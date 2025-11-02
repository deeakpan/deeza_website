'use client';

import Link from 'next/link';
import { useAccount, useDisconnect } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Home, Gift } from 'lucide-react';
import { motion } from 'framer-motion';

export function Header() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  return (
    <header className="bg-yellow-400 border-b-4 border-black sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 md:h-20 gap-2">
          {/* Logo */}
          <Link href="/" className="flex items-center flex-shrink-0">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="text-black font-bold text-base sm:text-lg md:text-xl lg:text-2xl [text-shadow:_2px_2px_0_rgb(0_0_0)]"
            >
              deeza
            </motion.div>
          </Link>

          {/* Live Status - Scrolling Marquee */}
          <div className="flex-1 overflow-hidden relative h-full flex items-center min-w-0">
            <motion.div
              className="flex whitespace-nowrap"
              style={{
                width: 'max-content',
              }}
              animate={{
                x: [0, -600],
              }}
              transition={{
                duration: 15,
                repeat: Infinity,
                ease: 'linear',
              }}
            >
              <span className="text-black font-bold text-[10px] sm:text-xs md:text-sm px-4 sm:px-6 md:px-8">
                now live! on testnet giving away 100,000 $ZAZZ for test
              </span>
              <span className="text-black font-bold text-[10px] sm:text-xs md:text-sm px-4 sm:px-6 md:px-8">
                now live! on testnet giving away 100,000 $ZAZZ for test
              </span>
              <span className="text-black font-bold text-[10px] sm:text-xs md:text-sm px-4 sm:px-6 md:px-8">
                now live! on testnet giving away 100,000 $ZAZZ for test
              </span>
            </motion.div>
          </div>

          {/* Wallet Connection - RainbowKit */}
          <div className="flex items-center">
            <ConnectButton.Custom>
              {({
                account,
                chain,
                openAccountModal,
                openChainModal,
                openConnectModal,
                authenticationStatus,
                mounted,
              }) => {
                const ready = mounted && authenticationStatus !== 'loading';
                const connected =
                  ready &&
                  account &&
                  chain &&
                  (!authenticationStatus ||
                    authenticationStatus === 'authenticated');

                return (
                  <div
                    {...(!ready && {
                      'aria-hidden': true,
                      style: {
                        opacity: 0,
                        pointerEvents: 'none',
                        userSelect: 'none',
                      },
                    })}
                  >
                    {(() => {
                      if (!connected) {
                        return (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={openConnectModal}
                            type="button"
                            className="bg-blue-500 text-white font-bold px-2 sm:px-3 md:px-4 lg:px-6 py-1.5 sm:py-2 md:py-2.5 lg:py-3 rounded-lg border-2 sm:border-2 md:border-4 border-black hover:bg-blue-400 transition-colors flex items-center gap-1 sm:gap-2 text-xs sm:text-sm md:text-base"
                          >
                            <span className="hidden md:inline">Connect Wallet</span>
                            <span className="md:hidden">Connect</span>
                          </motion.button>
                        );
                      }

                      return (
                        <div className="flex items-center gap-1 sm:gap-2">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={openChainModal}
                            type="button"
                            className="bg-white text-black font-bold px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border-2 border-black hover:bg-gray-100 transition-colors text-xs sm:text-sm flex items-center gap-1"
                          >
                            {chain.hasIcon && (
                              <div
                                style={{
                                  background: chain.iconBackground,
                                  width: 12,
                                  height: 12,
                                  borderRadius: 999,
                                  overflow: 'hidden',
                                  marginRight: 2,
                                }}
                              >
                                {chain.iconUrl && (
                                  <img
                                    alt={chain.name ?? 'Chain icon'}
                                    src={chain.iconUrl}
                                    style={{ width: 12, height: 12 }}
                                  />
                                )}
                              </div>
                            )}
                            <span className="hidden sm:inline">{chain.name}</span>
                            <span className="sm:hidden text-xs">Net</span>
                          </motion.button>

                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={openAccountModal}
                            type="button"
                            className="bg-white text-black font-bold px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border-2 border-black hover:bg-gray-100 transition-colors text-xs sm:text-sm font-mono"
                          >
                            <span className="hidden sm:inline">{account.displayName}</span>
                            <span className="sm:hidden">{account.displayName.substring(0, 4)}...{account.displayName.substring(account.displayName.length - 4)}</span>
                            {account.displayBalance
                              ? <span className="hidden md:inline">{` (${account.displayBalance})`}</span>
                              : ''}
                          </motion.button>
                        </div>
                      );
                    })()}
                  </div>
                );
              }}
            </ConnectButton.Custom>
          </div>
        </div>
      </div>
    </header>
  );
}
