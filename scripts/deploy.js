const path = require("path");

async function main() {
  // This is just a convenience check
  if (network.name === "hardhat") {
    console.warn(
      "You are trying to deploy a contract to the Hardhat Network, which" +
      "gets automatically created and destroyed every time. Use the Hardhat" +
      " option '--network localhost'"
    );
  }

  // ethers is available in the global scope
  const [deployer] = await ethers.getSigners();
  console.log(
    "Deploying the contracts with the account:",
    await deployer.getAddress()
  );

  console.log("Deploying the contracts with the account:", deployer.address);
  // Print deployer balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance));

  const LoanTypes = await hre.ethers.getContractFactory("LoanTypes");
  const loanTypes = await LoanTypes.deploy();
  await loanTypes.deployed();

  const LoanStorage = await hre.ethers.getContractFactory("LoanStorage");
  const loanStorage = await LoanStorage.deploy();
  await loanStorage.deployed();

  const LendingPlatform = await hre.ethers.getContractFactory("LendingPlatform");
  const lendingPlatform = await LendingPlatform.deploy();
  await lendingPlatform.deployed();

  console.log("loanTypes Contract address:", loanTypes.address);
  console.log("loanStorage Contract address:", loanStorage.address);
  console.log("lendingPlatform Contract address:", lendingPlatform.address);


  // save contract's artifacts and redirect to frontend for further use
  saveFrontendFiles(crowdfundContract);
}

function saveFrontendFiles(contracts) {
  const fs = require("fs");
  const contractsDir = path.join(__dirname, "..", "frontend", "src", "contracts");

  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir);
  }
  
  // Save addresses
  fs.writeFileSync(
    path.join(contractsDir, "contract-address.json"),
    JSON.stringify({
      LendingPlatform: contracts.lendingPlatform.address,
      LoanTypes: contracts.loanTypes.address,
      LoanStorage: contracts.loanStorage.address
    }, undefined, 2)
  );

  // Save ABIs
  const LendingPlatformArtifact = artifacts.readArtifactSync("LendingPlatform");
  fs.writeFileSync(
    path.join(contractsDir, "LendingPlatform.json"),
    JSON.stringify(LendingPlatformArtifact, null, 2)
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
