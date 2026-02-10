const { BettingEngine } = require('./BettingEngine');
const { TokenManager } = require('./TokenManager');
const { DemoTokenManager } = require('./DemoTokenManager');

const DEMO_MODE = process.env.DEMO_MODE === 'true' || process.env.DEMO_MODE === '1';

// Lazy-load real modules only when NOT in demo mode
function loadModules() {
  if (DEMO_MODE) {
    const { DemoWalletManager } = require('./DemoWalletManager');
    const { DemoDepositMonitor } = require('./DemoDepositMonitor');
    const { DemoPayoutExecutor } = require('./DemoPayoutExecutor');
    return { 
      WalletManager: DemoWalletManager, 
      DepositMonitor: DemoDepositMonitor, 
      PayoutExecutor: DemoPayoutExecutor,
      TokenManager: DemoTokenManager
    };
  }
  const { WalletManager } = require('./WalletManager');
  const { DepositMonitor } = require('./DepositMonitor');
  const { PayoutExecutor } = require('./PayoutExecutor');
  return { 
    WalletManager, 
    DepositMonitor, 
    PayoutExecutor,
    TokenManager
  };
}

/**
 * BettingSystem — orchestrates all betting modules with RSTR token integration.
 * 
 * Set DEMO_MODE=true for fake wallets, instant deposits, no on-chain payouts.
 * 
 * Events emitted (to frontend):
 *   game:betting-open      { roundNum, gameId }
 *   game:betting-pool      { roundNum, totalPool, betCount, gameId }
 *   game:betting-closed    { roundNum, gameId }
 *   game:betting-result    { roundNum, payouts, totalPool, gameId }
 *   game:token-balance     { playerId, balance, symbol: 'RSTR' }
 *   game:token-price       { buyPrice, sellPrice, totalSupply, maxSupply }
 * 
 * Events received (from frontend):
 *   game:bet-place         { gameId, roundNum, targetPlayerId, amount }
 *   game:buy-tokens        { gameId, openworkAmount }
 *   game:sell-tokens       { gameId, rstrAmount }
 *   game:token-balance-req { gameId }
 */
class BettingSystem {
  constructor() {
    const { WalletManager, DepositMonitor, PayoutExecutor, TokenManager: TM } = loadModules();
    this.demoMode = DEMO_MODE;
    this.tokenManager = new TM();
    this.walletManager = new WalletManager();
    this.depositMonitor = new DepositMonitor(this.walletManager);
    this.bettingEngine = new BettingEngine(this.tokenManager);
    this.payoutExecutor = new PayoutExecutor(this.walletManager);
    
    if (DEMO_MODE) {
      console.log('🎰 Betting system running in DEMO MODE — 100 RSTR starting balance');
    } else {
      console.log('🎰 Betting system running in PRODUCTION MODE');
    }
  }

  /**
   * Initialize betting for a new game.
   * Called when GameEngine creates a game.
   */
  initGame(gameId, humanPlayerId, players) {
    this.bettingEngine.initGame(gameId, humanPlayerId, players);
    
    // Initialize token balances for all players
    for (const player of players) {
      if (this.tokenManager.initPlayer) {
        const result = this.tokenManager.initPlayer(player.id);
        console.log(`🪙 Player ${player.id}: ${result.balance} RSTR`);
      }
    }
    
    console.log(`🎰 Betting system ready for game ${gameId}`);
  }

  /**
   * Open betting for a round. Called on phase transition.
   * @param {string} gameId
   * @param {number} roundNum
   * @param {object} io - Socket.io server
   */
  openBetting(gameId, roundNum, io) {
    // For RSTR mode, we don't need deposit wallet but keep for compatibility
    const wallet = this.walletManager.getOrCreateWallet(gameId, roundNum);
    this.bettingEngine.openRound(gameId, roundNum, wallet?.address);

    // Emit betting open to frontend
    io.to(gameId).emit('game:betting-open', {
      gameId,
      roundNum,
      token: 'RSTR'
    });

    // Send current token price
    const priceInfo = this.tokenManager.getBondingPrice();
    io.to(gameId).emit('game:token-price', {
      ...priceInfo,
      symbol: 'RSTR'
    });

    console.log(`🎰 Betting open: game ${gameId} round ${roundNum} (RSTR mode)`);
  }

  /**
   * Close betting for a round. Called when round ends.
   */
  closeBetting(gameId, roundNum, io) {
    this.bettingEngine.closeRound(gameId, roundNum);

    io.to(gameId).emit('game:betting-closed', { gameId, roundNum });
    console.log(`🎰 Betting closed: game ${gameId} round ${roundNum}`);
  }

  /**
   * Place a bet (pick who's human) using RSTR.
   */
  placeBet(gameId, roundNum, playerId, targetPlayerId, amount = 10) {
    return this.bettingEngine.placeBet(gameId, roundNum, playerId, targetPlayerId, amount);
  }

