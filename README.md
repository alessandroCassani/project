# Crowdfund webapp with Hardhat, React, EthersJS 

Web app built with React and etherjs using the Crowdfund smart contract on the
Hardhat local network. The app requires Metamask to run transactions. 

- React = frontend
- etherjs = backend and utility functions to connect the web app to the Ethereum
network, hence the smart contract
- Hardhat = framework for compiling, testing and deploying on a local network
- Metamask = wallet application and browser extension allowing you to 
communicate with web3 websites and perform transactions. 


## Quick start

Once installed, let's run Hardhat's testing network:

```sh
npx hardhat node
```

Then, on a new terminal, go to the repository's root folder and run this to
deploy your contract:

```sh
npx hardhat run scripts/deploy.js --network localhost
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