'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TokenBalance, TokenPrice } from '@/types/game';

interface TokenShopProps {
  isOpen: boolean;
  onClose: () => void;
  tokenBalance: TokenBalance;
  tokenPrice: TokenPrice;
  onBuy: (amount: number) => void;
  onSell: (amount: number) => void;
  demoMode?: boolean;
}

// Bonding curve visualization - simple SVG line chart
function BondingCurveChart({ currentSupply, maxSupply = 1000000 }: { currentSupply: number; maxSupply?: number }) {
  const width = 280;
  const height = 100;
  const padding = 10;
  
  // Generate points for linear bonding curve (10 steps)
  const points: string[] = [];
  const steps = 10;
  const stepSize = maxSupply / steps;
  
  for (let i = 0; i <= steps; i++) {
    const supply = i * stepSize;
    const price = 0.0001 + (i * 0.00009); // 0.0001 to 0.001
    const x = padding + (supply / maxSupply) * (width - 2 * padding);
    const y = height - padding - ((price - 0.0001) / 0.0009) * (height - 2 * padding);
    points.push(`${x},${y}`);
  }
  
  // Current position indicator
  const currentX = padding + (currentSupply / maxSupply) * (width - 2 * padding);
  const currentStep = Math.min(Math.floor(currentSupply / stepSize), steps - 1);
  const currentPrice = 0.0001 + (currentStep * 0.00009);
  const currentY = height - padding - ((currentPrice - 0.0001) / 0.0009) * (height - 2 * padding);
  
  return (
    <div className="relative">
      <svg width={width} height={height} className="overflow-visible">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
          <line
            key={pct}
            x1={padding}
            y1={height - padding - pct * (height - 2 * padding)}
            x2={width - padding}
            y2={height - padding - pct * (height - 2 * padding)}
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={1}
          />
        ))}
        
        {/* Bonding curve line */}
        <motion.polyline
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
          points={points.join(' ')}
          fill="none"
          stroke="url(#curveGradient)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Current position dot */}
        <motion.circle
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: "spring" }}
          cx={currentX}
          cy={currentY}
          r={5}
          fill="#f97316"
          stroke="#fff"
          strokeWidth={2}
        />
        
        {/* Glow effect */}
        <circle
          cx={currentX}
          cy={currentY}
          r={10}
          fill="rgba(249, 115, 22, 0.3)"
          className="animate-pulse"
        />
        
        {/* Gradient definition */}
        <defs>
          <linearGradient id="curveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="50%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>
        </defs>
      </svg>
      
      {/* Labels */}
      <div className="flex justify-between text-[10px] text-gray-500 mt-1">
        <span>0 RSTR</span>
        <span className="text-orange-400">{(currentSupply / 1000).toFixed(0)}K minted</span>
        <span>1M RSTR</span>
      </div>
    </div>
  );
}

