/**
 * DemoWalletManager — fake wallets for demo/testing.
 * No ethers, no blockchain, no real keys.
 */
class DemoWalletManager {
  constructor() {
    this.wallets = new Map();
    this._counter = 0;
  }

  getOrCreateWallet(gameId, roundNum) {
    const key = `${gameId}:${roundNum}`;
    if (!this.wallets.has(key)) {
      this._counter++;
      const addr = `0xDEMO_${gameId.slice(0, 6)}_R${roundNum}_${this._counter.toString(16).padStart(4, '0')}`;
      this.wallets.set(key, { address: addr });
    }
    return this.wallets.get(key);
  }

  getGameWallets(gameId) {
    return [1, 2, 3].map(r => this.getOrCreateWallet(gameId, r));
  }

  async getBalance(address) {
    return '0'; // demo — no real balances
  }

  cleanup(gameId) {
    for (const key of this.wallets.keys()) {
      if (key.startsWith(gameId)) this.wallets.delete(key);
    }
  }
}

module.exports = { DemoWalletManager };
