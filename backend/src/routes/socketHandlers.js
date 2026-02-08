const { PHASE } = require('../game/GameEngine');

function setupSocketHandlers(io, gameEngine) {
  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Join a game
    socket.on('joinGame', ({ gameId, playerId }) => {
      const game = gameEngine.getGame(gameId);
      if (!game) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }

      // Verify this is the human player
      if (game.humanPlayer.id !== playerId) {
        socket.emit('error', { message: 'Invalid player' });
        return;
      }

      game.humanPlayer.isConnected = true;
      socket.join(gameId);
      socket.gameId = gameId;
      socket.playerId = playerId;

      // Send current game state
      socket.emit('gameState', game.getPublicState());

      // Notify room
      io.to(gameId).emit('playerJoined', {
        playerId: game.humanPlayer.id,
        playerName: game.humanPlayer.name
      });

      console.log(`🎮 Player ${game.humanPlayer.name} joined game ${gameId}`);

      // Auto-start: transition from lobby after short delay
      if (game.phase === PHASE.LOBBY) {
        setTimeout(() => {
          if (game.phase === PHASE.LOBBY) {
            game.advancePhase(io);
          }
        }, 5000); // 5 second lobby before first round
      }
    });

    // Player sends a message
    socket.on('message', ({ text }) => {
      if (!socket.gameId || !socket.playerId) return;
      
      const game = gameEngine.getGame(socket.gameId);
      if (!game) return;

      // Only allow messages during active rounds
      if (![PHASE.ROUND1_HOTTAKES, PHASE.ROUND2_ROAST, PHASE.ROUND3_CHAOS].includes(game.phase)) {
        socket.emit('error', { message: 'Chat is closed during this phase' });
        return;
      }

      const msg = game.addMessage(socket.playerId, text);
      if (msg) {
        io.to(socket.gameId).emit('message', msg);
      }
    });

    // Player casts a vote
    socket.on('vote', ({ targetId }) => {
      if (!socket.gameId || !socket.playerId) return;
      
      const game = gameEngine.getGame(socket.gameId);
      if (!game) return;

      const success = game.castVote(socket.playerId, targetId);
      if (success) {
        // Send updated vote counts to room
        io.to(socket.gameId).emit('voteUpdate', game.getPublicState().votes);
        
        // Check if all votes are in (human + AIs)
        const totalVoters = game.players.length;
        const totalVotes = Object.keys(game.votes).length;
        if (totalVotes >= totalVoters) {
          // All votes in — move to reveal early
          setTimeout(() => {
            if (game.phase === PHASE.VOTING) {
              game.advancePhase(io);
            }
          }, 2000);
        }
      }
    });

    // Player requests to skip to next phase (for testing/demo)
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
          io.to(socket.gameId).emit('playerDisconnected', { playerId: socket.playerId });
        }
      }
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });
}

module.exports = { setupSocketHandlers };
