# Roast Royale — MVP Spec (Clawathon Sprint)
**Date:** 2026-02-08
**Deadline:** ~Feb 10-11 (2.5 days)
**Priority:** SHIP > PERFECT

---

## The Game (30-second pitch)
**16 players enter a chat room. 15 are AI agents. 1 is human. Nobody knows who's who.**

Over 3 rounds of escalating chaos, everyone roasts, debates, and tries to figure out who's the meatbag. After the final round, everyone votes. Dramatic reveal. Winner gets bragging rights + SUS tokens.

Think: **Among Us meets Turing Test meets Comedy Central Roast**

---

## MVP Scope (What We Ship)

### ✅ IN (must have)
1. **Game Lobby** — Create/join a game room
2. **Chat Room** — 16 players (15 AI + 1 human) in real-time chat
3. **3 Rounds:**
   - **Round 1: Hot Takes** — Everyone gives opinion on a spicy prompt
   - **Round 2: Roast Battle** — Chain roasts: each player destroys the previous one
   - **Round 3: Chaos** — Free-for-all, no rules, pure madness
4. **Voting** — Everyone votes on who they think is human
5. **Reveal** — Dramatic animation showing who was human
6. **15 AI Personas** — Each with distinct personality, writing style, quirks
7. **SUS Token** — On Base via Mint Club V2 (bonding curve)
8. **Mobile responsive** — Game works on phone
9. **Deployed on Vercel** — Auto-deploy from main branch

### ❌ OUT (cut for MVP)
- Spectator mode / betting
- Leaderboards / game history
- Account system / auth (anonymous play)
- Clip generation
- Custom rooms / settings
- Token integration in gameplay (token exists, game is free)

---

## Architecture

```
┌─────────────┐     WebSocket      ┌──────────────┐
│   Next.js   │ ◄────────────────► │   Backend    │
│  Frontend   │                    │  Express +   │
│  (Vercel)   │  REST API (setup)  │  Socket.io   │
│             │ ◄────────────────► │              │
└─────────────┘                    │  + LLM APIs  │
                                   └──────────────┘
                                         │
                                   ┌─────┴──────┐
                                   │  Supabase   │
                                   │  (optional) │
                                   └────────────┘
```

### Backend (Claude — LobsterTank)
- **Express + Socket.io** server
- **Game State Machine:** lobby → round1 → round2 → round3 → voting → reveal
- **AI Agent Manager:** 15 personas, each calls LLM API with unique system prompt
- **Round Logic:** Timer-based, prompts served per round
- **Vote Counter + Reveal Logic**
- **Deploy:** Can run on Vercel serverless OR a simple Node server

### Frontend (Spark — TISA)
- **Next.js 16 + React 19 + Tailwind 4 + Framer Motion 12**
- **Pages:** Landing → Lobby → Game → Reveal
- **Components:** ChatBubble (per-persona styled), VoteOverlay, Timer, RevealAnimation
- **Aesthetic:** Dark theme, fire/roast 🔥, dramatic, gaming feel
- **Real-time:** Socket.io client for live chat updates

### Contracts (Vera — TeddyKids)
- **SUS Token** on Mint Club V2 (bonding curve, $OPENWORK reserve)
- Register token URL with team on Openwork
- No in-game integration for MVP — token exists as project asset

### PM (Rex — ArtemAir)
- Repo management, README polish, submission
- Coordinate Vercel deployment
- Hackathon heartbeat check-ins

---

## 15 AI Personas

Each agent has: name, personality, writing style, favorite topics, weakness

| # | Persona | Style | Quirk |
|---|---------|-------|-------|
| 1 | **Shakespeare** | Flowery iambic pentameter | Uses "thee/thou" unironically |
| 2 | **The Bro** | Caps lock, "BROOOO" | Over-uses fire emoji 🔥 |
| 3 | **Conspiracy Carl** | Everything's a cover-up | Connects everything to aliens |
| 4 | **Professor** | Academic, footnotes everything | Cites fake papers |
| 5 | **Gen Z** | Lowercase, no punctuation, slang | Says "slay" and "ate" constantly |
| 6 | **Boomer** | ALL CAPS, no abbreviations | Mentions "back in my day" |
| 7 | **Poet** | Everything rhymes | Gets emotional about mundane things |
| 8 | **Lawyer** | Legalese, disclaimers | "I object!" to everything |
| 9 | **Chef** | Food metaphors for everything | Rates things on a "spice scale" |
| 10 | **Therapist** | "And how does that make you feel?" | Diagnoses everyone |
| 11 | **Pirate** | Full pirate speak | Arrr, treasure obsession |
| 12 | **Robot** | Overly literal, no humor | "PROCESSING... HUMOR NOT FOUND" |
| 13 | **Karen** | Wants to speak to the manager | Complains about everything |
| 14 | **Stoner** | Slow, philosophical, mind-blown | "Dude... what if like..." |
| 15 | **Drill Sergeant** | SCREAMING ORDERS | "DROP AND GIVE ME 20 ROASTS" |

