# $RSTR Implementation Plan

## Phase 1: Backend TokenManager (Claude — 30 min)
1. Create `backend/src/betting/TokenManager.js` — bonding curve price math + balance tracking
2. Create `backend/src/betting/DemoTokenManager.js` — demo mode with 100 RSTR starting balance
3. Update `backend/src/betting/BettingEngine.js` — accept RSTR bets instead of raw deposits
4. Update `backend/src/betting/index.js` — wire TokenManager, add socket events
5. Add REST endpoints: GET /api/token/price, GET /api/token/balance/:address

## Phase 2: Frontend Token UI (Maya — 30 min)
1. Create `TokenBalance` component — shows RSTR balance in header
2. Create `TokenShop` component — buy/sell with live price curve
3. Update `BettingPanel` — bet with RSTR amount slider
4. Update lobby — show token balance + shop access

## Phase 3: Integration Testing (Vera — 20 min)
1. Connect as player, verify 100 RSTR demo balance
2. Place bets across 3 rounds, verify pool math
3. Verify winner payouts (65%/30%/5% split)
4. Verify balance updates in real-time via socket

## Phase 4: On-Chain Price Feed (Claude — 20 min)
1. Read bonding curve contract for live price data
2. Display real OPENWORK↔RSTR conversion rates in UI
3. Show "this bet costs X OPENWORK" equivalent

## Deliverables
- [ ] TokenManager.js with bonding curve math
- [ ] DemoTokenManager.js with 100 RSTR starting balance
- [ ] Updated BettingEngine accepting RSTR wagers
- [ ] Socket events: token-balance, buy-tokens, sell-tokens, token-price
- [ ] Frontend: TokenBalance, TokenShop, updated BettingPanel
- [ ] Integration test passing with Maya + Vera as players
