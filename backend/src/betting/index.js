const { BettingEngine } = require('./BettingEngine');

const DEMO_MODE = process.env.DEMO_MODE === 'true' || process.env.DEMO_MODE === '1';

// Lazy-load real modules only when NOT in demo mode
function loadModules() {
  if (DEMO_MODE) {
    const { DemoWalletManager } = require('./DemoWalletManager');
    const { DemoDepositMonitor } = require('./DemoDepositMonitor');
    const { DemoPayoutExecutor } = require('./DemoPayoutExecutor');
    return { WalletManager: DemoWalletManager, DepositMonitor: DemoDepositMonitor, PayoutExecutor: DemoPayoutExecutor };
  }
  const { WalletManager } = require('./WalletManager');
  const { DepositMonitor } = require('./DepositMonitor');
  const { PayoutExecutor } = require('./PayoutExecutor');
  return { WalletManager, DepositMonitor, PayoutExecutor };
}

/**
 * BettingSystem — orchestrates all betting modules.
 * 
 * Set DEMO_MODE=true for fake wallets, instant deposits, no on-chain payouts.
 * 
 * Events emitted (to frontend):
 *   game:betting-open    { roundNum, walletAddress, gameId }
 *   game:betting-pool    { roundNum, totalPool, depositorCount, gameId }
 *   game:betting-closed  { roundNum, gameId }
 *   game:betting-result  { roundNum, payouts, totalPool, gameId }
 * 
 * Events received (from frontend):
 *   game:bet-place       { gameId, roundNum, targetPlayerId, walletAddress }
 *   game:demo-deposit    { gameId, roundNum, amount }  (DEMO_MODE only)
 */
class BettingSystem {
  constructor() {
    const { WalletManager, DepositMonitor, PayoutExecutor } = loadModules();
    this.demoMode = DEMO_MODE;
    this.walletManager = new WalletManager();
    this.depositMonitor = new DepositMonitor(this.walletManager);
    this.bettingEngine = new BettingEngine();
    this.payoutExecutor = new PayoutExecutor(this.walletManager);
    
    if (DEMO_MODE) {
      console.log('🎰 Betting system running in DEMO MODE — no real crypto');
    }
  }

  /**
   * Initialize betting for a new game.
   * Called when GameEngine creates a game.
   */
  initGame(gameId, humanPlayerId, players) {
    this.bettingEngine.initGame(gameId, humanPlayerId, players);
    // Pre-generate all 3 round wallets
    this.walletManager.getGameWallets(gameId);
    console.log(`🎰 Betting system ready for game ${gameId}`);
  }

  /**
   * Open betting for a round. Called on phase transition.
   * @param {string} gameId
   * @param {number} roundNum
   * @param {object} io - Socket.io server
   */
  openBetting(gameId, roundNum, io) {
    const wallet = this.walletManager.getOrCreateWallet(gameId, roundNum);
    this.bettingEngine.openRound(gameId, roundNum, wallet.address);

    // Start monitoring deposits
    this.depositMonitor.watchRound(gameId, roundNum, (deposit) => {
      // Register deposit in engine
      this.bettingEngine.registerDeposit(
        deposit.gameId, deposit.roundNum, deposit.from, deposit.amount, deposit.txHash
      );

      // Broadcast pool update to frontend
      const state = this.bettingEngine.getRoundState(gameId, roundNum);
      io.to(gameId).emit('game:betting-pool', {
        gameId,
        roundNum,
        totalPool: state.totalPool,
        depositorCount: state.depositorCount,
        lastDeposit: {
          from: deposit.from,
          amount: deposit.amount,
          txHash: deposit.txHash
        }
      });
    });

    // Emit betting open to frontend
    io.to(gameId).emit('game:betting-open', {
      gameId,
      roundNum,
      walletAddress: wallet.address
    });

    console.log(`🎰 Betting open: game ${gameId} round ${roundNum} → ${wallet.address}`);
  }

  /**
   * Close betting for a round. Called when round ends.
   */
  closeBetting(gameId, roundNum, io) {
    this.bettingEngine.closeRound(gameId, roundNum);
    this.depositMonitor.unwatchGame(gameId); // stop monitoring this game

    io.to(gameId).emit('game:betting-closed', { gameId, roundNum });
    console.log(`🎰 Betting closed: game ${gameId} round ${roundNum}`);
  }

