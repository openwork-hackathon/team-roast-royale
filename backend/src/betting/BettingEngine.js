const { ethers } = require('ethers');

/**
 * BettingEngine — manages bet placement, tracking, and result computation.
 * 
 * Flow per round:
 * 1. Round starts → betting opens → wallet address shown
 * 2. Players deposit $OPENWORK to the round wallet
 * 3. Players pick who they think is human (via Socket.io vote)
 * 4. Round ends → betting closes
 * 5. Results computed: who was right, split pools
 * 
 * Payout split:
 * - House: 5%
 * - "Most Human" player (most votes received): 30%
 * - Correct guessers: 65% (split equally)
 */

const SPLIT = {
  HOUSE: 0.05,        // 5%
  MOST_HUMAN: 0.30,   // 30%
  CORRECT_GUESSERS: 0.65  // 65%
};

class BettingEngine {
  constructor() {
    // gameId -> { rounds: { 1: RoundBet, 2: RoundBet, 3: RoundBet } }
    this.games = new Map();
  }

  /**
   * Initialize betting for a game.
   */
  initGame(gameId, humanPlayerId, players) {
    this.games.set(gameId, {
      humanPlayerId,
      players, // [{ id, name }]
      rounds: {}
    });
    console.log(`🎰 Betting initialized for game ${gameId}`);
  }

  /**
   * Open betting for a specific round.
   */
  openRound(gameId, roundNum, walletAddress) {
    const game = this.games.get(gameId);
    if (!game) throw new Error(`Game ${gameId} not initialized`);

    game.rounds[roundNum] = {
      walletAddress,
      status: 'open', // open -> closed -> resolved
      bets: new Map(), // depositorAddress -> { targetPlayerId, amount, txHash }
      deposits: new Map(), // depositorAddress -> { amount, txHash }
      openedAt: Date.now()
    };

    console.log(`🎰 Betting opened for game ${gameId} round ${roundNum} → ${walletAddress}`);
    return game.rounds[roundNum];
  }

  /**
   * Register a deposit (called by DepositMonitor callback).
   */
  registerDeposit(gameId, roundNum, from, amount, txHash) {
    const game = this.games.get(gameId);
    if (!game) return false;
    
    const round = game.rounds[roundNum];
    if (!round || round.status !== 'open') return false;

    const existing = round.deposits.get(from.toLowerCase());
    if (existing) {
      // Add to existing deposit
      existing.amount = (parseFloat(existing.amount) + parseFloat(amount)).toString();
      existing.txHashes = [...(existing.txHashes || [existing.txHash]), txHash];
    } else {
      round.deposits.set(from.toLowerCase(), {
        amount,
        txHash,
        txHashes: [txHash],
        timestamp: Date.now()
      });
    }

    console.log(`🎰 Deposit registered: ${amount} from ${from} in game ${gameId} round ${roundNum}`);
    return true;
  }

  /**
   * Place a bet (pick who you think is human).
   * Must have deposited first.
   */
  placeBet(gameId, roundNum, depositorAddress, targetPlayerId) {
    const game = this.games.get(gameId);
    if (!game) return { success: false, error: 'Game not found' };

    const round = game.rounds[roundNum];
    if (!round) return { success: false, error: 'Round not found' };
    if (round.status !== 'open') return { success: false, error: 'Betting closed' };

    // Check that target is a valid player
    const targetExists = game.players.some(p => p.id === targetPlayerId);
    if (!targetExists) return { success: false, error: 'Invalid player target' };

    // Check deposit exists
    const deposit = round.deposits.get(depositorAddress.toLowerCase());
    if (!deposit) return { success: false, error: 'No deposit found — deposit $OPENWORK first' };

    // Place the bet
    round.bets.set(depositorAddress.toLowerCase(), {
      targetPlayerId,
      amount: deposit.amount,
      timestamp: Date.now()
    });

    console.log(`🎰 Bet placed: ${depositorAddress} → player ${targetPlayerId} (${deposit.amount} $OPENWORK)`);
    return { success: true, amount: deposit.amount, target: targetPlayerId };
  }

  /**
   * Close betting for a round (no more bets accepted).
   */
  closeRound(gameId, roundNum) {
    const game = this.games.get(gameId);
    if (!game) return;

    const round = game.rounds[roundNum];
    if (!round) return;

    round.status = 'closed';
    round.closedAt = Date.now();
    console.log(`🎰 Betting closed for game ${gameId} round ${roundNum}`);
  }

