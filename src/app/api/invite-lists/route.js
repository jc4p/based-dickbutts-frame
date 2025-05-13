import { NextResponse } from 'next/server';

const COLLECTION_SLUG = 'baseddickbutts';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const walletAddress = searchParams.get('wallet');

  if (!walletAddress) {
    return NextResponse.json(
      { error: 'Wallet address is required' },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `https://api.scatter.art/v1/collection/${COLLECTION_SLUG}/eligible-invite-lists?minterAddress=${walletAddress}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch from Scatter: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Filter for free mints only
    const freeLists = data.filter(list => list.token_price === "0");
    
    return NextResponse.json(freeLists);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch whitelist data' },
      { status: 500 }
    );
  }
} 