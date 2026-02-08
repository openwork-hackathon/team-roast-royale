const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// $OPENWORK token on Base
const OPENWORK_TOKEN = '0x299c30dd5974bf4d5bfe42c340ca40462816ab07';
const BASE_RPC = 'https://mainnet.base.org';

// House wallet — receives 5% cut
const HOUSE_WALLET = '0x4ba550190e5793752c4248098ebb85c977815ddc';

// ERC20 ABI — just what we need
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)',
  'event Transfer(address indexed from, address indexed to, uint256 value)'
];

class WalletManager {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(BASE_RPC);
    this.token = new ethers.Contract(OPENWORK_TOKEN, ERC20_ABI, this.provider);
    this.wallets = new Map(); // gameId:roundNum -> { wallet, privateKey, address }
    this.walletsFile = path.join(__dirname, '../../.wallets.json');
    this._decimals = null;
    this._loadWallets();
  }

  _loadWallets() {
    try {
      if (fs.existsSync(this.walletsFile)) {
        const data = JSON.parse(fs.readFileSync(this.walletsFile, 'utf8'));
        for (const [key, val] of Object.entries(data)) {
          const wallet = new ethers.Wallet(val.privateKey, this.provider);
          this.wallets.set(key, {
            wallet,
            privateKey: val.privateKey,
            address: val.address
          });
        }
        console.log(`💰 Loaded ${this.wallets.size} wallets from disk`);
      }
    } catch (err) {
      console.error('Failed to load wallets:', err.message);
    }
  }

  _saveWallets() {
    const data = {};
    for (const [key, val] of this.wallets.entries()) {
      data[key] = { privateKey: val.privateKey, address: val.address };
    }
    fs.writeFileSync(this.walletsFile, JSON.stringify(data, null, 2));
  }

  async getDecimals() {
    if (!this._decimals) {
      this._decimals = await this.token.decimals();
    }
    return this._decimals;
  }

  /**
   * Generate or retrieve a wallet for a specific game round.
   * @param {string} gameId 
   * @param {number} roundNum - 1, 2, or 3
   * @returns {{ address: string, roundNum: number }}
   */
  getOrCreateWallet(gameId, roundNum) {
    const key = `${gameId}:${roundNum}`;
    
    if (this.wallets.has(key)) {
      const existing = this.wallets.get(key);
      return { address: existing.address, roundNum };
    }

    // Generate fresh wallet
    const wallet = ethers.Wallet.createRandom().connect(this.provider);
    const entry = {
      wallet,
      privateKey: wallet.privateKey,
      address: wallet.address
    };
    
    this.wallets.set(key, entry);
    this._saveWallets();
    
    console.log(`💰 Created wallet for game ${gameId} round ${roundNum}: ${wallet.address}`);
    return { address: wallet.address, roundNum };
  }

  /**
   * Get all wallets for a game (rounds 1-3).
   * @param {string} gameId
   * @returns {Array<{ address: string, roundNum: number }>}
   */
  getGameWallets(gameId) {
    const wallets = [];
    for (let r = 1; r <= 3; r++) {
      wallets.push(this.getOrCreateWallet(gameId, r));
    }
    return wallets;
  }

  /**
   * Check balance of a game round wallet.
   * @param {string} gameId
   * @param {number} roundNum
   * @returns {Promise<string>} Balance in human-readable format
   */
  async getBalance(gameId, roundNum) {
    const key = `${gameId}:${roundNum}`;
    const entry = this.wallets.get(key);
    if (!entry) return '0';
    
    const balance = await this.token.balanceOf(entry.address);
    const decimals = await this.getDecimals();
    return ethers.formatUnits(balance, decimals);
  }

  /**
   * Get the signer wallet for payouts.
   * @param {string} gameId
   * @param {number} roundNum
   * @returns {ethers.Contract} Token contract connected to round wallet signer
   */
  getSignerContract(gameId, roundNum) {
    const key = `${gameId}:${roundNum}`;
    const entry = this.wallets.get(key);
    if (!entry) throw new Error(`No wallet for ${key}`);
    return new ethers.Contract(OPENWORK_TOKEN, ERC20_ABI, entry.wallet);
  }

  /**
   * Get raw wallet for a round.
   */
  getWallet(gameId, roundNum) {
    const key = `${gameId}:${roundNum}`;
    return this.wallets.get(key);
  }

  /**
   * Cleanup wallets for a finished game (after payouts).
   */
  cleanupGame(gameId) {
    for (let r = 1; r <= 3; r++) {
      this.wallets.delete(`${gameId}:${r}`);
    }
    this._saveWallets();
    console.log(`🧹 Cleaned up wallets for game ${gameId}`);
  }
}

module.exports = { WalletManager, OPENWORK_TOKEN, HOUSE_WALLET, ERC20_ABI, BASE_RPC };
