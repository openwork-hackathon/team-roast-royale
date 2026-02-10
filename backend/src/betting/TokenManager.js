/**
 * TokenManager.js — Real RSTR token management with Mint Club bonding curve
 * 
 * Manages player RSTR balances and bonding curve math.
 * In production mode, can read on-chain price from Mint Club contract.
 */

// Bonding curve configuration (flat pricing for hackathon)
const BONDING_CONFIG = {
  minPrice: 100,        // 100 OPENWORK per RSTR (was 0.0001)
  maxPrice: 100,        // Flat rate: 100 OPENWORK per RSTR
  steps: 1,             // Single step = flat pricing
  maxSupply: 1_000_000, // Keep 1M max
  royaltyPercent: 0.03  // Keep 3%
};

// Mint Club contract addresses
const CONTRACTS = {
  bondContract: '0xc5a076cad94176c2996B32d8466Be1cE757FAa27',
  reserveToken: '0x299c30dd5974bf4d5bfe42c340ca40462816ab07', // OPENWORK
  tokenUrl: 'https://mint.club/token/base/RSTR'
};

/**
 * Calculate the price at a given supply point (linear interpolation)
 * @param {number} currentSupply - Current RSTR supply
 * @returns {number} Price in OPENWORK per RSTR
 */
function calculatePriceAtSupply(currentSupply) {
  // Flat pricing: always return minPrice (= maxPrice for flat curve)
  if (BONDING_CONFIG.steps <= 1 || BONDING_CONFIG.minPrice === BONDING_CONFIG.maxPrice) {
    return BONDING_CONFIG.minPrice;
  }
  
  const stepSize = BONDING_CONFIG.maxSupply / BONDING_CONFIG.steps;
  const step = Math.min(
    Math.floor(currentSupply / stepSize),
    BONDING_CONFIG.steps - 1
  );
  
  // Linear interpolation between steps
  const priceRange = BONDING_CONFIG.maxPrice - BONDING_CONFIG.minPrice;
  const stepProgress = (currentSupply % stepSize) / stepSize;
  const basePrice = BONDING_CONFIG.minPrice + (priceRange * step / (BONDING_CONFIG.steps - 1));
  const nextPrice = BONDING_CONFIG.minPrice + (priceRange * (step + 1) / (BONDING_CONFIG.steps - 1));
  
  return basePrice + (nextPrice - basePrice) * stepProgress;
}

/**
 * Calculate how many RSTR tokens you get for a given OPENWORK amount
 * Integrates over the bonding curve
 * @param {number} openworkAmount - Amount of OPENWORK to spend
 * @param {number} currentSupply - Current RSTR supply
 * @returns {number} RSTR tokens to receive
 */
function calculateBuyAmount(openworkAmount, currentSupply = 0) {
  if (openworkAmount <= 0) return 0;
  
  // Account for 3% royalty
  const reserveAmount = openworkAmount * (1 - BONDING_CONFIG.royaltyPercent);
  
  let remainingReserve = reserveAmount;
  let tokensToMint = 0;
  let supply = currentSupply;
  
  // Step through the curve to find token amount
  while (remainingReserve > 0 && supply < BONDING_CONFIG.maxSupply) {
    const currentPrice = calculatePriceAtSupply(supply);
    const stepEndSupply = Math.min(
      Math.ceil((supply + 1) / (BONDING_CONFIG.maxSupply / BONDING_CONFIG.steps)) * (BONDING_CONFIG.maxSupply / BONDING_CONFIG.steps),
      BONDING_CONFIG.maxSupply
    );
    const tokensInStep = stepEndSupply - supply;
    const reserveNeeded = tokensInStep * currentPrice;
    
    if (remainingReserve >= reserveNeeded) {
      // Can fill entire step
      tokensToMint += tokensInStep;
      remainingReserve -= reserveNeeded;
      supply = stepEndSupply;
    } else {
      // Partial step fill
      const tokensFromPartial = remainingReserve / currentPrice;
      tokensToMint += tokensFromPartial;
      remainingReserve = 0;
    }
  }
  
  return Math.floor(tokensToMint * 1e6) / 1e6; // Round to 6 decimals
}

/**
 * Calculate how much OPENWORK you get for selling RSTR tokens
 * @param {number} rstrAmount - Amount of RSTR to sell
 * @param {number} currentSupply - Current RSTR supply
 * @returns {number} OPENWORK to receive
 */
function calculateSellReturn(rstrAmount, currentSupply) {
  if (rstrAmount <= 0 || currentSupply <= 0) return 0;
  
  let tokensToSell = Math.min(rstrAmount, currentSupply);
  let supply = currentSupply;
  let reserveReturn = 0;
  
  // Step backwards through the curve
  while (tokensToSell > 0 && supply > 0) {
    const currentPrice = calculatePriceAtSupply(supply);
    const stepStartSupply = Math.floor(supply / (BONDING_CONFIG.maxSupply / BONDING_CONFIG.steps)) * (BONDING_CONFIG.maxSupply / BONDING_CONFIG.steps);
    const tokensInStep = supply - stepStartSupply;
    
    if (tokensToSell >= tokensInStep) {
      // Sell entire step
      reserveReturn += tokensInStep * currentPrice;
      tokensToSell -= tokensInStep;
      supply = stepStartSupply;
    } else {
      // Partial step
      reserveReturn += tokensToSell * currentPrice;
      tokensToSell = 0;
    }
  }
  
  // Account for 3% royalty
  return reserveReturn * (1 - BONDING_CONFIG.royaltyPercent);
}