  /**
   * Resolve a round — compute winners and payout amounts.
   * @returns {{ houseCut, mostHumanPayout, correctGuessers, payouts }}
   */
  resolveRound(gameId, roundNum) {
    const game = this.games.get(gameId);
    if (!game) throw new Error(`Game ${gameId} not found`);

    const round = game.rounds[roundNum];
    if (!round) throw new Error(`Round ${roundNum} not found`);

    round.status = 'resolved';

    // Calculate total pool
    let totalPool = 0;
    for (const deposit of round.deposits.values()) {
      totalPool += parseFloat(deposit.amount);
    }

    if (totalPool === 0) {
      console.log(`🎰 No bets in game ${gameId} round ${roundNum}`);
      return { houseCut: 0, mostHumanPayout: { address: null, amount: 0 }, correctGuessers: [], payouts: [], totalPool: 0 };
    }

    // Split pool
    const houseCut = totalPool * SPLIT.HOUSE;
    const mostHumanPool = totalPool * SPLIT.MOST_HUMAN;
    const guessersPool = totalPool * SPLIT.CORRECT_GUESSERS;

    // Find "Most Human" — player with most votes from bettors
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
    for (const [address, bet] of round.bets.entries()) {
      if (bet.targetPlayerId === game.humanPlayerId) {
        correctGuessers.push({ address, amount: bet.amount });
      }
    }

    // Build payout list
    const payouts = [];

    // House cut (goes to HOUSE_WALLET — handled by PayoutExecutor)
    payouts.push({
      type: 'house',
      address: null, // PayoutExecutor fills in HOUSE_WALLET
      amount: houseCut.toString()
    });

    // Most Human payout — the player who received the most votes
    // In our game the "most human" prize goes to the bettor who placed the biggest
    // bet on the most-voted player. If the most-voted IS the human, it goes to
    // the biggest correct guesser. If nobody voted, skip.
    if (mostHumanPlayerId) {
      // Find the bettor who bet the most on mostHumanPlayerId
      let biggestBettor = null;
      let biggestAmount = 0;
      for (const [address, bet] of round.bets.entries()) {
        if (bet.targetPlayerId === mostHumanPlayerId && parseFloat(bet.amount) > biggestAmount) {
          biggestAmount = parseFloat(bet.amount);
          biggestBettor = address;
        }
      }
      if (biggestBettor) {
        payouts.push({
          type: 'most_human',
          address: biggestBettor,
          amount: mostHumanPool.toString(),
          reason: `Biggest bet on most-voted player ${mostHumanPlayerId}`
        });
      }
    }

    // Correct guessers split
    if (correctGuessers.length > 0) {
      const perGuesser = guessersPool / correctGuessers.length;
      for (const guesser of correctGuessers) {
        payouts.push({
          type: 'correct_guess',
          address: guesser.address,
          amount: perGuesser.toString(),
          reason: 'Correctly identified the human'
        });
      }
    } else {
      // No one guessed right — roll guessers pool into house
      payouts[0].amount = (houseCut + guessersPool).toString();
      payouts[0].reason = 'No correct guessers — guessers pool rolled into house';
    }

    const result = {
      totalPool,
      houseCut,
      mostHumanPayout: { playerId: mostHumanPlayerId, amount: mostHumanPool },
      correctGuessers: correctGuessers.map(g => g.address),
      payouts,
      resolvedAt: Date.now()
    };

    round.result = result;
    console.log(`🎰 Round resolved: pool=${totalPool}, house=${houseCut}, correct=${correctGuessers.length}`);
    return result;
  }

  /**
   * Get betting state for a round (for frontend).
   */
  getRoundState(gameId, roundNum) {
    const game = this.games.get(gameId);
    if (!game) return null;

    const round = game.rounds[roundNum];
    if (!round) return null;

    let totalPool = 0;
    for (const deposit of round.deposits.values()) {
      totalPool += parseFloat(deposit.amount);
    }

    return {
      walletAddress: round.walletAddress,
      status: round.status,
      totalPool: totalPool.toString(),
      depositorCount: round.deposits.size,
      betCount: round.bets.size,
      result: round.result || null
    };
  }

  /**
   * Get full game betting summary.
   */
  getGameSummary(gameId) {
    const game = this.games.get(gameId);
    if (!game) return null;

    const rounds = {};
    for (const [num, round] of Object.entries(game.rounds)) {
      rounds[num] = this.getRoundState(gameId, parseInt(num));
    }

    return {
      gameId,
      humanPlayerId: game.humanPlayerId,
      rounds
    };
  }

  /**
   * Cleanup a game.
   */
  cleanupGame(gameId) {
    this.games.delete(gameId);
  }
}

module.exports = { BettingEngine, SPLIT };
