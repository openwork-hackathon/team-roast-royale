'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import type { TokenBalance } from '@/types/game';

interface TokenBalanceProps {
  balance: TokenBalance;
  onClick?: () => void;
  showLabel?: boolean;
}

export default function TokenBalance({ balance, onClick, showLabel = true }: TokenBalanceProps) {
  const [displayBalance, setDisplayBalance] = useState(balance.balance);
  const prevBalanceRef = useRef(balance.balance);
  
  // Spring animation for smooth number transitions
  const springValue = useSpring(balance.balance, {
    stiffness: 100,
    damping: 20,
    duration: 0.5,
  });

  // Update spring target when balance changes
  useEffect(() => {
    if (balance.balance !== prevBalanceRef.current) {
      springValue.set(balance.balance);
      prevBalanceRef.current = balance.balance;
    }
  }, [balance.balance, springValue]);

  // Subscribe to spring value changes
  useEffect(() => {
    const unsubscribe = springValue.on('change', (latest) => {
      setDisplayBalance(Math.round(latest));
    });
    return unsubscribe;
  }, [springValue]);

  // Flash effect when balance changes
  const [isFlashing, setIsFlashing] = useState(false);
  useEffect(() => {
    if (balance.balance !== prevBalanceRef.current) {
      setIsFlashing(true);
      const timer = setTimeout(() => setIsFlashing(false), 500);
      return () => clearTimeout(timer);
    }
  }, [balance.balance]);

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-xl border backdrop-blur-sm
        transition-all duration-200 cursor-pointer
        ${onClick ? 'hover:shadow-lg hover:shadow-orange-500/10' : ''}
        ${isFlashing 
          ? 'bg-orange-500/20 border-orange-400/50 shadow-orange-500/20 shadow-lg' 
          : 'bg-white/5 border-white/10 hover:border-orange-500/30'
        }
      `}
    >
      {/* Token Icon */}
      <motion.div
        animate={isFlashing ? { rotate: [0, -10, 10, -10, 10, 0], scale: [1, 1.2, 1] } : {}}
        transition={{ duration: 0.5 }}
        className="text-xl"
      >
        {balance.balance > 500 ? '🔥' : '🪙'}
      </motion.div>

      {/* Balance Display */}
      <div className="flex flex-col items-start">
        {showLabel && (
          <span className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">
            Balance
          </span>
        )}
        <div className="flex items-baseline gap-1">
          <motion.span
            key={displayBalance}
            initial={isFlashing ? { y: -5, opacity: 0 } : false}
            animate={{ y: 0, opacity: 1 }}
            className={`
              text-sm font-bold tabular-nums
              ${isFlashing ? 'text-orange-400' : 'text-white'}
            `}
          >
            {displayBalance.toLocaleString()}
          </motion.span>
          <span className={`
            text-xs font-medium
            ${isFlashing ? 'text-orange-300' : 'text-orange-400'}
          `}>
            ${balance.symbol}
          </span>
        </div>
      </div>

      {/* Change indicator */}
      {isFlashing && balance.balance > prevBalanceRef.current && (
        <motion.span
          initial={{ opacity: 0, x: -5 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0 }}
          className="text-[10px] text-green-400 font-medium"
        >
          +{balance.balance - prevBalanceRef.current}
        </motion.span>
      )}
      
      {/* Click hint */}
      {onClick && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="ml-1 text-gray-500"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M4.5 2.5L7.5 6L4.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.div>
      )}
    </motion.button>
  );
}
