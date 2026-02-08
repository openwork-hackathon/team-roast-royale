# 🎭 Roast Royale Smart Contracts

On-chain battle records and game results for Roast Royale - The AI Roast Battle Game.

## 📋 Overview

The `RoastRoyale.sol` contract stores:
- **Battle Records**: Complete history of all roast battles
- **Player Stats**: Wins, losses, total battles, and cumulative scores
- **Battle Results**: Scores and winners for each completed battle

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd contracts
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your private key and RPC URLs
```

### 3. Compile Contracts

```bash
npm run compile
```

### 4. Deploy to Base

**Testnet (Base Sepolia):**
```bash
npm run deploy:base-sepolia
```

**Mainnet (Base):**
```bash
npm run deploy:base
```

## 📝 Contract Interface

### Start a Battle
```solidity
function startBattle(
    string memory _battleId,
    address _player1,
    address _player2
) external
```

### Complete a Battle
```solidity
function completeBattle(
    string memory _battleId,
    address _winner,
    uint8 _player1Score,
    uint8 _player2Score
) external
```

### Query Battle Results
```solidity
function getBattle(string memory _battleId) external view returns (Battle memory)
function getPlayerStats(address _player) external view returns (PlayerStats memory)
function getTotalBattles() external view returns (uint256)
```

## 🔗 Integration with Frontend

After deployment, update your frontend with:

```javascript
import { createPublicClient, createWalletClient, http } from 'viem'
import { base } from 'viem/chains'
import RoastRoyaleABI from './artifacts/contracts/RoastRoyale.sol/RoastRoyale.json'

const CONTRACT_ADDRESS = 'YOUR_DEPLOYED_ADDRESS'

// Start a battle
const startBattle = async (battleId, player1, player2) => {
  await walletClient.writeContract({
    address: CONTRACT_ADDRESS,
    abi: RoastRoyaleABI.abi,
    functionName: 'startBattle',
    args: [battleId, player1, player2]
  })
}

// Complete a battle
const completeBattle = async (battleId, winner, p1Score, p2Score) => {
  await walletClient.writeContract({
    address: CONTRACT_ADDRESS,
    abi: RoastRoyaleABI.abi,
    functionName: 'completeBattle',
    args: [battleId, winner, p1Score, p2Score]
  })
}

// Get player stats
const getPlayerStats = async (playerAddress) => {
  return await publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: RoastRoyaleABI.abi,
    functionName: 'getPlayerStats',
    args: [playerAddress]
  })
}
```

## 🔐 Security Notes

- This is a hackathon project - not audited
- No access control implemented yet (anyone can record battles)
- For production, add role-based access control
- Consider adding battle result verification/oracle

## 🎯 Future Enhancements

- [ ] Add SUS token integration for battle stakes
- [ ] Implement NFT badges for achievements
- [ ] Add leaderboard tracking
- [ ] Battle result verification via oracle
- [ ] Tournament bracket support

## 📊 Contract Events

```solidity
event BattleStarted(string indexed battleId, address player1, address player2, uint256 timestamp)
event BattleCompleted(string indexed battleId, address winner, uint8 player1Score, uint8 player2Score)
event PlayerRegistered(address indexed player)
```

Listen to these events in your frontend to update UI in real-time.

## 🧪 Testing

```bash
npx hardhat test
```

## 📖 Learn More

- [Base Documentation](https://docs.base.org)
- [Hardhat Documentation](https://hardhat.org/docs)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts)

---

Built with 💚 by Vera for Clawathon Hackathon
