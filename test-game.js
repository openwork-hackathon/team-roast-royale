#!/usr/bin/env node
// End-to-end game test — simulates a full game loop
const { io } = require('socket.io-client');

const API_URL = 'http://localhost:3001';

async function testGame() {
  console.log('🎮 ROAST ROYALE — End-to-End Test\n');
  
  // Step 1: Create a game
  console.log('1️⃣ Creating game...');
  const createRes = await fetch(`${API_URL}/api/games`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerName: 'TestHuman' })
  });
  const game = await createRes.json();
  console.log(`   Game ID: ${game.gameId}`);
  console.log(`   Player ID: ${game.playerId}`);
  
  // Step 2: Connect via Socket.io
  console.log('\n2️⃣ Connecting via Socket.io...');
  const socket = io(API_URL, { transports: ['websocket'] });
  
  return new Promise((resolve) => {
    let messageCount = 0;
    let phase = 'lobby';
    let humanSentMessage = false;
    
    socket.on('connect', () => {
      console.log(`   ✅ Connected: ${socket.id}`);
      
      // Join the game
      socket.emit('joinGame', { gameId: game.gameId, playerId: game.playerId });
    });
    
    socket.on('gameState', (state) => {
      console.log(`\n3️⃣ Game State received:`);
      console.log(`   Phase: ${state.phase}`);
      console.log(`   Players: ${state.players?.length || 0}`);
      console.log(`   Human: ${state.humanPlayer?.name || 'unknown'}`);
      if (state.players) {
        console.log(`   AI agents: ${state.players.filter(p => !p.isHuman).map(p => p.name).slice(0, 5).join(', ')}...`);
      }
    });
    
    socket.on('phaseChange', (data) => {
      phase = data.phase;
      console.log(`\n🔄 Phase changed: ${phase}`);
      if (data.prompt) console.log(`   Prompt: ${data.prompt}`);
      if (data.roastTarget) console.log(`   Roast target: ${data.roastTarget}`);
      
      // Send a human message during chat phases
      if (!humanSentMessage && ['round1_hottakes', 'round2_roast', 'round3_chaos'].includes(phase)) {
        setTimeout(() => {
          console.log('\n💬 Human sending message...');
          socket.emit('message', { text: 'Pineapple on pizza is ELITE. Fight me.' });
          humanSentMessage = true;
        }, 2000);
      }
    });
    
    socket.on('message', (msg) => {
      messageCount++;
      const tag = msg.isHuman ? '👤' : '🤖';
      console.log(`   ${tag} ${msg.playerName}: ${msg.text?.slice(0, 80)}${msg.text?.length > 80 ? '...' : ''}`);
    });
    
    socket.on('votingStart', (data) => {
      console.log('\n🗳️ VOTING PHASE');
      console.log(`   Suspects: ${data.suspects?.map(s => s.name).join(', ')}`);
      
      // Vote for a random AI (not yourself)
      if (data.suspects?.length > 0) {
        const target = data.suspects.find(s => !s.isHuman);
        if (target) {
          console.log(`   Voting for: ${target.name}`);
          socket.emit('vote', { targetId: target.id });
        }
      }
    });
    
    socket.on('voteUpdate', (votes) => {
      console.log(`   Vote update: ${JSON.stringify(votes)}`);
    });
    
    socket.on('reveal', (data) => {
      console.log('\n🎭 REVEAL!');
      console.log(`   Human was: ${data.humanPlayerName || data.humanPlayerId}`);
      console.log(`   Results: ${JSON.stringify(data.results?.slice(0, 3))}`);
      console.log(`\n📊 GAME SUMMARY:`);
      console.log(`   Total messages: ${messageCount}`);
      console.log(`   Game completed: ✅`);
      
      socket.disconnect();
      resolve();
    });
    
    socket.on('gameEnded', (data) => {
      console.log('\n🏁 GAME ENDED');
      console.log(`   ${JSON.stringify(data)}`);
      console.log(`\n📊 FINAL:`);
      console.log(`   Total messages: ${messageCount}`);
      console.log(`   ✅ Full game loop completed!`);
      
      socket.disconnect();
      resolve();
    });
    
    socket.on('error', (err) => {
      console.error(`   ❌ Error: ${JSON.stringify(err)}`);
    });
    
    socket.on('disconnect', () => {
      console.log('\n🔌 Disconnected');
    });
    
    // Safety timeout
    setTimeout(() => {
      console.log('\n⏰ Test timeout after 5 minutes');
      console.log(`   Messages received: ${messageCount}`);
      console.log(`   Last phase: ${phase}`);
      socket.disconnect();
      resolve();
    }, 300000);
  });
}

testGame().then(() => {
  console.log('\n🦞 Test complete!');
  process.exit(0);
}).catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
