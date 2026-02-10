# $RSTR On-Chain Integration — Implementation Plan

**Date:** 2026-02-10
**Spec:** `2026-02-10-rstr-onchain-spec.md`
**Estimated Time:** 2-3 hours
**Dependencies:** viem (already installed)

---

## Phase 1: Bond Contract Interface (30 min)

### Task 1.1: Create MintClubClient.js
**File:** `backend/src/betting/MintClubClient.js`

Viem wrapper for Mint Club Bond contract operations:
- `mint(reserveAmount)` — deposit OPENWORK, receive RSTR
- `burn(tokenAmount)` — burn RSTR, receive OPENWORK
- `getPrice()` — current buy/sell price from curve
- `getSupply()` — current RSTR supply
- `approve(spender, amount)` — ERC20 approve for OPENWORK

ABI needed:
```solidity
function mint(address token, uint256 reserveAmount, uint256 minTokens, address recipient) payable
function burn(address token, uint256 tokenAmount, uint256 minRefund, address recipient)
function getReserveForToken(address token, uint256 tokenAmount) view returns (uint256)
function getTokenForReserve(address token, uint256 reserveAmount) view returns (uint256)
```

### Task 1.2: Write test for MintClubClient
**File:** `backend/test-mintclub.js`

- Connect to Base mainnet (read-only)
- Query current RSTR price
- Query current supply
- Calculate: "How many RSTR for 100 OPENWORK?"
- Calculate: "How much OPENWORK for burning 100 RSTR?"
- Verify math matches DemoTokenManager

### Task 1.3: Run test, verify
```bash
cd backend && node test-mintclub.js
```
Expected: prices match bonding curve, supply reads correctly.

**Commit:** `feat: MintClubClient — viem wrapper for bond contract`

---

## Phase 2: On-Chain Wallet Manager (30 min)

### Task 2.1: Create OnChainWalletManager.js
**File:** `backend/src/betting/OnChainWalletManager.js`

- `generateGameWallet(gameId)` — HD wallet derivation from master seed
- `getOrCreateWallet(gameId, roundNum)` — per-round deposit wallet
- `getGameWallets(gameId)` — all wallets for a game
- `getTreasuryWallet()` — main game treasury for gas + house cut
- Store: walletAddress → privateKey mapping (in-memory for MVP, env-based master seed)

Master seed from env: `GAME_WALLET_SEED` (BIP39 mnemonic or raw key)

### Task 2.2: Write test
**File:** `backend/test-wallets.js`

- Generate 3 game wallets from seed
- Verify deterministic (same seed = same wallets)
- Verify unique per game
- Check ETH balance of treasury (should be funded)

### Task 2.3: Run test
```bash
cd backend && node test-wallets.js
```

**Commit:** `feat: OnChainWalletManager — HD wallet generation`

---

## Phase 3: Deposit Monitor (45 min)

### Task 3.1: Create OnChainDepositMonitor.js
**File:** `backend/src/betting/OnChainDepositMonitor.js`

- Watch for ERC20 Transfer events on OPENWORK token to deposit wallets
- Use `publicClient.watchContractEvent()` for real-time monitoring
- Fallback: poll every 5s with `getLogs()` if websocket unavailable
- On deposit detected: callback with `{ gameId, roundNum, from, amount, txHash }`
- Dedup: track processed txHashes to prevent double-credit

OPENWORK Transfer event:
```solidity
event Transfer(address indexed from, address indexed to, uint256 value)
```

Filter: `to` = our deposit wallet address

### Task 3.2: Create OnChainPayoutExecutor.js
**File:** `backend/src/betting/OnChainPayoutExecutor.js`

- `mintRSTR(depositWallet, openworkAmount)` — approve OPENWORK → mint RSTR via bond contract
- `burnAndPayout(playerAddress, rstrAmount)` — burn RSTR → send OPENWORK to player
- `sweepToTreasury(walletKey, tokenAddress)` — move leftover tokens to treasury
- Gas estimation before each tx
- Error handling with retry (max 3)

### Task 3.3: Write integration test
**File:** `backend/test-deposit-flow.js`

- Use a testnet or forked Base for testing
- Simulate: send OPENWORK to deposit wallet → monitor detects → mint RSTR → verify balance
- Test payout: burn RSTR → verify OPENWORK returned

### Task 3.4: Run test
```bash
cd backend && node test-deposit-flow.js
```

**Commit:** `feat: OnChainDepositMonitor + PayoutExecutor`

---

## Phase 4: Wire Into BettingSystem (30 min)

### Task 4.1: Update index.js
**File:** `backend/src/betting/index.js`

When `DEMO_MODE=false`:
- Use OnChainWalletManager instead of DemoWalletManager
- Use OnChainDepositMonitor instead of DemoDepositMonitor
- Use OnChainPayoutExecutor instead of DemoPayoutExecutor
- Use real TokenManager with MintClubClient for live price feeds
- Add env vars: `GAME_WALLET_SEED`, `BASE_RPC_URL`

### Task 4.2: Update server.js
**File:** `backend/src/server.js`

- `/api/token/price` → read from MintClubClient (real chain data)
- `/api/token/balance/:address` → read on-chain RSTR balance
- Add `/api/token/deposit-address` → returns current round's deposit wallet

### Task 4.3: Environment config
**File:** `backend/.env.example`

```
DEMO_MODE=false
BASE_RPC_URL=https://mainnet.base.org
GAME_WALLET_SEED=your-bip39-mnemonic-here
HOUSE_WALLET_ADDRESS=0x...
```

**Commit:** `feat: wire on-chain modules into BettingSystem`

---

## Phase 5: Frontend Updates (20 min)

### Task 5.1: Update TokenShop for real mode
- Show real deposit address (QR code + copy button)
- "Send OPENWORK to this address" flow
- Real-time balance updates via socket (DepositMonitor triggers)
- Cash out button → calls backend → burns RSTR

### Task 5.2: Update BettingPanel
- Show "Waiting for deposit..." state
- Confirm deposit detected → enable betting
- Show tx hash links to BaseScan

**Commit:** `feat: frontend real-mode deposit/cashout flow`

---

## Phase 6: Verification (15 min)

### Task 6.1: End-to-end test
1. Start server with `DEMO_MODE=false`
2. Create game → get deposit wallet address
3. Send OPENWORK from test wallet → verify detection
4. Verify RSTR minted + balance credited
5. Place bet → resolve round → verify winner gets RSTR
6. Cash out → verify OPENWORK returned to player wallet

### Task 6.2: Demo mode still works
```bash
DEMO_MODE=true node backend/src/server.js
# Run test-tokens.js → should pass unchanged
```

**Commit:** `test: end-to-end on-chain betting verified`

---

## Execution Options

**1. Subagent-Driven** — Dispatch fresh agent per phase, review between phases
**2. Parallel Session** — Batch execution with checkpoints
**3. Tonight's Overnight Build** — Queue for Maya/Kimi swarm overnight
