'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './MintForm.module.css';
import * as frame from '@farcaster/frame-sdk';
import { MintedNFTs } from './MintedNFTs';
import { DebugOverlay } from './DebugOverlay';

// Default mint price in ETH (fallback)
const DEFAULT_MINT_PRICE = 0.002;
const DEFAULT_MAX_QUANTITY = 25;
const ACCOUNT_REQUEST_TIMEOUT_MS = 15000; // 15 seconds for initial account request
const MINT_ACCOUNT_REQUEST_TIMEOUT_MS = 30000; // 30 seconds for mint interaction

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
  const [eligibleLists, setEligibleLists] = useState([]);
  const mintedNFTsRef = useRef(null); // Ref for scrolling

  useEffect(() => {
    console.log('[MintForm] Component mounted / initialized');
  }, []);

  // Scroll to MintedNFTs when txHash is set
  useEffect(() => {
    console.log('[MintForm] txHash changed:', txHash);
    if (txHash && mintedNFTsRef.current) {
      console.log('[MintForm] Scrolling to MintedNFTs section.');
      const timer = setTimeout(() => {
        mintedNFTsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300); // Short delay to ensure rendering
      return () => clearTimeout(timer);
    }
  }, [txHash]);

  // Fetch invite list price and max quantity when wallet is connected
  useEffect(() => {
    console.log('[MintForm] getInviteListData effect triggered.');
    async function getInviteListData() {
      console.log('[MintForm] Attempting to get invite list data...');
      setIsLoadingPrice(true);
      setStatus({ type: STATUS_TYPES.LOADING, message: 'Connecting to wallet...' }); // User feedback
      try {
        console.log('[MintForm] Requesting accounts from Frame SDK...');
        const accountsPromise = frame.sdk.wallet.ethProvider.request({
          method: 'eth_requestAccounts'
        });
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Wallet connection timed out (15s). Please try again or ensure your wallet is responsive.')), ACCOUNT_REQUEST_TIMEOUT_MS)
        );

        const accounts = await Promise.race([accountsPromise, timeoutPromise]);
        console.log('[MintForm] Accounts received:', accounts);
        
        if (!accounts || !accounts[0]) {
          console.warn('[MintForm] No accounts found or access denied after request.');
          setStatus({ type: STATUS_TYPES.ERROR, message: 'No wallet account found. Please connect your wallet.' });
          setMintPrice(DEFAULT_MINT_PRICE);
          setMaxQuantity(DEFAULT_MAX_QUANTITY);
          setHasFreeMint(false);
          setEligibleLists([]);
          return;
        }
        const walletAddress = accounts[0];
        console.log(`[MintForm] Fetching /api/invite-lists for wallet: ${walletAddress}`);
        const response = await fetch(`/api/invite-lists?wallet=${walletAddress}`);
        console.log('[MintForm] /api/invite-lists response status:', response.status);
        if (!response.ok) {
          const errorText = await response.text();
          console.error('[MintForm] Failed to fetch invite list data, status:', response.status, 'body:', errorText);
          throw new Error('Failed to fetch invite list data');
        }

        const data = await response.json();
        console.log('[MintForm] /api/invite-lists data received:', data);
        setEligibleLists(data);
        
        if (data && data.length > 0) {
          const maxWalletLimit = Math.max(
            ...data
              .map(list => {
                const limit = parseInt(list.mints_remaining, 10);
                console.log(`[MintForm] List: ${list.name}, Mints Remaining: ${list.mints_remaining}, Parsed Limit: ${limit}`);
                return isNaN(limit) ? 0 : limit;
              })
              .filter(limit => limit > 0)
          );
          console.log('[MintForm] Calculated maxWalletLimit for free mints:', maxWalletLimit);
          
          if (maxWalletLimit === -Infinity || maxWalletLimit === 0) {
            console.log('[MintForm] No valid free mints found or limit is 0. Setting to default paid mint.');
            setMintPrice(DEFAULT_MINT_PRICE);
            setMaxQuantity(DEFAULT_MAX_QUANTITY);
            setHasFreeMint(false);
          } else {
            console.log('[MintForm] Valid free mints found. Max quantity for free mint:', maxWalletLimit);
            setHasFreeMint(true);
            setMintPrice(0);
            setMaxQuantity(maxWalletLimit);
          }
        } else {
          console.log('[MintForm] No invite lists data. Setting to default paid mint.');
          setMintPrice(DEFAULT_MINT_PRICE);
          setMaxQuantity(DEFAULT_MAX_QUANTITY);
          setHasFreeMint(false);
        }
        setStatus({ type: STATUS_TYPES.NONE, message: '' }); // Clear status on success
      } catch (error) {
        console.error('[MintForm] Error in getInviteListData (accounts or fetch):', error);
        setStatus({ type: STATUS_TYPES.ERROR, message: error.message || 'Failed to connect wallet or fetch invite data.' });
        setMintPrice(DEFAULT_MINT_PRICE);
        setMaxQuantity(DEFAULT_MAX_QUANTITY);
        setHasFreeMint(false);
        setEligibleLists([]);
      } finally {
        console.log('[MintForm] Finished getInviteListData. isLoadingPrice: false.');
        setIsLoadingPrice(false);
      }
    }
    getInviteListData();
  }, []);

  const handleOpenUrl = (urlAsString) => {
    console.log('[MintForm] handleOpenUrl called with:', urlAsString);
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
    console.log('[MintForm] handleOpenMintWebsite called.');
    handleOpenUrl('https://www.scatter.art/collection/baseddickbutts');
  };

  const handleShareOnWarpcast = () => {
    console.log('[MintForm] handleShareOnWarpcast called.');
    const targetText = 'Checkout Based Dickbutts, a new NFT collection by @xexcy';
    const targetURL = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    const finalUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(targetText)}&embeds[]=${encodeURIComponent(targetURL)}`;
    handleOpenUrl(finalUrl);
  };

  const handleSliderChange = (e) => {
    const newQuantity = parseInt(e.target.value, 10);
    console.log('[MintForm] handleSliderChange, new quantity:', newQuantity);
    setQuantity(newQuantity);
    updateSliderFill();
  };

  const updateSliderFill = () => {
    // ... (no logs needed here unless debugging slider visuals)
  };

  useEffect(() => {
    console.log('[MintForm] maxQuantity changed, updating slider fill. maxQuantity:', maxQuantity);
    updateSliderFill();
  }, [maxQuantity]); // Update slider fill when max quantity changes

  const handleMint = async () => {
    console.log(`[MintForm] handleMint started. Mint Type: ${mintType}, Quantity: ${quantity}`);
    setIsMinting(true);
    setStatus({ type: STATUS_TYPES.LOADING, message: 'Connecting to wallet for minting...' });
    
    try {
      console.log('[MintForm] Requesting accounts for minting...');
      const accountsPromise = frame.sdk.wallet.ethProvider.request({
        method: 'eth_requestAccounts'
      });
      const mintTimeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Wallet interaction for mint timed out (30s). Please try again.')), MINT_ACCOUNT_REQUEST_TIMEOUT_MS)
      );
      const accounts = await Promise.race([accountsPromise, mintTimeoutPromise]);
      console.log('[MintForm] Accounts for minting:', accounts);

      if (!accounts || !accounts[0]) {
        console.error('[MintForm] No wallet connected for minting after request.');
        throw new Error('No wallet connected. Please ensure your wallet is connected and try again.');
      }
      const walletAddress = accounts[0];
      console.log('[MintForm] Wallet address for minting:', walletAddress);
      
      setStatus({
        type: STATUS_TYPES.LOADING,
        message: 'Checking network...'
      });
      console.log('[MintForm] Requesting chainId...');
      const chainIdHex = await frame.sdk.wallet.ethProvider.request({ method: 'eth_chainId' });
      const chainIdDecimal = parseInt(chainIdHex, 16);
      console.log(`[MintForm] Current chainId: ${chainIdDecimal} (Hex: ${chainIdHex})`);
      
      if (chainIdDecimal !== 8453) {
        console.log('[MintForm] Incorrect network. Requesting switch to Base (8453)...');
        setStatus({
          type: STATUS_TYPES.LOADING,
          message: 'Switching to Base network...'
        });
        
        await frame.sdk.wallet.ethProvider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x2105' }] // Base mainnet chainId
        });
        console.log('[MintForm] Network switch requested.');
      }
      
      // Contract details
      const contractAddress = '0x6b65C9aE28c4201695A1046cC03ce4D5689E18C1';
      console.log('[MintForm] Contract address:', contractAddress);
      
      if (mintType === 'free') {
        console.log('[MintForm] Processing free mint.');
        let remainingToMintForTx = quantity;
        const listsForTx = eligibleLists
          .map(list => {
            const limit = parseInt(list.mints_remaining, 10);
            if (isNaN(limit) || limit <= 0 || remainingToMintForTx <= 0) return null;
            const useQty = Math.min(limit, remainingToMintForTx);
            remainingToMintForTx -= useQty;
            console.log(`[MintForm] Free mint list ${list.id}: using ${useQty} of ${limit} available.`);
            return useQty > 0 ? { id: list.id, quantity: useQty } : null;
          })
          .filter(Boolean);
        
        console.log('[MintForm] Lists prepared for free mint API call:', listsForTx);
        if (listsForTx.length === 0) {
          console.error('[MintForm] No eligible lists for the selected free mint quantity.');
          throw new Error('No eligible invite lists with remaining mints for the selected quantity.');
        }

        const body = {
          collectionAddress: contractAddress,
          chainId: 8453,
          minterAddress: walletAddress,
          lists: listsForTx, // Use the new listsForTx
          affiliateAddress: '0x0'
        };
        console.log('[MintForm] Calling /api/generate-mint-tx with body:', body);
        setStatus({
          type: STATUS_TYPES.LOADING,
          message: 'Generating mint transaction...'
        });
        const res = await fetch('/api/generate-mint-tx', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        console.log('[MintForm] /api/generate-mint-tx response status:', res.status);
        if (!res.ok) {
          const err = await res.json();
          console.error('[MintForm] /api/generate-mint-tx failed:', err);
          throw new Error(err.error || 'Failed to generate mint transaction');
        }
        const mintTx = await res.json();
        console.log('[MintForm] Received mintTransaction from API:', mintTx);
        
        setStatus({
          type: STATUS_TYPES.LOADING,
          message: 'Confirm transaction in your wallet...'
        });
        try {
          const txParams = {
            from: walletAddress,
            to: mintTx.to,
            data: mintTx.data
          };
          console.log('[MintForm] Sending free mint transaction with params:', txParams);
          const currentTxHash = await frame.sdk.wallet.ethProvider.request({
            method: 'eth_sendTransaction',
            params: [txParams]
          });
          console.log('[MintForm] Free mint transaction sent. TxHash:', currentTxHash);
          setTxHash(currentTxHash);
          setStatus({
            type: STATUS_TYPES.LOADING,
            message: 'Waiting for transaction to be confirmed...'
          });
        } catch (mintError) {
          console.error('[MintForm] Free mint transaction error:', mintError);
          setStatus({
            type: STATUS_TYPES.ERROR,
            message: `Transaction failed: ${mintError.message}`
          });
        }
      } else {
        console.log('[MintForm] Processing paid mint.');
        const mintFunctionSignature = '0x4a21a2df'; // mint function signature
        const ethToWei = (eth) => {
          return '0x' + (BigInt(Math.floor(eth * 1e18))).toString(16);
        };
        const totalPrice = DEFAULT_MINT_PRICE * quantity;
        const valueInWei = ethToWei(totalPrice);
        const quantityHex = quantity.toString(16).padStart(64, '0');
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
        console.log(`[MintForm] Paid mint details: Quantity=${quantity}, TotalPriceETH=${totalPrice}, ValueWei=${valueInWei}`);
        setStatus({
          type: STATUS_TYPES.LOADING,
          message: 'Confirm transaction in your wallet...'
        });
        try {
          console.log('[MintForm] Sending paid mint transaction with params:', { from: walletAddress, to: contractAddress, data: data, value: valueInWei });
          const currentTxHash = await frame.sdk.wallet.ethProvider.request({
            method: 'eth_sendTransaction',
            params: [{
              from: walletAddress,
              to: contractAddress,
              data: data,
              value: valueInWei
            }]
          });
          console.log('[MintForm] Paid mint transaction sent. TxHash:', currentTxHash);
          setTxHash(currentTxHash);
          setStatus({
            type: STATUS_TYPES.LOADING,
            message: 'Waiting for transaction to be confirmed...'
          });
        } catch (mintError) {
          console.error('[MintForm] Paid mint transaction error:', mintError);
          setStatus({
            type: STATUS_TYPES.ERROR,
            message: `Transaction failed: ${mintError.message}`
          });
        }
      }
    } catch (error) {
      console.error('[MintForm] General error in handleMint:', error);
      setStatus({ type: STATUS_TYPES.ERROR, message: error.message || 'Failed to mint. Please try again.'});
    } finally {
      console.log('[MintForm] handleMint finished. isMinting: false.');
      setIsMinting(false);
    }
  };

  return (
    <>
      <DebugOverlay />
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
           `Mint - ${Number(DEFAULT_MINT_PRICE * quantity).toFixed(4).replace(/\.?0+$/, '')} ETH`}
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
          <button 
            className={styles.webMintButton}
            onClick={handleOpenMintWebsite}
            type="button"
          >
            Mint on web
          </button>
        </div>
      </div>

      <div ref={mintedNFTsRef}>
        {txHash && <MintedNFTs txHash={txHash} />}
      </div>
    </>
  );
}