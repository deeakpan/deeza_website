import { createConfig, http } from 'wagmi';
import { walletConnect, injected, coinbaseWallet } from 'wagmi/connectors';
import { defineChain } from 'viem';
import { CHAIN_CONFIG } from './config';

// Define Somnia chain
export const somnia = defineChain({
  id: CHAIN_CONFIG.CHAIN_ID,
  name: CHAIN_CONFIG.CHAIN_ID === 50312 ? 'Somnia Testnet' : 'Somnia Mainnet',
  nativeCurrency: {
    decimals: 18,
    name: CHAIN_CONFIG.NATIVE_TOKEN,
    symbol: CHAIN_CONFIG.NATIVE_TOKEN,
  },
          rpcUrls: {
            default: {
              http: [CHAIN_CONFIG.RPC_URL],
            },
            public: {
              http: [CHAIN_CONFIG.RPC_URL],
            },
          },
  blockExplorers: {
    default: {
      name: 'Somnia Explorer',
      url: CHAIN_CONFIG.EXPLORER,
    },
  },
});

// Get project ID from environment or use a default
// For production, get this from https://cloud.walletconnect.com
const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || 'demo-project-id';

// Configure connectors
const metadata = {
  name: 'Deeza Agent',
  description: 'Deposit gifts on Somnia blockchain',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://deeza.agent',
  icons: ['https://deeza.agent/icon.png'],
};

export const config = createConfig({
  chains: [somnia],
  connectors: [
    walletConnect({ projectId, metadata, showQrModal: false }),
    injected({ shimDisconnect: true }),
    coinbaseWallet({ appName: metadata.name }),
  ],
  transports: {
    [somnia.id]: http(),
  },
});
