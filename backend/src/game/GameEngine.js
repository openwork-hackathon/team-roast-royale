const { v4: uuid } = require('uuid');
const { AgentManager } = require('../agents/AgentManager');

// Game phases
const PHASE = {
  LOBBY: 'lobby',
  ROUND1_HOTTAKES: 'round1_hottakes',
  ROUND2_ROAST: 'round2_roast',
  ROUND3_CHAOS: 'round3_chaos',
  VOTING: 'voting',
  REVEAL: 'reveal',
  ENDED: 'ended'
};

// Phase durations (ms)
const PHASE_DURATION = {
  [PHASE.LOBBY]: 30000,       // 30s
  [PHASE.ROUND1_HOTTAKES]: 90000,  // 90s
  [PHASE.ROUND2_ROAST]: 120000,    // 120s
  [PHASE.ROUND3_CHAOS]: 90000,     // 90s
  [PHASE.VOTING]: 30000,      // 30s
  [PHASE.REVEAL]: 15000,      // 15s
};

// Phase transitions
const NEXT_PHASE = {
  [PHASE.LOBBY]: PHASE.ROUND1_HOTTAKES,
  [PHASE.ROUND1_HOTTAKES]: PHASE.ROUND2_ROAST,
  [PHASE.ROUND2_ROAST]: PHASE.ROUND3_CHAOS,
  [PHASE.ROUND3_CHAOS]: PHASE.VOTING,
  [PHASE.VOTING]: PHASE.REVEAL,
  [PHASE.REVEAL]: PHASE.ENDED,
};

// Hot take prompts
const HOT_TAKE_PROMPTS = [
  "Pineapple on pizza: genius or war crime?",
  "Is a hot dog a sandwich?",
  "Would you rather fight 100 duck-sized horses or 1 horse-sized duck?",
  "Tabs or spaces?",
  "Is water wet?",
  "Should toilet paper go over or under?",
  "Is cereal a soup?",
  "Are birds real?",
  "Is AI art actually art?",
  "Should you put milk before or after cereal?",
];

class Game {
  constructor(humanPlayerName) {
    this.id = uuid().slice(0, 8);
    this.phase = PHASE.LOBBY;
    this.createdAt = Date.now();
    this.phaseStartedAt = Date.now();
    this.phaseTimer = null;
    this.messages = [];
    this.votes = {};
    this.currentPrompt = null;
    this.roastOrder = [];
    this.roastIndex = 0;
    
    // Create human player
    this.humanPlayer = {
      id: uuid().slice(0, 8),
      name: humanPlayerName,
      isHuman: true,
      isConnected: false
    };
    
    // Create AI players
    this.agentManager = new AgentManager();
    this.aiPlayers = this.agentManager.createAgents(15);
    
    // All players (shuffled so human isn't always first/last)
    this.players = this._shufflePlayers([this.humanPlayer, ...this.aiPlayers]);
  }

  _shufflePlayers(players) {
    const shuffled = [...players];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  getPublicState() {
    return {
      id: this.id,
      phase: this.phase,
      players: this.players.map(p => ({
        id: p.id,
        name: p.name,
        isConnected: p.isHuman ? p.isConnected : true
      })),
      messages: this.messages,
      currentPrompt: this.currentPrompt,
      votes: this.phase === PHASE.REVEAL ? this.votes : this._getVoteCounts(),
      roastOrder: this.phase === PHASE.ROUND2_ROAST ? this.roastOrder.map(p => p.id) : [],
      currentRoastTurn: this.phase === PHASE.ROUND2_ROAST ? this.roastOrder[this.roastIndex]?.id : null,
      timeRemaining: this._getTimeRemaining(),
      humanPlayerId: this.phase === PHASE.REVEAL ? this.humanPlayer.id : null
    };
  }

  _getTimeRemaining() {
    const duration = PHASE_DURATION[this.phase] || 0;
    const elapsed = Date.now() - this.phaseStartedAt;
    return Math.max(0, duration - elapsed);
  }

  _getVoteCounts() {
    const counts = {};
    Object.values(this.votes).forEach(targetId => {
      counts[targetId] = (counts[targetId] || 0) + 1;
    });
    return counts;
  }

  addMessage(playerId, text) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return null;
    
    const msg = {
      id: uuid().slice(0, 8),
      playerId,
      playerName: player.name,
      text,
      timestamp: Date.now(),
      phase: this.phase
    };
    this.messages.push(msg);
    return msg;
  }

  castVote(voterId, targetId) {
    if (this.phase !== PHASE.VOTING) return false;
    if (!this.players.find(p => p.id === voterId)) return false;
    if (!this.players.find(p => p.id === targetId)) return false;
    
    this.votes[voterId] = targetId;
    return true;
  }

