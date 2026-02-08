# Betting System Design — First Principles

**Date:** 2026-02-08  
**Author:** Claude (Backend) + Artem  
**Status:** APPROVED  

---

## Fundamental Truths (verified, not assumed)

1. **Bankr API** is a prompt-based agent at `https://api.bankr.bot/agent/prompt`
   - Auth: `x-api-key: bk_JBE8J2X27YX2VAEYTYKFEZE5WH4F2D9Q`
   - Response time: ~45 seconds per prompt (async: submit → poll jobId)
   - CAN: send tokens, check balances, check incoming transactions, swap tokens
   - CANNOT: create wallets, do real-time callbacks, batch operations

2. **Our Bankr wallet (the House):**
   - EVM (Base): `0x4ba550190e5793752c4248098ebb85c977815ddc`
   - Already holds: 45.8M $OPENWORK, 1.2M $BNKR, 1.6M $MOLT

3. **$OPENWORK token on Base:**
   - Contract: `0x299c30dd5974bf4d5bfe42c340ca40462816ab07`
   - Price: ~$0.00000158
   - 100K tokens ≈ $0.16 (low stakes, perfect for gaming)

4. **Bankr can see incoming transactions** — it reported recent swaps with tx hashes. So we CAN verify deposits.

5. **Bankr is SLOW (45s/prompt)** — cannot be used for real-time in-game actions. Must be used only for:
   - Pre-game: verify deposits
   - Post-game: batch payouts

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   FRONTEND                       │
│  Player connects wallet → sends $OPENWORK        │
│  to Game Wallet → enters game                    │
│  Bets tracked in UI via Socket.io                │
└────────────────────┬────────────────────────────┘
                     │ Socket.io
┌────────────────────▼────────────────────────────┐
│               BACKEND (Express)                  │
│                                                  │
│  BettingManager                                  │
│  ├─ 5 Game Wallets (fixed, reusable)            │
│  ├─ Deposit verification (Bankr prompt)          │
│  ├─ In-memory bet tracking (instant)             │
│  ├─ Payout calculation (instant)                 │
│  └─ Payout execution (Bankr prompts, queued)     │
│                                                  │
│  Flow:                                           │
│  1. Player sends 100K+ $OPENWORK to game wallet  │
│  2. Player registers: wallet address + tx hash    │
│  3. Backend verifies deposit via Bankr            │
│  4. Player enters game                            │
│  5. Per-round betting tracked in-memory           │
│  6. Game ends → payouts calculated               │
│  7. Bankr sends payouts (queued, ~45s each)      │
└────────────────────┬────────────────────────────┘
                     │ HTTPS (async)
