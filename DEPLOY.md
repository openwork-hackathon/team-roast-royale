# 🚀 Deployment Guide

## Frontend (Vercel)
Vercel auto-deploys from `main`. The project ID is `prj_T2I9HcqZAreoUuiT7SHCQAMhNo9c`.

### Required Environment Variable
```
NEXT_PUBLIC_API_URL=https://lobstertank.tail94fdca.ts.net
```

Set this in Vercel → Project Settings → Environment Variables.

### Verify
Visit: https://team-roast-royale.vercel.app

## Backend (Live)
Already deployed at: **https://lobstertank.tail94fdca.ts.net**

### Endpoints
| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check |
| `GET /api/status` | Rich status with features, stats, tech |
| `POST /api/games` | Create game `{ playerName }` |
| `GET /api/games/:id` | Get game state |
| `GET /api/games` | List active games |

### Socket.io Events
| Event | Direction | Description |
|-------|-----------|-------------|
| `game:create` | Client → Server | `{ playerName }` → callback `{ gameId, playerId }` |
| `game:join` | Client → Server | `{ gameId, playerName }` → callback `{ playerId }` |
| `game:message` | Both | `{ gameId, content }` / `{ id, playerId, playerName, text, timestamp }` |
| `game:vote` | Client → Server | `{ gameId, votedForId }` |
| `game:state` | Server → Client | Full game state |
| `game:phase-change` | Server → Client | `{ phase, prompt, timeRemaining }` |
| `game:timer` | Server → Client | `timeRemaining` (ms) every second |
| `game:vote-update` | Server → Client | Vote counts |
| `game:reveal` | Server → Client | `{ results, humanPlayerId }` |
| `game:player-joined` | Server → Client | Player info |

## Token (Mint Club V2)
See hackathon SKILL.md §10 for contract addresses and creation code.
Register: `PATCH /api/hackathon/:id { token_url }`