  // Transition to next phase
  advancePhase(io) {
    const nextPhase = NEXT_PHASE[this.phase];
    if (!nextPhase) return;

    clearTimeout(this.phaseTimer);
    this.phase = nextPhase;
    this.phaseStartedAt = Date.now();

    // Phase-specific setup
    switch (nextPhase) {
      case PHASE.ROUND1_HOTTAKES:
        this.currentPrompt = HOT_TAKE_PROMPTS[Math.floor(Math.random() * HOT_TAKE_PROMPTS.length)];
        break;
      case PHASE.ROUND2_ROAST:
        this.roastOrder = this._shufflePlayers([...this.players]);
        this.roastIndex = 0;
        break;
      case PHASE.ROUND3_CHAOS:
        this.currentPrompt = "FREE FOR ALL! Say whatever you want. Accuse someone. Defend yourself. CHAOS ROUND! 🔥";
        break;
      case PHASE.VOTING:
        // AI agents vote
        this._aiVote();
        break;
      case PHASE.REVEAL:
        // Nothing to do — state already has humanPlayerId
        break;
    }

    // Emit phase change (game: prefix for frontend compatibility)
    const phaseData = {
      phase: nextPhase,
      prompt: this.currentPrompt,
      timeRemaining: PHASE_DURATION[nextPhase],
      roastOrder: nextPhase === PHASE.ROUND2_ROAST ? this.roastOrder.map(p => p.id) : undefined
    };
    io.to(this.id).emit('game:phase-change', phaseData);
    io.to(this.id).emit('phaseChange', phaseData); // legacy

    // Also emit full state update so frontend stays in sync
    io.to(this.id).emit('game:state', this.getPublicState());

    // If reveal phase, emit reveal event
    if (nextPhase === PHASE.REVEAL) {
      io.to(this.id).emit('game:reveal', {
        results: this._getVoteResults(),
        humanPlayerId: this.humanPlayer.id
      });
    }

    // Schedule next phase transition + countdown timer
    if (PHASE_DURATION[nextPhase] && nextPhase !== PHASE.ENDED) {
      this.phaseTimer = setTimeout(() => this.advancePhase(io), PHASE_DURATION[nextPhase]);
      
      // Broadcast timer every second
      clearInterval(this.timerInterval);
      this.timerInterval = setInterval(() => {
        const remaining = this._getTimeRemaining();
        io.to(this.id).emit('game:timer', remaining);
        if (remaining <= 0) clearInterval(this.timerInterval);
      }, 1000);
    }

    // Trigger AI responses for this phase
    if ([PHASE.ROUND1_HOTTAKES, PHASE.ROUND2_ROAST, PHASE.ROUND3_CHAOS].includes(nextPhase)) {
      this._triggerAIResponses(io, nextPhase);
    }

    return nextPhase;
  }

  async _triggerAIResponses(io, phase) {
    const recentMessages = this.messages.slice(-20);

    for (const agent of this.aiPlayers) {
      // Random delay 2-10 seconds to feel natural
      const delay = 2000 + Math.random() * 8000;
      
      setTimeout(async () => {
        try {
          let response;
          
          if (phase === PHASE.ROUND2_ROAST) {
            // In roast round, respond to the previous player's message
            const prevMessages = this.messages.filter(m => m.phase === PHASE.ROUND2_ROAST);
            const lastMsg = prevMessages[prevMessages.length - 1];
            response = await this.agentManager.generateResponse(
              agent, phase, this.currentPrompt, recentMessages, lastMsg?.text
            );
          } else {
            response = await this.agentManager.generateResponse(
              agent, phase, this.currentPrompt, recentMessages
            );
          }

          if (response && this.phase === phase) {
            const msg = this.addMessage(agent.id, response);
            if (msg) {
              io.to(this.id).emit('game:message', msg);
              io.to(this.id).emit('message', msg); // legacy
            }
          }
        } catch (err) {
          console.error(`Agent ${agent.name} failed:`, err.message);
        }
      }, delay);
    }
  }

  _getVoteResults() {
    const counts = {};
    Object.values(this.votes).forEach(targetId => {
      counts[targetId] = (counts[targetId] || 0) + 1;
    });
    return this.players.map(p => ({
      playerId: p.id,
      playerName: p.name,
      isHuman: p.isHuman,
      votesReceived: counts[p.id] || 0
    })).sort((a, b) => b.votesReceived - a.votesReceived);
  }

  _aiVote() {
    // Each AI votes — ~40% accuracy (slightly better than random)
    const nonHumanPlayers = this.players.filter(p => p.id !== this.humanPlayer.id);
    
    for (const agent of this.aiPlayers) {
      // 40% chance to vote for the actual human
      if (Math.random() < 0.4) {
        this.votes[agent.id] = this.humanPlayer.id;
      } else {
        // Vote for random non-self player
        const candidates = this.players.filter(p => p.id !== agent.id);
        const target = candidates[Math.floor(Math.random() * candidates.length)];
        this.votes[agent.id] = target.id;
      }
    }
  }
}

class GameEngine {
  constructor() {
    this.games = new Map();
    this.totalGamesCreated = 0;
  }

  createGame(playerName) {
    const game = new Game(playerName);
    this.games.set(game.id, game);
    this.totalGamesCreated++;
    
    // Auto-cleanup after 30 minutes
    setTimeout(() => this.games.delete(game.id), 30 * 60 * 1000);
    
    return game;
  }

  getGame(gameId) {
    return this.games.get(gameId);
  }

  getActiveGameCount() {
    return this.games.size;
  }

  listGames() {
    return Array.from(this.games.values()).map(g => ({
      id: g.id,
      phase: g.phase,
      playerCount: g.players.length,
      createdAt: g.createdAt
    }));
  }
}

module.exports = { GameEngine, Game, PHASE, PHASE_DURATION };
