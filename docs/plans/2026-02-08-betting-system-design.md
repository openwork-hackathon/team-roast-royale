# Betting System Design — First Principles (v2)

**Date:** 2026-02-08  
**Author:** Claude (Backend) + Artem  
**Status:** APPROVED v2  

---

## Fundamental Truths

1. **We generate our own wallets** — `ethers.js` / `viem` → `Wallet.createRandom()` → we hold the private keys
2. **15 wallets total** — 5 games × 3 rounds = 15 wallets (one per round per game)
3. **Players have their own wallets** — they send $OPENWORK FROM their wallet to our round wallet
4. **We send payouts directly** — sign tx with our private key, broadcast to Base RPC → instant
5. **No Bankr AI** — just raw crypto. We ARE the wallet. Send, receive, sign, done.
6. **$OPENWORK on Base:**
   - Contract: `0x299c30dd5974bf4d5bfe42c340ca40462816ab07`
   - Standard ERC20 — `transfer(address, uint256)` is all we need
   - Need small ETH for gas on each wallet (~$0.001 per tx on Base)

---

## Wallet Architecture

```
GAME WALLETS (we generate + control):

Game 1:  Round 1 Wallet  |  Round 2 Wallet  |  Round 3 Wallet
Game 2:  Round 1 Wallet  |  Round 2 Wallet  |  Round 3 Wallet
Game 3:  Round 1 Wallet  |  Round 2 Wallet  |  Round 3 Wallet
Game 4:  Round 1 Wallet  |  Round 2 Wallet  |  Round 3 Wallet
Game 5:  Round 1 Wallet  |  Round 2 Wallet  |  Round 3 Wallet

= 15 wallets, generated on server startup, private keys stored in memory/env

HOUSE WALLET (permanent, collects 5%):
0x4ba550190e5793752c4248098ebb85c977815ddc (our Bankr wallet — reused for house rake)
```

### Why per-round wallets?
- Clean accounting: each round's pool is isolated
- Easy to verify: "wallet X has Y tokens = that round's total pool"
- Reusable: when a game ends, its 3 wallets are freed for the next game
- No mixing: round 1 money never touches round 2 money

### Wallet lifecycle:
```
Server starts → generate 15 wallets (or load from encrypted store)
Game starts  → assign 3 wallets to this game
Round starts → show players: "Send bets to 0xRoundWallet"
Round ends   → calculate payouts, send from round wallet
Game ends    → wallets freed, ready for next game
```

---

## Complete Flow

### Pre-Game: Player Registration

1. Player enters lobby, provides their **Base wallet address**
2. Frontend shows: "Send 100,000 $OPENWORK to `0xGameJoinWallet`"
   - This is the Round 1 wallet (doubles as join fee collection)
3. Player sends tokens from their wallet
4. **Backend monitors Round 1 wallet for incoming ERC20 transfers:**
   ```javascript
   // Poll every 10 seconds using Base RPC
   const balance = await openworkContract.balanceOf(roundWallet.address);
   // OR use etherscan/basescan API to see individual transfers
   // OR listen for Transfer events on the OPENWORK contract
   ```
5. When deposit detected from player's address → player confirmed
6. Player enters game

**How we detect WHO sent tokens:**
- ERC20 Transfer event: `Transfer(from, to, amount)`
- Filter: `to = ourRoundWallet`
- The `from` field = player's wallet address → we match it to registered player

### In-Game: Per-Round Betting

**Round 1: Hot Takes**
1. All players already deposited 100K+ to Round 1 wallet (join fee)
2. Round plays out (chat, roasts)
3. Round ends → vote "Most Human"
4. Backend calculates payouts from Round 1 wallet's balance:
   ```
   Pool = Round 1 wallet balance
   House (5%)     → send to house wallet
   Winner (30%)   → send to winner's registered wallet
   Guessers (65%) → send proportionally to each correct guesser's wallet
   ```
5. Round 1 wallet now empty (or has dust)

**Round 2: Roast Battle**
1. Frontend shows: "Send your Round 2 bet to `0xRound2Wallet`"
2. Players send 50K - 1M $OPENWORK to Round 2 wallet
3. Wait for deposits (30-60 second betting window)
4. Round plays out
5. Same payout calculation + execution

**Round 3: Chaos Round**
1. Same pattern with Round 3 wallet

### Post-Game: Settlement

