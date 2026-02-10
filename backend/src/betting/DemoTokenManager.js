/**
 * DemoTokenManager.js — Simulated RSTR token management for hackathon demo
 * 
 * Same interface as TokenManager but:
 * - Every new player gets 100 RSTR automatically
 * - No real on-chain transactions
 * - Uses bonding curve math for realistic price simulation
 */

const {
  BONDING_CONFIG,
  CONTRACTS,
  calculateBuyAmount,
  calculateSellReturn,
  calculatePriceAtSupply
} = require('./TokenManager');

const DEMO_STARTING_BALANCE = 100; // 100 RSTR for every new player

class DemoTokenManager {
  constructor() {
    // Player balances: playerId -> { balance: number, address: string|null, joinedAt: number }
    this.balances = new Map();
    
    // Total supply tracking (simulated)
    this.totalSupply = 0;
    
    // Track circulating supply
    this.circulatingSupply = 0;
    
    // Track all transactions for debugging
    this.transactions = [];
    
    console.log('🪙 DemoTokenManager initialized — 100 RSTR starting balance for all players');
  }

  /**
   * Initialize a player with demo balance
   * Called automatically when player first interacts
   * @param {string} playerId 
   * @param {string|null} walletAddress 
   * @returns {{ balance: number, isNew: boolean }}
   */
  initPlayer(playerId, walletAddress = null) {
    if (!this.balances.has(playerId)) {
      this.balances.set(playerId, {
        balance: DEMO_STARTING_BALANCE,
        address: walletAddress,
        joinedAt: Date.now()
      });
      
      this.circulatingSupply += DEMO_STARTING_BALANCE;
      
      this.transactions.push({
        type: 'demo_grant',
        playerId,
        amount: DEMO_STARTING_BALANCE,
        timestamp: Date.now()
      });
      
      console.log(`🪙 Demo player initialized: ${playerId} → ${DEMO_STARTING_BALANCE} RSTR`);
      return { balance: DEMO_STARTING_BALANCE, isNew: true };
    }
    
    return { balance: this.getBalance(playerId), isNew: false };
  }

  /**
   * Get a player's RSTR balance
   * @param {string} playerId 
   * @returns {number} RSTR balance
   */
  getBalance(playerId) {
    const record = this.balances.get(playerId);
    return record ? record.balance : 0;
  }

  /**
   * Get full balance info for a player
   * @param {string} playerId 
   * @returns {{ balance: number, address: string|null, joinedAt: number|null }}
   */
  getBalanceInfo(playerId) {
    const record = this.balances.get(playerId);
    if (!record) {
      return { balance: 0, address: null, joinedAt: null };
    }
    return { 
      balance: record.balance, 
      address: record.address,
      joinedAt: record.joinedAt
    };
  }

  /**
   * Credit RSTR to a player's balance
   * @param {string} playerId 
   * @param {number} amount 
   * @param {string} reason - Optional reason for the credit
   * @returns {{ success: boolean, newBalance: number, error?: string }}
   */
  credit(playerId, amount, reason = 'credit') {
    if (amount <= 0) {
      return { success: false, error: 'Amount must be positive', newBalance: this.getBalance(playerId) };
    }

    // Auto-init player if not exists
    if (!this.balances.has(playerId)) {
      this.initPlayer(playerId);
    }

    const record = this.balances.get(playerId);
    record.balance += amount;
    this.circulatingSupply += amount;
    
    this.transactions.push({
      type: 'credit',
      playerId,
      amount,
      reason,
      timestamp: Date.now()
    });
    
    return { success: true, newBalance: record.balance };
  }

  /**
   * Debit RSTR from a player's balance
   * @param {string} playerId 
   * @param {number} amount 
   * @param {string} reason - Optional reason for the debit
   * @returns {{ success: boolean, newBalance: number, error?: string }}
   */
  debit(playerId, amount, reason = 'debit') {
    if (amount <= 0) {
      return { success: false, error: 'Amount must be positive', newBalance: this.getBalance(playerId) };
    }

    // Auto-init player if not exists
    if (!this.balances.has(playerId)) {
      this.initPlayer(playerId);
    }

    const record = this.balances.get(playerId);
    if (record.balance < amount) {
      return { 
        success: false, 
        error: 'Insufficient RSTR balance', 
        newBalance: record.balance 
      };
    }

    record.balance -= amount;
    this.circulatingSupply -= amount;
    
    this.transactions.push({
      type: 'debit',
      playerId,
      amount,
      reason,
      timestamp: Date.now()
    });
    
    return { success: true, newBalance: record.balance };
  }