  /**
   * Resolve and pay out a round.
   * Called after voting/reveal phase.
   */
  async resolveAndPayout(gameId, roundNum, io) {
    try {
      // Resolve bets
      const result = this.bettingEngine.resolveRound(gameId, roundNum);
      
      if (result.totalPool === 0) {
        io.to(gameId).emit('game:betting-result', {
          gameId, roundNum,
          totalPool: 0,
          message: 'No bets placed this round',
          payouts: []
        });
        return result;
      }

      // Send balance updates to all winners
      for (const payout of result.payouts) {
        if (payout.playerId && (payout.type === 'most_human' || payout.type === 'correct_guess')) {
          const balance = this.tokenManager.getBalance(payout.playerId);
          io.to(gameId).emit('game:token-balance', {
            playerId: payout.playerId,
            balance,
            symbol: 'RSTR',
            change: `+${payout.amount.toFixed(2)}`
          });
        }
      }

      // Emit results to frontend
      io.to(gameId).emit('game:betting-result', {
        gameId,
        roundNum,
        totalPool: result.totalPool,
        houseCut: result.houseCut,
        correctGuessers: result.correctGuessers,
        payouts: result.payouts.map(p => ({
          type: p.type,
          playerId: p.playerId,
          amount: p.amount,
          reason: p.reason
        }))
      });

      return result;
    } catch (err) {
      console.error(`❌ Betting resolution failed for game ${gameId} round ${roundNum}:`, err);
      io.to(gameId).emit('game:betting-result', {
        gameId, roundNum,
        error: 'Round resolution failed',
        message: err.message
      });
      throw err;
    }
  }

  /**
   * Full game cleanup.
   */
  async cleanupGame(gameId) {
    this.depositMonitor.unwatchGame(gameId);
    this.bettingEngine.cleanupGame(gameId);
    console.log(`🧹 Betting system cleaned up for game ${gameId}`);
  }

  /**
   * Get betting state for API/frontend.
   */
  getState(gameId, roundNum) {
    if (roundNum) {
      return this.bettingEngine.getRoundState(gameId, roundNum);
    }
    return this.bettingEngine.getGameSummary(gameId);
  }

  /**
   * Get token balance for a player
   */
  getTokenBalance(playerId) {
    return this.tokenManager.getBalance(playerId);
  }

  /**
   * Get token price info
   */
  getTokenPrice() {
    return this.tokenManager.getBondingPrice();
  }

  /**
   * Get full token info
   */
  getTokenInfo() {
    return this.tokenManager.getTokenInfo();
  }

