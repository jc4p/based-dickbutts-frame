import { NextResponse } from 'next/server';

// Contract address to check for mints
const CONTRACT_ADDRESS = '0x744512b7d6d7cb36c417D7EC6CCcC53954eC103E';

// Function to get all mintees from Alchemy and their mint counts
async function getMintees() {
  const alchemyUrl = process.env.ALCHEMY_RPC_URL;
  
  // Get all transfer events (mints are transfers from 0x0 address)
  const response = await fetch(alchemyUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id: 1,
      jsonrpc: '2.0',
      method: 'alchemy_getAssetTransfers',
      params: [
        {
          fromBlock: '0x0',
          toBlock: 'latest',
          contractAddresses: [CONTRACT_ADDRESS],
          category: ['erc721', 'erc1155'],
          withMetadata: false,
          excludeZeroValue: true,
          maxCount: '0x3e8', // 1000 in hex
          fromAddress: '0x0000000000000000000000000000000000000000', // Mints are transfers from zero address
        }
      ]
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch from Alchemy: ${response.statusText}`);
  }

  const data = await response.json();
  
  // Extract recipient addresses and count mints
  const mintCounts = {}; // Use an object to store counts
  if (data.result && data.result.transfers) {
    data.result.transfers.forEach(transfer => {
      if (transfer.to) {
        const address = transfer.to.toLowerCase();
        mintCounts[address] = (mintCounts[address] || 0) + 1; // Increment count
      }
    });
  }
  
  console.log(`Found ${Object.keys(mintCounts).length} unique minters`);
   
  return mintCounts; // Return the map of address -> count
}

// Function to get user data from Neynar
async function getUserDataFromNeynar(addresses) {
  const apiKey = process.env.NEYNAR_API_KEY;
  const batchSize = 350;
  let allResults = {};

  // Process addresses in batches
  for (let i = 0; i < addresses.length; i += batchSize) {
    const batch = addresses.slice(i, i + batchSize);

    const batchCommaDelimited = batch.join(',');
    
    try {
      // Construct the URL with query parameters
      const url = new URL('https://api.neynar.com/v2/farcaster/user/bulk-by-address');
      url.searchParams.append('addresses', batchCommaDelimited);
      url.searchParams.append('address_types', 'verified_address');

      const response = await fetch(url.toString(), {
        method: 'GET', // Change method to GET
        headers: {
          'x-api-key': apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch from Neynar: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Map users to their addresses - NEW LOGIC
      if (data) {
        // Iterate through the addresses returned in the response
        for (const address in data) {
          // Ensure the address key exists in allResults
          if (!allResults[address]) {
            allResults[address] = [];
          }
          // Add the user data array for this address
          // We assume the API returns the desired user object structure directly
          // If specific field mapping is needed, it should be done here.
          allResults[address].push(...data[address]); 
        }
      }
    } catch (error) {
      console.error(`Error fetching batch ${i}-${i+batchSize}:`, error);
      // Continue with the next batch even if there's an error
    }
  }

  return allResults;
}

export async function GET() {
  try {
    // Get all mintees and their counts
    const addressToMintCount = await getMintees();
    
    // Get unique addresses
    const minteeAddresses = Object.keys(addressToMintCount);

    if (minteeAddresses.length === 0) {
      return NextResponse.json({}); // Return empty if no minters
    }
    
    // Get Farcaster data for mintees
    const neynarUserData = await getUserDataFromNeynar(minteeAddresses);

    // Combine Neynar data with mint counts
    const finalResults = {};
    for (const address in addressToMintCount) {
      const mintCount = addressToMintCount[address];
      const userDataArray = neynarUserData[address]; // This might be undefined

      // Only include addresses that have Farcaster data from Neynar
      if (userDataArray && userDataArray.length > 0) {
        finalResults[address] = userDataArray.map(user => ({
          ...user,
          mint_count: mintCount // Add the mint count here
        }));
      }
      // Optional: Handle addresses that minted but have no Neynar profile
      // else {
      //   finalResults[address] = [{ mint_count: mintCount, user: null }];
      // }
    }
    
    return NextResponse.json(finalResults);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch data' },
      { status: 500 }
    );
  }
}