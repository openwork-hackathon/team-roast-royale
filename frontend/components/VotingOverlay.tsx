'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Player } from '@/types/game';

interface VotingOverlayProps {
  players: Player[];
  timeRemaining: number;
  myPlayerId: string;
  onVote: (playerId: string) => void;
}

export default function VotingOverlay({ players, timeRemaining, myPlayerId, onVote }: VotingOverlayProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!selected) return;
    setSubmitted(true);
    onVote(selected);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center px-4 py-8"
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="max-w-xl w-full"
      >
        <div className="text-center mb-6">
          <h2 className="text-3xl font-black text-white mb-2">🗳️ Who&apos;s the Human?</h2>
          <p className="text-gray-400 text-sm">Select the player you think is a real human</p>
          <motion.p
            key={Math.ceil(timeRemaining)}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            className={`text-2xl font-mono font-bold mt-3 ${timeRemaining < 10 ? 'text-red-400' : 'text-cyan-400'}`}
          >
            {Math.ceil(timeRemaining)}s
          </motion.p>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-6">
          {players.filter(p => p.id !== myPlayerId).map((player, i) => (
            <motion.button
              key={player.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + i * 0.03 }}
              onClick={() => !submitted && setSelected(player.id)}
              disabled={submitted}
              className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${
                selected === player.id
                  ? 'bg-orange-500/20 border-orange-500/50 scale-105'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              } ${submitted ? 'opacity-60' : ''}`}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                style={{ backgroundColor: player.avatar }}
              >
                {player.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs text-gray-300 truncate max-w-full">{player.name}</span>
              {selected === player.id && (
                <motion.div
                  layoutId="vote-indicator"
                  className="w-2 h-2 rounded-full bg-orange-400"
                />
              )}
            </motion.button>
          ))}
        </div>

        <motion.button
          whileHover={{ scale: submitted ? 1 : 1.02 }}
          whileTap={{ scale: submitted ? 1 : 0.98 }}
          onClick={handleSubmit}
          disabled={!selected || submitted}
          className={`w-full py-4 rounded-xl font-bold text-lg transition-all cursor-pointer ${
            submitted
              ? 'bg-green-500/20 border border-green-500/30 text-green-300'
              : selected
                ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white glow-fire'
                : 'bg-white/5 border border-white/10 text-gray-500'
          }`}
        >
          {submitted ? '✅ Vote Submitted' : 'Submit Vote'}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