export default function TokenShop({
  isOpen,
  onClose,
  tokenBalance,
  tokenPrice,
  onBuy,
  onSell,
  demoMode = true,
}: TokenShopProps) {
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState(50);
  const [isProcessing, setIsProcessing] = useState(false);

  // Quick amount buttons
  const quickAmounts = [10, 25, 50, 100];

  // Calculate price impact
  const priceImpact = useMemo(() => {
    if (activeTab === 'buy') {
      const openworkNeeded = amount * tokenPrice.buyPrice;
      return { 
        label: 'Cost', 
        value: `${openworkNeeded.toFixed(4)} OPENWORK`,
        price: tokenPrice.buyPrice,
      };
    } else {
      const openworkReceived = amount * tokenPrice.sellPrice;
      return { 
        label: 'Receive', 
        value: `${openworkReceived.toFixed(4)} OPENWORK`,
        price: tokenPrice.sellPrice,
      };
    }
  }, [activeTab, amount, tokenPrice]);

  const handleTransaction = async () => {
    if (amount <= 0) return;
    setIsProcessing(true);
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    if (activeTab === 'buy') {
      onBuy(amount);
    } else {
      onSell(amount);
    }
    
    setIsProcessing(false);
    setAmount(50);
  };

  // Validate amount
  const maxSellAmount = tokenBalance.balance;
  const isValidAmount = activeTab === 'buy' 
    ? amount > 0 
    : amount > 0 && amount <= maxSellAmount;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md bg-gradient-to-b from-[#13131a] to-[#0a0a0f] border border-white/10 rounded-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/20 flex items-center justify-center text-xl">
                🔥
              </div>
              <div>
                <h2 className="font-bold text-white">Token Shop</h2>
                <p className="text-xs text-gray-400">Buy or sell $RSTR</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors text-gray-400 hover:text-white"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* Balance Card */}
          <div className="p-5 pb-0">
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🪙</span>
                  <div>
                    <p className="text-xs text-gray-400">Your Balance</p>
                    <p className="text-xl font-bold text-white">
                      {tokenBalance.balance.toLocaleString()} <span className="text-orange-400">$RSTR</span>
                    </p>
                  </div>
                </div>
                {demoMode && (
                  <span className="px-2 py-1 bg-amber-500/10 text-amber-400 text-[10px] font-medium rounded-full uppercase">
                    Demo
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="p-5">
            <div className="flex gap-1 p-1 bg-white/5 border border-white/10 rounded-xl">
              <button
                onClick={() => setActiveTab('buy')}
                className={`
                  flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all
                  ${activeTab === 'buy'
                    ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 border border-green-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }
                `}
              >
                Buy RSTR
              </button>
              <button
                onClick={() => setActiveTab('sell')}
                className={`
                  flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all
                  ${activeTab === 'sell'
                    ? 'bg-gradient-to-r from-orange-500/20 to-red-500/20 text-orange-400 border border-orange-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }
                `}
              >
                Sell RSTR
              </button>
            </div>
          </div>

          {/* Bonding Curve Visualization */}
          <div className="px-5 pb-5">
            <p className="text-xs text-gray-400 mb-2">Bonding Curve (Linear)</p>
            <div className="p-3 bg-black/20 rounded-xl border border-white/5">
              <BondingCurveChart currentSupply={tokenPrice.totalSupply} />
            </div>
          </div>

          {/* Amount Selector */}
          <div className="px-5 pb-5">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-300">
                {activeTab === 'buy' ? 'Buy Amount' : 'Sell Amount'}
              </label>
              <span className="text-xs text-gray-500">
                {activeTab === 'sell' && `Max: ${maxSellAmount} RSTR`}
              </span>
            </div>

            {/* Quick Amount Buttons */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              {quickAmounts.map((quickAmount) => (
                <button
                  key={quickAmount}
                  onClick={() => setAmount(quickAmount)}
                  disabled={activeTab === 'sell' && quickAmount > maxSellAmount}
                  className={`
                    py-2 text-sm font-medium rounded-lg border transition-all
                    ${amount === quickAmount
                      ? 'bg-orange-500/20 border-orange-500/50 text-orange-400'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20 hover:text-white'
                    }
                    ${activeTab === 'sell' && quickAmount > maxSellAmount ? 'opacity-30 cursor-not-allowed' : ''}
                  `}
                >
                  {quickAmount}
                </button>
              ))}
            </div>

            {/* Custom Amount Input */}
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Math.max(0, parseInt(e.target.value) || 0))}
                className={`
                  w-full px-4 py-3 bg-black/30 border rounded-xl text-white text-center font-bold text-lg
                  focus:outline-none focus:ring-2 transition-all
                  ${activeTab === 'sell' && amount > maxSellAmount
                    ? 'border-red-500/50 focus:ring-red-500/20'
                    : 'border-white/10 focus:border-orange-500/50 focus:ring-orange-500/20'
                  }
                `}
                placeholder="Enter amount"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-medium">
                RSTR
              </span>
            </div>

            {/* Max button for sell */}
            {activeTab === 'sell' && (
              <button
                onClick={() => setAmount(maxSellAmount)}
                className="mt-2 text-xs text-orange-400 hover:text-orange-300 font-medium"
              >
                Use max balance
              </button>
            )}
          </div>

          {/* Price Impact Preview */}
          <div className="px-5 pb-5">
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Price per RSTR</span>
                <span className="text-sm font-medium text-white">
                  {priceImpact.price.toFixed(5)} OPENWORK
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">{priceImpact.label}</span>
                <span className="text-lg font-bold text-fire">
                  {priceImpact.value}
                </span>
              </div>
              <div className="mt-3 pt-3 border-t border-white/5 text-[10px] text-gray-500">
                3% royalty fee included • Price changes as supply increases
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="p-5 pt-0">
            <motion.button
              onClick={handleTransaction}
              disabled={!isValidAmount || isProcessing}
              whileHover={isValidAmount && !isProcessing ? { scale: 1.02 } : {}}
              whileTap={isValidAmount && !isProcessing ? { scale: 0.98 } : {}}
              className={`
                w-full py-4 rounded-xl font-bold text-white transition-all
                ${activeTab === 'buy'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 shadow-lg shadow-green-500/20'
                  : 'bg-gradient-to-r from-orange-500 to-red-500 shadow-lg shadow-orange-500/20'
                }
                ${(!isValidAmount || isProcessing) ? 'opacity-40 shadow-none' : 'hover:shadow-xl'}
              `}
            >
              {isProcessing ? (
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  className="inline-block"
                >
                  ⚡
                </motion.span>
              ) : activeTab === 'buy' ? (
                `Buy ${amount} RSTR`
              ) : (
                `Sell ${amount} RSTR`
              )}
            </motion.button>

            {/* Mint Club Link */}
            <a
              href="https://mint.club/token/base/RSTR"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 mt-4 text-sm text-gray-400 hover:text-orange-400 transition-colors"
            >
              <span>Trade on Mint Club</span>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1H13M13 1V7M13 1L5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
