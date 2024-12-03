# DApp Hardhat, React, EthersJS, solidity

Inserire descrizione componenti

## Quick start

# create package.json

npm init -y

# Install hardhat and required packages

npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox

# Create Hardhat project

npx hardhat init

# Start local network for testing

```sh
npx hardhat node
```

Then, on a new terminal, go to the repository's root folder and run this to
deploy your contract on a new terminal (the hardhat is running in the previous terminal and must not be touched):

```sh
npx hardhat run scripts/deploy.js --network localhost
```

# How to test the contrats with hardhat console

```sh
npx hardhat console --network localhost
```

> Note: this example uses a custom deploy script, consider using `hardhat ignition` -
> Hardhat builtin deployment system

Connect Metamask to a local network through Settings > Networks > Add Network.
You might need to delete previously added network from Metamask and re-add it
every time you start a new network instance. Please do so if you get "Transaction
#x failed! JSON-RPC error." in Metamask

Finally, we can run the frontend with:

```sh
cd frontend
npm install
npm start
```

Open [http://localhost:3000/](http://localhost:3000/) to see your Dapp. You will
need to have [Metamask](https://metamask.io) installed and listening to
`localhost 8545`.

## Acknowledgements and other resources

This Dapp used the [Hardhat boilerplate project tutorial](https://hardhat.org/tutorial/boilerplate-project). as a starting point. Please refer to the tutorial and original repo for additional informations on how to use Hardhat with React, etherjs and Metamask.
