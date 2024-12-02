require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "0.8.19",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545"
    },
  },
  paths: {
    sources: "./contracts",
    scripts: "./scripts",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};