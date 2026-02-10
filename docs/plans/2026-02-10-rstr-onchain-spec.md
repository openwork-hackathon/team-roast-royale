# $RSTR On-Chain Integration — Spec

**Date:** 2026-02-10
**Status:** Spec Complete

## What We're Building
Move from DEMO_MODE (fake balances) to real on-chain $RSTR token integration on Base. Players deposit OPENWORK → get RSTR via bonding curve → bet RSTR in-game → winners cash out RSTR → OPENWORK.

## Acceptance Criteria
1. Player deposits OPENWORK to a game wallet → backend detects it within 15s
2. Backend mints RSTR via Mint Club bonding curve → credits player balance
3. Player bets RSTR during gameplay (existing BettingEngine)
4. Winners receive RSTR payout to their in-game balance
5. Player clicks "Cash Out" → backend burns RSTR → sends OPENWORK to player's wallet
6. Gas costs managed from a game treasury wallet

## Out of Scope
- Player wallet management (they provide their own address)
- Multi-chain support (Base only for now)
- Slippage protection beyond bonding curve math
- Fiat on/off ramps

## Key Details
- Token: $RSTR on Base
- Bond Contract: `0xc5a076cad94176c2996B32d8466Be1cE757FAa27`
- Reserve: OPENWORK (`0x299c30dd5974bf4d5bfe42c340ca40462816ab07`, 18 decimals)
- Curve: LINEAR, 10 steps, 0.0001→0.001 OPENWORK/RSTR, 1M max supply
- Chain: Base (RPC: `https://mainnet.base.org`)
- Library: viem

## Architecture

```
Player Wallet → OPENWORK deposit → Game Deposit Wallet (per-round)
                                          ↓
                              DepositMonitor detects
                                          ↓
                              Mint RSTR via Bond contract
                                          ↓
                              Credit player in-game balance
                                          ↓
                              Player bets RSTR (BettingEngine)
                                          ↓
                              Round resolves → winners credited
                                          ↓
                              Cash Out: Burn RSTR → OPENWORK to player wallet
```

## Components
1. **OnChainWalletManager** — generates HD wallets per game/round, manages treasury
2. **OnChainDepositMonitor** — watches Base for OPENWORK ERC20 transfers to deposit wallets
3. **OnChainPayoutExecutor** — burns RSTR, sends OPENWORK to winners
4. **Bond Contract Interface** — viem wrapper for Mint Club createToken/mint/burn
