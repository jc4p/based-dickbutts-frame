import { NextResponse } from 'next/server';
import { createPublicClient, http, parseAbiItem } from 'viem';
import { base } from 'viem/chains';

const COLLECTION_SLUG = 'baseddickbutts';
const CONTRACT_ADDRESS = '0x6b65C9aE28c4201695A1046cC03ce4D5689E18C1';

const contractABI = [
  parseAbiItem('function minted(address minter, bytes32 key) external view returns (uint256)'),
];

const alchemyRpcUrl = process.env.ALCHEMY_RPC_URL;

if (!alchemyRpcUrl) {
  console.error("ALCHEMY_RPC_URL is not set in environment variables. Contract calls will fail.");
}

const publicClient = alchemyRpcUrl ? createPublicClient({
  chain: base,
  transport: http(alchemyRpcUrl),
}) : null;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const walletAddress = searchParams.get('wallet');

  if (!walletAddress) {
    return NextResponse.json(
      { error: 'Wallet address is required' },
      { status: 400 }
    );
  }

  if (!publicClient) {
    return NextResponse.json(
      { error: 'Server configuration error: RPC URL not available. Cannot query contract.' },
      { status: 500 }
    );
  }
  console.log(`[invite-lists] Processing request for wallet: ${walletAddress}`);

  try {
    const scatterResponse = await fetch(
      `https://api.scatter.art/v1/collection/${COLLECTION_SLUG}/eligible-invite-lists?minterAddress=${walletAddress}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (!scatterResponse.ok) {
      const errorBody = await scatterResponse.text();
      console.error(`[invite-lists] Scatter API error: ${scatterResponse.statusText}, Body: ${errorBody}`);
      throw new Error(`Failed to fetch from Scatter: ${scatterResponse.statusText}`);
    }

    const scatterData = await scatterResponse.json();
    console.log(`[invite-lists] Scatter data for ${walletAddress}:`, JSON.stringify(scatterData, null, 2));
    const freeListsFromScatter = scatterData.filter(list => list.token_price === "0");

    const processedLists = await Promise.all(
      freeListsFromScatter.map(async (list) => {
        console.log(`[invite-lists] Processing list: ID=${list.id}, Name=${list.name}, Root=${list.root}`);
        // Use list.root as the key if it exists and looks like a bytes32, otherwise log a warning or fallback.
        // For now, we assume list.root is the correct bytes32 key.
        const contractKey = list.root; 

        if (!contractKey || !/^0x[0-9a-fA-F]{64}$/.test(contractKey)) {
          console.warn(`[invite-lists] List ID ${list.id} has an invalid or missing root: ${contractKey}. Skipping contract call for this list.`);
          return {
            ...list,
            wallet_limit: parseInt(list.wallet_limit, 10) || 0,
            num_minted_on_contract: 0, // Cannot determine from contract
            mints_remaining: parseInt(list.wallet_limit, 10) || 0, 
            contract_error: `Invalid or missing root for contract key: ${contractKey}`
          };
        }

        try {
          console.log(`[invite-lists] Calling contract 'minted' for wallet ${walletAddress}, key ${contractKey} (from list.root)`);
          const numMintedOnContract = await publicClient.readContract({
            address: CONTRACT_ADDRESS,
            abi: contractABI,
            functionName: 'minted',
            args: [walletAddress, contractKey], 
          });
          console.log(`[invite-lists] Contract returned numMintedOnContract: ${numMintedOnContract} for key ${contractKey}`);
          
          const walletLimit = parseInt(list.wallet_limit, 10);
          const mintedCount = parseInt(numMintedOnContract.toString(), 10);
          
          let mints_remaining = 0;
          if (!isNaN(walletLimit) && !isNaN(mintedCount)) {
             mints_remaining = Math.max(0, walletLimit - mintedCount);
          }

          const processedList = {
            ...list,
            wallet_limit: walletLimit,
            num_minted_on_contract: mintedCount,
            mints_remaining: mints_remaining,
          };
          console.log(`[invite-lists] Processed list ${list.id}:`, JSON.stringify(processedList, null, 2));
          return processedList;
        } catch (contractError) {
          console.error(`[invite-lists] Error fetching minted count for list ${list.id}, contract key ${contractKey}:`, contractError);
          return {
            ...list,
            wallet_limit: parseInt(list.wallet_limit, 10) || 0,
            num_minted_on_contract: 0, 
            mints_remaining: parseInt(list.wallet_limit, 10) || 0, 
            contract_error: contractError.message
          };
        }
      })
    );
    
    console.log(`[invite-lists] Successfully processed lists for wallet: ${walletAddress}`);
    return NextResponse.json(processedLists);
  } catch (error) {
    console.error(`[invite-lists] API error in invite-lists for wallet ${walletAddress}:`, error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch invite list data' },
      { status: 500 }
    );
  }
} 