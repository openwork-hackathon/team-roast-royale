const { PHASE } = require('../game/GameEngine');

function setupSocketHandlers(io, gameEngine) {
  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Create a new game (frontend: game:create)
    socket.on('game:create', ({ playerName }, callback) => {
      if (!playerName) {
        socket.emit('error', 'Player name required');
        return;
      }

      const game = gameEngine.createGame(playerName);
      game.humanPlayer.isConnected = true;
      socket.join(game.id);
      socket.gameId = game.id;
      socket.playerId = game.humanPlayer.id;

      console.log(`🎮 Game ${game.id} created by ${playerName}`);

      // Callback with game/player IDs
      if (typeof callback === 'function') {
        callback({ gameId: game.id, playerId: game.humanPlayer.id });
      }

      // Send initial state
      socket.emit('game:state', game.getPublicState());

      // Auto-start: transition from lobby after short delay
      setTimeout(() => {
        if (game.phase === PHASE.LOBBY) {
          game.advancePhase(io);
        }
      }, 5000);
    });

    // Join an existing game (frontend: game:join)
    socket.on('game:join', ({ gameId, playerName }, callback) => {
      const game = gameEngine.getGame(gameId);
      if (!game) {
        socket.emit('error', 'Game not found');
        return;
      }

      game.humanPlayer.isConnected = true;
      socket.join(gameId);
      socket.gameId = gameId;
      socket.playerId = game.humanPlayer.id;

      // Callback with player ID
      if (typeof callback === 'function') {
        callback({ playerId: game.humanPlayer.id });
      }

      // Send current game state
      socket.emit('game:state', game.getPublicState());

      // Notify room
      io.to(gameId).emit('game:player-joined', {
        id: game.humanPlayer.id,
        name: game.humanPlayer.name,
        isConnected: true
      });

      console.log(`🎮 Player ${game.humanPlayer.name} joined game ${gameId}`);

      // Auto-start if in lobby
      if (game.phase === PHASE.LOBBY) {
        setTimeout(() => {
          if (game.phase === PHASE.LOBBY) {
            game.advancePhase(io);
          }
        }, 5000);
      }
    });

    // Legacy: joinGame (backward compat)
    socket.on('joinGame', ({ gameId, playerId }) => {
      const game = gameEngine.getGame(gameId);
      if (!game) {
        socket.emit('error', 'Game not found');
        return;
      }
      if (game.humanPlayer.id !== playerId) {
        socket.emit('error', 'Invalid player');
        return;
      }

      game.humanPlayer.isConnected = true;
      socket.join(gameId);
      socket.gameId = gameId;
      socket.playerId = playerId;

      socket.emit('game:state', game.getPublicState());
      io.to(gameId).emit('game:player-joined', {
        id: game.humanPlayer.id,
        name: game.humanPlayer.name,
        isConnected: true
      });

      if (game.phase === PHASE.LOBBY) {
        setTimeout(() => {
          if (game.phase === PHASE.LOBBY) {
            game.advancePhase(io);
          }
        }, 5000);
      }
    });

    // Player sends a message (frontend: game:message)
    socket.on('game:message', ({ gameId, content }) => {
      const gid = gameId || socket.gameId;
      const pid = socket.playerId;
      if (!gid || !pid) return;
      
      const game = gameEngine.getGame(gid);
      if (!game) return;

      // Only allow messages during active rounds
      if (![PHASE.ROUND1_HOTTAKES, PHASE.ROUND2_ROAST, PHASE.ROUND3_CHAOS].includes(game.phase)) {
        socket.emit('error', 'Chat is closed during this phase');
        return;
      }

      const msg = game.addMessage(pid, content);
      if (msg) {
        io.to(gid).emit('game:message', msg);
      }
    });

    // Legacy: message
    socket.on('message', ({ text }) => {
      if (!socket.gameId || !socket.playerId) return;
      const game = gameEngine.getGame(socket.gameId);
      if (!game) return;
      if (![PHASE.ROUND1_HOTTAKES, PHASE.ROUND2_ROAST, PHASE.ROUND3_CHAOS].includes(game.phase)) return;
      const msg = game.addMessage(socket.playerId, text);
      if (msg) {
        io.to(socket.gameId).emit('game:message', msg);
      }
    });

    // Player casts a vote (frontend: game:vote)
    socket.on('game:vote', ({ gameId, votedForId }) => {
      const gid = gameId || socket.gameId;
      const pid = socket.playerId;
      if (!gid || !pid) return;
      
      const game = gameEngine.getGame(gid);
      if (!game) return;

      const success = game.castVote(pid, votedForId);
      if (success) {
        io.to(gid).emit('game:vote-update', game.getPublicState().votes);
        
        const totalVoters = game.players.length;
        const totalVotes = Object.keys(game.votes).length;
        if (totalVotes >= totalVoters) {
          setTimeout(() => {
            if (game.phase === PHASE.VOTING) {
              game.advancePhase(io);
            }
          }, 2000);
        }
      }
    });

    // Legacy: vote
    socket.on('vote', ({ targetId }) => {
      if (!socket.gameId || !socket.playerId) return;
      const game = gameEngine.getGame(socket.gameId);
      if (!game) return;
      const success = game.castVote(socket.playerId, targetId);
      if (success) {
        io.to(socket.gameId).emit('game:vote-update', game.getPublicState().votes);
        const totalVoters = game.players.length;
        const totalVotes = Object.keys(game.votes).length;
        if (totalVotes >= totalVoters) {
          setTimeout(() => {
            if (game.phase === PHASE.VOTING) {
              game.advancePhase(io);
            }
          }, 2000);
        }
      }
    });

    // Skip phase (for testing/demo)
    socket.on('skipPhase', () => {
      if (!socket.gameId) return;
      const game = gameEngine.getGame(socket.gameId);
      if (game) game.advancePhase(io);
    });

    // Disconnect
    socket.on('disconnect', () => {
      if (socket.gameId) {
        const game = gameEngine.getGame(socket.gameId);
        if (game && game.humanPlayer.id === socket.playerId) {
          game.humanPlayer.isConnected = false;
          io.to(socket.gameId).emit('game:player-left', { playerId: socket.playerId });
        }
      }
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });
}

module.exports = { setupSocketHandlers };