  /**
   * Setup Socket.io handlers for betting and token events.
   */
  setupSocketHandlers(io) {
    io.on('connection', (socket) => {
      
      // ============================================================
      // BETTING EVENTS
      // ============================================================
      
      // Player places a bet (picks who's human) with RSTR amount
      socket.on('game:bet-place', ({ gameId, roundNum, targetPlayerId, amount }) => {
        const gid = gameId || socket.gameId;
        if (!gid) {
          socket.emit('game:bet-error', { error: 'Not in a game' });
          return;
        }

        const playerId = socket.playerId || socket.id;
        const betAmount = amount || 10; // Default 10 RSTR per bet

        const result = this.placeBet(gid, roundNum, playerId, targetPlayerId, betAmount);

        if (result.success) {
          socket.emit('game:bet-confirmed', {
            roundNum,
            targetPlayerId,
            amount: result.amount,
            message: `Bet placed! ${result.amount} RSTR on player being human 🎰`
          });

          // Update pool for everyone
          const state = this.getState(gid, roundNum);
          if (state) {
            io.to(gid).emit('game:betting-pool', {
              gameId: gid,
              roundNum,
              totalPool: state.totalPool,
              betCount: state.betCount
            });
          }

          // Send updated balance to player
          const newBalance = this.getTokenBalance(playerId);
          socket.emit('game:token-balance', {
            playerId,
            balance: newBalance,
            symbol: 'RSTR',
            change: `-${betAmount}`
          });
        } else {
          socket.emit('game:bet-error', { error: result.error });
        }
      });

      // Get current betting state
      socket.on('game:bet-state', ({ gameId, roundNum }) => {
        const state = this.getState(gameId || socket.gameId, roundNum);
        socket.emit('game:bet-state', state);
      });

      // ============================================================
      // TOKEN EVENTS
      // ============================================================
      
      // Get player's token balance
      socket.on('game:token-balance-req', ({ gameId, playerId }) => {
        const pid = playerId || socket.playerId || socket.id;
        const balance = this.getTokenBalance(pid);
        socket.emit('game:token-balance', {
          playerId: pid,
          balance,
          symbol: 'RSTR'
        });
      });

      // Buy tokens with OPENWORK (simulated in demo)
      socket.on('game:buy-tokens', ({ gameId, openworkAmount }) => {
        const playerId = socket.playerId || socket.id;
        
        if (!openworkAmount || openworkAmount <= 0) {
          socket.emit('game:token-error', { error: 'Invalid amount' });
          return;
        }

        const result = this.tokenManager.buyTokens(playerId, openworkAmount);
        
        if (result.success) {
          socket.emit('game:token-balance', {
            playerId,
            balance: result.newBalance,
            symbol: 'RSTR',
            change: `+${result.rstrReceived.toFixed(4)}`
          });
          
          socket.emit('game:buy-tokens-confirmed', {
            openworkSpent: result.openworkSpent,
            rstrReceived: result.rstrReceived,
            newBalance: result.newBalance
          });
        } else {
          socket.emit('game:token-error', { error: result.error });
        }
      });

      // Sell tokens for OPENWORK (simulated in demo)
      socket.on('game:sell-tokens', ({ gameId, rstrAmount }) => {
        const playerId = socket.playerId || socket.id;
        
        if (!rstrAmount || rstrAmount <= 0) {
          socket.emit('game:token-error', { error: 'Invalid amount' });
          return;
        }

        const result = this.tokenManager.sellTokens(playerId, rstrAmount);
        
        if (result.success) {
          socket.emit('game:token-balance', {
            playerId,
            balance: result.newBalance,
            symbol: 'RSTR',
            change: `-${rstrAmount}`
          });
          
          socket.emit('game:sell-tokens-confirmed', {
            rstrSold: result.rstrSold,
            openworkReceived: result.openworkReceived,
            newBalance: result.newBalance
          });
        } else {
          socket.emit('game:token-error', { error: result.error });
        }
      });

      // Get current token price
      socket.on('game:token-price-req', () => {
        const priceInfo = this.getTokenPrice();
        socket.emit('game:token-price', {
          ...priceInfo,
          symbol: 'RSTR'
        });
      });

      // ============================================================
      // DEMO MODE EVENTS
      // ============================================================
      
      if (this.demoMode) {
        // Legacy demo deposit (still supported for compatibility)
        socket.on('game:demo-deposit', ({ gameId, roundNum, amount }) => {
          const gid = gameId || socket.gameId;
          if (!gid) {
            socket.emit('game:bet-error', { error: 'Not in a game' });
            return;
          }

          // In demo mode, just grant more RSTR
          const playerId = socket.playerId || socket.id;
          const bonusAmount = amount ? parseFloat(amount) / 10 : 10; // Convert fake OPENWORK to RSTR
          
          const result = this.tokenManager.credit(playerId, bonusAmount, 'demo_bonus');
          
          socket.emit('game:demo-deposit-confirmed', {
            playerId,
            bonusAmount,
            newBalance: result.newBalance,
            message: `💰 Demo bonus: +${bonusAmount} RSTR`
          });

          socket.emit('game:token-balance', {
            playerId,
            balance: result.newBalance,
            symbol: 'RSTR',
            change: `+${bonusAmount}`
          });

          console.log(`🎰 [DEMO] Bonus: ${bonusAmount} RSTR to ${playerId}`);
        });

        // Quick bet for demo (uses default 10 RSTR)
        socket.on('game:demo-bet', ({ gameId, roundNum, targetPlayerId }) => {
          const gid = gameId || socket.gameId;
          const playerId = socket.playerId || socket.id;

          const result = this.placeBet(gid, roundNum, playerId, targetPlayerId, 10);

          if (result.success) {
            socket.emit('game:bet-confirmed', {
              roundNum,
              targetPlayerId,
              amount: result.amount,
              message: `🎰 Bet placed on player ${targetPlayerId}!`
            });

            const state = this.getState(gid, roundNum);
            if (state) {
              io.to(gid).emit('game:betting-pool', {
                gameId: gid,
                roundNum,
                totalPool: state.totalPool,
                betCount: state.betCount
              });
            }

            // Send updated balance
            const newBalance = this.getTokenBalance(playerId);
            socket.emit('game:token-balance', {
              playerId,
              balance: newBalance,
              symbol: 'RSTR',
              change: '-10'
            });
          } else {
            socket.emit('game:bet-error', { error: result.error });
          }
        });
      }

      // Send initial token balance on connection
      const playerId = socket.playerId || socket.id;
      if (this.tokenManager.initPlayer) {
        this.tokenManager.initPlayer(playerId);
      }
      const balance = this.getTokenBalance(playerId);
      socket.emit('game:token-balance', {
        playerId,
        balance,
        symbol: 'RSTR'
      });
    });
  }
}

module.exports = { BettingSystem };
