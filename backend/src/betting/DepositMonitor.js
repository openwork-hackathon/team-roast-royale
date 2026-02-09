const { ethers } = require('ethers');
const { OPENWORK_TOKEN, ERC20_ABI, BASE_RPC } = require('./WalletManager');

/**
 * Monitors ERC20 Transfer events to detect deposits into round wallets.
 * Uses polling (every 5s) instead of WebSocket for RPC compatibility.
 */
class DepositMonitor {
  constructor(walletManager) {
    this.walletManager = walletManager;
    this.provider = new ethers.JsonRpcProvider(BASE_RPC);
    this.token = new ethers.Contract(OPENWORK_TOKEN, ERC20_ABI, this.provider);
    this.deposits = new Map(); // "gameId:roundNum:fromAddress" -> { amount, txHash, timestamp }
    this.poolTotals = new Map(); // "gameId:roundNum" -> totalAmount (bigint)
    this.listeners = []; // { gameId, roundNum, callback }
    this.pollInterval = null;
    this.lastBlock = null;
    this.watchedAddresses = new Set(); // lowercase wallet addresses we're watching
  }

  /**
   * Start monitoring deposits for a game round.
   * @param {string} gameId
   * @param {number} roundNum
   * @param {Function} onDeposit - callback({ from, amount, txHash, gameId, roundNum })
   */
  watchRound(gameId, roundNum, onDeposit) {
    const walletInfo = this.walletManager.getOrCreateWallet(gameId, roundNum);
    this.watchedAddresses.add(walletInfo.address.toLowerCase());
    
    this.listeners.push({ gameId, roundNum, address: walletInfo.address.toLowerCase(), callback: onDeposit });
    
    console.log(`👁️ Watching deposits for game ${gameId} round ${roundNum} → ${walletInfo.address}`);
    
    // Start polling if not already
    if (!this.pollInterval) {
      this._startPolling();
    }
  }

  /**
   * Stop monitoring a specific game.
   */
  unwatchGame(gameId) {
    this.listeners = this.listeners.filter(l => l.gameId !== gameId);
    
    // Remove addresses not watched by any remaining listener
    this.watchedAddresses.clear();
    for (const l of this.listeners) {
      this.watchedAddresses.add(l.address);
    }
    
    // Stop polling if no more listeners
    if (this.listeners.length === 0 && this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
      console.log('👁️ Stopped deposit monitoring (no active watchers)');
    }
  }

  async _startPolling() {
    // Get current block as starting point
    this.lastBlock = await this.provider.getBlockNumber();
    console.log(`👁️ Deposit monitor started, polling from block ${this.lastBlock}`);
    
    this.pollInterval = setInterval(() => this._poll(), 5000); // every 5 seconds
  }

  async _poll() {
    try {
      const currentBlock = await this.provider.getBlockNumber();
      if (currentBlock <= this.lastBlock) return;

      // Query Transfer events to any of our watched addresses
      const filter = this.token.filters.Transfer(null, null);
      const events = await this.token.queryFilter(filter, this.lastBlock + 1, currentBlock);

      for (const event of events) {
        const to = event.args[1].toLowerCase();
        
        if (this.watchedAddresses.has(to)) {
          const from = event.args[0];
          const value = event.args[2];
          const decimals = await this.walletManager.getDecimals();
          const amount = ethers.formatUnits(value, decimals);
          
          // Find which listener this belongs to
          const listener = this.listeners.find(l => l.address === to);
          if (!listener) continue;

          const depositKey = `${listener.gameId}:${listener.roundNum}:${from.toLowerCase()}`;
          
          // Track deposit
          this.deposits.set(depositKey, {
            from,
            amount,
            amountRaw: value,
            txHash: event.transactionHash,
            timestamp: Date.now(),
            gameId: listener.gameId,
            roundNum: listener.roundNum
          });

          // Update pool total
          const poolKey = `${listener.gameId}:${listener.roundNum}`;
          const currentTotal = this.poolTotals.get(poolKey) || 0n;
          this.poolTotals.set(poolKey, currentTotal + value);

          console.log(`💰 Deposit detected: ${amount} $OPENWORK from ${from} → game ${listener.gameId} round ${listener.roundNum}`);

          // Fire callback
          listener.callback({
            from,
            amount,
            amountRaw: value.toString(),
            txHash: event.transactionHash,
            gameId: listener.gameId,
            roundNum: listener.roundNum,
            poolTotal: ethers.formatUnits(this.poolTotals.get(poolKey), decimals)
          });
        }
      }

      this.lastBlock = currentBlock;
    } catch (err) {
      console.error('Deposit monitor poll error:', err.message);
    }
  }

  /**
   * Get total pool for a game round.
   */
  async getPoolTotal(gameId, roundNum) {
    const poolKey = `${gameId}:${roundNum}`;
    const total = this.poolTotals.get(poolKey) || 0n;
    const decimals = await this.walletManager.getDecimals();
    return ethers.formatUnits(total, decimals);
  }

  /**
   * Get all deposits for a game round.
   */
  getDeposits(gameId, roundNum) {
    const result = [];
    for (const [key, deposit] of this.deposits.entries()) {
      if (deposit.gameId === gameId && deposit.roundNum === roundNum) {
        result.push(deposit);
      }
    }
    return result;
  }

  /**
   * Get depositors (addresses that bet) for a game round.
   */
  getDepositors(gameId, roundNum) {
    return this.getDeposits(gameId, roundNum).map(d => d.from.toLowerCase());
  }
}

module.exports = { DepositMonitor };
