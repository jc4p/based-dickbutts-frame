'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './MintForm.module.css';
import * as frame from '@farcaster/frame-sdk';

// Mint price in ETH
const MINT_PRICE = 0.0033;

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
  const sliderRef = useRef(null);

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
    handleOpenUrl('https://www.scatter.art/collection/based-interns');
  };

  const handleShareOnWarpcast = () => {
    const targetText = 'Checkout Based Interns, a new NFT collection by @xexcy';
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
  }, []);

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
      const contractAddress = '0x744512b7d6d7cb36c417D7EC6CCcC53954eC103E';
      const mintFunctionSignature = '0x4a21a2df'; // mint function signature
      
      // Convert ETH to Wei for the transaction
      const ethToWei = (eth) => {
        return '0x' + (BigInt(Math.floor(eth * 1e18))).toString(16);
      };
      
      // Calculate the total price
      const totalPrice = MINT_PRICE * quantity;
      const valueInWei = ethToWei(totalPrice);
      
      // Encode the function parameters
      // Encoding format: function signature + encoded parameters
      
      // Parameters:
      // 1. auth.key: 0x0000000000000000000000000000000000000000000000000000000000000000
      // 2. auth.proof: [] (empty array)
      // 3. quantity: user selected quantity
      // 4. affiliate: 0x0000000000000000000000000000000000000000 (zero address)
      // 5. signature: 0x00
      
      // Manually encode parameters for the mint function
      const quantityHex = quantity.toString(16).padStart(64, '0');
      
      // Construct the data field with all parameters
      // This is a simplified approach - normally you would use a library for proper ABI encoding
      const data =
        mintFunctionSignature +
        // auth.key (32 bytes)
        '0000000000000000000000000000000000000000000000000000000000000000' +
        // offset to auth.proof (160 bytes => 0xa0)
        '00000000000000000000000000000000000000000000000000000000000000a0' +
        // quantity (uint256, padded to 32 bytes)
        quantityHex.padStart(64, '0') +
        // affiliate address (zero address)
        '0000000000000000000000000000000000000000000000000000000000000000' +
        // offset to signature (192 bytes => 0xc0, because proof is empty, proof offset + 32 bytes length = 0xa0+0x20 = 0xc0)
        '00000000000000000000000000000000000000000000000000000000000000c0' +
        // auth.proof length (0)
        '0000000000000000000000000000000000000000000000000000000000000000' +
        // signature length (1 byte)
        '0000000000000000000000000000000000000000000000000000000000000001' +
        // signature byte data (1 byte 0x00 padded)
        '0000000000000000000000000000000000000000000000000000000000000000';

      
      console.log(`Minting ${quantity} NFTs for ${totalPrice.toFixed(4)} ETH...`);
      
      setStatus({
        type: STATUS_TYPES.LOADING,
        message: 'Confirm transaction in your wallet...'
      });
      
      try {
        // Following the example in docs/FRAME_INTEGRATION.md
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
    <div className={styles.mintForm}>
      <div className={styles.quantitySelector}>
        <label htmlFor="quantity">Quantity: {quantity}</label>
        <input
          ref={sliderRef}
          type="range"
          id="quantity"
          name="quantity"
          min="1"
          max="10"
          value={quantity}
          onChange={handleSliderChange}
          className={styles.slider}
        />
        <div className={styles.sliderValues}>
          <span>1</span>
          <span>10</span>
        </div>
      </div>
      
      <button 
        className={styles.mintButton} 
        onClick={handleMint}
        disabled={isMinting}
      >
        {isMinting ? 'Minting...' : `Mint - ${(MINT_PRICE * quantity).toFixed(4)} ETH`}
      </button>
      
      {status.type !== STATUS_TYPES.NONE && (
        <div className={`${styles.statusMessage} ${styles[status.type]}`}>
          {status.message}
        </div>
      )}
      
      <div className={styles.linksContainer}>
        <div className={styles.webLink}>
          <a onClick={handleOpenMintWebsite}>Mint on web</a>
        </div>
        <span className={styles.separator}>•</span>
        <div className={styles.webLink}>
          <a onClick={handleShareOnWarpcast}>Share</a>
        </div>
      </div>
    </div>
  );
}