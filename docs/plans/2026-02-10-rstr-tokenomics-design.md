# $RSTR Tokenomics Design — Roast Royale

**Date:** 2026-02-10
**Status:** Design Complete → Implementation

## Overview

$RSTR is the in-game betting token for Roast Royale. Players buy $RSTR with $OPENWORK via the Mint Club bonding curve, then use $RSTR to place bets in-game. Winners earn more $RSTR which they can sell back to the bonding curve for $OPENWORK.

## Token Details

- **Name:** Roast Royale
- **Symbol:** $RSTR
- **Chain:** Base
- **Bonding Curve:** Mint Club V2 (LINEAR, 10 steps)
- **Reserve Token:** $OPENWORK (`0x299c30dd5974bf4d5bfe42c340ca40462816ab07`)
- **Price Range:** 0.0001 → 0.001 OPENWORK per RSTR
- **Max Supply:** 1,000,000 RSTR
- **Royalties:** 3% buy / 3% sell
- **Token URL:** https://mint.club/token/base/RSTR
- **Bond Contract:** `0xc5a076cad94176c2996B32d8466Be1cE757FAa27`

## Flow

```
Player → Send OPENWORK → Mint Club Bonding Curve → Receive $RSTR
Player → Bet $RSTR in Roast Royale game
Winners → Receive $RSTR payout from betting pool
Player → Sell $RSTR → Mint Club Bonding Curve → Receive OPENWORK back
```

## In-Game Betting Flow

### Phase 1: Buy-In (MVP — Server-Side)
1. Player clicks "Buy Tokens" in lobby
2. Frontend shows: "Send X OPENWORK to get Y RSTR"
3. Backend generates a deposit wallet per game (existing system)
4. Player sends OPENWORK to deposit wallet
5. Backend detects deposit → mints RSTR via bonding curve → credits player's in-game balance
6. Player sees RSTR balance in UI

### Phase 2: Betting
1. Round starts → betting opens
2. Player wagers N RSTR on who they think is the human
3. Backend tracks bets (in-memory, existing BettingEngine)
4. Round ends → results computed

### Phase 3: Payout Split
```
Total Pool: All RSTR wagered in a round

House:           5%  → Game treasury (stays in bonding curve = increases price)
Most Human:     30%  → Player who received most votes gets bonus
Correct Guessers: 65% → Split equally among those who guessed right
```

### Phase 4: Cash-Out
1. Player clicks "Cash Out" in lobby
2. Backend burns player's RSTR via bonding curve → receives OPENWORK
3. OPENWORK sent to player's wallet

## Demo Mode (Default — No Real Crypto)

For the hackathon demo:
- **Simulated RSTR balances** — no real on-chain transactions during gameplay
- **Each player starts with 100 RSTR** (demo tokens)
- **Buy/sell buttons** show the bonding curve math but don't transact
- **Betting uses in-memory balances** (existing demo system)
- **Real on-chain integration** is a post-hackathon upgrade path

## Implementation Architecture

### Backend Changes

```
backend/src/betting/
├── BettingEngine.js      ← UPDATE: Use RSTR balances instead of raw deposits
├── TokenManager.js       ← NEW: RSTR balance management + bonding curve math
├── DemoTokenManager.js   ← NEW: Demo mode with fake balances
├── index.js              ← UPDATE: Wire TokenManager into BettingSystem
```

### New Socket Events

```
game:token-balance   → { balance: 100, symbol: 'RSTR' }   (server → client)
game:buy-tokens      ← { amount: 50 }                      (client → server)
game:sell-tokens     ← { amount: 50 }                      (client → server)
game:token-price     → { buyPrice, sellPrice, supply }     (server → client)
```

### Frontend Changes

```
frontend/
├── components/
│   ├── TokenBalance.jsx  ← NEW: Shows RSTR balance + buy/sell buttons
│   ├── BettingPanel.jsx  ← UPDATE: Bet with RSTR (amount selector)
│   └── TokenShop.jsx     ← NEW: Buy/sell RSTR with price curve display
```

## Bonding Curve Math

At current supply (0 minted):
- **Buy 100K OPENWORK** → ~316,228 RSTR (√(200K/0.001) due to linear curve)
- **100 RSTR** costs ~0.01 OPENWORK at the start

Price formula (linear, 10 steps):
- Step 1 (0-100K RSTR): 0.0001 OPENWORK each
- Step 2 (100K-200K): 0.0002 OPENWORK each
- ...
- Step 10 (900K-1M): 0.001 OPENWORK each

## Testing Plan

1. **Unit tests:** TokenManager math (buy/sell amounts)
2. **Integration:** Demo mode betting flow with RSTR balances
3. **Fleet test:** Maya and Vera connect as players, place bets, verify payouts
4. **On-chain test:** Verify bonding curve reads work (price queries)

## Key Decisions

- **Demo mode first** — Real on-chain during gameplay is post-hackathon
- **100 RSTR starting balance** in demo — enough for 3 rounds of betting
- **Bonding curve math shown in UI** — players see the price impact
- **3% royalty** goes to creator wallet (team treasury)
