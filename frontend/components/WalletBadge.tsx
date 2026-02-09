'use client';

import { motion } from 'framer-motion';
import type { WalletInfo } from '@/types/game';

interface WalletBadgeProps {
  wallet: WalletInfo | null;
}

export default function WalletBadge({ wallet }: WalletBadgeProps) {
  // Generate a demo wallet if none exists
  const displayWallet = wallet ?? {
    address: `0xDEMO${Math.random().toString(36).substring(2, 6).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
    balance: 1000,
    isDemo: true,
  };

  // Format address for display (0xDEMO...XXXX)
  const formatAddress = (addr: string) => {
    if (addr.length <= 12) return addr;
    return `${addr.slice(0, 10)}...${addr.slice(-4)}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 px-3 py-2 bg-white/5 border border-white/10 rounded-xl backdrop-blur-sm"
    >
      {/* Wallet Icon */}
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500/20 to-amber-500/20 border border-orange-500/20 flex items-center justify-center">
        <span className="text-sm">👛</span>
      </div>

      {/* Wallet Info */}
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-mono text-gray-300">
            {formatAddress(displayWallet.address)}
          </span>
          {displayWallet.isDemo && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-[10px]"
              title="Demo Mode"
            >
              🎰
            </motion.span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-sm font-bold text-white">
            {displayWallet.balance.toLocaleString()}
          </span>
          <span className="text-xs text-orange-400 font-medium">$OPENWORK</span>
        </div>
      </div>

      {/* Demo Mode Badge */}
      {displayWallet.isDemo && (
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className="hidden sm:flex items-center gap-1 px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-[10px] font-medium text-amber-400 uppercase tracking-wider">
            Demo
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}