┌────────────────────▼────────────────────────────┐
│               BANKR API                          │
│  POST /agent/prompt → jobId                      │
│  GET  /agent/job/:id → status + response         │
│                                                  │
│  Used for:                                       │
│  - "Check if 0xABC sent me 100K OPENWORK"        │
│  - "Send 500K OPENWORK to 0xDEF on Base"         │
│  - "What is my OPENWORK balance?"                 │
└─────────────────────────────────────────────────┘
```

---

## The 5 Game Wallets

We use ONE Bankr wallet (the House wallet). We do NOT need 5 separate wallets.

**Why:** Bankr gives us one wallet per API key. All deposits go to the same address. We track which game a deposit belongs to by the player's wallet address + the game ID they register with.

**House Wallet:** `0x4ba550190e5793752c4248098ebb85c977815ddc`

All players deposit to this single address. The backend tracks:
```
deposits = {
  "0xPlayerWallet123": {
    gameId: "abc123",
    amount: 100000,
    txHash: "0x...",
    verified: true,
    playerName: "zoey"
  }
}
```

---

## Complete Flow — Step by Step

### Step 1: Player Joins (Pre-Game)

**What happens:**
1. Player visits lobby page
2. Player enters their name AND their Base wallet address
3. Frontend shows: "Send 100,000 $OPENWORK to `0x4ba5...5ddc` to join"
4. Player sends tokens via their own wallet (Bankr, MetaMask, whatever)
5. Player pastes their tx hash OR we detect it

**Backend action:**
```
POST /api/game/:id/register
Body: {
  playerName: "artem",
  walletAddress: "0xPlayerWallet...",
  txHash: "0xTransactionHash..." (optional, speeds up verification)
}
```

**Backend verifies deposit via Bankr:**
```
Bankr prompt: "Check if wallet 0xPlayerWallet sent me at least 100000 OPENWORK tokens on Base. Look for recent transaction."
```
- If verified → player confirmed, can join game
- If not yet → retry in 30 seconds (tx might be pending)
- Timeout after 3 minutes → registration fails, player retries

### Step 2: Game Starts (All Players Verified)

Game starts when:
- At least 1 human player has verified deposit
- 15 AI agents are auto-created (AI agents don't need real wallets — they're OUR agents)
- Lobby timer expires OR host starts

**AI Agent Bets:**
- AI agents "bet" with virtual tokens from the house pool
- Their bets are real numbers but come from the house wallet
- This means: if an AI wins, the money stays in house. If an AI loses, it's house money lost to players.
- Net effect: house subsidizes the game to make pools bigger

### Step 3: Per-Round Betting (In-Memory, Instant)

Each round (Hot Takes, Roast Battle, Chaos):

1. Round starts → all players MUST bet to participate in this round's pool
2. Bet amounts: 50K - 1M $OPENWORK (tracked in-memory, NOT on-chain per round)
3. Players submit bets via Socket.io: `game:bet { amount: 500000 }`
4. AI agents auto-bet random amounts (50K - 1M)
5. Round plays out → chat, roasts, chaos
6. Round ends → everyone votes "Most Human"
7. Payout calculated instantly:

```javascript
const pool = totalBetsThisRound;
const houseTake = pool * 0.05;          // 5% to house
const winnerTake = pool * 0.30;         // 30% to "most human"
const guesserPool = pool * 0.65;        // 65% to correct guessers

// Correct guessers split proportionally to bet size
for (const guesser of correctGuessers) {
  guesser.payout = guesserPool * (guesser.bet / totalCorrectBets);
}
```

8. Payouts added to player's in-game balance (NOT sent on-chain yet)

### Step 4: Game Ends — Settlement

After 3 rounds, game ends. Each player has a final balance:

```
Player balances = {
  "0xArtem...": { deposited: 100000, balance: 350000, netWin: 250000 },
  "0xSomeAI": { deposited: 0, balance: -200000, netLoss: 200000 },  // house covers
  ...
}
```

**Payout queue:**
For each human player with positive balance:
1. Calculate net winnings: `balance - deposited`
2. If net positive → queue Bankr payout
3. If net negative or zero → no payout (they lost their deposit)

**Bankr payout execution:**
```
Bankr prompt: "Send 250000 OPENWORK to 0xArtem on Base"
→ Wait for job completion (~45s)
→ Log tx hash
→ Next payout in queue
```

Payouts are sequential (Bankr processes one at a time). For a 16-player game with ~6 winners, that's ~6 × 45s = ~4.5 minutes for all payouts.

**Player sees:** "Calculating winnings..." → "Sending 250,000 $OPENWORK to your wallet..." → "Paid! Tx: 0x..."

### Step 5: House Accounting

After each game:
```
houseProfit = sum(allDeposits) + sum(aiBetsLost) - sum(allPayouts)
```

The house wallet accumulates:
- 5% of every pool (guaranteed)
- AI agent losses (when AIs guess wrong, it's house money that stays)
- Unclaimed/forfeited deposits (disconnected players)

---

## Data Model

### Game Betting State (in-memory)

```javascript
game.betting = {
  gameWallet: "0x4ba550190e5793752c4248098ebb85c977815ddc",
  joinFee: 100000, // 100K OPENWORK
  
  players: {
    "player-id-123": {
      walletAddress: "0xABC...",
      depositTxHash: "0x...",
      depositVerified: true,
      depositAmount: 100000,
      inGameBalance: 100000, // changes per round
      isHuman: true,
      betsPlaced: [
        { round: 1, amount: 200000, votedFor: "player-456", won: true, payout: 340000 },
        { round: 2, amount: 300000, votedFor: "player-789", won: false, payout: 0 },
        { round: 3, amount: 150000, votedFor: "player-456", won: true, payout: 250000 },
      ]
    },
    "ai-0-xyz": {
      walletAddress: null, // AI — no real wallet
      depositVerified: true, // auto-verified
      depositAmount: 0, // house-funded
      inGameBalance: 100000, // virtual starting balance
      isHuman: false,
      betsPlaced: [...]
    }
  },
  
  rounds: [
    {
      roundNumber: 1,
      totalPool: 8500000,
      houseTake: 425000,    // 5%
      winnerTake: 2550000,  // 30%
      guesserPool: 5525000, // 65%
      winnerId: "player-456",
      correctGuessers: ["player-123", "ai-2-abc", ...],
    }
  ],
  
  // Post-game settlement
  payoutQueue: [
    { walletAddress: "0xABC...", amount: 250000, status: "pending", bankrJobId: null, txHash: null }
  ]
};
```

---

## Socket.io Events (new)

| Event | Direction | Payload |
|-------|-----------|---------|
| `game:register-wallet` | Client → Server | `{ walletAddress, txHash? }` |
| `game:deposit-status` | Server → Client | `{ verified: bool, message }` |
| `game:bet` | Client → Server | `{ round, amount }` |
| `game:bet-confirmed` | Server → Client | `{ round, amount, newBalance }` |
| `game:round-result` | Server → Client | `{ winnerId, winnerName, pool, houseTake, yourPayout, yourNewBalance }` |
| `game:payout-started` | Server → Client | `{ message: "Sending winnings..." }` |
| `game:payout-complete` | Server → Client | `{ amount, txHash, walletAddress }` |
| `game:pool-update` | Server → Room | `{ round, currentPool, playerCount }` |

---

## API Endpoints (new)

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/game/:id/register` | Register wallet + trigger deposit check |
| `GET` | `/api/game/:id/betting` | Get current betting state (pools, balances) |
| `GET` | `/api/game/:id/payouts` | Get payout status for ended game |

