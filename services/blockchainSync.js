const Web3 = require('web3');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
// Import User model from api/user.js instead of models/User
const userModule = require('../api/user');
// Use the User model exported by the user module
const User = userModule.User;
const Order = userModule.Order;

// Load the contract ABI and address - corrected path to point to the artifacts folder
const transactionAbiPath = path.join(__dirname, '../contracts/artifacts/Transaction.json');
let transactionAbi;
let transactionContract;
let transactionContractAddress;

// Initialize Web3
const web3 = new Web3(process.env.GANACHE_URL || 'http://127.0.0.1:7545');

// Load contract artifacts
try {
  const transactionAbiFile = fs.readFileSync(transactionAbiPath, 'utf8');
  const transactionArtifact = JSON.parse(transactionAbiFile);
  transactionAbi = transactionArtifact.abi;
  transactionContractAddress = process.env.TRANSACTION_CONTRACT_ADDRESS;
  
  // Initialize the contract
  transactionContract = new web3.eth.Contract(
    transactionAbi,
    transactionContractAddress
  );
} catch (error) {
  console.error('Error loading contract artifacts:', error);
}

// Function to handle a checkout transaction
async function processCheckoutTransaction(orderId, buyerAddress, sellerAddress, amountEth) {
  try {
    // Convert ETH amount to Wei
    const amountWei = web3.utils.toWei(amountEth.toString(), 'ether');
    
    // Get the buyer's private key (in a production app, you'd use a wallet or secure method)
    const buyer = await User.findOne({ cryptoKey: buyerAddress });
    if (!buyer || !buyer.cryptoKeyPrivate) {
      throw new Error('Buyer private key not found');
    }
    
    // Create transaction
    const tx = {
      from: buyerAddress,
      to: transactionContractAddress,
      gas: 500000,
      data: transactionContract.methods.recordPurchase(
        orderId,
        sellerAddress
      ).encodeABI(),
      value: amountWei
    };
    
    // Sign and send transaction
    const signedTx = await web3.eth.accounts.signTransaction(tx, buyer.cryptoKeyPrivate);
    const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    
    console.log(`Transaction successful: ${receipt.transactionHash}`);
    return receipt;
  } catch (error) {
    console.error('Transaction error:', error);
    throw error;
  }
}

// Function to run initial blockchain sync
async function runSync() {
  console.log('Starting blockchain synchronization...');
  // Check connection to the blockchain
  try {
    const blockNumber = await web3.eth.getBlockNumber();
    console.log(`Connected to blockchain, current block: ${blockNumber}`);
  } catch (error) {
    console.error('Failed to connect to blockchain:', error);
  }
}

module.exports = {
  runSync,
  processCheckoutTransaction,
  web3
};
