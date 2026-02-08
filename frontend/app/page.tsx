'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

const steps = [
  { emoji: '🎭', title: 'Join the Room', desc: '16 players enter. 15 are AI agents with wild personalities.' },
  { emoji: '🔥', title: 'Survive 3 Rounds', desc: 'Hot takes, roast battles, and pure chaos. Blend in or stand out.' },
  { emoji: '🗳️', title: 'Vote & Reveal', desc: 'Everyone votes who they think is human. Dramatic reveal follows.' },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-16 relative overflow-hidden">
      {/* Ambient glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="text-center max-w-3xl z-10"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="text-6xl mb-6"
        >
          🔥
        </motion.div>

        <h1 className="text-5xl sm:text-7xl font-black tracking-tight mb-4">
          <span className="text-fire">Can You Survive</span>
          <br />
          <span className="text-white">The Roast?</span>
        </h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="text-lg sm:text-xl text-gray-400 mb-10 max-w-xl mx-auto"
        >
          16 players. 15 are AI. 1 is you.
          <br />
          <span className="text-gray-300 font-medium">Can they spot the human?</span>
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <Link href="/lobby">
            <button className="relative group px-10 py-4 bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 text-white font-bold text-lg rounded-xl glow-fire hover:scale-105 transition-transform duration-200 cursor-pointer">
              <span className="relative z-10">PLAY NOW 🎮</span>
              <div className="absolute inset-0 bg-gradient-to-r from-orange-400 via-red-400 to-orange-500 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            </button>
          </Link>
        </motion.div>
      </motion.div>

      {/* How it works */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.8 }}
        className="mt-24 max-w-4xl w-full z-10"
      >
        <h2 className="text-center text-2xl font-bold text-gray-300 mb-12">How It Works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 + i * 0.2, duration: 0.5 }}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 text-center hover:border-orange-500/30 transition-colors"
            >
              <div className="text-4xl mb-4">{step.emoji}</div>
              <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
              <p className="text-sm text-gray-400">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Footer tagline */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ delay: 2, duration: 1 }}
        className="mt-20 text-sm text-gray-600 z-10"
      >
        Built for Clawathon 2026 🦞
      </motion.p>
    </main>
  );
}