---

## Edge Cases

| Case | Handling |
|------|----------|
| Player disconnects mid-game | Forfeit remaining balance. No payout. |
| Bankr payout fails | Retry 3 times. If still fails, log for manual resolution. |
| Player sends wrong amount | Accept any amount ≥ 100K. Extra = bigger starting balance. |
| Player sends to wrong chain | Not detected. Their loss. Clear instructions in UI. |
| Two players send from same wallet | First registration wins. Second rejected. |
| Nobody guesses correctly | 65% guesser pool rolls to house for that round. |
| All guess correctly | 65% split evenly (low ROI, but still profitable). |
| Bankr API down | Game plays without betting. Bets disabled, free play mode. |
| House wallet runs low | Alert admin. Don't start new games until funded. |

---

## Payout Split (FINAL)

| Recipient | % of Pool | Description |
|-----------|-----------|-------------|
| 🏠 House | 5% | Platform fee. Guaranteed. |
| 👑 Most Human | 30% | Whoever gets most "most human" votes |
| 🎯 Correct Guessers | 65% | Split proportionally by bet size |

---

## Implementation Tasks

### Backend (Claude) — `backend/src/betting/`
1. `BettingManager.js` — core betting logic, pool management, payout calculation
2. `BankrClient.js` — Bankr API wrapper (submit prompt, poll job, retry logic)
3. `PayoutQueue.js` — sequential payout execution with status tracking
4. Socket.io event handlers for betting events
5. REST endpoints for wallet registration and betting state

### Frontend (Spark) — Issue on GitHub
1. Wallet registration flow in lobby (input wallet address)
2. Deposit instructions + verification status
3. Per-round bet slider (50K - 1M)
4. Live pool size display
5. Round result overlay (who won, your payout)
6. Post-game payout status tracker

### Contracts (Vera) — Issue on GitHub
1. Verify $OPENWORK token contract is standard ERC20
2. Test a small deposit + withdrawal cycle via Bankr
3. Document the exact Bankr prompts that work for deposits/payouts

---

## NOT Building (YAGNI)
- ❌ Smart contract escrow (Bankr handles custody)
- ❌ Multiple game wallets (one wallet, tracked by player address)
- ❌ On-chain per-round betting (too slow, in-memory is instant)
- ❌ Spectator betting (v2)
- ❌ Side bets (v2)
- ❌ Leaderboard persistence (v2, needs database)
