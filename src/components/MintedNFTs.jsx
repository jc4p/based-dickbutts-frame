'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import styles from './MintedNFTs.module.css';
import { createPublicClient, http, parseAbiItem } from 'viem';
import { base } from 'viem/chains';

const CONTRACT_ADDRESS = '0x6b65C9aE28c4201695A1046cC03ce4D5689E18C1';

// ABI for the events we need
const contractABI = [
  parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'),
  parseAbiItem('function tokenURI(uint256 tokenId) view returns (string)')
];

export function MintedNFTs({ txHash }) {
  const [mintedNFTs, setMintedNFTs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!txHash) return;

    async function fetchMintedNFTs() {
      try {
        const client = createPublicClient({
          chain: base,
          transport: http()
        });

        // Wait for transaction to be mined
        const receipt = await client.waitForTransactionReceipt({ hash: txHash });
        
        // Get Transfer events from the transaction
        const transferEvents = receipt.logs
          .filter(log => log.address.toLowerCase() === CONTRACT_ADDRESS.toLowerCase())
          .map(log => {
            const parsedLog = client.parseEventLogs({
              abi: contractABI,
              logs: [log]
            })[0];
            return parsedLog.args;
          })
          .filter(args => args.from === '0x0000000000000000000000000000000000000000'); // Only mints (from zero address)

        // Get token URIs for each minted NFT
        const nftPromises = transferEvents.map(async (event) => {
          const tokenId = event.tokenId;
          const tokenURI = await client.readContract({
            address: CONTRACT_ADDRESS,
            abi: contractABI,
            functionName: 'tokenURI',
            args: [tokenId]
          });

          // Convert IPFS URI to HTTP if needed
          const imageUrl = tokenURI.replace('ipfs://', 'https://ipfs.io/ipfs/');
          
          return {
            tokenId: tokenId.toString(),
            imageUrl
          };
        });

        const nfts = await Promise.all(nftPromises);
        setMintedNFTs(nfts);
      } catch (err) {
        console.error('Error fetching minted NFTs:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchMintedNFTs();
  }, [txHash]);

  if (loading) {
    return <div className={styles.loading}>Loading your minted NFTs...</div>;
  }

  if (error) {
    return <div className={styles.error}>Error: {error}</div>;
  }

  if (mintedNFTs.length === 0) {
    return null;
  }

  return (
    <div className={styles.container}>
      <h2>Your Minted NFTs</h2>
      <div className={`${styles.grid} ${mintedNFTs.length === 1 ? styles.single : ''}`}>
        {mintedNFTs.map((nft) => (
          <div key={nft.tokenId} className={styles.nftCard}>
            <Image
              src={nft.imageUrl}
              alt={`NFT #${nft.tokenId}`}
              width={mintedNFTs.length === 1 ? 500 : 300}
              height={mintedNFTs.length === 1 ? 500 : 300}
              className={styles.nftImage}
            />
            <p className={styles.tokenId}>#{nft.tokenId}</p>
          </div>
        ))}
      </div>
    </div>
  );
} 