// Blockchain Configuration
export const SOMNIA_TESTNET = {
  CHAIN_ID: 50312,
  RPC_URL: 'https://rpc.ankr.com/somnia_testnet',
  NATIVE_TOKEN: 'STT',
  EXPLORER: 'https://shannon-explorer.somnia.network',
};

export const SOMNIA_MAINNET = {
  CHAIN_ID: 50311,
  RPC_URL: 'https://somnia.publicnode.com',
  NATIVE_TOKEN: 'SOMI',
  EXPLORER: 'https://explorer.somnia.network',
};

// Use testnet by default
export const CHAIN_CONFIG = SOMNIA_TESTNET;

// Contract Address
export const CONTRACT_ADDRESS = '0x2e56899276A3020AC5522D2f21DB880ae7c49632' as const;

// Contract ABI
export const CONTRACT_ABI = [
  {
    inputs: [
      { internalType: 'bytes32', name: 'id', type: 'bytes32' },
    ],
    name: 'depositGift',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'id', type: 'bytes32' }],
    name: 'getGift',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'gifter', type: 'address' },
          { internalType: 'address', name: 'recipient', type: 'address' },
          { internalType: 'address', name: 'token', type: 'address' },
          { internalType: 'uint256', name: 'amount', type: 'uint256' },
          { internalType: 'string', name: 'code', type: 'string' },
          { internalType: 'string', name: 'ipfsLink', type: 'string' },
          { internalType: 'address', name: 'claimer', type: 'address' },
          { internalType: 'uint256', name: 'claimDeadline', type: 'uint256' },
          { internalType: 'uint8', name: 'attempts', type: 'uint8' },
          { internalType: 'bool', name: 'deposited', type: 'bool' },
          { internalType: 'bool', name: 'claimed', type: 'bool' },
        ],
        internalType: 'struct DeezaAgent.Gift',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, internalType: 'bytes32', name: 'id', type: 'bytes32' }],
    name: 'GiftDeposited',
    type: 'event',
  },
] as const;

// ERC-20 ABI
export const ERC20_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'spender', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'owner', type: 'address' },
      { internalType: 'address', name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

