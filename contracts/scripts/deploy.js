const hre = require("hardhat");

async function main() {
  console.log("🎭 Deploying RoastRoyale contract to", hre.network.name);

  // Get the deployer's address
  const [deployer] = await hre.ethers.getSigners();
  console.log("📍 Deploying with account:", deployer.address);

  // Get account balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "ETH");

  // Deploy the contract
  console.log("\n🚀 Deploying RoastRoyale...");
  const RoastRoyale = await hre.ethers.getContractFactory("RoastRoyale");
  const roastRoyale = await RoastRoyale.deploy();

  await roastRoyale.waitForDeployment();
  const contractAddress = await roastRoyale.getAddress();

  console.log("✅ RoastRoyale deployed to:", contractAddress);
  console.log("\n📋 Next steps:");
  console.log("1. Verify the contract on BaseScan:");
  console.log(`   npx hardhat verify --network ${hre.network.name} ${contractAddress}`);
  console.log("\n2. Update your frontend with the contract address:");
  console.log(`   Contract Address: ${contractAddress}`);
  console.log(`   Network: ${hre.network.name}`);
  console.log("\n3. View on BaseScan:");
  
  if (hre.network.name === "base") {
    console.log(`   https://basescan.org/address/${contractAddress}`);
  } else if (hre.network.name === "baseSepolia") {
    console.log(`   https://sepolia.basescan.org/address/${contractAddress}`);
  }

  // Save deployment info
  const fs = require("fs");
  const deploymentInfo = {
    network: hre.network.name,
    contractAddress: contractAddress,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    blockNumber: await hre.ethers.provider.getBlockNumber(),
  };

  const deploymentPath = `./deployments/${hre.network.name}.json`;
  fs.mkdirSync("./deployments", { recursive: true });
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n💾 Deployment info saved to ${deploymentPath}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
