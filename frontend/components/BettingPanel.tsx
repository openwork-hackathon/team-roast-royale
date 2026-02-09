'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Player, BettingPool, WalletInfo, BetInfo } from '@/types/game';

interface BettingPanelProps {
  players: Player[];
  bettingPool: BettingPool | null;
  myWallet: WalletInfo | null;
  myBet: BetInfo | null;
  isBettingOpen: boolean;
  currentRound: number;
  gameId: string;
  onPlaceBet: (targetPlayerId: string) => void;
  onDemoDeposit: () => void;
  onBetPlaced: (bet: BetInfo) => void;
}

export default function BettingPanel({
  players,
  bettingPool,
  myWallet,
  myBet,
  isBettingOpen,
  currentRound,
  gameId,
  onPlaceBet,
  onDemoDeposit,
  onBetPlaced,
}: BettingPanelProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [displayedPool, setDisplayedPool] = useState(0);
  const [isDepositing, setIsDepositing] = useState(false);
  const [isPlacingBet, setIsPlacingBet] = useState(false);

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
  }, [currentRound]);

  const handleDeposit = () => {
    setIsDepositing(true);
    onDemoDeposit();
    setTimeout(() => setIsDepositing(false), 500);
  };

  const handlePlaceBet = () => {
    if (!selectedPlayerId) return;
    
    setIsPlacingBet(true);
    const selectedPlayer = players.find(p => p.id === selectedPlayerId);
    
    onPlaceBet(selectedPlayerId);
    
    if (selectedPlayer) {
      onBetPlaced({
        targetPlayerId: selectedPlayerId,
        targetPlayerName: selectedPlayer.name,
        amount: 100,
      });
    }
    
    setTimeout(() => setIsPlacingBet(false), 500);
  };

  const hasPlacedBet = myBet !== null;
  const canBet = isBettingOpen && !hasPlacedBet && myWallet !== null;

  // Debug logging
  useEffect(() => {
    console.log('[BettingPanel] State:', { isBettingOpen, hasPlacedBet, hasWallet: !!myWallet, canBet, currentRound });
  }, [isBettingOpen, hasPlacedBet, myWallet, canBet, currentRound]);

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
            <span className="text-orange-400 text-sm ml-1">$OPENWORK</span>
          </motion.div>
          <div className="text-xs text-gray-400">
            {bettingPool?.depositorCount ?? 0} depositors
          </div>
        </div>
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
            {/* Deposit Button */}
            <motion.button
              onClick={handleDeposit}
              disabled={isDepositing}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-2.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-xl text-amber-400 font-semibold text-sm flex items-center justify-center gap-2 hover:from-amber-500/30 hover:to-orange-500/30 transition-all disabled:opacity-50"
            >
              {isDepositing ? (
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  className="inline-block"
                >
                  ⏳
                </motion.span>
              ) : (
                <>
                  <span>💰</span>
                  Deposit 100 $OPENWORK
                </>
              )}
            </motion.button>

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

            {/* Place Bet Button */}
            <motion.button
              onClick={handlePlaceBet}
              disabled={!selectedPlayerId || isPlacingBet}
              whileHover={{ scale: selectedPlayerId ? 1.02 : 1 }}
              whileTap={{ scale: selectedPlayerId ? 0.98 : 1 }}
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
              ) : (
                'Place Bet 🔥'
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
              You bet on <span className="text-white font-medium">{myBet?.targetPlayerName}</span>
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="waiting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-3 text-center text-gray-500 text-sm"
          >
            {isBettingOpen ? 'Connect wallet to bet' : 'Betting closed for this round'}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
