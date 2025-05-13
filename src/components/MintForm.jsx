'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './MintForm.module.css';
import * as frame from '@farcaster/frame-sdk';
import { MintedNFTs } from './MintedNFTs';

// Default mint price in ETH (fallback)
const DEFAULT_MINT_PRICE = 0.002;
const DEFAULT_MAX_QUANTITY = 25;

// Status message types
const STATUS_TYPES = {
  NONE: 'none',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error'
};

export function MintForm() {
  const [quantity, setQuantity] = useState(1);
  const [isMinting, setIsMinting] = useState(false);
  const [status, setStatus] = useState({ type: STATUS_TYPES.NONE, message: '' });
  const [txHash, setTxHash] = useState(null);
  const [mintPrice, setMintPrice] = useState(DEFAULT_MINT_PRICE);
  const [isLoadingPrice, setIsLoadingPrice] = useState(true);
  const [maxQuantity, setMaxQuantity] = useState(DEFAULT_MAX_QUANTITY);
  const [hasFreeMint, setHasFreeMint] = useState(false);
  const [mintType, setMintType] = useState('free'); // 'free' or 'paid'
  const sliderRef = useRef(null);

  // Fetch invite list price and max quantity when wallet is connected
  useEffect(() => {
    async function getInviteListData() {
      try {
        const accounts = await frame.sdk.wallet.ethProvider.request({
          method: 'eth_requestAccounts'
        });
        
        if (!accounts || !accounts[0]) {
          setMintPrice(DEFAULT_MINT_PRICE);
          setMaxQuantity(DEFAULT_MAX_QUANTITY);
          setHasFreeMint(false);
          setIsLoadingPrice(false);
          return;
        }

        const response = await fetch(`/api/invite-lists?wallet=${accounts[0]}`);
        if (!response.ok) {
          throw new Error('Failed to fetch invite list data');
        }

        const data = await response.json();
        
        if (data && data.length > 0) {
          // Find the list with the highest wallet limit
          const maxWalletLimit = Math.max(
            ...data
              .map(list => {
                const limit = parseInt(list.wallet_limit, 10);
                return isNaN(limit) ? 0 : limit;
              })
              .filter(limit => limit > 0)
          );
          
          // If no valid wallet limits found, use default
          if (maxWalletLimit === -Infinity || maxWalletLimit === 0) {
            setMintPrice(DEFAULT_MINT_PRICE);
            setMaxQuantity(DEFAULT_MAX_QUANTITY);
            setHasFreeMint(false);
          } else {
            setHasFreeMint(true);
            setMintPrice(0);
            setMaxQuantity(maxWalletLimit);
          }
        } else {
          setMintPrice(DEFAULT_MINT_PRICE);
          setMaxQuantity(DEFAULT_MAX_QUANTITY);
          setHasFreeMint(false);
        }
      } catch (error) {
        console.error('Error fetching invite list data:', error);
        setMintPrice(DEFAULT_MINT_PRICE);
        setMaxQuantity(DEFAULT_MAX_QUANTITY);
        setHasFreeMint(false);
      } finally {
        setIsLoadingPrice(false);
      }
    }

    getInviteListData();
  }, []);

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

  const handleOpenMintWebsite = () => {
    handleOpenUrl('https://www.scatter.art/collection/baseddickbutts');
  };

  const handleShareOnWarpcast = () => {
    const targetText = 'Checkout Based Dickbutts, a new NFT collection by @xexcy';
    const targetURL = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    const finalUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(targetText)}&embeds[]=${encodeURIComponent(targetURL)}`;
    handleOpenUrl(finalUrl);
  };

  const handleSliderChange = (e) => {
    setQuantity(parseInt(e.target.value, 10));
    updateSliderFill();
  };

  const updateSliderFill = () => {
    if (sliderRef.current) {
      const value = sliderRef.current.value;
      const max = sliderRef.current.max;
      const percentage = (value - 1) / (max - 1) * 100;
      sliderRef.current.style.background = `linear-gradient(to right, var(--primary) 0%, var(--primary) ${percentage}%, var(--disabled) ${percentage}%, var(--disabled) 100%)`;
    }
  };

  useEffect(() => {
    updateSliderFill();
  }, [maxQuantity]); // Update slider fill when max quantity changes

  const handleMint = async () => {
    setIsMinting(true);
    setStatus({
      type: STATUS_TYPES.LOADING,
      message: 'Connecting to wallet...'
    });
    
    try {
      // Get the user's wallet address
      const accounts = await frame.sdk.wallet.ethProvider.request({
        method: 'eth_requestAccounts'
      });
      
      if (!accounts || !accounts[0]) {
        throw new Error('No wallet connected');
      }
      
      const walletAddress = accounts[0];
      setStatus({
        type: STATUS_TYPES.LOADING,
        message: 'Checking network...'
      });
      
      // Check chain ID (Base Mainnet is 8453)
      const chainId = await frame.sdk.wallet.ethProvider.request({
        method: 'eth_chainId'
      });
      
      const chainIdDecimal = parseInt(chainId, 16);
      
      // Switch to Base if not already on it
      if (chainIdDecimal !== 8453) {
        setStatus({
          type: STATUS_TYPES.LOADING,
          message: 'Switching to Base network...'
        });
        
        await frame.sdk.wallet.ethProvider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x2105' }] // Base mainnet chainId
        });
      }
      
      // Contract details
      const contractAddress = '0x6b65C9aE28c4201695A1046cC03ce4D5689E18C1';
      const mintFunctionSignature = '0x4a21a2df'; // mint function signature
      
      // Convert ETH to Wei for the transaction
      const ethToWei = (eth) => {
        return '0x' + (BigInt(Math.floor(eth * 1e18))).toString(16);
      };
      
      // Calculate the total price based on mint type
      const currentPrice = mintType === 'free' ? 0 : DEFAULT_MINT_PRICE;
      const totalPrice = currentPrice * quantity;
      const valueInWei = ethToWei(totalPrice);
      
      // Encode the function parameters
      const quantityHex = quantity.toString(16).padStart(64, '0');
      
      // Construct the data field with all parameters
      const data =
        mintFunctionSignature +
        '0000000000000000000000000000000000000000000000000000000000000080' +
        quantityHex.padStart(64, '0') +
        '0000000000000000000000000000000000000000000000000000000000000000' +
        '00000000000000000000000000000000000000000000000000000000000000e0' +
        '0000000000000000000000000000000000000000000000000000000000000000' +
        '0000000000000000000000000000000000000000000000000000000000000040' +
        '0000000000000000000000000000000000000000000000000000000000000000' +
        '0000000000000000000000000000000000000000000000000000000000000001' +
        '0000000000000000000000000000000000000000000000000000000000000000';
      
      console.log(`Minting ${quantity} NFTs for ${totalPrice.toFixed(4)} ETH...`);
      
      setStatus({
        type: STATUS_TYPES.LOADING,
        message: 'Confirm transaction in your wallet...'
      });
      
      try {
        const txHash = await frame.sdk.wallet.ethProvider.request({
          method: 'eth_sendTransaction',
          params: [{
            from: walletAddress,
            to: contractAddress,
            data: data,
            value: valueInWei
          }]
        });
        
        console.log('Transaction hash:', txHash);
        setTxHash(txHash);
        
        const successMessage = quantity > 1 
          ? `Check your wallet in a few minutes for your new NFTs!` 
          : `Check your wallet in a few minutes for your new NFT!`;
          
        setStatus({
          type: STATUS_TYPES.SUCCESS,
          message: successMessage
        });
        
        // Reset status after 5 seconds
        setTimeout(() => {
          if (status.type === STATUS_TYPES.SUCCESS) {
            setStatus({ type: STATUS_TYPES.NONE, message: '' });
          }
        }, 5000);
      } catch (mintError) {
        console.error('Error in mint transaction:', mintError);
        setStatus({
          type: STATUS_TYPES.ERROR,
          message: `Transaction failed: ${mintError.message}`
        });
      }
    } catch (error) {
      console.error('Error minting:', error);
      setStatus({
        type: STATUS_TYPES.ERROR,
        message: `Failed to mint: ${error.message}`
      });
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <>
      <div className={styles.mintForm}>
        {hasFreeMint && (
          <div className={styles.mintTypeSelector}>
            <button
              className={`${styles.mintTypeButton} ${mintType === 'free' ? styles.active : ''}`}
              onClick={() => setMintType('free')}
            >
              Free Mint
            </button>
            <button
              className={`${styles.mintTypeButton} ${mintType === 'paid' ? styles.active : ''}`}
              onClick={() => setMintType('paid')}
            >
              Public Mint
            </button>
          </div>
        )}

        {(mintType === 'paid' || (mintType === 'free' && maxQuantity > 1)) && (
          <div className={styles.quantitySelector}>
            <label htmlFor="quantity">Quantity: {quantity}</label>
            <input
              ref={sliderRef}
              type="range"
              id="quantity"
              name="quantity"
              min="1"
              max={mintType === 'free' ? maxQuantity : DEFAULT_MAX_QUANTITY}
              value={quantity}
              onChange={handleSliderChange}
              className={styles.slider}
              disabled={isLoadingPrice}
            />
            <div className={styles.sliderValues}>
              <span>1</span>
              <span>{mintType === 'free' ? maxQuantity : DEFAULT_MAX_QUANTITY}</span>
            </div>
          </div>
        )}
        
        <button 
          className={styles.mintButton} 
          onClick={handleMint}
          disabled={isMinting || isLoadingPrice}
        >
          {isMinting ? 'Minting...' : 
           isLoadingPrice ? 'Loading...' :
           mintType === 'free' ? `Mint - Free` :
           `Mint - ${(DEFAULT_MINT_PRICE * quantity).toFixed(4)} ETH`}
        </button>
        
        {status.type !== STATUS_TYPES.NONE && (
          <div className={`${styles.statusMessage} ${styles[status.type]}`}>
            {status.message}
          </div>
        )}
        
        <hr className={styles.divider} />
        
        <button 
          className={styles.shareButton} 
          onClick={handleShareOnWarpcast}
        >
          Share
        </button>
        
        <div className={styles.linksContainer}>
          <div className={styles.webLink}>
            <a onClick={handleOpenMintWebsite}>Mint on web</a>
          </div>
        </div>
      </div>

      {txHash && <MintedNFTs txHash={txHash} />}
    </>
  );
}