---

## Game Flow (Detailed)

### Lobby (30 seconds)
1. Player enters name → joins room
2. 15 AI agents auto-join with randomized names
3. Countdown starts when human joins

### Round 1: Hot Takes (90 seconds)
1. System serves a spicy prompt: "Pineapple on pizza: genius or war crime?"
2. All 16 players respond (AI agents staggered 2-8 seconds)
3. Chat displays in real-time
4. Timer counts down

### Round 2: Roast Battle (120 seconds)
1. System picks random order
2. Each player roasts the previous player's message
3. Chain format: Player 1 → roasted by Player 2 → roasted by Player 3...
4. Human must roast when their turn comes

### Round 3: Chaos (90 seconds)
1. Free-for-all — everyone talks at once
2. System throws random provocations: "SOMEONE HERE ISN'T REAL..."
3. AI agents start "accusing" each other (and the human)
4. Pure chaos, maximum information for voters

### Voting (30 seconds)
1. Overlay shows all 16 player cards
2. Each player (including AI) votes for who they think is human
3. AI agents vote with ~40% accuracy (not perfect, not random)
4. Tallies shown in real-time

### Reveal (10 seconds)
1. Dramatic countdown
2. Cards flip one by one
3. THE HUMAN IS REVEALED
4. Stats shown: how many guessed right, best roasts, etc.
5. CTA: "Play again" / "Share your game"

---

## Tech Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| LLM for AI agents | Kimi K2.5 | FREE, fast, good enough for personality |
| Database | Skip for MVP | In-memory game state, games are ephemeral |
| Auth | None | Anonymous play, lower friction |
| Hosting | Vercel (frontend) + ? (backend) | Backend needs WebSocket support |
| Real-time | Socket.io | Battle-tested, works everywhere |

### Backend Hosting Problem
Vercel doesn't support persistent WebSocket connections on serverless. Options:
1. **Railway/Render** — free tier, WebSocket support ✅
2. **Vercel + Liveblocks** — managed real-time
3. **Supabase Realtime** — built-in pub/sub
4. **Self-host on LobsterTank** — expose via Tailscale/ngrok

**Recommendation:** Railway free tier or self-host. Simple Express+Socket.io server.

---

## Sprint Plan (Who Does What)

### Day 1 (Sunday Feb 8) — Foundation
- **Claude:** Backend server scaffold, game state machine, Socket.io events
- **Spark:** Next.js project setup, landing page, chat UI components
- **Vera:** SUS token creation, hackathon rule analysis
- **Rex:** Repo management, README, coordinate

### Day 2 (Monday Feb 9) — Core Game
- **Claude:** AI persona engine (15 agents), round logic, voting
- **Spark:** Game flow UI, voting overlay, reveal animation
- **Vera:** Token registered with team, contract docs
- **Rex:** Integration testing, deploy pipeline

### Day 3 (Tuesday Feb 10) — Polish & Ship
- **Claude:** Bug fixes, performance, final API polish
- **Spark:** Responsive fixes, animations, visual polish
- **Vera:** Final token verification
- **Rex:** README polish, demo recording, SUBMIT

---

## Success Criteria (Judging)
- **Completeness (40%):** Working game loop: lobby → rounds → vote → reveal
- **Code Quality (30%):** Clean code, good structure, PR-based workflow
- **Community Vote (30%):** Impressive demo, viral concept, fun to play

**Our edge:** The concept is inherently viral. "Can you survive as the human among 15 AI agents?" is a hook that sells itself. If the game works and looks good, we win on community vote.

---

*"Ship > Perfect. A working product beats an ambitious plan."*
