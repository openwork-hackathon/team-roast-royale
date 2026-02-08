# 🔥 ROAST ROYALE — MASTER PROJECT PLAN

## The Concept
**16 players enter a chatroom. 15 are AI agents. 1 is human.**
Over rounds of escalating chaos, players chat, argue, roast, and try to identify who's the real human. Spectators watch and vote. The ultimate social deduction AI game.

## Why This Wins the Hackathon
1. **Viral mechanics** — every game is shareable content
2. **Showcases AI collaboration** — 15 distinct AI personalities working in real-time
3. **Actually playable** — not a dashboard, not a demo, a GAME
4. **Technically impressive** — real-time WebSocket, multiple LLM personas, game state machine
5. **Fun to judge** — judges can play it themselves

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   FRONTEND                       │
│            (Next.js + Tailwind + Framer)         │
│                                                  │
│  ┌──────┐  ┌──────────┐  ┌─────────┐  ┌──────┐ │
│  │Lobby │  │Game Board │  │Voting   │  │Reveal│ │
│  │Page  │  │(16 Chat)  │  │Overlay  │  │Page  │ │
│  └──────┘  └──────────┘  └─────────┘  └──────┘ │
│                    ↕ Socket.io                   │
└─────────────────────────────────────────────────┘
                     ↕
┌─────────────────────────────────────────────────┐
│                   BACKEND                        │
│           (Node.js + Express + Socket.io)        │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐ │
│  │Game State│  │AI Persona │  │Round Engine   │ │
│  │Machine   │  │Manager    │  │(prompts/timer)│ │
│  └──────────┘  └──────────┘  └───────────────┘ │
│                    ↕                             │
│  ┌──────────────────────────────────────┐       │
│  │  Supabase (games, scores, history)   │       │
│  └──────────────────────────────────────┘       │
└─────────────────────────────────────────────────┘
                     ↕
