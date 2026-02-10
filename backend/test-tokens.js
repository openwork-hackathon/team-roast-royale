/**
 * test-tokens.js — Test RSTR Token Integration
 * 
 * Tests the DemoTokenManager and BettingEngine with RSTR:
 * - Creates 3 players with 100 RSTR each
 * - Simulates 3 rounds of betting
 * - Verifies math (65%/30%/5% split)
 * - Prints final balances
 */

const { DemoTokenManager, DEMO_STARTING_BALANCE } = require('./src/betting/DemoTokenManager');
const { BettingEngine } = require('./src/betting/BettingEngine');

// Test configuration
const PLAYERS = [
  { id: 'player1', name: 'Alice' },
  { id: 'player2', name: 'Bob' },
  { id: 'player3', name: 'Charlie' }
];

const HUMAN_PLAYER_ID = 'player1'; // Alice is the human
const BET_AMOUNT = 10; // 10 RSTR per bet

console.log('🧪 RSTR Token Integration Test\n');
console.log('=' .repeat(50));

// Initialize
const tokenManager = new DemoTokenManager();
const bettingEngine = new BettingEngine(tokenManager);

// Initialize game
const gameId = 'test-game-001';
bettingEngine.initGame(gameId, HUMAN_PLAYER_ID, PLAYERS);

console.log('\n📊 Initial Setup:');
console.log(`   Game ID: ${gameId}`);
console.log(`   Human Player: ${HUMAN_PLAYER_ID} (Alice)`);
console.log(`   Players: ${PLAYERS.map(p => p.name).join(', ')}`);
console.log(`   Starting Balance: ${DEMO_STARTING_BALANCE} RSTR each`);
console.log(`   Bet Amount: ${BET_AMOUNT} RSTR per bet`);

// Print initial balances
console.log('\n💰 Initial Balances:');
for (const player of PLAYERS) {
  const balance = tokenManager.getBalance(player.id);
  console.log(`   ${player.name} (${player.id}): ${balance} RSTR`);
}

// Simulate 3 rounds of betting
console.log('\n' + '='.repeat(50));
console.log('🎲 SIMULATING 3 ROUNDS OF BETTING');
console.log('='.repeat(50));

const roundResults = [];

for (let roundNum = 1; roundNum <= 3; roundNum++) {
  console.log(`\n--- Round ${roundNum} ---`);
  
  // Open betting
  bettingEngine.openRound(gameId, roundNum);
  
  // Each player places a bet (in a real game, they'd pick different targets)
  // For testing:
  // - Player 1 (human) bets on Player 2
  // - Player 2 bets on Player 1 (correct guess!)
  // - Player 3 bets on Player 1 (correct guess!)
  
  const bets = [
    { playerId: 'player1', target: 'player2', name: 'Alice' },   // Wrong guess
    { playerId: 'player2', target: 'player1', name: 'Bob' },     // Correct!
    { playerId: 'player3', target: 'player1', name: 'Charlie' }  // Correct!
  ];
  
  console.log('   Bets placed:');
  for (const bet of bets) {
    const result = bettingEngine.placeBet(gameId, roundNum, bet.playerId, bet.target, BET_AMOUNT);
    if (result.success) {
      console.log(`   - ${bet.name} bets ${result.amount} RSTR on ${bet.target === HUMAN_PLAYER_ID ? 'HUMAN' : 'AI'}`);
    } else {
      console.log(`   - ${bet.name} FAILED: ${result.error}`);
    }
  }
  
  // Get round state
  const state = bettingEngine.getRoundState(gameId, roundNum);
  console.log(`   Pool total: ${state.totalPool} RSTR (${state.betCount} bets)`);
  
  // Close betting
  bettingEngine.closeRound(gameId, roundNum);
  
  // Resolve round
  const result = bettingEngine.resolveRound(gameId, roundNum);
  roundResults.push(result);
  
  console.log('   Payouts:');
  console.log(`   - House (5%): ${result.houseCut.toFixed(2)} RSTR`);
  console.log(`   - Most Human (30%): ${result.mostHumanPayout.amount.toFixed(2)} RSTR → ${result.payouts.find(p => p.type === 'most_human')?.playerId || 'none'}`);
  
  const correctPayouts = result.payouts.filter(p => p.type === 'correct_guess');
  if (correctPayouts.length > 0) {
    console.log(`   - Correct Guessers (65%): ${correctPayouts[0].amount.toFixed(2)} RSTR each`);
    for (const payout of correctPayouts) {
      console.log(`     → ${payout.playerId}`);
    }
  }
}

// Print final balances
console.log('\n' + '='.repeat(50));
console.log('💰 FINAL BALANCES');
console.log('='.repeat(50));

let totalWinnings = 0;
let totalLosses = 0;