  /**
   * Simulate buying RSTR tokens with OPENWORK
   * @param {string} playerId 
   * @param {number} openworkAmount 
   * @returns {{ success: boolean, rstrReceived: number, newBalance: number, error?: string }}
   */
  buyTokens(playerId, openworkAmount) {
    if (openworkAmount <= 0) {
      return { success: false, error: 'Amount must be positive', rstrReceived: 0, newBalance: this.getBalance(playerId) };
    }

    // Auto-init player if not exists
    if (!this.balances.has(playerId)) {
      this.initPlayer(playerId);
    }

    const rstrReceived = calculateBuyAmount(openworkAmount, this.totalSupply);
    
    if (rstrReceived <= 0) {
      return { success: false, error: 'Amount too small', rstrReceived: 0, newBalance: this.getBalance(playerId) };
    }

    // Simulate supply increase
    this.totalSupply += rstrReceived;
    
    // Credit to player
    const creditResult = this.credit(playerId, rstrReceived, 'buy');
    
    this.transactions.push({
      type: 'buy',
      playerId,
      openworkAmount,
      rstrReceived,
      timestamp: Date.now()
    });
    
    console.log(`🪙 Demo buy: ${playerId} spent ${openworkAmount} OPENWORK → ${rstrReceived.toFixed(4)} RSTR`);
    
    return {
      success: true,
      rstrReceived,
      openworkSpent: openworkAmount,
      newBalance: creditResult.newBalance
    };
  }

  /**
   * Simulate selling RSTR tokens for OPENWORK
   * @param {string} playerId 
   * @param {number} rstrAmount 
   * @returns {{ success: boolean, openworkReceived: number, newBalance: number, error?: string }}
   */
  sellTokens(playerId, rstrAmount) {
    if (rstrAmount <= 0) {
      return { success: false, error: 'Amount must be positive', openworkReceived: 0, newBalance: this.getBalance(playerId) };
    }

    // Auto-init player if not exists
    if (!this.balances.has(playerId)) {
      this.initPlayer(playerId);
    }

    const balance = this.getBalance(playerId);
    if (balance < rstrAmount) {
      return { success: false, error: 'Insufficient RSTR balance', openworkReceived: 0, newBalance: balance };
    }

    const openworkReceived = calculateSellReturn(rstrAmount, this.totalSupply);
    
    // Debit from player
    const debitResult = this.debit(playerId, rstrAmount, 'sell');
    if (!debitResult.success) {
      return { success: false, error: debitResult.error, openworkReceived: 0, newBalance: balance };
    }

    // Simulate supply decrease
    this.totalSupply -= rstrAmount;
    
    this.transactions.push({
      type: 'sell',
      playerId,
      rstrAmount,
      openworkReceived,
      timestamp: Date.now()
    });
    
    console.log(`🪙 Demo sell: ${playerId} sold ${rstrAmount} RSTR → ${openworkReceived.toFixed(6)} OPENWORK`);
    
    return {
      success: true,
      openworkReceived,
      rstrSold: rstrAmount,
      newBalance: debitResult.newBalance
    };
  }

  /**
   * Get current bonding curve price info
   * @returns {{ buyPrice: number, sellPrice: number, totalSupply: number, maxSupply: number }}
   */
  getBondingPrice() {
    const buyPrice = calculatePriceAtSupply(this.totalSupply);
    const sellPrice = calculateSellReturn(1, this.totalSupply);
    
    return {
      buyPrice,
      sellPrice,
      totalSupply: this.totalSupply,
      maxSupply: BONDING_CONFIG.maxSupply,
      circulatingSupply: this.circulatingSupply
    };
  }

  /**
   * Get full token info
   * @returns {object}
   */
  getTokenInfo() {
    const price = this.getBondingPrice();
    
    return {
      name: 'Roast Royale',
      symbol: 'RSTR',
      chain: 'Base (Demo Mode)',
      decimals: 6,
      ...price,
      reserveToken: 'OPENWORK',
      reserveAddress: CONTRACTS.reserveToken,
      bondContract: CONTRACTS.bondContract,
      mintClubUrl: CONTRACTS.tokenUrl,
      royaltyPercent: BONDING_CONFIG.royaltyPercent * 100,
      curveType: 'LINEAR',
      curveSteps: BONDING_CONFIG.steps,
      priceRange: {
        min: BONDING_CONFIG.minPrice,
        max: BONDING_CONFIG.maxPrice
      },
      demoMode: true,
      startingBalance: DEMO_STARTING_BALANCE
    };
  }

  /**
   * Register/update player wallet address
   * @param {string} playerId 
   * @param {string} walletAddress 
   */
  registerPlayer(playerId, walletAddress) {
    if (!this.balances.has(playerId)) {
      this.initPlayer(playerId, walletAddress);
    } else {
      const record = this.balances.get(playerId);
      record.address = walletAddress;
    }
  }

  /**
   * Get all balances (for admin/debugging)
   * @returns {Map}
   */
  getAllBalances() {
    return new Map(this.balances);
  }

  /**
   * Get transaction history for a player
   * @param {string} playerId 
   * @returns {Array}
   */
  getTransactionHistory(playerId) {
    return this.transactions.filter(t => t.playerId === playerId);
  }

  /**
   * Get all transactions (for debugging)
   * @returns {Array}
   */
  getAllTransactions() {
    return [...this.transactions];
  }

  /**
   * Reset all data (for testing)
   */
  reset() {
    this.balances.clear();
    this.totalSupply = 0;
    this.circulatingSupply = 0;
    this.transactions = [];
    console.log('🪙 DemoTokenManager reset');
  }
}

module.exports = { DemoTokenManager, DEMO_STARTING_BALANCE };
