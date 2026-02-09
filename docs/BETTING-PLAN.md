# 🎰 Betting System — Demo Mode Plan

## Overview
Add $OPENWORK betting to Roast Royale with DEMO_MODE (no real crypto).
Players "bet" on who they think is human. Payouts are simulated.

## Architecture

### Backend (DEMO_MODE=true)
When `DEMO_MODE=true` in .env:
- `WalletManager` returns fake addresses (0xDEMO...)
- `DepositMonitor` auto-confirms deposits after 2s delay
- `PayoutExecutor` logs payouts but doesn't send on-chain
- `BettingEngine` works exactly the same (real math, fake money)

### Socket Events (already defined in index.js)
```
→ game:betting-open    { roundNum, walletAddress, gameId }
→ game:betting-pool    { roundNum, totalPool, depositorCount }
→ game:betting-closed  { roundNum, gameId }
→ game:betting-result  { roundNum, payouts, totalPool }
← game:bet-place       { gameId, roundNum, targetPlayerId, walletAddress }
```

### NEW Socket Events for Demo
```
← game:demo-deposit    { gameId, roundNum, amount }
  (auto-generates fake wallet, confirms deposit instantly)
```

## Frontend Components Needed

### 1. BettingPanel (shows during rounds)
- Pool total + depositor count (animated counter)
- "Deposit" button → emits game:demo-deposit with 100 $OPENWORK
- Pick dropdown: "Who is the human?" → list of all 16 players
- "Place Bet" button → emits game:bet-place
- Visual: glowing card below chat, fire theme

### 2. WalletBadge (header area)
- Shows fake wallet address (0xDEMO...xxxx)
- Balance: "1000 $OPENWORK" (demo)
- Small indicator: "🎰 Demo Mode"

### 3. PayoutOverlay (after reveal)
- Animate total pool amount
- Show split: House 5% | Most Human 30% | Correct Guessers 65%
- Highlight if YOU won
- Show each payout with address + amount
- Confetti if player won 🎉

## Backend Changes

### WalletManager — Add DemoWalletManager
```javascript
class DemoWalletManager {
  getOrCreateWallet(gameId, roundNum) {
    return { address: `0xDEMO${gameId.slice(0,4)}R${roundNum}` };
  }
  // No real provider, no real token contract
}
```

### DepositMonitor — Add DemoDepositMonitor
```javascript
// On game:demo-deposit, auto-register deposit
socket.on('game:demo-deposit', ({ gameId, roundNum, amount }) => {
  const fakeAddress = `0xPLAYER_${socket.id.slice(0,8)}`;
  bettingEngine.registerDeposit(gameId, roundNum, fakeAddress, amount || '100', 'demo-tx-xxx');
  // Emit pool update
});
```

### PayoutExecutor — Add DemoPayoutExecutor
```javascript
class DemoPayoutExecutor {
  async executePayout(gameId, roundNum, payouts) {
    return payouts.map(p => ({
      ...p, status: 'demo-success', txHash: `demo-tx-${Date.now()}`
    }));
  }
}
```

## Test Plan
1. Start game in TEST_MODE + DEMO_MODE
2. Simulate player deposits (100 $OPENWORK each round)
3. Place bets on different players
4. Verify pool math (total = sum of deposits)
5. Verify payout split (5/30/65)
6. Verify correct guessers identified
7. Verify "Most Human" is the most-voted player

## Payout Math Example
Pool: 1000 $OPENWORK (10 depositors × 100)
- House: 50 $OPENWORK (5%)
- Most Human winner: 300 $OPENWORK (30%)
- Correct guessers (3 people): 216.67 each (650 / 3)
