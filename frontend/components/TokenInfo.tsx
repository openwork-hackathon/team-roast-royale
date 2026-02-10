'use client';

import { motion } from 'framer-motion';
import type { TokenPrice } from '@/types/game';

interface TokenInfoProps {
  tokenPrice: TokenPrice;
  className?: string;
}

export default function TokenInfo({ tokenPrice, className = '' }: TokenInfoProps) {
  const tokenDetails = {
    name: 'Roast Royale',
    symbol: '$RSTR',
    chain: 'Base',
    curveType: 'LINEAR',
    maxSupply: '1,000,000',
    contractAddress: '0x...RSTR',
    bondContract: '0xc5a076cad94176c2996B32d8466Be1cE757FAa27',
    mintClubUrl: 'https://mint.club/token/base/RSTR',
  };

  const baseScanUrl = `https://basescan.org/address/${tokenDetails.bondContract}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        p-4 bg-white/5 border border-white/10 rounded-xl backdrop-blur-sm
        ${className}
      `}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/20 flex items-center justify-center text-xl">
          🔥
        </div>
        <div>
          <h3 className="font-bold text-white">{tokenDetails.name}</h3>
          <p className="text-xs text-orange-400 font-medium">{tokenDetails.symbol}</p>
        </div>
      </div>

      {/* Token Stats */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Chain</span>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-blue-400" />
            <span className="text-white font-medium">{tokenDetails.chain}</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Bonding Curve</span>
          <span className="text-cyan-400 font-medium">{tokenDetails.curveType}</span>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Max Supply</span>
          <span className="text-white font-medium">{tokenDetails.maxSupply} RSTR</span>
        </div>

        <div className="pt-2 border-t border-white/5 mt-2">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-400">Buy Price</span>
            <span className="text-green-400 font-medium">
              {tokenPrice.buyPrice.toFixed(5)} OPENWORK
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Sell Price</span>
            <span className="text-orange-400 font-medium">
              {tokenPrice.sellPrice.toFixed(5)} OPENWORK
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Total Minted</span>
          <span className="text-white font-medium">
            {tokenPrice.totalSupply.toLocaleString()} RSTR
          </span>
        </div>
      </div>

      {/* Links */}
      <div className="space-y-2">
        <a
          href={tokenDetails.mintClubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-2 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg text-sm text-purple-400 hover:text-purple-300 hover:border-purple-500/40 transition-all"
        >
          <span>Powered by Mint Club</span>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1H11M11 1V6M11 1L4 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </a>
        
        <a
          href={baseScanUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-400 hover:text-white hover:border-white/20 transition-all"
        >
          <span>View on BaseScan</span>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1H11M11 1V6M11 1L4 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </a>
      </div>

      {/* Contract Address (truncated) */}
      <div className="mt-3 pt-3 border-t border-white/5">
        <p className="text-[10px] text-gray-500 mb-1">Bond Contract</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-[10px] text-gray-400 font-mono bg-black/20 px-2 py-1 rounded">
            {tokenDetails.bondContract.slice(0, 10)}...{tokenDetails.bondContract.slice(-8)}
          </code>
          <button
            onClick={() => navigator.clipboard.writeText(tokenDetails.bondContract)}
            className="p-1.5 hover:bg-white/5 rounded transition-colors text-gray-400 hover:text-white"
            title="Copy address"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="3" y="3" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="6" y="6" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
