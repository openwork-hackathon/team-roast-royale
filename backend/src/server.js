const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { GameEngine } = require('./game/GameEngine');
const { setupSocketHandlers } = require('./routes/socketHandlers');
const { BettingSystem } = require('./betting');

const app = express();
const server = createServer(app);

const FRONTEND_URL = process.env.FRONTEND_URL || '*';

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingInterval: 10000,
  pingTimeout: 5000,
  transports: ['polling', 'websocket']
});

app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path !== '/health') {
      console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    }
  });
  next();
});

// Game engine (in-memory, no DB for MVP)
const gameEngine = new GameEngine();

// Betting system
const bettingSystem = new BettingSystem();
gameEngine.setBettingSystem(bettingSystem);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'alive',
    version: '2.0.0',
    games: gameEngine.getActiveGameCount(),
    uptime: Math.floor(process.uptime()),
    connectedSockets: io.engine?.clientsCount || 0,
    memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB'
  });
});

// API status — richer info for judges
app.get('/api/status', (req, res) => {
  const games = gameEngine.listGames();
  const totalGamesPlayed = gameEngine.totalGamesCreated || 0;
  res.json({
    name: 'Roast Royale',
    tagline: '1 Human. 15 AI Agents. Can you survive the roast?',
    version: '2.0.0',
    status: 'live',
    features: [
      '15 unique AI personas powered by Kimi K2.5',
      '3 rounds: Hot Takes → Roast Battle → Chaos',
      'Real-time Socket.io multiplayer',
      'AI voting with 40% accuracy (slightly better than random)',
      'Staggered AI response timing (2-10s) for natural feel',
      'Fallback responses when LLM is unavailable',
      'On-chain betting with $OPENWORK on Base',
      'Per-round deposit wallets with real-time monitoring',
      'Automated payouts: House 5% / Most Human 30% / Correct Guessers 65%'
    ],
    stats: {
      activeGames: games.length,
      totalGamesCreated: totalGamesPlayed,
      aiPersonas: 15,
      connectedClients: io.engine?.clientsCount || 0,
      uptime: Math.floor(process.uptime())
    },
    tech: {
      runtime: 'Node.js',
      framework: 'Express + Socket.io',
      ai: 'Kimi K2.5 (free tier)',
      hosting: 'Tailscale Funnel'
    },
    endpoints: {
      health: 'GET /health',
      status: 'GET /api/status',
      createGame: 'POST /api/games { playerName }',
      getGame: 'GET /api/games/:gameId',
      listGames: 'GET /api/games',
      leaderboard: 'GET /api/leaderboard'
    }
  });
});

// REST: Create a new game
app.post('/api/games', (req, res) => {
  const { playerName } = req.body;
  if (!playerName || typeof playerName !== 'string' || playerName.trim().length === 0) {
    return res.status(400).json({ error: 'playerName required (non-empty string)' });
  }
  if (playerName.length > 20) {
    return res.status(400).json({ error: 'playerName must be 20 characters or less' });
  }
  
  try {
    const game = gameEngine.createGame(playerName.trim());
    res.status(201).json({ 
      gameId: game.id, 
      playerId: game.humanPlayer.id,
      players: game.players.length,
      message: `Game created! You're playing against ${game.aiPlayers.length} AI agents. Good luck. 🔥`
    });
  } catch (err) {
    console.error('Game creation error:', err);
    res.status(500).json({ error: 'Failed to create game' });
  }
});

// REST: Get game state (for reconnection)
app.get('/api/games/:gameId', (req, res) => {
  const game = gameEngine.getGame(req.params.gameId);
  if (!game) return res.status(404).json({ error: 'Game not found' });
  res.json(game.getPublicState());
});

// REST: List active games
app.get('/api/games', (req, res) => {
  res.json({ 
    games: gameEngine.listGames(),
    total: gameEngine.getActiveGameCount()
  });
});

// Leaderboard (tracks games played per session)
app.get('/api/leaderboard', (req, res) => {
  res.json({
    message: 'Leaderboard coming soon — play more games!',
    gamesActive: gameEngine.getActiveGameCount()
  });
});

// Socket.io connection tracking
io.on('connection', () => {
  console.log(`📡 Clients: ${io.engine?.clientsCount || '?'}`);
});

// Socket.io handlers
setupSocketHandlers(io, gameEngine);

// Betting socket handlers
bettingSystem.setupSocketHandlers(io);

// Betting API endpoints
app.get('/api/games/:gameId/betting', (req, res) => {
  const state = bettingSystem.getState(req.params.gameId);
  if (!state) return res.status(404).json({ error: 'No betting data for this game' });
  res.json(state);
});

app.get('/api/games/:gameId/betting/:roundNum', (req, res) => {
  const state = bettingSystem.getState(req.params.gameId, parseInt(req.params.roundNum));
  if (!state) return res.status(404).json({ error: 'No betting data for this round' });
  res.json(state);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not found',
    hint: 'Try GET /api/status for available endpoints'
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🔥 Roast Royale v2.0 on port ${PORT}`);
  console.log(`   Frontend: ${FRONTEND_URL}`);
  console.log(`   LLM: ${process.env.LLM_API_URL || 'fallback mode'}`);
  console.log(`   Personas: 15 unique AI characters`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down...');
  server.close(() => process.exit(0));
});