class TokenManager {
  constructor() {
    // Player balances: playerId -> { balance: number, address: string }
    this.balances = new Map();
    
    // Total supply tracking (for bonding curve calculations)
    this.totalSupply = 0;
    
    // Track which tokens are "in circulation" in the game vs held by players
    this.circulatingSupply = 0;
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
   * @returns {{ balance: number, address: string|null }}
   */
  getBalanceInfo(playerId) {
    const record = this.balances.get(playerId);
    if (!record) {
      return { balance: 0, address: null };
    }
    return { balance: record.balance, address: record.address };
  }

  /**
   * Credit RSTR to a player's balance
   * @param {string} playerId 
   * @param {number} amount 
   * @returns {{ success: boolean, newBalance: number, error?: string }}
   */
  credit(playerId, amount) {
    if (amount <= 0) {
      return { success: false, error: 'Amount must be positive', newBalance: this.getBalance(playerId) };
    }

    const record = this.balances.get(playerId);
    if (!record) {
      this.balances.set(playerId, { balance: amount, address: null });
    } else {
      record.balance += amount;
    }
    
    this.circulatingSupply += amount;
    
    return { success: true, newBalance: this.getBalance(playerId) };
  }

  /**
   * Debit RSTR from a player's balance
   * @param {string} playerId 
   * @param {number} amount 
   * @returns {{ success: boolean, newBalance: number, error?: string }}
   */
  debit(playerId, amount) {
    if (amount <= 0) {
      return { success: false, error: 'Amount must be positive', newBalance: this.getBalance(playerId) };
    }

    const record = this.balances.get(playerId);
    if (!record || record.balance < amount) {
      return { 
        success: false, 
        error: 'Insufficient RSTR balance', 
        newBalance: this.getBalance(playerId) 
      };
    }

    record.balance -= amount;
    this.circulatingSupply -= amount;
    
    return { success: true, newBalance: record.balance };
  }

  /**
   * Buy RSTR tokens with OPENWORK (simulated in demo, real in production)
   * @param {string} playerId 
   * @param {number} openworkAmount 
   * @returns {{ success: boolean, rstrReceived: number, newBalance: number, error?: string }}
   */
  buyTokens(playerId, openworkAmount) {
    if (openworkAmount <= 0) {
      return { success: false, error: 'Amount must be positive', rstrReceived: 0, newBalance: this.getBalance(playerId) };
    }

    const rstrReceived = calculateBuyAmount(openworkAmount, this.totalSupply);
    
    if (rstrReceived <= 0) {
      return { success: false, error: 'Amount too small', rstrReceived: 0, newBalance: this.getBalance(playerId) };
    }

    // Update supply
    this.totalSupply += rstrReceived;
    
    // Credit to player
    const creditResult = this.credit(playerId, rstrReceived);
    
    return {
      success: true,
      rstrReceived,
      openworkSpent: openworkAmount,
      newBalance: creditResult.newBalance
    };
  }

  /**
   * Sell RSTR tokens for OPENWORK (simulated in demo, real in production)
   * @param {string} playerId 
   * @param {number} rstrAmount 
   * @returns {{ success: boolean, openworkReceived: number, newBalance: number, error?: string }}
   */
  sellTokens(playerId, rstrAmount) {
    if (rstrAmount <= 0) {
      return { success: false, error: 'Amount must be positive', openworkReceived: 0, newBalance: this.getBalance(playerId) };
    }

    const balance = this.getBalance(playerId);
    if (balance < rstrAmount) {
      return { success: false, error: 'Insufficient RSTR balance', openworkReceived: 0, newBalance: balance };
    }

    const openworkReceived = calculateSellReturn(rstrAmount, this.totalSupply);
    
    // Debit from player
    const debitResult = this.debit(playerId, rstrAmount);
    if (!debitResult.success) {
      return { success: false, error: debitResult.error, openworkReceived: 0, newBalance: balance };
    }

    // Update supply
    this.totalSupply -= rstrAmount;
    
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
    // Sell price is slightly lower due to curve mechanics
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
      chain: 'Base',
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
      }
    };
  }

  /**
   * Initialize player with their wallet address
   * @param {string} playerId 
   * @param {string} walletAddress 
   */
  registerPlayer(playerId, walletAddress) {
    const record = this.balances.get(playerId);
    if (record) {
      record.address = walletAddress;
    } else {
      this.balances.set(playerId, { balance: 0, address: walletAddress });
    }
  }

  /**
   * Get all balances (for admin/debugging)
   * @returns {Map}
   */
  getAllBalances() {
    return new Map(this.balances);
  }
}

module.exports = {
  TokenManager,
  BONDING_CONFIG,
  CONTRACTS,
  calculateBuyAmount,
  calculateSellReturn,
  calculatePriceAtSupply
};
