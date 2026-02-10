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
const TEST_MODE = process.env.TEST_MODE === 'true';
const PHASE_DURATION = {
  [PHASE.LOBBY]: TEST_MODE ? 3000 : 30000,       // 30s (3s test)
  [PHASE.ROUND1_HOTTAKES]: TEST_MODE ? 15000 : 90000,  // 90s (15s test)
  [PHASE.ROUND2_ROAST]: TEST_MODE ? 15000 : 120000,    // 120s (15s test)
  [PHASE.ROUND3_CHAOS]: TEST_MODE ? 15000 : 90000,     // 90s (15s test)
  [PHASE.VOTING]: TEST_MODE ? 10000 : 30000,      // 30s (10s test)
  [PHASE.REVEAL]: TEST_MODE ? 5000 : 15000,       // 15s (5s test)
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
    
    // Create human players array (max 2 humans)
    this.humanPlayers = [];
    this.humanPlayer = null; // Backward compatibility - first human
    
    // Create AI players (will be adjusted when humans join)
    this.agentManager = new AgentManager();
    this.aiPlayers = [];
    
    // All players (shuffled so humans aren't always first/last)
    this.players = [];
    
    // Add first human player if provided
    if (humanPlayerName) {
      this.addHumanPlayer(humanPlayerName);
    }
  }

  _shufflePlayers(players) {
    const shuffled = [...players];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Add a human player to the game (max 2 humans)
   * @param {string} playerName 
   * @returns {{ player: object, isFull: boolean }|null} The new player or null if full
   */
  addHumanPlayer(playerName) {
    if (this.humanPlayers.length >= 2) {
      return null; // Game is full
    }

    const player = {
      id: uuid().slice(0, 8),
      name: playerName,
      isHuman: true,
      isConnected: false
    };

    this.humanPlayers.push(player);
    
    // Keep backward compatibility - first human is the main humanPlayer
    if (!this.humanPlayer) {
      this.humanPlayer = player;
    }

    // Recalculate AI players count: 16 total - humanCount
    const humanCount = this.humanPlayers.length;
    const aiCount = 16 - humanCount;
    
    // Create AI players if not already created
    if (this.aiPlayers.length === 0) {
      this.aiPlayers = this.agentManager.createAgents(aiCount);
    }

    // Rebuild players list
    this.players = this._shufflePlayers([...this.humanPlayers, ...this.aiPlayers]);

    console.log(`🎮 Added human player ${playerName} (${this.humanPlayers.length}/2). Total players: ${this.players.length} (${humanCount} humans, ${aiCount} AI)`);

    return { player, isFull: this.humanPlayers.length >= 2 };
  }

  // Map backend phases to frontend phase names
  _frontendPhase(phase) {
    const map = {
      [PHASE.LOBBY]: 'lobby',
      [PHASE.ROUND1_HOTTAKES]: 'round1',
      [PHASE.ROUND2_ROAST]: 'round2',
      [PHASE.ROUND3_CHAOS]: 'round3',
      [PHASE.VOTING]: 'voting',
      [PHASE.REVEAL]: 'reveal',
      [PHASE.ENDED]: 'ended',
    };
    return map[phase] || phase;
  }

  // Generate consistent avatar color from player name
  _avatarColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 65%, 45%)`;
  }

  getPublicState() {
    const frontendPhase = this._frontendPhase(this.phase);
    return {
      id: this.id,
      phase: this.phase, // raw phase for backend compat
      // Frontend expects nested round object
      round: {
        phase: frontendPhase,
        roundNumber: frontendPhase.startsWith('round') ? parseInt(frontendPhase.slice(-1)) : 0,
        prompt: this.currentPrompt || '',
        timeRemaining: this._getTimeRemaining(),
        totalTime: PHASE_DURATION[this.phase] || 0,
      },
      players: this.players.map(p => ({
        id: p.id,
        name: p.name,
        avatar: this._avatarColor(p.name),
        isHuman: false, // never reveal who's human until reveal phase
        isConnected: p.isHuman ? p.isConnected : true
      })),
      // Frontend expects messages with 'content' not 'text'
      messages: this.messages.map(m => ({
        id: m.id,
        playerId: m.playerId,
        playerName: m.playerName,
        avatar: this._avatarColor(m.playerName),
        content: m.text,
        timestamp: m.timestamp,
      })),
      currentPrompt: this.currentPrompt,
      votes: this.phase === PHASE.REVEAL ? this.votes : this._getVoteCounts(),
      roastOrder: this.phase === PHASE.ROUND2_ROAST ? this.roastOrder.map(p => p.id) : [],
      currentRoastTurn: this.phase === PHASE.ROUND2_ROAST ? this.roastOrder[this.roastIndex]?.id : null,
      timeRemaining: this._getTimeRemaining(),
      humanPlayerId: this.phase === PHASE.REVEAL ? this.humanPlayer?.id : null,
      humanPlayerIds: this.phase === PHASE.REVEAL ? this.humanPlayers.map(h => h.id) : null,
      results: this.phase === PHASE.REVEAL ? this._getVoteResults() : null,
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
      avatar: this._avatarColor(player.name),
      text,
      content: text, // frontend expects 'content'
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

    const betting = this.bettingSystem;

    // Phase-specific setup
    switch (nextPhase) {
      case PHASE.ROUND1_HOTTAKES:
        this.currentPrompt = HOT_TAKE_PROMPTS[Math.floor(Math.random() * HOT_TAKE_PROMPTS.length)];
        if (betting) betting.openBetting(this.id, 1, io);
        break;
      case PHASE.ROUND2_ROAST:
        this.roastOrder = this._shufflePlayers([...this.players]);
        this.roastIndex = 0;
        if (betting) betting.openBetting(this.id, 2, io);
        break;
      case PHASE.ROUND3_CHAOS:
        this.currentPrompt = "FREE FOR ALL! Say whatever you want. Accuse someone. Defend yourself. CHAOS ROUND! 🔥";
        if (betting) betting.openBetting(this.id, 3, io);
        break;
      case PHASE.VOTING:
        // AI agents vote
        this._aiVote();
        // Close betting for all rounds
        if (betting) {
          for (let r = 1; r <= 3; r++) {
            try { betting.closeBetting(this.id, r, io); } catch(e) {}
          }
        }
        break;
      case PHASE.REVEAL:
        // Resolve bets and trigger payouts
        if (betting) {
          for (let r = 1; r <= 3; r++) {
            betting.resolveAndPayout(this.id, r, io).catch(err => {
              console.error(`Payout error game ${this.id} round ${r}:`, err.message);
            });
          }
        }
        break;
    }

    // Emit phase change (game: prefix for frontend compatibility)
    const frontendPhase = this._frontendPhase(nextPhase);
    const phaseData = {
      phase: frontendPhase,
      roundNumber: frontendPhase.startsWith('round') ? parseInt(frontendPhase.slice(-1)) : 0,
      prompt: this.currentPrompt || '',
      timeRemaining: PHASE_DURATION[nextPhase],
      totalTime: PHASE_DURATION[nextPhase],
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
    const humanPlayerIds = new Set(this.humanPlayers.map(h => h.id));
    return this.players.map(p => ({
      playerId: p.id,
      playerName: p.name,
      isHuman: humanPlayerIds.has(p.id),
      votesReceived: counts[p.id] || 0
    })).sort((a, b) => b.votesReceived - a.votesReceived);
  }

  _aiVote() {
    // Each AI votes — ~40% chance to vote for a human (split between humans if multiple)
    const humanPlayerIds = this.humanPlayers.map(h => h.id);
    
    for (const agent of this.aiPlayers) {
      // 40% chance to vote for any of the human players
      if (Math.random() < 0.4 && humanPlayerIds.length > 0) {
        // Pick a random human if multiple
        const targetHuman = humanPlayerIds[Math.floor(Math.random() * humanPlayerIds.length)];
        this.votes[agent.id] = targetHuman;
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
    this.bettingSystem = null;
  }

  setBettingSystem(bettingSystem) {
    this.bettingSystem = bettingSystem;
  }

  createGame(playerName) {
    const game = new Game(playerName);
    game.bettingSystem = this.bettingSystem || null;
    this.games.set(game.id, game);
    this.totalGamesCreated++;
    
    // Initialize betting for this game
    if (this.bettingSystem && game.humanPlayer) {
      this.bettingSystem.initGame(
        game.id,
        game.humanPlayer.id,
        game.players.map(p => ({ id: p.id, name: p.name }))
      );
    }
    
    // Auto-cleanup after 30 minutes
    setTimeout(() => {
      this.games.delete(game.id);
      if (this.bettingSystem) this.bettingSystem.cleanupGame(game.id);
    }, 30 * 60 * 1000);
    
    return game;
  }

  /**
   * Join an existing game as a human player
   * @param {string} gameId 
   * @param {string} playerName 
   * @returns {{ game: Game, player: object }|null} The game and new player, or null if can't join
   */
  joinAsHuman(gameId, playerName) {
    const game = this.games.get(gameId);
    if (!game) return null;
    
    const result = game.addHumanPlayer(playerName);
    if (!result) return null;
    
    // Update betting system with new players list
    if (this.bettingSystem) {
      this.bettingSystem.initGame(
        game.id,
        game.humanPlayer.id,
        game.players.map(p => ({ id: p.id, name: p.name }))
      );
    }
    
    return { game, player: result.player };
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
