/**
 * BettingEngine — manages RSTR bet placement, tracking, and result computation.
 * 
 * Flow per round:
 * 1. Round starts -> betting opens -> RSTR wagering enabled
 * 2. Players place bets using their RSTR balance (via TokenManager)
 * 3. Players pick who they think is human (via Socket.io vote)
 * 4. Round ends -> betting closes
 * 5. Results computed: who was right, split pools in RSTR
 * 
 * Payout split:
 * - House: 5%
 * - "Most Human" player (most votes received): 30%
 * - Correct guessers: 65% (split equally)
 * 
 * All amounts are now in RSTR tokens instead of raw OPENWORK deposits.
 */

const SPLIT = {
  HOUSE: 0.05,        // 5%
  MOST_HUMAN: 0.30,   // 30%
  CORRECT_GUESSERS: 0.65  // 65%
};

class BettingEngine {
  constructor(tokenManager) {
    // TokenManager instance for balance management
    this.tokenManager = tokenManager;
    
    // gameId -> { rounds: { 1: RoundBet, 2: RoundBet, 3: RoundBet } }
    this.games = new Map();
  }

  /**
   * Initialize betting for a game.
   * @param {string} gameId 
   * @param {string} humanPlayerId 
   * @param {Array} players - Array of player objects with id and name
   */
  initGame(gameId, humanPlayerId, players) {
    this.games.set(gameId, {
      humanPlayerId,
      players: players,
      rounds: {}
    });
    
    // Initialize all players with token balances (Demo mode gives 100 RSTR)
    for (const player of players) {
      if (this.tokenManager.initPlayer) {
        // Demo mode - auto-grants starting balance
        this.tokenManager.initPlayer(player.id);
      }
    }
    
    console.log(`Betting initialized for game ${gameId} with ${players.length} players`);
  }

  /**
   * Open betting for a specific round.
   * @param {string} gameId 
   * @param {number} roundNum 
   * @param {string} walletAddress - Kept for backward compatibility
   */
  openRound(gameId, roundNum, walletAddress = null) {
    const game = this.games.get(gameId);
    if (!game) throw new Error(`Game ${gameId} not initialized`);

    game.rounds[roundNum] = {
      walletAddress: walletAddress,
      status: 'open',
      bets: new Map(),
      totalPool: 0,
      openedAt: Date.now()
    };

    console.log(`Betting opened for game ${gameId} round ${roundNum}`);
    return game.rounds[roundNum];
  }

  /**
   * Place a bet using RSTR balance (replaces the old deposit-based flow)
   * @param {string} gameId 
   * @param {number} roundNum 
   * @param {string} playerId - Player placing the bet
   * @param {string} targetPlayerId - Player they think is human
   * @param {number} amount - Amount of RSTR to wager
   * @returns {{ success: boolean, amount: number, error?: string }}
   */
  placeBet(gameId, roundNum, playerId, targetPlayerId, amount = 10) {
    const game = this.games.get(gameId);
    if (!game) return { success: false, error: 'Game not found' };

    const round = game.rounds[roundNum];
    if (!round) return { success: false, error: 'Round not found' };
    if (round.status !== 'open') return { success: false, error: 'Betting closed' };

    // Check that target is a valid player
    const targetExists = game.players.some(p => p.id === targetPlayerId);
    if (!targetExists) return { success: false, error: 'Invalid player target' };

    // Check player has sufficient RSTR balance
    const balance = this.tokenManager.getBalance(playerId);
    if (balance < amount) {
      return { 
        success: false, 
        error: `Insufficient RSTR balance. You have ${balance} RSTR but tried to bet ${amount} RSTR`
      };
    }

    // Debit RSTR from player
    const debitResult = this.tokenManager.debit(playerId, amount, `bet_round_${roundNum}`);
    if (!debitResult.success) {
      return { success: false, error: debitResult.error };
    }

    // Place the bet
    round.bets.set(playerId, {
      targetPlayerId: targetPlayerId,
      amount: amount,
      timestamp: Date.now()
    });

    // Update pool total
    round.totalPool += amount;

    console.log(`Bet placed: ${playerId} -> player ${targetPlayerId} (${amount} RSTR)`);
    return { success: true, amount: amount, target: targetPlayerId };
  }

  /**
   * Close betting for a round (no more bets accepted).
   * @param {string} gameId 
   * @param {number} roundNum 
   */
  closeRound(gameId, roundNum) {
    const game = this.games.get(gameId);
    if (!game) return;

    const round = game.rounds[roundNum];
    if (!round) return;

    round.status = 'closed';
    round.closedAt = Date.now();
    console.log(`Betting closed for game ${gameId} round ${roundNum}. Pool: ${round.totalPool} RSTR`);
  }