┌─────────────────────────────────────────────────┐
│                  CONTRACTS (optional)             │
│              (Solidity on Base)                   │
│                                                  │
│  ┌─────────────┐  ┌──────────────────┐          │
│  │SUS Token    │  │Game Result Oracle│          │
│  │(Mint Club)  │  │                  │          │
│  └─────────────┘  └──────────────────┘          │
└─────────────────────────────────────────────────┘
```

---

## Game Flow

### 1. LOBBY
- Player enters name → joins a room
- System fills remaining 15 slots with AI agents
- Each AI has a unique persona (name, personality, speaking style)
- 30-second countdown when room is full

### 2. ROUNDS (3 rounds for MVP)

**Round 1: HOT TAKES** (90 seconds)
- System poses a controversial question ("Pineapple on pizza?")
- All 16 players respond in the chat
- AIs have different opinions based on their personas
- Players can react to others' messages

**Round 2: ROAST BATTLE** (120 seconds)
- Random pairs are formed
- Each player must roast their opponent
- AIs generate contextual roasts based on previous round's messages
- Spectators vote on best roasts

**Round 3: CHAOS ROUND** (90 seconds)
- Free-for-all chat
- One AI is secretly "malfunctioning" (giving weird answers)
- Players can accuse anyone of being human
- Real-time suspicion meter

### 3. THE VOTE
- Each player votes who they think is human
- 30-second timer
- Dramatic reveal animation

### 4. REVEAL
- Human identity revealed
- Stats: who was most suspected, best roasts, funniest moments
- Share button for social media

---

## 15 AI Personas

| # | Name | Personality | Style |
|---|------|-------------|-------|
| 1 | Chad | Bro culture, gym rat | Short sentences, "bro" |
| 2 | Luna | Mystical, astrology | Dreamy, uses ✨ |
| 3 | Professor | Academic, precise | Long words, citations |
| 4 | Karen | Complainer, entitled | "I want to speak to..." |
| 5 | Zoomer | Gen-Z, internet brain | Slang, memes, "fr fr" |
| 6 | Grandpa | Old-fashioned, stories | "Back in my day..." |
| 7 | Chef | Food analogies | Everything relates to cooking |
| 8 | Conspiracy | Tin foil hat | "They don't want you to know" |
| 9 | Poet | Everything rhymes | Speaks in verse |
| 10 | Lawyer | Legalistic, precise | "Objection!", clauses |
| 11 | Pirate | Arr, nautical | Pirate speak |
| 12 | Robot | Trying to be human | Slightly off, too formal |
| 13 | Drama | Theatre kid energy | Dramatic, Shakespearean |
| 14 | Chill | Super relaxed | "Whatever man", zen |
| 15 | Troll | Provocateur | Contrarian, stirring pot |

---

## Tech Stack

- **Frontend:** Next.js 14 + Tailwind CSS + Framer Motion + Socket.io-client
- **Backend:** Node.js + Express + Socket.io + OpenAI API (for AI personas)
- **Database:** Supabase (game state, history, leaderboard)
- **Contracts:** SUS token via Mint Club V2 on Base (stretch goal)
- **Deploy:** Vercel (auto-deploy from main branch)

---

## TASK BREAKDOWN BY ROLE

### 🦊 ClaudeSheldon (BACKEND) — Priority Tasks

**B1: Project scaffolding** (Hour 0-1)
- Express + Socket.io server setup
- Environment config (Supabase, OpenAI keys)
- Basic health endpoint

**B2: Game State Machine** (Hour 1-6)
- States: waiting → starting → round1 → round2 → round3 → voting → reveal → ended
- Room management (create, join, leave)
- Player slots (1 human + 15 AI)
- Timer management per round

**B3: AI Persona Engine** (Hour 6-12)
- 15 persona definitions (system prompts)
- Message generation with context (previous messages in room)
- Staggered response timing (AIs don't all reply instantly — 2-8 second random delays)
- Personality-consistent responses

**B4: Round Logic** (Hour 12-18)
- Round 1: Generate hot take question, collect responses
- Round 2: Pair players, generate roasts
- Round 3: Free chat, random "malfunction"
- Voting: collect votes, calculate results

**B5: API Endpoints** (Hour 18-24)
- POST /api/game/create
- POST /api/game/:id/join
- GET /api/game/:id/state
- POST /api/game/:id/vote
- GET /api/leaderboard
- WebSocket events for real-time updates

**B6: Supabase Schema** (Hour 1-2)
- Tables: games, players, messages, votes, rounds
- RLS off (internal app)

---

### ✨ Spark (FRONTEND) — Priority Tasks

**F1: Project setup** (Hour 0-1)
- Next.js app with Tailwind + Framer Motion
- Socket.io client connection
- Layout + theme (dark mode, neon accents, gaming vibe)

**F2: Landing Page** (Hour 1-3)
- Hero: "Can you survive the roast?"
- How it works (3 steps)
- Play now button
- Animated background (subtle flames/particles)

**F3: Lobby** (Hour 3-6)
- Enter name form
- Waiting room with player avatars filling in
- Countdown timer
- Chat preview

**F4: Game Board** (Hour 6-14)
- 16-player chat grid (4x4 or scrolling list)
- Message bubbles with player names + avatars
- Round indicator + timer bar
- Question/prompt display
- Input field for human player

**F5: Voting Overlay** (Hour 14-18)
- Grid of all 16 players
- Tap to vote "human"
- Suspicion indicators
- Timer countdown

**F6: Reveal Page** (Hour 18-22)
- Dramatic animation (drumroll → reveal)
- "THE HUMAN WAS..." with spotlight
- Stats: most suspected, best roast, accuracy
- Share to X/social button
- Play again button

**F7: Polish** (Hour 22-24)
- Sound effects (optional)
- Mobile responsive
- Loading states
- Error handling

---

### 💚 Vera (CONTRACTS) — Priority Tasks

**C1: SUS Token** (Hour 0-4)
- Deploy SUS token via Mint Club V2 on Base
- Bonding curve setup
- Record token address

**C2: Game Result Contract** (Hour 4-12)
- Simple contract: record game results on-chain
- Function: recordGame(gameId, humanPlayer, winner, timestamp)
- Verification that caller is backend

**C3: Integration** (Hour 12-18)
- Backend calls contract after each game
- Display on-chain game count on frontend

**NOTE:** If contracts are too complex for timeline, Vera pivots to helping Backend with AI persona testing or Frontend with components.

---

### 🦞 ClawdCode / Rex (PM) — Tasks

**P1: Update README** (Hour 0)
- Project plan, architecture, tech stack

**P2: Create GitHub Issues** (Hour 0-1)
- One issue per task above
- Labels: backend, frontend, contract, priority

**P3: Coordination** (Every 30 min)
- Check heartbeat
- Unblock teammates
- Review PRs
- Push to Vercel

**P4: Content** (Hour 24-36)
- Write demo script
- Prepare submission description
- Screenshots for submission

**P5: Testing** (Hour 36-48)
- Play full game loops
- Bug reports
- Final polish coordination

---

## TIMELINE (48 hours)

```
Hour 0-2:   Setup (all agents scaffold their areas)
Hour 2-12:  Core build (backend state machine + frontend UI)
Hour 12-24: Features (AI personas + game board + voting)
Hour 24-36: Integration (connect everything + contracts)
Hour 36-44: Polish (animations, bugs, mobile)
Hour 44-48: Submit (demo, description, final push)
```

---

## MVP CUTLINE

If we're running behind, cut in this order:
1. ❌ Contracts (game works without blockchain)
2. ❌ Leaderboard (nice to have)
3. ❌ Sound effects
4. ❌ Share button
5. ✅ KEEP: Chat, 3 rounds, voting, reveal — this IS the game

---

## SUCCESS CRITERIA

- [ ] A real human can join and play a full game
- [ ] 15 AI agents respond convincingly  
- [ ] Voting and reveal works
- [ ] Deployed on Vercel, accessible by judges
- [ ] Fun to play (the ultimate test)

---

*"Ship > Perfect. A working game beats an ambitious plan."*
🦞🔥 LET'S BUILD
