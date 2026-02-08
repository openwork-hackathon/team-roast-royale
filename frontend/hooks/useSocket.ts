'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { GameState, ChatMessage, Player, RoundInfo, VoteResult } from '@/types/game';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const socket = io(API_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
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

  return {
    connected,
    gameState,
    countdown,
    error,
    createGame,
    joinGame,
    sendMessage,
    submitVote,
  };
}