  /**
   * Resolve a round - compute winners and payout amounts in RSTR.
   * @param {string} gameId 
   * @param {number} roundNum 
   * @returns {{ houseCut: number, mostHumanPayout: object, correctGuessers: Array, payouts: Array, totalPool: number }}
   */
  resolveRound(gameId, roundNum) {
    const game = this.games.get(gameId);
    if (!game) throw new Error(`Game ${gameId} not found`);

    const round = game.rounds[roundNum];
    if (!round) throw new Error(`Round ${roundNum} not found`);

    round.status = 'resolved';
    const totalPool = round.totalPool;

    if (totalPool === 0) {
      console.log(`No bets in game ${gameId} round ${roundNum}`);
      return { 
        houseCut: 0, 
        mostHumanPayout: { playerId: null, amount: 0 }, 
        correctGuessers: [], 
        payouts: [], 
        totalPool: 0 
      };
    }

    // Split pool
    const houseCut = totalPool * SPLIT.HOUSE;
    const mostHumanPool = totalPool * SPLIT.MOST_HUMAN;
    const guessersPool = totalPool * SPLIT.CORRECT_GUESSERS;

    // Find "Most Human" - player with most votes from bettors
    const voteCounts = {};
    for (const bet of round.bets.values()) {
      voteCounts[bet.targetPlayerId] = (voteCounts[bet.targetPlayerId] || 0) + 1;
    }
    
    let mostHumanPlayerId = null;
    let maxVotes = 0;
    for (const [playerId, count] of Object.entries(voteCounts)) {
      if (count > maxVotes) {
        maxVotes = count;
        mostHumanPlayerId = playerId;
      }
    }

    // Find correct guessers (those who picked the actual human)
    const correctGuessers = [];
    for (const [playerId, bet] of round.bets.entries()) {
      if (bet.targetPlayerId === game.humanPlayerId) {
        correctGuessers.push({ playerId: playerId, amount: bet.amount });
      }
    }

    // Build payout list
    const payouts = [];

    // House cut (goes to house treasury)
    payouts.push({
      type: 'house',
      playerId: null,
      amount: houseCut
    });

    // Most Human payout - the bettor who bet the most on mostHumanPlayerId
    if (mostHumanPlayerId) {
      let biggestBettor = null;
      let biggestAmount = 0;
      for (const [playerId, bet] of round.bets.entries()) {
        if (bet.targetPlayerId === mostHumanPlayerId && bet.amount > biggestAmount) {
          biggestAmount = bet.amount;
          biggestBettor = playerId;
        }
      }
      if (biggestBettor) {
        payouts.push({
          type: 'most_human',
          playerId: biggestBettor,
          amount: mostHumanPool,
          reason: `Biggest bet on most-voted player ${mostHumanPlayerId}`
        });
        
        // Credit the winner
        this.tokenManager.credit(biggestBettor, mostHumanPool, 'most_human_prize');
      }
    }

    // Correct guessers split
    if (correctGuessers.length > 0) {
      const perGuesser = guessersPool / correctGuessers.length;
      for (const guesser of correctGuessers) {
        payouts.push({
          type: 'correct_guess',
          playerId: guesser.playerId,
          amount: perGuesser,
          reason: 'Correctly identified the human'
        });
        
        // Credit the winner
        this.tokenManager.credit(guesser.playerId, perGuesser, 'correct_guess_prize');
      }
    } else {
      // No one guessed right - roll guessers pool into house
      payouts[0].amount = houseCut + guessersPool;
      payouts[0].reason = 'No correct guessers - guessers pool rolled into house';
    }

    const result = {
      totalPool: totalPool,
      houseCut: houseCut,
      mostHumanPayout: { playerId: mostHumanPlayerId, amount: mostHumanPool },
      correctGuessers: correctGuessers.map(g => g.playerId),
      payouts: payouts,
      resolvedAt: Date.now()
    };

    round.result = result;
    console.log(`Round resolved: pool=${totalPool} RSTR, house=${houseCut.toFixed(2)}, correct=${correctGuessers.length}`);
    return result;
  }

  /**
   * Get betting state for a round (for frontend).
   * @param {string} gameId 
   * @param {number} roundNum 
   */
  getRoundState(gameId, roundNum) {
    const game = this.games.get(gameId);
    if (!game) return null;

    const round = game.rounds[roundNum];
    if (!round) return null;

    // Convert bets Map to plain object for serialization
    const betsArray = [];
    for (const [playerId, bet] of round.bets.entries()) {
      betsArray.push({
        playerId: playerId,
        targetPlayerId: bet.targetPlayerId,
        amount: bet.amount,
        timestamp: bet.timestamp
      });
    }

    return {
      status: round.status,
      totalPool: round.totalPool,
      betCount: round.bets.size,
      bets: betsArray,
      result: round.result || null
    };
  }

  /**
   * Get full game betting summary.
   * @param {string} gameId 
   */
  getGameSummary(gameId) {
    const game = this.games.get(gameId);
    if (!game) return null;

    const rounds = {};
    for (const [num, round] of Object.entries(game.rounds)) {
      rounds[num] = this.getRoundState(gameId, parseInt(num));
    }

    // Get player balances
    const playerBalances = {};
    for (const player of game.players) {
      playerBalances[player.id] = this.tokenManager.getBalance(player.id);
    }

    return {
      gameId: gameId,
      humanPlayerId: game.humanPlayerId,
      rounds: rounds,
      playerBalances: playerBalances
    };
  }

  /**
   * Get a specific player's bet for a round
   * @param {string} gameId 
   * @param {number} roundNum 
   * @param {string} playerId 
   */
  getPlayerBet(gameId, roundNum, playerId) {
    const game = this.games.get(gameId);
    if (!game) return null;

    const round = game.rounds[roundNum];
    if (!round) return null;

    return round.bets.get(playerId) || null;
  }

  /**
   * Cleanup a game.
   * @param {string} gameId 
   */
  cleanupGame(gameId) {
    this.games.delete(gameId);
  }

  /**
   * Legacy method for backward compatibility - no longer used with RSTR
   * @deprecated Use placeBet with RSTR instead
   */
  registerDeposit(gameId, roundNum, from, amount, txHash) {
    console.warn('registerDeposit is deprecated - use placeBet with RSTR instead');
    return false;
  }
}

module.exports = { BettingEngine, SPLIT };
