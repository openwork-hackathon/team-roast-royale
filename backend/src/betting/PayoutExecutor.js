const { ethers } = require('ethers');
const { OPENWORK_TOKEN, HOUSE_WALLET, ERC20_ABI, BASE_RPC } = require('./WalletManager');

/**
 * PayoutExecutor — sends $OPENWORK payouts from round wallets to winners.
 * 
 * Each round wallet holds the deposits. After resolution:
 * 1. Send house cut to HOUSE_WALLET
 * 2. Send most-human prize to winner
 * 3. Send correct-guesser shares to each correct guesser
 * 
 * All transfers are ERC20 token transfers on Base (~2s each).
 */
class PayoutExecutor {
  constructor(walletManager) {
    this.walletManager = walletManager;
    this.provider = new ethers.JsonRpcProvider(BASE_RPC);
    this.payoutHistory = []; // { gameId, roundNum, payouts, executedAt }
  }

  /**
   * Execute all payouts for a resolved round.
   * @param {string} gameId
   * @param {number} roundNum
   * @param {Array} payouts - from BettingEngine.resolveRound()
   * @returns {Promise<Array>} executed payout results with txHashes
   */
  async executePayout(gameId, roundNum, payouts) {
    console.log(`💸 Executing ${payouts.length} payouts for game ${gameId} round ${roundNum}`);

    const signerContract = this.walletManager.getSignerContract(gameId, roundNum);
    const decimals = await this.walletManager.getDecimals();
    const results = [];

    for (const payout of payouts) {
      const toAddress = payout.type === 'house' ? HOUSE_WALLET : payout.address;
      
      if (!toAddress) {
        results.push({ ...payout, status: 'skipped', reason: 'No address' });
        continue;
      }

      const amount = parseFloat(payout.amount);
      if (amount <= 0) {
        results.push({ ...payout, status: 'skipped', reason: 'Zero amount' });
        continue;
      }

      try {
        const amountWei = ethers.parseUnits(amount.toFixed(6), decimals);
        
        console.log(`💸 Sending ${amount} $OPENWORK to ${toAddress} (${payout.type})`);
        
        const tx = await signerContract.transfer(toAddress, amountWei);
        const receipt = await tx.wait();

        results.push({
          ...payout,
          toAddress,
          status: 'success',
          txHash: receipt.hash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString()
        });

        console.log(`✅ Payout sent: ${amount} → ${toAddress} (tx: ${receipt.hash})`);
      } catch (err) {
        console.error(`❌ Payout failed for ${toAddress}:`, err.message);
        results.push({
          ...payout,
          toAddress,
          status: 'failed',
          error: err.message
        });
      }
    }

    // Record history
    const record = {
      gameId,
      roundNum,
      payouts: results,
      executedAt: Date.now(),
      successCount: results.filter(r => r.status === 'success').length,
      failCount: results.filter(r => r.status === 'failed').length
    };
    this.payoutHistory.push(record);

    console.log(`💸 Payouts complete: ${record.successCount} success, ${record.failCount} failed`);
    return results;
  }

  /**
   * Execute payouts for all rounds of a game.
   */
  async executeGamePayouts(gameId, roundResults) {
    const allResults = {};
    
    for (const [roundNum, result] of Object.entries(roundResults)) {
      if (result.payouts && result.payouts.length > 0) {
        allResults[roundNum] = await this.executePayout(gameId, parseInt(roundNum), result.payouts);
      }
    }

    return allResults;
  }

  /**
   * Check if round wallet has enough balance for payouts.
   */
  async verifyBalance(gameId, roundNum, expectedTotal) {
    const balance = await this.walletManager.getBalance(gameId, roundNum);
    const sufficient = parseFloat(balance) >= parseFloat(expectedTotal);
    
    if (!sufficient) {
      console.warn(`⚠️ Insufficient balance: ${balance} < ${expectedTotal} for game ${gameId} round ${roundNum}`);
    }
    
    return { balance, expectedTotal, sufficient };
  }

  /**
   * Emergency: sweep all funds from a round wallet to house.
   */
  async sweepToHouse(gameId, roundNum) {
    try {
      const balance = await this.walletManager.getBalance(gameId, roundNum);
      if (parseFloat(balance) <= 0) return null;

      const signerContract = this.walletManager.getSignerContract(gameId, roundNum);
      const decimals = await this.walletManager.getDecimals();
      const amountWei = ethers.parseUnits(balance, decimals);

      const tx = await signerContract.transfer(HOUSE_WALLET, amountWei);
      const receipt = await tx.wait();
      
      console.log(`🧹 Swept ${balance} $OPENWORK to house from game ${gameId} round ${roundNum}`);
      return receipt.hash;
    } catch (err) {
      console.error(`Sweep failed:`, err.message);
      return null;
    }
  }

  /**
   * Get payout history.
   */
  getHistory(gameId) {
    if (gameId) {
      return this.payoutHistory.filter(h => h.gameId === gameId);
    }
    return this.payoutHistory;
  }
}

module.exports = { PayoutExecutor };
