import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI, CHAIN_CONFIG, ERC20_ABI } from './config';

// Re-export CHAIN_CONFIG for convenience
export { CHAIN_CONFIG };

export interface Gift {
  gifter: string;
  token: string;
  amount: bigint;
  code: string;
  ipfsLink: string;
  claimer: string;
  claimDeadline: bigint;
  attempts: number;
  deposited: boolean;
  claimed: boolean;
}

// Get gift ID from code string
export function getGiftId(code: string): string {
  return ethers.id(code);
}

// Connect wallet
export async function connectWallet(): Promise<ethers.BrowserProvider> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask or other Web3 wallet not found');
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  
  // Check network
  const network = await provider.getNetwork();
  if (Number(network.chainId) !== CHAIN_CONFIG.CHAIN_ID) {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${CHAIN_CONFIG.CHAIN_ID.toString(16)}` }],
      });
    } catch (switchError: any) {
      // If chain doesn't exist, add it
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: `0x${CHAIN_CONFIG.CHAIN_ID.toString(16)}`,
              chainName: CHAIN_CONFIG.CHAIN_ID === 50312 ? 'Somnia Testnet' : 'Somnia Mainnet',
              nativeCurrency: {
                name: CHAIN_CONFIG.NATIVE_TOKEN,
                symbol: CHAIN_CONFIG.NATIVE_TOKEN,
                decimals: 18,
              },
              rpcUrls: [CHAIN_CONFIG.RPC_URL],
              blockExplorerUrls: [CHAIN_CONFIG.EXPLORER],
            },
          ],
        });
      } else {
        throw switchError;
      }
    }
  }

  return provider;
}

// Get connected address
export async function getConnectedAddress(provider: ethers.BrowserProvider): Promise<string> {
  const signer = await provider.getSigner();
  return await signer.getAddress();
}

// Get gift details
export async function getGift(provider: ethers.BrowserProvider, giftId: string): Promise<Gift> {
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
  const gift = await contract.getGift(giftId);
  
  return {
    gifter: gift.gifter,
    token: gift.token,
    amount: gift.amount,
    code: gift.code,
    ipfsLink: gift.ipfsLink,
    claimer: gift.claimer,
    claimDeadline: gift.claimDeadline,
    attempts: gift.attempts,
    deposited: gift.deposited,
    claimed: gift.claimed,
  };
}

// Check ERC-20 allowance
export async function checkAllowance(
  provider: ethers.BrowserProvider,
  tokenAddress: string,
  owner: string
): Promise<bigint> {
  const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
  return await tokenContract.allowance(owner, CONTRACT_ADDRESS);
}

// Approve ERC-20 token
export async function approveToken(
  provider: ethers.BrowserProvider,
  tokenAddress: string,
  amount: bigint
): Promise<ethers.ContractTransactionResponse> {
  const signer = await provider.getSigner();
  const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
  return await tokenContract.approve(CONTRACT_ADDRESS, amount);
}

// Deposit gift (native token)
export async function depositGiftNative(
  provider: ethers.BrowserProvider,
  giftId: string,
  amount: bigint
): Promise<ethers.ContractTransactionResponse> {
  const signer = await provider.getSigner();
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
  return await contract.depositGift(giftId, ethers.ZeroAddress, amount, { value: amount });
}

// Deposit gift (ERC-20 token)
export async function depositGiftERC20(
  provider: ethers.BrowserProvider,
  giftId: string,
  tokenAddress: string,
  amount: bigint
): Promise<ethers.ContractTransactionResponse> {
  const signer = await provider.getSigner();
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
  return await contract.depositGift(giftId, tokenAddress, amount);
}

