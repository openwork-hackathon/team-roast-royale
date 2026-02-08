const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { GameEngine } = require('./game/GameEngine');
const { setupSocketHandlers } = require('./routes/socketHandlers');

const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// Game engine (in-memory, no DB for MVP)
const gameEngine = new GameEngine();

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'alive',
    games: gameEngine.getActiveGameCount(),
    uptime: process.uptime()
  });
});

// REST: Create a new game
app.post('/api/games', (req, res) => {
  const { playerName } = req.body;
  if (!playerName) return res.status(400).json({ error: 'playerName required' });
  
  const game = gameEngine.createGame(playerName);
  res.json({ gameId: game.id, playerId: game.humanPlayer.id });
});

// REST: Get game state (for reconnection)
app.get('/api/games/:gameId', (req, res) => {
  const game = gameEngine.getGame(req.params.gameId);
  if (!game) return res.status(404).json({ error: 'Game not found' });
  res.json(game.getPublicState());
});

// REST: List active games
app.get('/api/games', (req, res) => {
  res.json(gameEngine.listGames());
});

// Socket.io handlers
setupSocketHandlers(io, gameEngine);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🔥 Roast Royale server on port ${PORT}`);
});
