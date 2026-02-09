'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { BettingResult, PayoutInfo } from '@/types/game';

interface PayoutOverlayProps {
  result: BettingResult;
  myWalletAddress?: string;
  onClose: () => void;
}

export default function PayoutOverlay({ result, myWalletAddress, onClose }: PayoutOverlayProps) {
  const [phase, setPhase] = useState<'counting' | 'split' | 'payouts'>('counting');
  const [displayedTotal, setDisplayedTotal] = useState(0);

  const {
    totalPool,
    houseAmount,
    mostHumanAmount,
    correctGuessersAmount,
    payouts,
    myPayout,
  } = result;

  const iWon = myPayout && myPayout.amount > 0;
  const myWinAmount = myPayout?.amount ?? 0;

  // Animate total pool
  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const increment = totalPool / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= totalPool) {
        setDisplayedTotal(totalPool);
        clearInterval(timer);
        setTimeout(() => setPhase('split'), 500);
      } else {
        setDisplayedTotal(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [totalPool]);

  // Auto-advance phases
  useEffect(() => {
    if (phase === 'split') {
      const timer = setTimeout(() => setPhase('payouts'), 3000);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  const splitData = [
    { label: 'House', amount: houseAmount, percent: 5, color: 'from-gray-500 to-gray-600', icon: '🏦' },
    { label: 'Most Human', amount: mostHumanAmount, percent: 30, color: 'from-purple-500 to-pink-500', icon: '🎭' },
    { label: 'Correct Guessers', amount: correctGuessersAmount, percent: 65, color: 'from-orange-500 to-red-500', icon: '🔥' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center px-4 overflow-y-auto"
    >
      <AnimatePresence mode="wait">
        {/* Phase 1: Total Pool Counting */}
        {phase === 'counting' && (
          <motion.div
            key="counting"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="text-center"
          >
            <motion.div
              animate={{ 
                textShadow: [
                  '0 0 20px rgba(249,115,22,0.3)',
                  '0 0 60px rgba(249,115,22,0.6)',
                  '0 0 20px rgba(249,115,22,0.3)',
                ]
              }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="text-6xl sm:text-8xl font-black text-white tabular-nums mb-4"
            >
              {displayedTotal.toLocaleString()}
            </motion.div>
            <p className="text-xl text-orange-400 font-bold">$OPENWORK Total Pool</p>
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 1 }}
              className="mt-8 text-gray-500 text-sm"
            >
              Calculating payouts...
            </motion.div>
          </motion.div>
        )}

        {/* Phase 2: Split Visualization */}
        {phase === 'split' && (
          <motion.div
            key="split"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-lg"
          >
            <h2 className="text-2xl font-black text-white text-center mb-8">Pool Distribution</h2>
            
            <div className="space-y-4">
              {splitData.map((item, index) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.2 }}
                  className="relative"
                >
                  <div className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-xl">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center text-xl`}>
                      {item.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-white">{item.label}</span>
                        <span className="text-sm text-gray-400">{item.percent}%</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${item.percent}%` }}
                          transition={{ delay: index * 0.2 + 0.3, duration: 0.8, ease: 'easeOut' }}
                          className={`h-full bg-gradient-to-r ${item.color} rounded-full`}
                        />
                      </div>
                    </div>
                    <div className="text-right">
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.2 + 0.5 }}
                        className="text-lg font-bold text-white tabular-nums"
                      >
                        {item.amount.toLocaleString()}
                      </motion.div>
                      <div className="text-xs text-orange-400">$OPENWORK</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Phase 3: Payouts List */}
        {phase === 'payouts' && (
          <motion.div
            key="payouts"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-lg"
          >
            {/* Winner Banner */}
            {iWon && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', damping: 12 }}
                className="mb-6 p-6 bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-2xl text-center"
              >
                <motion.div
                  animate={{ rotate: [0, -10, 10, 0] }}
                  transition={{ repeat: Infinity, duration: 0.5, repeatDelay: 1 }}
                  className="text-4xl mb-2"
                >
                  🎉
                </motion.div>
                <h3 className="text-2xl font-black text-white mb-1">You Won!</h3>
                <p className="text-3xl font-black text-orange-400 tabular-nums">
                  +{myWinAmount.toLocaleString()} $OPENWORK
                </p>
              </motion.div>
            )}

            {/* Payouts List */}
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 bg-white/5 border-b border-white/10">
                <h3 className="font-bold text-white">Payouts</h3>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {payouts.map((payout, index) => (
                  <motion.div
                    key={`${payout.address}-${index}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex items-center justify-between px-4 py-3 border-b border-white/5 last:border-0 ${
                      payout.address === myWalletAddress ? 'bg-orange-500/10' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">
                        {payout.type === 'house' && '🏦'}
                        {payout.type === 'most_human' && '🎭'}
                        {payout.type === 'correct_guess' && '✅'}
                      </span>
                      <div>
                        <p className="text-sm font-mono text-gray-300">
                          {payout.address.slice(0, 8)}...{payout.address.slice(-4)}
                        </p>
                        <p className="text-xs text-gray-500 capitalize">
                          {payout.type.replace('_', ' ')}
                          {payout.address === myWalletAddress && (
                            <span className="text-orange-400 ml-1">(You)</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold tabular-nums ${payout.amount > 0 ? 'text-green-400' : 'text-gray-500'}`}>
                        +{payout.amount.toLocaleString()}
                      </p>
                      <p className="text-xs text-orange-400">$OPENWORK</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Close Button */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              onClick={onClose}
              className="w-full mt-6 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-orange-500/20 transition-all"
            >
              Continue 🔥
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
