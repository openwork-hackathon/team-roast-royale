'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'next/navigation';
import { useSocket } from '@/hooks/useSocket';
import ChatBubble from '@/components/ChatBubble';
import RoundHeader from '@/components/RoundHeader';
import VotingOverlay from '@/components/VotingOverlay';
import RevealOverlay from '@/components/RevealOverlay';
import BettingPanel from '@/components/BettingPanel';
import WalletBadge from '@/components/WalletBadge';
import PayoutOverlay from '@/components/PayoutOverlay';
import type { BetInfo } from '@/types/game';

export default function GamePage() {
  const params = useParams();
  const gameId = params.id as string;
  const {
    connected,
    gameState,
    sendMessage,
    submitVote,
    joinGame,
    // Betting
    bettingPool,
    myWallet,
    myBet,
    bettingResult,
    isBettingOpen,
    placeBet,
    demoDeposit,
    setMyBet,
    clearBettingResult,
  } = useSocket();
  const [input, setInput] = useState('');
  const [playerId, setPlayerId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [gameState?.messages?.length]);

  // Always rejoin game when socket connects (new socket = new connection)
  useEffect(() => {
    if (connected && gameId) {
      const storedId = sessionStorage.getItem(`roast-royale-${gameId}`);
      const name = sessionStorage.getItem('roast-royale-name') || 'Player';
      console.log('[Game] Joining game', gameId, 'name:', name, 'storedId:', storedId);
      joinGame(gameId, name).then(res => {
        console.log('[Game] Joined! playerId:', res.playerId);
        setPlayerId(res.playerId);
        sessionStorage.setItem(`roast-royale-${gameId}`, res.playerId);
      }).catch(err => {
        console.error('[Game] Join failed:', err);
      });
    }
  }, [connected, gameId, joinGame]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || !gameId) return;
    sendMessage(gameId, text);
    setInput('');
  };

  const handlePlaceBet = (targetPlayerId: string) => {
    const roundNum = gameState?.round?.roundNumber ?? 1;
    placeBet(gameId, roundNum, targetPlayerId);
  };

  const handleDemoDeposit = () => {
    const roundNum = gameState?.round?.roundNumber ?? 1;
    demoDeposit(gameId, roundNum, 100);
  };

  const handleBetPlaced = (bet: BetInfo) => {
    setMyBet(bet);
  };

  const phase = gameState?.round?.phase;
  const messages = gameState?.messages ?? [];
  const players = gameState?.players ?? [];
  const isVoting = phase === 'voting';
  const isReveal = phase === 'reveal';
  const isRoundPhase = phase && ['round1', 'round2', 'round3'].includes(phase);
  const currentRound = gameState?.round?.roundNumber ?? 1;

  return (
    <main className="h-screen flex flex-col relative overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-4 pt-4 pb-3 border-b border-white/5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            {gameState?.round && <RoundHeader round={gameState.round} />}
          </div>
          <div className="flex items-center gap-3">
            {/* Connection Status Indicator */}
            <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-full">
              <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className={`text-[10px] font-medium ${connected ? 'text-green-400' : 'text-red-400'}`}>
                {connected ? 'Live' : 'Offline'}
              </span>
            </div>
            <WalletBadge wallet={myWallet} />
          </div>
        </div>
      </div>

      {/* Online players bar */}
      <div className="shrink-0 px-4 py-2 border-b border-white/5 overflow-x-auto">
        <div className="flex gap-2">
          {players.map(player => (
            <div key={player.id} className="flex items-center gap-1.5 shrink-0">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                style={{ backgroundColor: player.avatar }}
              >
                {player.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs text-gray-400 hidden sm:inline">{player.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <AnimatePresence initial={false}>
          {messages.map(msg => (
            <ChatBubble
              key={msg.id}
              message={msg}
              isOwnMessage={msg.playerId === playerId}
            />
          ))}
        </AnimatePresence>
        <div ref={chatEndRef} />
      </div>

      {/* Betting Panel (during rounds) */}
      <AnimatePresence>
        {isRoundPhase && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="shrink-0 px-4 py-2 border-t border-white/5"
          >
            <BettingPanel
              players={players}
              bettingPool={bettingPool}
              myWallet={myWallet}
              myBet={myBet}
              isBettingOpen={isBettingOpen}
              currentRound={currentRound}
              gameId={gameId}
              onPlaceBet={handlePlaceBet}
              onDemoDeposit={handleDemoDeposit}
              onBetPlaced={handleBetPlaced}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      {phase && !['voting', 'reveal', 'ended'].includes(phase) && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="shrink-0 px-4 pb-4 pt-2 border-t border-white/5"
        >
          <div className="flex gap-2 max-w-3xl mx-auto">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type your message..."
              maxLength={500}
              className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 transition-colors"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="px-5 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded-xl hover:scale-105 transition-transform disabled:opacity-30 disabled:hover:scale-100 cursor-pointer"
            >
              Send
            </button>
          </div>
        </motion.div>
      )}

      {/* Voting overlay */}
      <AnimatePresence>
        {isVoting && playerId && gameState?.round && (
          <VotingOverlay
            players={players}
            timeRemaining={gameState.round.timeRemaining}
            myPlayerId={playerId}
            onVote={(votedForId) => submitVote(gameId, votedForId)}
          />
        )}
      </AnimatePresence>

      {/* Reveal overlay */}
      <AnimatePresence>
        {isReveal && gameState?.results && gameState?.humanPlayerId && (
          <RevealOverlay
            results={gameState.results}
            humanPlayerId={gameState.humanPlayerId}
          />
        )}
      </AnimatePresence>

      {/* Betting Payout Overlay */}
      <AnimatePresence>
        {bettingResult && (
          <PayoutOverlay
            result={bettingResult}
            myWalletAddress={myWallet?.address}
            onClose={clearBettingResult}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
