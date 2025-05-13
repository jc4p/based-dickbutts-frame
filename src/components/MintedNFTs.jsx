'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import styles from './MintedNFTs.module.css';
import { createPublicClient, http, parseAbiItem, parseEventLogs } from 'viem';
import { base } from 'viem/chains';
import * as frame from '@farcaster/frame-sdk';

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

  const handleOpenUrl = (urlAsString) => {
    try {
      // Try with string parameter first
      frame.sdk.actions.openUrl(urlAsString);
    } catch (error) {
      try {
        // If string parameter fails, try with object parameter
        frame.sdk.actions.openUrl({ url: urlAsString });
      } catch (secondError) {
        console.error('Failed to open URL:', secondError);
      }
    }
  };

  const handleShareOnWarpcast = () => {
    const targetText = mintedNFTs.length > 1 
      ? `Just minted ${mintedNFTs.length} Based Dickbutts NFTs!` 
      : `Just minted Based Dickbutt #${mintedNFTs[0].tokenId}!`;
    const targetURL = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    const finalUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(targetText)}&embeds[]=${encodeURIComponent(targetURL)}`;
    handleOpenUrl(finalUrl);
  };

  useEffect(() => {
    if (!txHash) return;

    async function fetchMintedNFTs() {
      setLoading(true);
      setError(null);
      try {
        const client = createPublicClient({
          chain: base,
          transport: http(),
        });

        const receipt = await client.waitForTransactionReceipt({ hash: txHash });
        
        const transferEvents = receipt.logs
          .filter(log => log.address.toLowerCase() === CONTRACT_ADDRESS.toLowerCase())
          .map(log => {
            const parsedLog = parseEventLogs({
              abi: contractABI,
              logs: [log],
            })[0];
            return parsedLog.args;
          })
          .filter(args => args.from === '0x0000000000000000000000000000000000000000');

        const nftPromises = transferEvents.map(async (event) => {
          const tokenId = event.tokenId;
          const metadataUri = await client.readContract({
            address: CONTRACT_ADDRESS,
            abi: contractABI,
            functionName: 'tokenURI',
            args: [tokenId],
          });

          // Fetch the JSON metadata
          const metadataResponse = await fetch(metadataUri.replace('ipfs://', 'https://ipfs.io/ipfs/'));
          if (!metadataResponse.ok) {
            throw new Error(`Failed to fetch metadata for token ${tokenId} from ${metadataUri}`);
          }
          const metadata = await metadataResponse.json();

          // Extract image URL and attributes
          const imageUrl = metadata.image ? metadata.image.replace('ipfs://', 'https://ipfs.io/ipfs/') : '';
          const attributes = metadata.attributes ? metadata.attributes.filter(attr => attr.value !== 'None' && attr.value !== null && attr.value !== '') : [];
          
          return {
            tokenId: tokenId.toString(),
            imageUrl,
            name: metadata.name || `NFT #${tokenId}`,
            attributes,
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
            {nft.imageUrl && (
              <Image
                src={nft.imageUrl}
                alt={nft.name || `NFT #${nft.tokenId}`}
                width={mintedNFTs.length === 1 ? 400 : 250}
                height={mintedNFTs.length === 1 ? 400 : 250}
                className={styles.nftImage}
                unoptimized={true}
              />
            )}
            <h3 className={styles.nftName}>{nft.name}</h3>
            {nft.attributes && nft.attributes.length > 0 && (
              <div className={styles.attributesContainer}>
                <h4>Traits:</h4>
                <ul className={styles.attributesList}>
                  {nft.attributes.map((attr, index) => (
                    <li key={index} className={styles.attributeItem}>
                      <span className={styles.traitType}>{attr.trait_type}:</span> {attr.value}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
      {mintedNFTs.length > 0 && (
        <button 
          className={styles.shareButton} 
          onClick={handleShareOnWarpcast}
        >
          Share
        </button>
      )}
    </div>
  );
} 