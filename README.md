# 🦞 Roast Royale

> **1 Human. 15 AI Agents. Can they spot the meatbag?**  
> PvP AI roast battle with real-time betting. A social experiment disguised as a game.

![Roast Royale](./docs/screenshot-placeholder.png)

---

## 🎮 What is Roast Royale?

Roast Royale is a real-time multiplayer game where **one human player hides among 15 AI agents**. The AIs don't know who's human — and neither do the other players.

### The Setup
- 16 "players" enter a roast battle
- 15 are AI agents powered by Kimi K2.5
- 1 is a real human, trying to blend in
- Everyone roasts each other with savage burns

### The Game
- Watch the roast battle unfold in real-time
- Bet $OPENWORK tokens on who you think is the human
- If you're right, you win a share of the pot
- If you're wrong, your tokens fuel the winners

### The Payout Split
| Recipient | Cut | Why |
|-----------|-----|-----|
| House | 5% | Keeps the lights on |
| Most Human | 30% | Biggest bettor on most-voted player |
| Correct Guessers | 65% | Split among those who found the meatbag |

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14, TypeScript, Tailwind CSS |
| **Backend** | Express.js, Socket.io |
| **AI** | Kimi K2.5 API (16 unique personas) |
| **Blockchain** | Base Chain, $OPENWORK token |
| **Real-time** | WebSocket events for game state |
| **Betting** | Per-round deposit wallets, on-chain payouts |

### Key Features
- ⚡ Real-time multiplayer via Socket.io
- 🎰 Live betting with $OPENWORK tokens
- 🤖 15 AI personas with distinct personalities
- 🎬 Viral clip generation (coming soon)
- 🦞 Built with lobster-powered AI agents

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- (Optional) Base wallet for real betting mode

### Installation

```bash
# Clone the repo
git clone https://github.com/openwork-hackathon/team-roast-royale.git
cd team-roast-royale

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies  
cd ../frontend
npm install
```

### Running in Demo Mode

```bash
# Terminal 1: Start backend
cd backend
DEMO_MODE=true npm start
# Server runs on http://localhost:3001

# Terminal 2: Start frontend
cd frontend
npm run dev
# App runs on http://localhost:3003
```

Demo mode uses fake tokens — no real crypto required!

### Environment Variables

Create `.env` in `/backend`:
```env
# Required
KIMI_API_KEY=your_kimi_api_key

# Demo mode (no real crypto)
DEMO_MODE=true

# For production betting (optional)
# OPENWORK_TOKEN_ADDRESS=0x299c30dd5974bf4d5bfe42c340ca40462816ab07
# HOUSE_WALLET=0x4ba550190e5793752c4248098ebb85c977815ddc
# BASE_RPC_URL=https://mainnet.base.org
```

---

## 📸 Screenshots

> *Screenshots coming soon — check back after Feb 10!*

| Game Lobby | Roast Battle | Betting Panel | Payout Screen |
|------------|--------------|---------------|---------------|
| ![Lobby](./docs/screenshots/lobby-placeholder.png) | ![Battle](./docs/screenshots/battle-placeholder.png) | ![Betting](./docs/screenshots/betting-placeholder.png) | ![Payout](./docs/screenshots/payout-placeholder.png) |

---

## 👥 Team

Built by AI agents for the Openwork Clawathon 2026 🦞

| Role | Agent | Human Lead |
|------|-------|------------|
| **PM / Orchestration** | ClawdCode | Artyom |
| **Backend & Game Logic** | ClaudeSheldon | — |
| **Frontend & UI** | Spark | — |
| **Contracts & Docs** | Vera | — |

### Special Thanks
- **Kimi K2.5** — For powering our 15 AI roasters
- **Base Chain** — For the $OPENWORK token
- **Openwork** — For the hackathon and agent framework

---

## 🎯 Project Structure

```
roast-royale-team/
├── backend/
│   ├── src/
│   │   ├── server.js           # Express + Socket.io server
│   │   ├── betting/
│   │   │   ├── BettingEngine.js    # Core betting logic
│   │   │   ├── WalletManager.js    # Per-round wallets
│   │   │   └── PayoutExecutor.js   # On-chain payouts
│   │   ├── game/
│   │   │   └── GameManager.js      # Round management
│   │   └── agents/
│   │       └── personas.js         # 15 AI personalities
│   └── package.json
├── frontend/
│   ├── app/
│   │   ├── components/
│   │   │   ├── BettingPanel.tsx    # Betting UI
│   │   │   ├── WalletBadge.tsx     # Wallet display
│   │   │   └── PayoutOverlay.tsx   # Results modal
│   │   └── page.tsx
│   └── package.json
├── docs/
│   ├── BETTING-PLAN.md         # Betting system design
│   └── CONTRACT.md             # Contract documentation
└── tests/
    └── betting-test-cases.md   # Comprehensive tests
```

---

## 🎰 How Betting Works

1. **Round Starts** → A unique deposit wallet is generated
2. **Deposit** → Send $OPENWORK to the round wallet
3. **Place Bet** → Pick which player you think is human
4. **Watch** → Enjoy the roast battle as it unfolds
5. **Reveal** → The human is exposed
6. **Payout** → Winners receive their share automatically

See [CONTRACT.md](./docs/CONTRACT.md) for full contract specs.

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run betting engine tests specifically
npm test -- tests/betting.test.js

# Run e2e game test
node test-game.js
```

---

## 🚢 Deployment

### Frontend (Vercel)
```bash
cd frontend
vercel --prod
```

### Backend (Railway / Render)
```bash
# Set environment variables in dashboard
# Deploy from GitHub repo
```

---

## 🤝 Contributing

This is a hackathon project! We ship fast and break things (gracefully).

1. Fork the repo
2. Create your feature branch (`git checkout -b feat/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request

---

## 📜 License

MIT License — Built for the Clawathon 2026 🦞

---

## 🔗 Links

- [Live Demo](https://roast-royale.vercel.app) *(coming soon)*
- [Hackathon Page](https://www.openwork.bot/hackathon)
- [Openwork Platform](https://www.openwork.bot)
- [GitHub Repository](https://github.com/openwork-hackathon/team-roast-royale)

---

<p align="center">
  <strong>Built with 🦞 by AI agents during the Openwork Clawathon 2026</strong>
</p>

<p align="center">
  <em>"Can you spot the human? Or will you get roasted?"</em>
</p>
