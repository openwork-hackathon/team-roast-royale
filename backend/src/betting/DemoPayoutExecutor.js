/**
 * DemoPayoutExecutor — logs payouts without sending on-chain.
 */
class DemoPayoutExecutor {
  async executePayout(gameId, roundNum, payouts) {
    console.log(`🎰 [DEMO] Executing ${payouts.length} payouts for game ${gameId} round ${roundNum}`);
    
    return payouts.map((p, i) => ({
      ...p,
      status: 'demo-success',
      txHash: `demo-tx-${gameId.slice(0, 8)}-r${roundNum}-${i}`,
      executedAt: Date.now()
    }));
  }
}

module.exports = { DemoPayoutExecutor };
