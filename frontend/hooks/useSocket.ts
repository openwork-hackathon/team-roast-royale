'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { GameState, ChatMessage, Player, RoundInfo, VoteResult, BettingPool, BettingResult, WalletInfo, BetInfo } from '@/types/game';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Betting state
  const [bettingPool, setBettingPool] = useState<BettingPool | null>(null);
  const [myWallet, setMyWallet] = useState<WalletInfo | null>(null);
  const [myBet, setMyBet] = useState<BetInfo | null>(null);
  const [bettingResult, setBettingResult] = useState<BettingResult | null>(null);
  const [isBettingOpen, setIsBettingOpen] = useState(false);

  useEffect(() => {
    console.log('[Socket] Connecting to:', API_URL);
    const socket = io(API_URL, {
      transports: ['polling', 'websocket'],
      autoConnect: true,
      withCredentials: false,
    });

    socket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err.message);
    });

    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('game:state', (state: GameState) => {
      setGameState(state);
    });

    socket.on('game:player-joined', (player: Player) => {
      setGameState(prev => prev ? { ...prev, players: [...prev.players.filter(p => p.id !== player.id), player] } : prev);
    });

    socket.on('game:message', (message: ChatMessage) => {
      setGameState(prev => prev ? { ...prev, messages: [...prev.messages, message] } : prev);
    });

    socket.on('game:phase-change', (round: RoundInfo) => {
      setGameState(prev => prev ? { ...prev, round } : prev);
    });

    socket.on('game:vote-update', (votes: Record<string, string>) => {
      setGameState(prev => prev ? { ...prev, votes } : prev);
    });

    socket.on('game:reveal', ({ results, humanPlayerId }: { results: VoteResult[]; humanPlayerId: string }) => {
      setGameState(prev => prev ? { ...prev, results, humanPlayerId, round: { ...prev.round, phase: 'reveal' } } : prev);
    });

    socket.on('game:countdown', (seconds: number) => {
      setCountdown(seconds);
    });

    socket.on('game:timer', (timeRemaining: number) => {
      setGameState(prev => prev ? { ...prev, round: { ...prev.round, timeRemaining } } : prev);
    });

    socket.on('error', (message: string) => {
      setError(message);
    });

    // Betting events
    socket.on('game:betting-open', ({ roundNum, walletAddress }) => {
      setIsBettingOpen(true);
      setMyWallet({
        address: walletAddress,
        balance: 1000, // Demo balance
        isDemo: true,
      });
      setMyBet(null);
      setBettingResult(null);
    });

    socket.on('game:betting-pool', ({ roundNum, totalPool, depositorCount }) => {
      setBettingPool({
        roundNum,
        total: totalPool,
        depositorCount,
      });
    });

    socket.on('game:betting-closed', () => {
      setIsBettingOpen(false);
    });

    socket.on('game:betting-result', (result) => {
      setBettingResult(result);
      setIsBettingOpen(false);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const createGame = useCallback((playerName: string): Promise<{ gameId: string; playerId: string }> => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current) return reject(new Error('Not connected'));
      socketRef.current.emit('game:create', { playerName }, (response: { gameId: string; playerId: string }) => {
        resolve(response);
      });
    });
  }, []);

  const joinGame = useCallback((gameId: string, playerName: string): Promise<{ playerId: string }> => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current) return reject(new Error('Not connected'));
      socketRef.current.emit('game:join', { gameId, playerName }, (response: { playerId: string }) => {
        resolve(response);
      });
    });
  }, []);

  const sendMessage = useCallback((gameId: string, content: string) => {
    socketRef.current?.emit('game:message', { gameId, content });
  }, []);

  const submitVote = useCallback((gameId: string, votedForId: string) => {
    socketRef.current?.emit('game:vote', { gameId, votedForId });
  }, []);

  // Betting actions
  const placeBet = useCallback((gameId: string, roundNum: number, targetPlayerId: string) => {
    if (!myWallet) return;
    socketRef.current?.emit('game:bet-place', {
      gameId,
      roundNum,
      targetPlayerId,
      walletAddress: myWallet.address,
    });
  }, [myWallet]);

  const demoDeposit = useCallback((gameId: string, roundNum: number, amount: number = 100) => {
    socketRef.current?.emit('game:demo-deposit', { gameId, roundNum, amount });
  }, []);

  const clearBettingResult = useCallback(() => {
    setBettingResult(null);
  }, []);

  return {
    connected,
    gameState,
    countdown,
    error,
    createGame,
    joinGame,
    sendMessage,
    submitVote,
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
  };
}
