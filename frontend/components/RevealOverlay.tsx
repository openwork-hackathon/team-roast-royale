'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import type { VoteResult } from '@/types/game';

interface RevealOverlayProps {
  results: VoteResult[];
  humanPlayerId: string;
}

export default function RevealOverlay({ results, humanPlayerId }: RevealOverlayProps) {
  const [phase, setPhase] = useState<'drumroll' | 'reveal' | 'stats'>('drumroll');
  const humanResult = results.find(r => r.playerId === humanPlayerId);
  const correctGuesses = results.filter(r => r.isHuman && r.votesReceived > 0).reduce((sum, r) => sum + r.votesReceived, 0);
  const totalVoters = results.length;

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('reveal'), 2500);
    const t2 = setTimeout(() => setPhase('stats'), 5000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-lg flex flex-col items-center justify-center px-4"
    >
      <AnimatePresence mode="wait">
        {phase === 'drumroll' && (
          <motion.div
            key="drumroll"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="text-center"
          >
            <motion.p
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 0.6 }}
              className="text-6xl"
            >
              🥁
            </motion.p>
            <p className="text-2xl font-bold text-gray-300 mt-4">The human was...</p>
          </motion.div>
        )}

        {phase === 'reveal' && humanResult && (
          <motion.div
            key="reveal"
            initial={{ opacity: 0, scale: 0.3 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 12, stiffness: 200 }}
            className="text-center"
          >
            <motion.div
              initial={{ boxShadow: '0 0 0px rgba(249,115,22,0)' }}
              animate={{ boxShadow: '0 0 80px rgba(249,115,22,0.6), 0 0 160px rgba(249,115,22,0.2)' }}
              transition={{ delay: 0.3, duration: 1 }}
              className="w-28 h-28 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white text-4xl font-black mx-auto mb-6"
            >
              {humanResult.playerName.charAt(0).toUpperCase()}
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-4xl sm:text-5xl font-black text-white mb-2"
            >
              {humanResult.playerName}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-xl text-fire font-bold"
            >
              WAS THE HUMAN! 🎭
            </motion.p>
          </motion.div>
        )}

        {phase === 'stats' && humanResult && (
          <motion.div
            key="stats"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-md w-full"
          >
            {/* Mini reveal */}
            <div className="mb-8">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white text-2xl font-black mx-auto mb-3"
                style={{ boxShadow: '0 0 40px rgba(249,115,22,0.4)' }}>
                {humanResult.playerName.charAt(0).toUpperCase()}
              </div>
              <h2 className="text-2xl font-black text-white">{humanResult.playerName} was the human!</h2>
            </div>

            {/* Stats */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-3xl font-black text-fire">{correctGuesses}</p>
                  <p className="text-xs text-gray-400">Correct Guesses</p>
                </div>
                <div>
                  <p className="text-3xl font-black text-cyan-400">{totalVoters}</p>
                  <p className="text-xs text-gray-400">Total Voters</p>
                </div>
              </div>

              {/* Most suspected */}
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-xs text-gray-400 mb-2">Most Suspected</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {results
                    .sort((a, b) => b.votesReceived - a.votesReceived)
                    .slice(0, 3)
                    .map((r, i) => (
                      <span key={r.playerId} className={`px-3 py-1 rounded-full text-xs font-medium ${
                        i === 0 ? 'bg-orange-500/20 text-orange-300' : 'bg-white/5 text-gray-400'
                      }`}>
                        {r.playerName}: {r.votesReceived} votes {r.isHuman && '👤'}
                      </span>
                    ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Link href="/lobby" className="flex-1">
                <button className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded-xl hover:scale-105 transition-transform cursor-pointer">
                  Play Again 🔥
                </button>
              </Link>
              <button
                onClick={() => {
                  const text = `I just played Roast Royale! 🔥 ${correctGuesses}/${totalVoters} guessed the human correctly. Can you survive?`;
                  navigator.clipboard?.writeText(text);
                }}
                className="px-6 py-3 bg-white/5 border border-white/10 text-gray-300 font-bold rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
              >
                Share 📋
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
