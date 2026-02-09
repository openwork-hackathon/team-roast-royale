/**
 * DemoDepositMonitor — no blockchain watching, deposits confirmed instantly.
 */
class DemoDepositMonitor {
  constructor() {
    this.callbacks = new Map();
  }

  watchRound(gameId, roundNum, onDeposit) {
    this.callbacks.set(`${gameId}:${roundNum}`, onDeposit);
    console.log(`👁️ [DEMO] Watching deposits for game ${gameId} round ${roundNum}`);
  }

  /**
   * Simulate a deposit (called from socket handler).
   */
  simulateDeposit(gameId, roundNum, fromAddress, amount) {
    const cb = this.callbacks.get(`${gameId}:${roundNum}`);
    if (cb) {
      const deposit = {
        gameId,
        roundNum,
        from: fromAddress,
        amount: amount.toString(),
        txHash: `demo-deposit-${Date.now().toString(36)}`
      };
      // Simulate 1s blockchain confirmation delay
      setTimeout(() => cb(deposit), 1000);
      return deposit;
    }
    return null;
  }

  unwatchGame(gameId) {
    for (const key of this.callbacks.keys()) {
      if (key.startsWith(gameId)) this.callbacks.delete(key);
    }
  }
}

module.exports = { DemoDepositMonitor };
