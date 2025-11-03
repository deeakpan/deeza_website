'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Header } from '@/components/Header';
import { CONTRACT_ADDRESS, CONTRACT_ABI, CHAIN_CONFIG, ERC20_ABI } from '@/lib/config';
import { formatUnits, keccak256, stringToBytes, zeroAddress, maxUint256 } from 'viem';
import type { Address } from 'viem';
import { Search, Gift, Coins, Wallet, AlertCircle, CheckCircle, Loader2, ExternalLink, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type TransactionStatus = 'idle' | 'pending' | 'success' | 'error';

interface Gift {
  gifter: Address;
  recipient: Address;
  token: Address;
  amount: bigint;
  code: string;
  ipfsLink: string;
  claimer: Address;
  claimDeadline: bigint;
  attempts: number;
  deposited: boolean;
  claimed: boolean;
}

function DepositContent() {
  const searchParams = useSearchParams();
  const { address, isConnected } = useAccount();
  const { writeContract, data: hash, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });
  
  // Separate write contract hook for approvals
  const { writeContract: writeApproveContract, data: approvalHash, error: approveError } = useWriteContract();
  const { isLoading: isApproving, isSuccess: isApproved } = useWaitForTransactionReceipt({
    hash: approvalHash,
  });

  const [giftCode, setGiftCode] = useState<string>('');
  const [giftId, setGiftId] = useState<`0x${string}` | null>(null);
  const [giftDetails, setGiftDetails] = useState<Gift | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [needsApproval, setNeedsApproval] = useState<boolean>(false);
  const [tokenSymbol, setTokenSymbol] = useState<string>('');
  const [tokenDecimals, setTokenDecimals] = useState<number>(18);

  // Helper function to parse and format error messages
  const formatError = (error: any): string => {
    const errorMessage = error?.message || error?.shortMessage || String(error);
    
    // Check for circuit breaker error
    if (errorMessage.toLowerCase().includes('circuit breaker')) {
      return 'Token transfers are currently paused. The token contract has activated its circuit breaker (safety mechanism). Please try again later or contact the token issuer.';
    }
    
    // Check for revert reasons
    if (errorMessage.includes('reverted') || errorMessage.includes('revert')) {
      // Try to extract the revert reason
      const revertReasonMatch = errorMessage.match(/reason:?\s*([^]+?)(?:\n|$)/i);
      if (revertReasonMatch) {
        const reason = revertReasonMatch[1].trim();
        if (reason.toLowerCase().includes('circuit breaker')) {
          return 'Token transfers are paused. Circuit breaker is active. Please try again later.';
        }
        return `Transaction failed: ${reason}`;
      }
      return 'Transaction was rejected by the token contract. Please check your balance and try again.';
    }
    
    return errorMessage || 'An unknown error occurred';
  };

  // Load URL parameters on mount
  useEffect(() => {
    const giftParam = searchParams?.get('gift');
    if (giftParam) {
      setGiftCode(giftParam);
      const id = keccak256(stringToBytes(giftParam.trim())) as `0x${string}`;
      setGiftId(id);
    }
  }, [searchParams]);

  // Fetch gift details
  const { 
    data: giftData, 
    refetch: refetchGift, 
    isFetching: isFetchingGift,
    error: readError 
  } = useReadContract({
    address: CONTRACT_ADDRESS as Address,
    abi: CONTRACT_ABI,
    functionName: 'getGift',
    args: giftId ? [giftId] : undefined,
    query: {
      enabled: !!giftId && !!isConnected,
      retry: 2,
    },
  });

  useEffect(() => {
    if (readError) {
      console.error('Contract read error:', readError);
      setError(`Failed to fetch gift: ${readError.message || 'Gift not found'}`);
      setGiftDetails(null);
    }
  }, [readError]);

  // Check allowance for ERC-20 tokens (only when we have gift details)
  const { data: allowance } = useReadContract({
    address: giftDetails?.token && giftDetails.token !== zeroAddress && giftDetails.token !== '0x0000000000000000000000000000000000000000' 
      ? (giftDetails.token as Address) 
      : undefined,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address && giftDetails?.token && giftDetails.token !== zeroAddress && giftDetails.token !== '0x0000000000000000000000000000000000000000'
      ? [address, CONTRACT_ADDRESS as Address]
      : undefined,
    query: {
      enabled: !!address && !!giftDetails && giftDetails.token !== zeroAddress && giftDetails.token !== '0x0000000000000000000000000000000000000000',
    },
  });

  useEffect(() => {
    if (giftData) {
      console.log('Gift data received (raw):', giftData);
      
      // viem returns struct as object with named properties
      const gift = giftData as any;
      
      // Extract fields - struct returns as object with named properties
      const gifter = gift.gifter;
      const recipient = gift.recipient;
      const tokenAddr = gift.token;
      const amount = gift.amount;
      const code = gift.code;
      const ipfsLink = gift.ipfsLink;
      const claimer = gift.claimer;
      const claimDeadline = gift.claimDeadline;
      const attempts = gift.attempts;
      const deposited = gift.deposited;
      const claimed = gift.claimed;
      
      console.log('Parsed gift:', { gifter, recipient, tokenAddr, amount, code });
      
      // Check if gift exists (amount > 0 means gift was created)
      // Note: gifter is address(0) when gift is created, only set when deposited
      const giftAmount = BigInt(amount?.toString() || '0');
      if (!giftAmount || giftAmount === BigInt(0)) {
        setError('Gift not found with this code');
        setGiftDetails(null);
        return;
      }

      setGiftDetails({
        gifter: gifter as Address,
        recipient: recipient as Address,
        token: tokenAddr as Address,
        amount: BigInt(amount?.toString() || '0'),
        code: code || '',
        ipfsLink: ipfsLink || '',
        claimer: claimer as Address,
        claimDeadline: BigInt(claimDeadline?.toString() || '0'),
        attempts: Number(attempts || 0),
        deposited: Boolean(deposited),
        claimed: Boolean(claimed),
      });

      // Check if ERC-20 token
      if (tokenAddr !== zeroAddress && tokenAddr !== '0x0000000000000000000000000000000000000000') {
        setTokenSymbol('TOKEN');
        setTokenDecimals(18);
      } else {
        setTokenSymbol(CHAIN_CONFIG.NATIVE_TOKEN);
      }
    }
  }, [giftData]);

  const handleFetchGift = async () => {
    if (!giftCode.trim()) {
      setError('Please enter a gift code');
      return;
    }

    if (!isConnected) {
      setError('Please connect your wallet first');
      return;
    }

    setError('');
    setLoading(true);
    setGiftDetails(null);
    
    try {
      const id = keccak256(stringToBytes(giftCode.trim())) as `0x${string}`;
      console.log('Fetching gift with ID:', id);
      console.log('Contract address:', CONTRACT_ADDRESS);
      setGiftId(id);
      
      // Wait a bit for state to update, then refetch
      await new Promise(resolve => setTimeout(resolve, 100));
      const result = await refetchGift();
      console.log('Refetch result:', result);
      
      if (result.error) {
        setError(`Failed to fetch gift: ${result.error.message}`);
      }
    } catch (err: any) {
      console.error('Error fetching gift:', err);
      setError(err.message || 'Failed to fetch gift');
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async () => {
    if (!giftDetails || !giftId) {
      setError('No gift selected');
      return;
    }

    if (!isConnected) {
      setError('Please connect your wallet first');
      return;
    }

    // Check if already deposited (prevent double deposit)
    if (giftDetails.deposited) {
      setError('This gift has already been deposited');
      return;
    }

    try {
      setError('');
      setLoading(true);
      
      console.log('Depositing gift:', {
        giftId,
        token: giftDetails.token,
        amount: giftDetails.amount.toString(),
        contractAddress: CONTRACT_ADDRESS,
      });

      // Check if native token (STT/SOMI)
      if (giftDetails.token === zeroAddress || giftDetails.token === '0x0000000000000000000000000000000000000000') {
        console.log('Depositing native token with value:', giftDetails.amount.toString());
        // For native tokens, just call depositGift with value
        writeContract({
          address: CONTRACT_ADDRESS as Address,
          abi: CONTRACT_ABI,
          functionName: 'depositGift',
          args: [giftId],
          value: giftDetails.amount,
        });
      } else {
        // For ERC-20 tokens, need to approve first
        console.log('Depositing ERC-20 token:', giftDetails.token);
        
        // Check if already approved
        if (!allowance || allowance < giftDetails.amount) {
          // Need to approve first
          console.log('Approving token...');
          writeApproveContract({
            address: giftDetails.token as Address,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [CONTRACT_ADDRESS as Address, giftDetails.amount],
          });
          // Wait for approval confirmation before depositing
          // The useEffect below will handle the deposit after approval
        } else {
          // Already approved, proceed with deposit
          console.log('Token already approved, depositing...');
          writeContract({
            address: CONTRACT_ADDRESS as Address,
            abi: CONTRACT_ABI,
            functionName: 'depositGift',
            args: [giftId],
          });
        }
      }
    } catch (err: any) {
      console.error('Deposit error:', err);
      setError(formatError(err));
      setLoading(false);
    }
  };

  useEffect(() => {
    if (writeError) {
      console.error('Write contract error:', writeError);
      setError(formatError(writeError));
      setLoading(false);
    }
  }, [writeError]);

  useEffect(() => {
    if (approveError) {
      console.error('Approve error:', approveError);
      setError(formatError(approveError));
      setLoading(false);
    }
  }, [approveError]);

  // Handle approval confirmation and then deposit
  useEffect(() => {
    if (isApproved && approvalHash && giftDetails && giftId) {
      console.log('Approval confirmed, now depositing...');
      // Approval confirmed, now deposit
      writeContract({
        address: CONTRACT_ADDRESS as Address,
        abi: CONTRACT_ABI,
        functionName: 'depositGift',
        args: [giftId],
      });
    }
  }, [isApproved, approvalHash, giftDetails, giftId, writeContract]);

  useEffect(() => {
    if (isConfirmed) {
      console.log('Transaction confirmed!');
      setLoading(false);
      // Don't clear gift details immediately, let user see success message
      setTimeout(() => {
        setGiftDetails(null);
        setGiftCode('');
        setGiftId(null);
      }, 3000);
    }
  }, [isConfirmed]);

  const formatAmount = (amount: bigint, decimals: number = 18): string => {
    return formatUnits(amount, decimals);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen bg-blue-500 pb-8">
      <Header />
      
      {/* Navigation Links - Under Header */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 flex justify-end items-center gap-6">
        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
          <Link href="/" className="text-white font-bold text-sm md:text-base [text-shadow:_2px_2px_0_rgb(0,0,0)] hover:text-yellow-400 transition-colors">
            Home
          </Link>
        </motion.div>
        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
          <Link href="/deposit" className="text-white font-bold text-sm md:text-base [text-shadow:_2px_2px_0_rgb(0,0,0)] hover:text-yellow-400 transition-colors">
            Deposit
          </Link>
        </motion.div>
        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
          <a 
            href="https://t.me/heydeeza_bot" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-white font-bold text-sm md:text-base [text-shadow:_2px_2px_0_rgb(0,0,0)] hover:text-yellow-400 transition-colors"
          >
            Telegram
          </a>
        </motion.div>
      </div>

      {/* Big Title Section */}
      <div className="max-w-4xl mx-auto px-4 py-6 md:py-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center justify-center gap-2 md:gap-3 mb-3 flex-wrap"
        >
          <motion.span 
            whileHover={{ scale: 1.05 }}
            className="text-white font-bold text-2xl md:text-4xl lg:text-5xl [text-shadow:_3px_3px_0_rgb(0,0,0)]"
          >
            Send Gifts with
          </motion.span>
          <motion.div
            animate={{ 
              rotate: [0, 10, -10, 10, -10, 0],
              scale: [1, 1.1, 1, 1.1, 1, 1],
              y: [0, -3, 0, -3, 0, 0]
            }}
            transition={{ 
              duration: 2.5,
              repeat: Infinity,
              repeatDelay: 1,
              ease: "easeInOut"
            }}
            whileHover={{ scale: 1.15, rotate: 360 }}
            className="relative w-10 h-10 md:w-14 md:h-14 lg:w-16 lg:h-16 cursor-pointer"
          >
            <Image 
              src="/Deeza DJ Logo Design.png" 
              alt="Deeza" 
              fill
              className="object-contain drop-shadow-[4px_4px_0_rgb(0,0,0)]"
              priority
            />
          </motion.div>
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-white font-bold text-sm md:text-base lg:text-lg [text-shadow:_2px_2px_0_rgb(0,0,0)]"
        >
          Your AI powered crypto bro
        </motion.p>
      </div>
      
      <div className="max-w-xl mx-auto px-3 py-4 md:py-6">
        {/* Compact Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-yellow-400 border-4 border-black rounded-xl p-3 md:p-4 shadow-[4px_4px_0_rgb(0,0,0)]"
        >
          {/* Title */}
          <div className="flex items-center justify-center mb-3">
            <Gift className="w-4 h-4 md:w-5 md:h-5 mr-2 text-black" />
            <h1 className="text-black text-xl md:text-2xl font-bold [text-shadow:_2px_2px_0_rgb(255,255,255)]">
              DEPOSIT GIFT
            </h1>
          </div>

          {/* Connection Status */}
          <AnimatePresence>
            {!isConnected && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-red-400 border-4 border-black rounded-lg p-2 mb-3 text-center"
              >
                <div className="flex items-center justify-center gap-1.5">
                  <AlertCircle className="w-3 h-3 md:w-4 md:h-4 text-white" />
                  <p className="text-white font-bold text-xs md:text-sm">Connect your wallet to continue</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Gift Code Input */}
          <div className="bg-white border-4 border-black rounded-lg p-2 md:p-3 mb-3">
            <label className="block text-black font-bold text-xs md:text-sm mb-1.5">Gift Code</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={giftCode}
                onChange={(e) => setGiftCode(e.target.value)}
                placeholder="Enter gift code (e.g., john42)"
                className="flex-1 bg-white text-black font-bold py-1.5 md:py-2 px-2 md:px-3 rounded-lg border-4 border-black focus:outline-none focus:ring-2 focus:ring-yellow-400 text-xs md:text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleFetchGift();
                  }
                }}
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleFetchGift}
                disabled={loading || isFetchingGift || !isConnected}
                className="bg-yellow-400 text-black font-bold py-1.5 md:py-2 px-3 md:px-4 rounded-lg border-4 border-black hover:bg-yellow-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {(loading || isFetchingGift) ? (
                  <Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin" />
                ) : (
                  <Search className="w-3 h-3 md:w-4 md:h-4" />
                )}
                <span className="hidden sm:inline text-xs md:text-sm">
                  {loading || isFetchingGift ? 'Loading...' : 'Fetch'}
                </span>
              </motion.button>
            </div>
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-red-400 border-4 border-black rounded-lg p-2 mb-3"
              >
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="w-3 h-3 md:w-4 md:h-4 text-white flex-shrink-0" />
                  <p className="text-white font-bold text-xs md:text-sm">{error}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Gift Details Display */}
          <AnimatePresence>
            {giftDetails && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-white border-4 border-black rounded-lg p-2 md:p-3 mb-3 space-y-2"
              >
                <div className="flex items-center justify-center gap-1.5 mb-2">
                  <Gift className="w-3 h-3 md:w-4 md:h-4 text-black" />
                  <h2 className="text-black font-bold text-sm md:text-base">Gift Details</h2>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="bg-yellow-400 border-4 border-black rounded-lg p-1.5 md:p-2">
                    <p className="text-black font-bold text-xs mb-0.5">Token Symbol</p>
                    <p className="text-black font-mono text-xs md:text-sm">{tokenSymbol || 'N/A'}</p>
                  </div>
                  <div className="bg-yellow-400 border-4 border-black rounded-lg p-1.5 md:p-2">
                    <p className="text-black font-bold text-xs mb-0.5">Amount</p>
                    <p className="text-black font-mono text-xs md:text-sm">
                      {formatAmount(giftDetails.amount, tokenDecimals)} {tokenSymbol}
                    </p>
                  </div>
                </div>

                <div className="bg-blue-400 border-4 border-black rounded-lg p-1.5 md:p-2">
                  <p className="text-black font-bold text-xs mb-0.5 flex items-center gap-1">
                    <Wallet className="w-2.5 h-2.5 md:w-3 md:h-3" />
                    Token Address
                  </p>
                  <div className="flex items-center gap-1.5">
                    <p className="text-black font-mono text-xs break-all flex-1">
                      {giftDetails.token === zeroAddress || giftDetails.token === '0x0000000000000000000000000000000000000000'
                        ? `${CHAIN_CONFIG.NATIVE_TOKEN} (Native)`
                        : giftDetails.token}
                    </p>
                    {giftDetails.token !== zeroAddress && giftDetails.token !== '0x0000000000000000000000000000000000000000' && (
                      <button
                        onClick={() => copyToClipboard(giftDetails.token)}
                        className="flex-shrink-0"
                      >
                        <Copy className="w-2.5 h-2.5 md:w-3 md:h-3 text-black" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Recipient (set when gift is created) */}
                {giftDetails.recipient && giftDetails.recipient !== zeroAddress && giftDetails.recipient !== '0x0000000000000000000000000000000000000000' && (
                  <div className="bg-green-400 border-4 border-black rounded-lg p-1.5 md:p-2">
                    <p className="text-black font-bold text-xs mb-0.5">Recipient</p>
                    <div className="flex items-center gap-1.5">
                      <p className="text-black font-mono text-xs break-all flex-1">{giftDetails.recipient}</p>
                      <button
                        onClick={() => copyToClipboard(giftDetails.recipient)}
                        className="flex-shrink-0"
                      >
                        <Copy className="w-2.5 h-2.5 md:w-3 md:h-3 text-black" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Gifter (set when gift is deposited) */}
                {giftDetails.gifter && giftDetails.gifter !== zeroAddress && giftDetails.gifter !== '0x0000000000000000000000000000000000000000' && (
                  <div className="bg-purple-400 border-4 border-black rounded-lg p-1.5 md:p-2">
                    <p className="text-black font-bold text-xs mb-0.5">Gifter (Depositor)</p>
                    <div className="flex items-center gap-1.5">
                      <p className="text-black font-mono text-xs break-all flex-1">{giftDetails.gifter}</p>
                      <button
                        onClick={() => copyToClipboard(giftDetails.gifter)}
                        className="flex-shrink-0"
                      >
                        <Copy className="w-2.5 h-2.5 md:w-3 md:h-3 text-black" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Already Deposited Warning */}
                {giftDetails.deposited && (
                  <div className="bg-orange-400 border-4 border-black rounded-lg p-1.5 md:p-2 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <AlertCircle className="w-3 h-3 md:w-4 md:h-4 text-black" />
                      <p className="text-black font-bold text-xs md:text-sm">Already Deposited - Cannot deposit again</p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Deposit Button */}
          <AnimatePresence>
            {giftDetails && !giftDetails.deposited && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleDeposit}
                disabled={isConfirming || loading || !isConnected || giftDetails.deposited}
                className="w-full bg-yellow-400 text-black font-bold py-2 md:py-2.5 px-3 rounded-lg border-4 border-black hover:bg-yellow-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base shadow-[4px_4px_0_rgb(0,0,0)] hover:shadow-[2px_2px_0_rgb(0,0,0)] active:shadow-none flex items-center justify-center gap-1.5"
              >
                {(isConfirming || isApproving) ? (
                  <>
                    <Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin" />
                    <span className="text-xs md:text-sm">{isApproving ? 'Approving...' : 'Processing...'}</span>
                  </>
                ) : (
                  <>
                    <Coins className="w-3 h-3 md:w-4 md:h-4" />
                    <span>Deposit Gift</span>
                  </>
                )}
              </motion.button>
            )}
          </AnimatePresence>

          {/* Transaction Status */}
          <AnimatePresence>
            {hash && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="mt-3 bg-green-400 border-4 border-black rounded-lg p-2 text-center"
              >
                <p className="text-black font-bold text-xs mb-1">Transaction Hash:</p>
                <a
                  href={`${CHAIN_CONFIG.EXPLORER}/tx/${hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-black font-mono text-xs break-all underline hover:text-blue-600 flex items-center justify-center gap-1"
                >
                  <span className="break-all">{hash}</span>
                  <ExternalLink className="w-2.5 h-2.5 md:w-3 md:h-3 flex-shrink-0" />
                </a>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {isConfirmed && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="mt-3 bg-green-400 border-4 border-black rounded-lg p-2 text-center"
              >
                <div className="flex items-center justify-center gap-1.5">
                  <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-black" />
                  <p className="text-black font-bold text-sm md:text-base">Deposit Successful!</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}

// Disable static generation - force dynamic rendering
export const dynamic = 'force-dynamic';

export default function Deposit() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-blue-500 border-4 border-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    }>
      <DepositContent />
    </Suspense>
  );
}