for (const player of PLAYERS) {
  const balance = tokenManager.getBalance(player.id);
  const netChange = balance - DEMO_STARTING_BALANCE;
  const emoji = netChange > 0 ? '📈' : netChange < 0 ? '📉' : '➡️';
  
  console.log(`   ${emoji} ${player.name} (${player.id}): ${balance.toFixed(2)} RSTR (change: ${netChange >= 0 ? '+' : ''}${netChange.toFixed(2)})`);
  
  if (netChange > 0) totalWinnings += netChange;
  if (netChange < 0) totalLosses += Math.abs(netChange);
}

// Print token info
console.log('\n' + '='.repeat(50));
console.log('🪙 TOKEN INFO');
console.log('='.repeat(50));

const tokenInfo = tokenManager.getTokenInfo();
console.log(`   Name: ${tokenInfo.name}`);
console.log(`   Symbol: ${tokenInfo.symbol}`);
console.log(`   Chain: ${tokenInfo.chain}`);
console.log(`   Current Price: ${tokenInfo.buyPrice.toFixed(6)} OPENWORK/RSTR`);
console.log(`   Total Supply: ${tokenInfo.totalSupply.toFixed(2)} RSTR`);
console.log(`   Max Supply: ${tokenInfo.maxSupply.toLocaleString()} RSTR`);
console.log(`   Mint Club URL: ${tokenInfo.mintClubUrl}`);

// Print transaction history
console.log('\n' + '='.repeat(50));
console.log('📝 TRANSACTION HISTORY');
console.log('='.repeat(50));

const transactions = tokenManager.getAllTransactions();
for (const tx of transactions) {
  const time = new Date(tx.timestamp).toISOString().split('T')[1].split('.')[0];
  if (tx.type === 'debit' && tx.reason?.startsWith('bet')) {
    console.log(`   [${time}] ${tx.playerId}: -${tx.amount} RSTR (bet)`);
  } else if (tx.type === 'credit' && tx.reason?.includes('prize')) {
    console.log(`   [${time}] ${tx.playerId}: +${tx.amount.toFixed(2)} RSTR (${tx.reason})`);
  }
}

// Verify math
console.log('\n' + '='.repeat(50));
console.log('✅ MATH VERIFICATION');
console.log('='.repeat(50));

// Total pool from all rounds
const totalPool = roundResults.reduce((sum, r) => sum + r.totalPool, 0);
const totalHouse = roundResults.reduce((sum, r) => sum + r.houseCut, 0);

// Sum of all balance changes should equal negative house cut
// (house takes tokens out of player circulation)
const netSystemChange = PLAYERS.reduce((sum, p) => {
  return sum + (tokenManager.getBalance(p.id) - DEMO_STARTING_BALANCE);
}, 0);

console.log(`   Total wagered across all rounds: ${totalPool} RSTR`);
console.log(`   Total house cut (5%): ${totalHouse.toFixed(2)} RSTR`);
console.log(`   Net player change: ${netSystemChange.toFixed(6)} RSTR`);
console.log(`   Expected (negative of house cut): ${(-totalHouse).toFixed(6)} RSTR`);

// House cut should equal the negative of net player change
if (Math.abs(netSystemChange + totalHouse) < 0.0001) {
  console.log('   ✅ Token conservation verified! (house cut = player losses)');
} else {
  console.log('   ❌ Token conservation FAILED!');
  console.log(`      Difference: ${Math.abs(netSystemChange + totalHouse).toFixed(6)}`);
  process.exit(1);
}

// Check outcomes - wrong guesser should lose, best correct guesser should profit
const aliceBalance = tokenManager.getBalance('player1');
const bobBalance = tokenManager.getBalance('player2');
const charlieBalance = tokenManager.getBalance('player3');

const checks = [
  { name: 'Alice (wrong guesser)', balance: aliceBalance, expectLoss: true },
  { name: 'Bob (best correct guesser + most human)', balance: bobBalance, expectProfit: true },
  { name: 'Charlie (correct guesser)', balance: charlieBalance }
];

console.log('\n   Expected outcomes:');
let allPassed = true;
for (const check of checks) {
  const netChange = check.balance - DEMO_STARTING_BALANCE;
  let passed = true;
  let expectation = 'any';
  
  if (check.expectLoss) {
    passed = netChange < 0;
    expectation = 'loss';
  } else if (check.expectProfit) {
    passed = netChange > 0;
    expectation = 'profit';
  }
  
  const status = passed ? '✅' : '❌';
  console.log(`   ${status} ${check.name}: ${netChange > 0 ? '+' : ''}${netChange.toFixed(2)} RSTR${expectation !== 'any' ? ` (expected ${expectation})` : ''}`);
  if (!passed) allPassed = false;
}

console.log('\n' + '='.repeat(50));
if (allPassed) {
  console.log('🎉 ALL TESTS PASSED!');
  console.log('='.repeat(50));
  process.exit(0);
} else {
  console.log('❌ SOME TESTS FAILED!');
  console.log('='.repeat(50));
  process.exit(1);
}
