import { NextResponse } from 'next/server';
import { createPublicClient, http, parseAbiItem, stringToHex } from 'viem';
import { base } from 'viem/chains';

const COLLECTION_SLUG = 'baseddickbutts';
const CONTRACT_ADDRESS = '0x6b65C9aE28c4201695A1046cC03ce4D5689E18C1';

const contractABI = [
  parseAbiItem('function minted(address minter, bytes32 key) external view returns (uint256)'),
];

const alchemyRpcUrl = process.env.ALCHEMY_RPC_URL;

if (!alchemyRpcUrl) {
  console.error("ALCHEMY_RPC_URL is not set in environment variables.");
  // Potentially throw an error or handle this case appropriately
  // For now, we'll let it proceed and viem will likely fail if it's used without a transport
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
      { error: 'Server configuration error: RPC URL not available.' },
      { status: 500 }
    );
  }

  try {
    const scatterResponse = await fetch(
      `https://api.scatter.art/v1/collection/${COLLECTION_SLUG}/eligible-invite-lists?minterAddress=${walletAddress}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!scatterResponse.ok) {
      throw new Error(`Failed to fetch from Scatter: ${scatterResponse.statusText}`);
    }

    const scatterData = await scatterResponse.json();
    const freeListsFromScatter = scatterData.filter(list => list.token_price === "0");

    const processedLists = await Promise.all(
      freeListsFromScatter.map(async (list) => {
        try {
          const listIdAsBytes32 = stringToHex(list.id, { size: 32 });

          const numMintedOnContract = await publicClient.readContract({
            address: CONTRACT_ADDRESS,
            abi: contractABI,
            functionName: 'minted',
            args: [walletAddress, listIdAsBytes32],
          });
          
          const walletLimit = parseInt(list.wallet_limit, 10);
          const mintedCount = parseInt(numMintedOnContract.toString(), 10);
          
          let mints_remaining = 0;
          if (!isNaN(walletLimit) && !isNaN(mintedCount)) {
             mints_remaining = Math.max(0, walletLimit - mintedCount);
          }

          return {
            ...list,
            wallet_limit: walletLimit,
            num_minted_on_contract: mintedCount,
            mints_remaining: mints_remaining,
          };
        } catch (contractError) {
          console.error(`Error fetching minted count for list ${list.id} (converted to ${stringToHex(list.id, { size: 32 })}):`, contractError);
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
    
    return NextResponse.json(processedLists);
  } catch (error) {
    console.error('API error in invite-lists:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch invite list data' },
      { status: 500 }
    );
  }
} 