  /**
   * Place a bet (pick who's human). Called via Socket.io.
   */
  placeBet(gameId, roundNum, depositorAddress, targetPlayerId) {
    return this.bettingEngine.placeBet(gameId, roundNum, depositorAddress, targetPlayerId);
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
          totalPool: '0',
          message: 'No bets placed this round',
          payouts: []
        });
        return result;
      }

      // Execute payouts on-chain
      const payoutResults = await this.payoutExecutor.executePayout(
        gameId, roundNum, result.payouts
      );

      // Emit results to frontend
      io.to(gameId).emit('game:betting-result', {
        gameId,
        roundNum,
        totalPool: result.totalPool.toString(),
        houseCut: result.houseCut.toString(),
        correctGuessers: result.correctGuessers,
        payouts: payoutResults.map(p => ({
          type: p.type,
          address: p.toAddress,
          amount: p.amount,
          status: p.status,
          txHash: p.txHash
        }))
      });

      return { ...result, payoutResults };
    } catch (err) {
      console.error(`❌ Betting resolution failed for game ${gameId} round ${roundNum}:`, err);
      io.to(gameId).emit('game:betting-result', {
        gameId, roundNum,
        error: 'Payout failed — funds are safe, will retry',
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
    // Don't cleanup wallets until confirmed all payouts sent
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
   * Setup Socket.io handlers for betting events.
   */
  setupSocketHandlers(io) {
    io.on('connection', (socket) => {
      // Player places a bet (picks who's human)
      socket.on('game:bet-place', ({ gameId, roundNum, targetPlayerId, walletAddress }) => {
        if (!walletAddress) {
          socket.emit('game:bet-error', { error: 'Wallet address required — connect your wallet' });
          return;
        }

        const result = this.placeBet(
          gameId || socket.gameId,
          roundNum,
          walletAddress,
          targetPlayerId
        );

        if (result.success) {
          socket.emit('game:bet-confirmed', {
            roundNum,
            targetPlayerId,
            amount: result.amount,
            message: `Bet placed! ${result.amount} $OPENWORK on player being human 🎰`
          });

          // Update pool for everyone
          const state = this.getState(gameId || socket.gameId, roundNum);
          if (state) {
            io.to(gameId || socket.gameId).emit('game:betting-pool', {
              gameId: gameId || socket.gameId,
              roundNum,
              totalPool: state.totalPool,
              depositorCount: state.depositorCount,
              betCount: state.betCount
            });
          }
        } else {
          socket.emit('game:bet-error', { error: result.error });
        }
      });

      // Get current betting state
      socket.on('game:bet-state', ({ gameId, roundNum }) => {
        const state = this.getState(gameId || socket.gameId, roundNum);
        socket.emit('game:bet-state', state);
      });

      // DEMO MODE: simulate deposit without real blockchain
      if (this.demoMode) {
        socket.on('game:demo-deposit', ({ gameId, roundNum, amount }) => {
          const gid = gameId || socket.gameId;
          if (!gid) {
            socket.emit('game:bet-error', { error: 'Not in a game' });
            return;
          }

          // Generate fake wallet for this player
          const fakeAddress = `0xPLAYER_${socket.id.slice(0, 8)}`;
          const depositAmount = amount || '100';

          // Store player's demo wallet
          socket.demoWallet = fakeAddress;

          // Simulate deposit via DemoDepositMonitor
          this.depositMonitor.simulateDeposit(gid, roundNum, fakeAddress, depositAmount);

          socket.emit('game:demo-deposit-confirmed', {
            walletAddress: fakeAddress,
            amount: depositAmount,
            roundNum,
            message: `💰 Demo deposit: ${depositAmount} $OPENWORK`
          });

          console.log(`🎰 [DEMO] Deposit: ${depositAmount} from ${fakeAddress} in game ${gid} round ${roundNum}`);
        });

        // In demo mode, allow bet without prior real deposit check
        // Override bet-place to use demo wallet
        socket.on('game:demo-bet', ({ gameId, roundNum, targetPlayerId }) => {
          const gid = gameId || socket.gameId;
          const wallet = socket.demoWallet || `0xPLAYER_${socket.id.slice(0, 8)}`;

          const result = this.placeBet(gid, roundNum, wallet, targetPlayerId);

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
                depositorCount: state.depositorCount,
                betCount: state.betCount
              });
            }
          } else {
            socket.emit('game:bet-error', { error: result.error });
          }
        });
      }
    });
  }
}

module.exports = { BettingSystem };
