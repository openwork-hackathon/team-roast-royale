'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/hooks/useSocket';
import TokenBalance from '@/components/TokenBalance';
import TokenShop from '@/components/TokenShop';
import TokenInfo from '@/components/TokenInfo';
import type { Player } from '@/types/game';

const AVATAR_COLORS = [
  '#f97316', '#ef4444', '#a855f7', '#22d3ee', '#10b981',
  '#f59e0b', '#ec4899', '#6366f1', '#14b8a6', '#f43f5e',
  '#8b5cf6', '#06b6d4', '#84cc16', '#e879f9', '#fb923c', '#34d399',
];

export default function LobbyPage() {
  const router = useRouter();
  const { connected, gameState, countdown, createGame, tokenBalance, tokenPrice, buyTokens, sellTokens } = useSocket();
  const [playerName, setPlayerName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [gameId, setGameId] = useState<string | null>(null);
  const [isTokenShopOpen, setIsTokenShopOpen] = useState(false);
  const [showTokenInfo, setShowTokenInfo] = useState(false);

  const players = gameState?.players ?? [];
  const slots = Array.from({ length: 16 }, (_, i) => players[i] ?? null);

  const handleCreate = async () => {
    if (!playerName.trim() || !connected) return;
    setIsCreating(true);
    try {
      const result = await createGame(playerName.trim());
      setGameId(result.gameId);
      // Save to sessionStorage so game page can rejoin
      sessionStorage.setItem('roast-royale-name', playerName.trim());
      sessionStorage.setItem(`roast-royale-${result.gameId}`, result.playerId);
    } catch {
      setIsCreating(false);
    }
  };

  useEffect(() => {
    if (gameState?.round?.phase && gameState.round.phase !== 'lobby' && gameState.round.phase !== 'starting') {
      router.push(`/game/${gameState.id}`);
    }
  }, [gameState?.round?.phase, gameState?.id, router]);

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-12 relative">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-orange-500/8 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-10 w-full max-w-2xl"
      >
        {/* Header with Token Balance */}
        <div className="flex items-center justify-between mb-4">
          <div />
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTokenInfo(!showTokenInfo)}
              className="px-3 py-2 text-xs font-medium text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg transition-all"
            >
              About $RSTR
            </button>
            <TokenBalance 
              balance={tokenBalance} 
              onClick={() => setIsTokenShopOpen(true)}
            />
          </div>
        </div>

        <h1 className="text-4xl font-black text-center mb-2">
          <span className="text-fire">Roast Royale</span> 🔥
        </h1>
        <p className="text-center text-gray-400 mb-8">Enter the arena. Try not to get caught.</p>

        {/* Token Info Card */}
        <AnimatePresence>
          {showTokenInfo && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-8"
            >
              <TokenInfo tokenPrice={tokenPrice} />
            </motion.div>
          )}
        </AnimatePresence>

        {!gameId ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-3 mb-12"
          >
            <input
              type="text"
              placeholder="Your name..."
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              maxLength={20}
              className="flex-1 px-5 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/30 transition-all"
            />
            <button
              onClick={handleCreate}
              disabled={!playerName.trim() || !connected || isCreating}
              className="px-8 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded-xl hover:scale-105 transition-transform disabled:opacity-40 disabled:hover:scale-100 cursor-pointer"
            >
              {isCreating ? 'Creating...' : 'Create Game'}
            </button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center mb-8"
          >
            <p className="text-gray-400 text-sm mb-1">Game Code</p>
            <p className="text-2xl font-mono font-bold text-white tracking-wider">{gameId}</p>
          </motion.div>
        )}

        {/* Countdown */}
        <AnimatePresence>
          {countdown !== null && countdown > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="text-center mb-8"
            >
              <p className="text-gray-400 text-sm mb-1">Game starts in</p>
              <p className="text-6xl font-black text-fire">{countdown}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Player grid */}
        <div className="grid grid-cols-4 gap-3">
          {slots.map((player, i) => (
            <motion.div
              key={player?.id ?? `empty-${i}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className={`aspect-square rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all ${
                player
                  ? 'bg-white/5 border-white/10'
                  : 'bg-white/[0.02] border-white/5 border-dashed'
              }`}
            >
              {player ? (
                <>
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                    style={{ backgroundColor: player.avatar || AVATAR_COLORS[i] }}
                  >
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs text-gray-300 truncate max-w-full px-2">{player.name}</span>
                </>
              ) : (
                <div className="w-10 h-10 rounded-full bg-white/5 pulse-glow" />
              )}
            </motion.div>
          ))}
        </div>

        <p className="text-center text-gray-500 text-sm mt-6">
          {connected ? `${players.length}/16 players` : 'Connecting...'}
        </p>
      </motion.div>

      {/* Token Shop Modal */}
      <TokenShop
        isOpen={isTokenShopOpen}
        onClose={() => setIsTokenShopOpen(false)}
        tokenBalance={tokenBalance}
        tokenPrice={tokenPrice}
        onBuy={buyTokens}
        onSell={sellTokens}
        demoMode={true}
      />
    </main>
  );
}
