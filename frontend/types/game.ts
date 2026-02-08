export interface Player {
  id: string;
  name: string;
  avatar: string; // color hex
  isHuman: boolean;
  isConnected: boolean;
}

export type GamePhase = 'lobby' | 'starting' | 'round1' | 'round2' | 'round3' | 'voting' | 'reveal' | 'ended';

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  avatar: string;
  content: string;
  timestamp: number;
}

export interface RoundInfo {
  phase: GamePhase;
  roundNumber: number;
  prompt: string;
  timeRemaining: number;
  totalTime: number;
}

export interface VoteResult {
  playerId: string;
  playerName: string;
  votesReceived: number;
  isHuman: boolean;
}

export interface GameState {
  id: string;
  players: Player[];
  messages: ChatMessage[];
  round: RoundInfo;
  votes: Record<string, string>; // voterId -> votedForId
  results: VoteResult[] | null;
  humanPlayerId: string | null;
}

export interface ServerEvents {
  'game:state': (state: GameState) => void;
  'game:player-joined': (player: Player) => void;
  'game:message': (message: ChatMessage) => void;
  'game:phase-change': (round: RoundInfo) => void;
  'game:vote-update': (votes: Record<string, string>) => void;
  'game:reveal': (results: { results: VoteResult[]; humanPlayerId: string }) => void;
  'game:countdown': (seconds: number) => void;
  'game:timer': (timeRemaining: number) => void;
  'error': (message: string) => void;
}

export interface ClientEvents {
  'game:create': (data: { playerName: string }, callback: (response: { gameId: string; playerId: string }) => void) => void;
  'game:join': (data: { gameId: string; playerName: string }, callback: (response: { playerId: string }) => void) => void;
  'game:message': (data: { gameId: string; content: string }) => void;
  'game:vote': (data: { gameId: string; votedForId: string }) => void;
}
