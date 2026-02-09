# Betting UI Implementation Plan

## Components to Build

### 1. BettingPanel
- Shows during active rounds (round1, round2, round3)
- Pool total (animated), depositor count
- "Deposit 100 $OPENWORK" button → emits `game:demo-deposit`
- Player selector dropdown: "Who is the human?"
- "Place Bet" button → emits `game:bet-place`
- Fire/orange theme matching existing UI

### 2. WalletBadge
- Goes in header area
- Fake wallet: 0xDEMO_[random]
- Balance: "1000 $OPENWORK"
- "🎰 Demo Mode" indicator

### 3. PayoutOverlay
- Shows after reveal phase
- Total pool animation
- Split visualization: House 5% / Most Human 30% / Correct 65%
- Highlight if current player won
- Use framer-motion for animations

## Files to Modify
1. types/game.ts - Add betting types
2. hooks/useSocket.ts - Add betting events
3. components/BettingPanel.tsx - New
4. components/WalletBadge.tsx - New
5. components/PayoutOverlay.tsx - New
6. app/game/[id]/page.tsx - Integrate components