All payouts happen FROM the round wallets directly to player wallets.

```javascript
// For each payout:
const tx = await openworkContract.connect(roundWallet).transfer(
  playerWalletAddress,
  ethers.parseUnits(payoutAmount.toString(), 18)
);
await tx.wait(); // ~2 seconds on Base
```

**Speed:** Each Base L2 transaction takes ~2 seconds. For 6 winners per round × 3 rounds = ~18 transactions = ~36 seconds total. **100x faster than Bankr.**

---

## Deposit Detection — Three Options

### Option A: ERC20 Transfer Events (RECOMMENDED)
```javascript
const openworkContract = new ethers.Contract(OPENWORK_ADDRESS, ERC20_ABI, provider);

// Listen for incoming transfers to our round wallet
const filter = openworkContract.filters.Transfer(null, roundWalletAddress);
openworkContract.on(filter, (from, to, amount, event) => {
  console.log(`Deposit: ${from} sent ${amount} OPENWORK`);
  // Match 'from' to registered player
  registerDeposit(from, amount, event.transactionHash);
});
```
- **Real-time** — event fires as soon as tx is confirmed
- **Reliable** — standard ERC20 behavior
- **Shows sender** — `from` field = player's wallet

### Option B: Polling Balance
```javascript
// Poll every 10 seconds
setInterval(async () => {
  const balance = await openworkContract.balanceOf(roundWallet.address);
  if (balance > lastKnownBalance) {
    // New deposit detected, but we don't know FROM whom
    // Need to cross-reference with tx history
  }
}, 10000);
```
- Simpler but doesn't show WHO sent tokens
- Needs Basescan API for sender info

### Option C: Basescan API (v2)
```
GET https://api.etherscan.io/v2/api?chainid=8453&module=account&action=tokentx&address={wallet}&contractaddress={OPENWORK}
```
- Shows full transfer history with sender
- Rate limited (5/sec free tier)
- Good as backup verification

**Decision: Use Option A (events) as primary, Option C as backup verification.**

---

## Gas Funding

Each round wallet needs a tiny amount of ETH for gas on Base (~$0.001 per transfer).

**Solution:** On server startup, fund each of the 15 wallets with 0.001 ETH from the house wallet. That's 0.015 ETH total (~$0.04). Enough for hundreds of transactions.

```javascript
// On startup: fund round wallets
for (const wallet of roundWallets) {
  const tx = await houseWallet.sendTransaction({
    to: wallet.address,
    value: ethers.parseEther("0.001")
  });
}
```

**Or:** Keep a small ETH balance in each wallet and top up when low.

---

## AI Agent Betting

AI agents don't have real wallets. Their bets are virtual:

```javascript
// AI agent "bets" — no on-chain transaction
aiBet = {
  playerId: "ai-3-xyz",
  amount: 500000, // virtual
  source: "house", // funded by house
  walletAddress: null
};
```

- If AI wins: payout stays in round wallet → swept to house
- If AI loses: nothing happens (virtual money)
- **Net effect:** AI bets inflate the pool, making it more attractive for humans
- **House risk:** If AI guesses correctly a lot, house pays out more. But with 35% detection rate and 15 AIs, the math works.

---

## Payout Calculation (per round)

```javascript
function calculatePayouts(round) {
  const pool = round.totalPool; // actual tokens in round wallet
  const houseTake = Math.floor(pool * 0.05);
  const winnerTake = Math.floor(pool * 0.30);
  const guesserPool = Math.floor(pool * 0.65);
  
  // Winner = player with most "most human" votes
  const winner = getMostVotedPlayer(round);
  
  // Correct guessers = everyone who voted for the winner
  const correctGuessers = getVotersFor(winner.id, round);
  const totalCorrectBets = sum(correctGuessers.map(g => g.betAmount));
  
  const payouts = [];
  
  // House
  payouts.push({
    to: HOUSE_WALLET,
    amount: houseTake,
    reason: "house_rake"
  });
  
  // Winner (only if human — AI winnings stay in wallet for house)
  if (winner.isHuman) {
    payouts.push({
      to: winner.walletAddress,
      amount: winnerTake,
      reason: "most_human"
    });
  }
  
  // Correct guessers (only humans get real payouts)
  for (const guesser of correctGuessers) {
    const share = Math.floor(guesserPool * (guesser.betAmount / totalCorrectBets));
    if (guesser.isHuman && guesser.walletAddress) {
      payouts.push({
        to: guesser.walletAddress,
        amount: share,
        reason: "correct_guess"
      });
    }
  }
  
  // Remaining tokens (AI winnings + rounding) → sweep to house
  // Done after all payouts by transferring remaining balance
  
  return payouts;
}
```

