'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Player, BettingPool, TokenBalance } from '@/types/game';

interface BettingPanelProps {
  players: Player[];
  bettingPool: BettingPool | null;
  tokenBalance: TokenBalance;
  myBet: { targetPlayerId: string; targetPlayerName: string; amount: number } | null;
  isBettingOpen: boolean;
  currentRound: number;
  gameId: string;
  onPlaceBet: (targetPlayerId: string, amount: number) => void;
  onBetPlaced: (bet: { targetPlayerId: string; targetPlayerName: string; amount: number }) => void;
}

export default function BettingPanel({
  players,
  bettingPool,
  tokenBalance,
  myBet,
  isBettingOpen,
  currentRound,
  gameId,
  onPlaceBet,
  onBetPlaced,
}: BettingPanelProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [betAmount, setBetAmount] = useState<number>(10);
  const [displayedPool, setDisplayedPool] = useState(0);
  const [isPlacingBet, setIsPlacingBet] = useState(false);

  // Quick bet amounts
  const quickAmounts = [10, 25, 50];

  // Animate pool total
  useEffect(() => {
    if (!bettingPool) {
      setDisplayedPool(0);
      return;
    }

    const target = bettingPool.total;
    const duration = 1000;
    const steps = 30;
    const increment = target / steps;
    let current = displayedPool;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setDisplayedPool(target);
        clearInterval(timer);
      } else {
        setDisplayedPool(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [bettingPool?.total]);

  // Reset selection when round changes
  useEffect(() => {
    setSelectedPlayerId('');
    setBetAmount(10);
  }, [currentRound]);

  // Calculate potential payout (65% split among correct guessers, estimate 3 correct = 2x)
  const potentialPayout = Math.floor(betAmount * 2.5);

  const handlePlaceBet = () => {
    if (!selectedPlayerId || betAmount <= 0 || betAmount > tokenBalance.balance) return;
    
    setIsPlacingBet(true);
    const selectedPlayer = players.find(p => p.id === selectedPlayerId);
    
    onPlaceBet(selectedPlayerId, betAmount);
    
    if (selectedPlayer) {
      onBetPlaced({
        targetPlayerId: selectedPlayerId,
        targetPlayerName: selectedPlayer.name,
        amount: betAmount,
      });
    }
    
    setTimeout(() => setIsPlacingBet(false), 500);
  };

  const hasPlacedBet = myBet !== null;
  const canBet = isBettingOpen && !hasPlacedBet;
  const maxBet = tokenBalance.balance;

  // Debug logging
  useEffect(() => {
    console.log('[BettingPanel] State:', { isBettingOpen, hasPlacedBet, canBet, currentRound, balance: tokenBalance.balance });
  }, [isBettingOpen, hasPlacedBet, canBet, currentRound, tokenBalance.balance]);

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent border border-orange-500/20 rounded-2xl p-4 backdrop-blur-sm"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎰</span>
          <span className="font-bold text-orange-400 text-sm tracking-wide uppercase">Betting Pool</span>
          {isBettingOpen && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="px-2 py-0.5 bg-green-500/20 text-green-400 text-[10px] font-bold rounded-full uppercase"
            >
              Open
            </motion.span>
          )}
        </div>
        <div className="text-right">
          <motion.div
            key={displayedPool}
            className="text-xl font-black text-white tabular-nums"
          >
            {displayedPool.toLocaleString()}
            <span className="text-orange-400 text-sm ml-1">RSTR</span>
          </motion.div>
          <div className="text-xs text-gray-400">
            {bettingPool?.depositorCount ?? 0} players betting
          </div>
        </div>
      </div>

      {/* Balance indicator */}
      <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-white/5 rounded-xl">
        <span className="text-sm">🪙</span>
        <span className="text-sm text-gray-400">Your balance:</span>
        <span className="text-sm font-bold text-white">{tokenBalance.balance.toLocaleString()} RSTR</span>
      </div>

      <AnimatePresence mode="wait">
        {canBet ? (
          <motion.div
            key="betting-controls"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            {/* Player Selector */}
            <div className="relative">
              <select
                value={selectedPlayerId}
                onChange={(e) => setSelectedPlayerId(e.target.value)}
                className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white text-sm appearance-none focus:outline-none focus:border-orange-500/50 transition-colors cursor-pointer"
              >
                <option value="" disabled>Who is the human?</option>
                {players.map(player => (
                  <option key={player.id} value={player.id}>
                    {player.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>

            {/* Bet Amount Selector */}
            <div>
              <label className="text-xs text-gray-400 mb-2 block">Bet Amount</label>
              <div className="grid grid-cols-4 gap-2">
                {quickAmounts.map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setBetAmount(amount)}
                    disabled={amount > maxBet}
                    className={`
                      py-2 text-sm font-medium rounded-lg border transition-all
                      ${betAmount === amount
                        ? 'bg-orange-500/20 border-orange-500/50 text-orange-400'
                        : 'bg-white/5 border-white/10 text-gray-300 hover:border-white/20'
                      }
                      ${amount > maxBet ? 'opacity-30 cursor-not-allowed' : ''}
                    `}
                  >
                    {amount}
                  </button>
                ))}
                <button
                  onClick={() => setBetAmount(maxBet)}
                  disabled={maxBet <= 0}
                  className={`
                    py-2 text-sm font-medium rounded-lg border transition-all
                    ${betAmount === maxBet
                      ? 'bg-orange-500/20 border-orange-500/50 text-orange-400'
                      : 'bg-white/5 border-white/10 text-gray-300 hover:border-white/20'
                    }
                    ${maxBet <= 0 ? 'opacity-30 cursor-not-allowed' : ''}
                  `}
                >
                  ALL
                </button>
              </div>
            </div>

            {/* Potential Payout */}
            {selectedPlayerId && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-green-400">Potential payout</span>
                  <span className="text-sm font-bold text-green-400">
                    ~{potentialPayout} RSTR
                  </span>
                </div>
                <p className="text-[10px] text-gray-500 mt-1">
                  65% pool split among correct guessers (estimated)
                </p>
              </motion.div>
            )}

            {/* Place Bet Button */}
            <motion.button
              onClick={handlePlaceBet}
              disabled={!selectedPlayerId || isPlacingBet || betAmount > maxBet || betAmount <= 0}
              whileHover={{ scale: selectedPlayerId && betAmount <= maxBet ? 1.02 : 1 }}
              whileTap={{ scale: selectedPlayerId && betAmount <= maxBet ? 0.98 : 1 }}
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 disabled:opacity-30 disabled:shadow-none hover:shadow-orange-500/30 transition-all"
            >
              {isPlacingBet ? (
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  className="inline-block"
                >
                  🔥
                </motion.span>
              ) : betAmount > maxBet ? (
                'Insufficient Balance'
              ) : (
                `Bet ${betAmount} RSTR 🔥`
              )}
            </motion.button>
          </motion.div>
        ) : hasPlacedBet ? (
          <motion.div
            key="bet-placed"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-3 px-4 bg-green-500/10 border border-green-500/20 rounded-xl"
          >
            <div className="flex items-center gap-2 text-green-400">
              <span>✅</span>
              <span className="font-semibold text-sm">Bet Placed!</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              You bet <span className="text-orange-400 font-medium">{myBet?.amount} RSTR</span> on{' '}
              <span className="text-white font-medium">{myBet?.targetPlayerName}</span>
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="waiting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-3 text-center text-gray-500 text-sm"
          >
            {isBettingOpen ? 'Loading...' : 'Betting closed for this round'}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
