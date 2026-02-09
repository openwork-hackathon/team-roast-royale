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
  betting?: BettingState;
}

// Betting Types
export interface BettingState {
  roundNum: number;
  isOpen: boolean;
  pool: BettingPool;
  myWallet?: WalletInfo;
  myBet?: BetInfo;
}

export interface BettingPool {
  total: number;
  depositorCount: number;
  roundNum: number;
}

export interface WalletInfo {
  address: string;
  balance: number;
  isDemo: boolean;
}

export interface BetInfo {
  targetPlayerId: string;
  targetPlayerName: string;
  amount: number;
}

export interface PayoutInfo {
  address: string;
  amount: number;
  isWinner: boolean;
  type: 'house' | 'most_human' | 'correct_guess';
}

export interface BettingResult {
  roundNum: number;
  totalPool: number;
  houseAmount: number;
  mostHumanAmount: number;
  correctGuessersAmount: number;
  payouts: PayoutInfo[];
  mostHumanPlayerId: string;
  myPayout?: PayoutInfo;
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
  // Betting events
  'game:betting-open': (data: { roundNum: number; walletAddress: string; gameId: string }) => void;
  'game:betting-pool': (data: { roundNum: number; totalPool: number; depositorCount: number }) => void;
  'game:betting-closed': (data: { roundNum: number; gameId: string }) => void;
  'game:betting-result': (result: BettingResult) => void;
}

export interface ClientEvents {
  'game:create': (data: { playerName: string }, callback: (response: { gameId: string; playerId: string }) => void) => void;
  'game:join': (data: { gameId: string; playerName: string }, callback: (response: { playerId: string }) => void) => void;
  'game:message': (data: { gameId: string; content: string }) => void;
  'game:vote': (data: { gameId: string; votedForId: string }) => void;
  // Betting events
  'game:bet-place': (data: { gameId: string; roundNum: number; targetPlayerId: string; walletAddress: string }) => void;
  'game:demo-deposit': (data: { gameId: string; roundNum: number; amount: number }) => void;
}
