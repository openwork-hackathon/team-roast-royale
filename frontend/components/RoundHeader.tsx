'use client';

import { motion } from 'framer-motion';
import type { RoundInfo } from '@/types/game';

const ROUND_LABELS: Record<string, { title: string; color: string }> = {
  round1: { title: '🔥 HOT TAKES', color: 'from-orange-500 to-yellow-500' },
  round2: { title: '⚔️ ROAST BATTLE', color: 'from-red-500 to-pink-500' },
  round3: { title: '💀 CHAOS ROUND', color: 'from-purple-500 to-pink-500' },
  voting: { title: '🗳️ VOTE NOW', color: 'from-cyan-500 to-blue-500' },
  reveal: { title: '🎭 THE REVEAL', color: 'from-yellow-500 to-orange-500' },
};

interface RoundHeaderProps {
  round: RoundInfo;
}

export default function RoundHeader({ round }: RoundHeaderProps) {
  const label = ROUND_LABELS[round.phase] ?? { title: round.phase, color: 'from-gray-500 to-gray-600' };
  const progress = round.totalTime > 0 ? (round.timeRemaining / round.totalTime) * 100 : 0;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <motion.h2
          key={round.phase}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-sm font-bold tracking-wider uppercase"
        >
          <span className={`bg-gradient-to-r ${label.color} bg-clip-text text-transparent`}>
            {label.title}
          </span>
          {round.roundNumber > 0 && (
            <span className="text-gray-500 ml-2">Round {round.roundNumber}/3</span>
          )}
        </motion.h2>
        <span className="text-sm font-mono text-gray-400">{Math.ceil(round.timeRemaining)}s</span>
      </div>

      {/* Timer bar */}
      <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          className={`h-full bg-gradient-to-r ${label.color} rounded-full`}
          initial={{ width: '100%' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'linear' }}
        />
      </div>

      {/* Prompt */}
      {round.prompt && (
        <motion.div
          key={round.prompt}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-center"
        >
          <p className="text-sm text-gray-300 italic">&ldquo;{round.prompt}&rdquo;</p>
        </motion.div>
      )}
    </div>
  );
}