---

## Data Model

### Wallet Store (server memory / encrypted file)
```javascript
walletStore = {
  houseWallet: {
    address: "0x4ba5...",
    privateKey: "0x..." // from env var
  },
  gameWallets: [
    // 15 wallets, generated on startup
    {
      id: 0,
      address: "0xABC...",
      privateKey: "0x...",
      assignedToGame: null, // or game ID
      assignedToRound: null, // 1, 2, or 3
    },
    // ... 14 more
  ]
}
```

### Player Registration
```javascript
game.players["player-123"] = {
  name: "artem",
  walletAddress: "0xPlayerAddr",  // they provided this
  depositAmount: 100000,           // detected on-chain
  depositTxHash: "0x...",          // from Transfer event
  depositVerified: true,
  inGameBalance: 100000,           // tracks their current balance
  isHuman: true
}
```

### Round Betting State
```javascript
game.rounds[0] = {
  walletAddress: "0xRound1Wallet",
  bets: {
    "player-123": { amount: 200000, votedFor: "player-456" },
    "ai-0-xyz":   { amount: 500000, votedFor: "player-123" }, // virtual
  },
  totalPool: 8500000,
  winnerId: "player-456",
  payouts: [
    { to: "0xHouse", amount: 425000, txHash: "0x...", status: "confirmed" },
    { to: "0xArtem", amount: 2550000, txHash: "0x...", status: "confirmed" },
    // ...
  ],
  settled: true
}
```

---

## Socket.io Events (Betting)

| Event | Direction | Payload |
|-------|-----------|---------|
| `game:register-wallet` | Client→Server | `{ walletAddress }` |
| `game:deposit-detected` | Server→Client | `{ amount, txHash, verified: true }` |
| `game:bet` | Client→Server | `{ amount }` (for current round) |
| `game:bet-confirmed` | Server→Client | `{ amount, newBalance, roundPool }` |
| `game:pool-update` | Server→Room | `{ round, pool, bettorCount }` |
| `game:round-payout` | Server→Client | `{ winnerId, winnerName, yourPayout, yourNewBalance, totalPool }` |
| `game:payout-sent` | Server→Client | `{ amount, txHash }` |
| `game:payout-complete` | Server→Client | `{ totalPaid, finalBalance }` |

---

## REST Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/game/:id/wallet` | Get the deposit address for current round |
| `POST` | `/api/game/:id/register` | Register player wallet address |
| `GET` | `/api/game/:id/pool` | Get current round's pool size + bets |
| `GET` | `/api/game/:id/payouts` | Get payout history for ended game |

---

## Implementation Tasks

### Backend — Claude
1. **`WalletManager.js`** — Generate 15 wallets on startup, assign to games, fund with gas
2. **`DepositMonitor.js`** — Listen for ERC20 Transfer events on round wallets, match to players
3. **`BettingEngine.js`** — Per-round bet tracking, pool calculation, payout math
4. **`PayoutExecutor.js`** — Sign and send ERC20 transfers from round wallets to winners
5. Wire into existing Socket.io handlers + REST routes

### Frontend — Spark (GitHub Issue)
1. Wallet input field in lobby (Base address)
2. "Send X $OPENWORK to 0x..." instruction with copy button
3. Deposit verification spinner → confirmed badge
4. Per-round bet amount selector
5. Live pool size display
6. Round payout result screen
7. Final payout confirmation with tx hash link to Basescan

### Contracts/Verification — Vera (GitHub Issue)
1. Verify OPENWORK token is standard ERC20 (transferable, no tax/fee on transfer)
2. Test deposit detection on Base testnet
3. Test payout execution on Base testnet
4. Document gas costs per transaction

---

## NOT Building (YAGNI)
- ❌ Bankr AI integration (too slow, unnecessary)
- ❌ Smart contract escrow (we hold keys, simpler)
- ❌ On-chain bet tracking (in-memory, instant)
- ❌ Spectator betting (v2)
- ❌ Leaderboard persistence (v2)
- ❌ Multiple chains (Base only)
