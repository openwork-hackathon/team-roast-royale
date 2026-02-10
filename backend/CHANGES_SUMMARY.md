# Roast Royale Backend Changes Summary

## Changes Made for Hackathon Submission

### 1. Updated TokenManager Pricing (`src/betting/TokenManager.js`)
**Changed bonding curve config to flat pricing:**
- `minPrice`: 100 OPENWORK per RSTR (was 0.0001)
- `maxPrice`: 100 OPENWORK per RSTR (flat rate)
- `steps`: 1 (single step = flat pricing)
- Result: 100K OPENWORK = 1000 RSTR exactly

### 2. Updated Demo Starting Balance (`src/betting/DemoTokenManager.js`)
**Changed `DEMO_STARTING_BALANCE`:**
- Old: 100 RSTR
- New: 1000 RSTR
- All new players now start with 1000 RSTR

### 3. Auto-Match Game Lobby (`src/server.js`)
**Added 10-minute game cycle system:**
- `MATCH_INTERVAL_MS`: 10 minutes (600,000ms)
- A "current lobby" game is always available for humans to join
- Every 10 minutes, the current lobby auto-starts (if at least 1 human joined)
- A new lobby game is immediately created for the next cycle
- Broadcasts `match:timer` event every second with countdown
- New endpoint: `GET /api/games/current` returns current lobby state

### 4. Multi-Human Player Support (`src/game/GameEngine.js`)
**Game class now supports up to 2 human players:**
- Added `this.humanPlayers = []` array (max 2 humans)
- Kept `this.humanPlayer` for backward compatibility (first human)
- AI players count: `16 - humanCount` (so 2 humans + 14 AI = 16 total)
- Added `addHumanPlayer(name)` method - returns new player or null if full
- Added `joinAsHuman(gameId, playerName)` to GameEngine for joining existing lobbies
- Updated `_aiVote()` to handle multiple humans (40% chance to vote for any human)
- Updated `_getVoteResults()` to correctly identify all humans
- Updated `getPublicState()` to include `humanPlayerIds` array in reveal phase

### 5. New Socket Event (`src/routes/socketHandlers.js`)
**Added `game:join-match` socket event:**
- Checks if there's a current lobby game
- If yes: joins the human to that game
- If no: returns error (lobby should always exist via auto-cycle)
- Supports up to 2 humans per lobby
- Returns: `{ gameId, playerId, isFull, humanCount }`
- Emits `game:player-joined` to notify room of new players

### 6. Current Lobby API Endpoint (`src/server.js`)
**Added `GET /api/games/current`:**
```json
{
  "gameId": "abc123",
  "phase": "lobby",
  "humanCount": 1,
  "maxHumans": 2,
  "secondsUntilMatch": 542,
  "players": [...],
  "createdAt": 1234567890
}
```

### 7. Increased Recommended Bet Amounts (`src/betting/BettingEngine.js` & `src/betting/index.js`)
**Added recommended bet documentation:**
- `RECOMMENDED_BET`: 50 RSTR per round
- `recommendedBetTotal`: 150 RSTR for full 3-round game
- Token info endpoint now includes:
  - `recommendedBet`: 50
  - `recommendedBetTotal`: 150
  - `recommendedBetNote`: "50 RSTR per round (150 RSTR for full 3-round game)"

## Backward Compatibility

All existing functionality is preserved:
- `game:create` still works for creating private games
- `game:join` still works for joining existing games
- `humanPlayer` property still exists (refers to first human)
- All socket.io events remain unchanged
- Frontend can continue using existing endpoints

## Test Results

All token tests pass:
- ✅ Starting balance: 1000 RSTR
- ✅ Token conservation verified
- ✅ Betting system works correctly
- ✅ House cut (5%) properly calculated
- ✅ Payouts distributed correctly

## Files Modified

1. `/src/betting/TokenManager.js` - Bonding curve pricing
2. `/src/betting/DemoTokenManager.js` - Starting balance
3. `/src/server.js` - Auto-match lobby system + API endpoint
4. `/src/game/GameEngine.js` - Multi-human support
5. `/src/routes/socketHandlers.js` - New socket handlers
6. `/src/betting/BettingEngine.js` - Recommended bet constant
7. `/src/betting/index.js` - Token info with recommended bet
