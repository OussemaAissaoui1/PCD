const Web3 = require('web3');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Initialize Web3 with Ganache
const web3 = new Web3(process.env.GANACHE_URL || 'http://localhost:7545');

// Load Transaction contract ABI and address
let transactionContract;
let transactionAbi;
const contractAbiPath = path.join(__dirname, '../contracts/artifacts/EnsiBEcommerce.json');

// Initialize the contract connection
async function initializeContract() {
  try {
    // Get contract address from environment or deploy a new one
    let contractAddress = process.env.TRANSACTION_CONTRACT_ADDRESS;
    
    if (!contractAddress || contractAddress === '') {
      console.log('No contract address found. Please deploy the contract first.');
      return false;
    }
    
    // Load ABI from artifacts
    try {
      const contractArtifact = JSON.parse(fs.readFileSync(contractAbiPath, 'utf8'));
      transactionAbi = contractArtifact.abi;
    } catch (error) {
      console.error('Error loading contract ABI:', error);
      return false;
    }
    
    // Initialize contract instance
    transactionContract = new web3.eth.Contract(transactionAbi, contractAddress);
    console.log('Transaction contract initialized at:', contractAddress);
    return true;
  } catch (error) {
    console.error('Failed to initialize contract:', error);
    return false;
  }
}

// Get account balance
async function getAccountBalance(address) {
  try {
    const balanceWei = await web3.eth.getBalance(address);
    const balanceEth = web3.utils.fromWei(balanceWei, 'ether');
    return { 
      address, 
      balanceWei, 
      balanceEth,
      formattedBalance: `${parseFloat(balanceEth).toFixed(4)} ETH` 
    };
  } catch (error) {
    console.error(`Failed to get balance for ${address}:`, error);
    throw error;
  }
}

// Make a payment from buyer to seller
async function makePayment(buyerPrivateKey, sellerAddress, amountEth, orderId = null) {
  try {
    if (!orderId) {
      // Generate a unique order ID if none provided
      orderId = `order-${uuidv4()}`;
    }
    
    // Get the buyer's account from private key
    const buyerAccount = web3.eth.accounts.privateKeyToAccount(buyerPrivateKey);
    const buyerAddress = buyerAccount.address;
    
    // Convert ETH to Wei
    const amountWei = web3.utils.toWei(amountEth.toString(), 'ether');
    
    // Check if buyer has sufficient funds
    const buyerBalance = await web3.eth.getBalance(buyerAddress);
    if (BigInt(buyerBalance) < BigInt(amountWei)) {
      throw new Error('Insufficient funds for transaction');
    }
    
    // Create transaction to call the smart contract
    const txData = transactionContract.methods.recordPurchase(
      orderId,
      sellerAddress
    ).encodeABI();
    
    const txObject = {
      from: buyerAddress,
      to: transactionContract.options.address,
      gas: 500000,
      gasPrice: await web3.eth.getGasPrice(),
      data: txData,
      value: amountWei
    };
    
    // Sign transaction
    const signedTx = await web3.eth.accounts.signTransaction(txObject, buyerPrivateKey);
    
    // Send transaction
    const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    
    return {
      success: true,
      transactionHash: receipt.transactionHash,
      orderId,
      buyer: buyerAddress,
      seller: sellerAddress,
      amount: amountEth,
      blockNumber: receipt.blockNumber
    };
  } catch (error) {
    console.error('Payment error:', error);
    throw error;
  }
}

// Direct transfer (without smart contract) - utility function for testing and fund allocation
async function directTransfer(fromPrivateKey, toAddress, amountEth) {
  try {
    const fromAccount = web3.eth.accounts.privateKeyToAccount(fromPrivateKey);
    const fromAddress = fromAccount.address;
    const amountWei = web3.utils.toWei(amountEth.toString(), 'ether');
    
    const txObject = {
      from: fromAddress,
      to: toAddress,
      gas: 21000,
      gasPrice: await web3.eth.getGasPrice(),
      value: amountWei
    };
    
    const signedTx = await web3.eth.accounts.signTransaction(txObject, fromPrivateKey);
    const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    
    return {
      success: true,
      transactionHash: receipt.transactionHash,
      from: fromAddress,
      to: toAddress,
      amount: amountEth
    };
  } catch (error) {
    console.error('Direct transfer error:', error);
    throw error;
  }
}

// Get transaction details from blockchain
async function getTransactionDetails(txHash) {
  try {
    const tx = await web3.eth.getTransaction(txHash);
    const receipt = await web3.eth.getTransactionReceipt(txHash);
    
    return {
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: web3.utils.fromWei(tx.value, 'ether'),
      status: receipt.status ? 'Success' : 'Failed',
      blockNumber: tx.blockNumber,
      gasUsed: receipt.gasUsed
    };
  } catch (error) {
    console.error('Error getting transaction:', error);
    throw error;
  }
}

// Create a new Ganache account
function createAccount() {
  const account = web3.eth.accounts.create();
  return {
    address: account.address,
    privateKey: account.privateKey
  };
}

// Check if web3 is connected to Ganache
async function checkConnection() {
  try {
    const accounts = await web3.eth.getAccounts();
    return {
      connected: true,
      nodeInfo: await web3.eth.getNodeInfo(),
      networkId: await web3.eth.net.getId(),
      accountsAvailable: accounts.length,
      firstAccount: accounts[0]
    };
  } catch (error) {
    console.error('Connection check failed:', error);
    return { connected: false, error: error.message };
  }
}

module.exports = {
  initializeContract,
  makePayment,
  getAccountBalance,
  directTransfer,
  getTransactionDetails,
  createAccount,
  checkConnection,
  web3
};