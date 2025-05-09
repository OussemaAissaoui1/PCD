/**
 * Contract Integration for Ganache-based payments
 * This file handles the integration with blockchain payments on the client side
 */
// Global variables
let web3;
let currentAccount;
let isConnected = false;

// Initialize Web3 with MetaMask or fallback to Ganache
async function initWeb3() {
  // Modern browsers with MetaMask or other injected web3 providers
  if (window.ethereum) {
    web3 = new Web3(window.ethereum);
    try {
      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      // Listen for account changes
      window.ethereum.on('accountsChanged', (accounts) => {
        currentAccount = accounts[0];
        console.log('Account changed:', currentAccount);
        updateUIWithAccount();
      });
      
      const accounts = await web3.eth.getAccounts();
      currentAccount = accounts[0];
      isConnected = true;
      console.log('Using MetaMask, connected account:', currentAccount);
      return true;
    } catch (error) {
      console.error('User denied account access:', error);
      return false;
    }
  }
  // Legacy dapp browsers
  else if (window.web3) {
    web3 = new Web3(window.web3.currentProvider);
    const accounts = await web3.eth.getAccounts();
    currentAccount = accounts[0];
    isConnected = true;
    console.log('Using legacy web3, connected account:', currentAccount);
    return true;
  } 
  // Fallback to Ganache
  else {
    try {
      // Use Ganache server from .env file
      web3 = new Web3('http://localhost:7545');
      const accounts = await web3.eth.getAccounts();
      currentAccount = accounts[0];
      isConnected = true;
      console.log('Using Ganache server, connected account:', currentAccount);
      return true;
    } catch (error) {
      console.error('Could not connect to Ganache:', error);
      alert('No Ethereum wallet found. Please install MetaMask or make sure Ganache is running.');
      return false;
    }
  }
}

// Get current account balance
async function getAccountBalance(address) {
  if (!web3) await initWeb3();
  
  try {
    const balance = await web3.eth.getBalance(address || currentAccount);
    const ethBalance = web3.utils.fromWei(balance, 'ether');
    return {
      wei: balance,
      ether: ethBalance,
      formatted: parseFloat(ethBalance).toFixed(4) + ' ETH'
    };
  } catch (error) {
    console.error('Error getting balance:', error);
    return null;
  }
}

// Update UI elements with current account info
async function updateUIWithAccount() {
  const metamaskButton = document.getElementById('pay-with-metamask');
  
  if (metamaskButton) {
    if (isConnected && currentAccount) {
      const balance = await getAccountBalance();
      metamaskButton.innerHTML = `
        <img src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" alt="MetaMask" style="height: 20px; margin-right: 10px;">
        Pay with MetaMask (${currentAccount.slice(0, 6)}...${currentAccount.slice(-4)})
      `;
      metamaskButton.disabled = false;
    } else {
      metamaskButton.innerHTML = `
        <img src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" alt="MetaMask" style="height: 20px; margin-right: 10px;">
        Connect MetaMask
      `;
    }
  }
}

// Process payment through our backend API
async function processPayment(sellerId, amount, orderId) {
  try {
    // Get authentication token from session storage
    const token = sessionStorage.getItem('authToken');
    if (!token) {
      alert('Please login to complete your purchase');
      return null;
    }
    
    const response = await fetch('/api/payment/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        sellerId,
        amount,
        orderId
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Payment processing failed');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Payment error:', error);
    alert(`Payment error: ${error.message}`);
    return null;
  }
}

// Process a direct blockchain transaction using Web3
async function sendDirectTransaction(toAddress, amountEth, data = '') {
  if (!web3) await initWeb3();
  
  if (!currentAccount) {
    alert('No Ethereum account connected. Please connect MetaMask first.');
    return null;
  }
  
  try {
    const amountWei = web3.utils.toWei(amountEth.toString(), 'ether');
    
    const gasPrice = await web3.eth.getGasPrice();
    const gasEstimate = await web3.eth.estimateGas({
      from: currentAccount,
      to: toAddress,
      value: amountWei
    });
    
    const txHash = await window.ethereum.request({
      method: 'eth_sendTransaction',
      params: [{
        from: currentAccount,
        to: toAddress,
        value: web3.utils.toHex(amountWei),
        gas: web3.utils.toHex(gasEstimate),
        gasPrice: web3.utils.toHex(gasPrice),
        data: data
      }]
    });
    
    return {
      success: true,
      transactionHash: txHash
    };
  } catch (error) {
    console.error('Direct transaction error:', error);
    alert(`Transaction error: ${error.message}`);
    return null;
  }
}

// Process checkout directly from the checkout page
async function processCheckout(cartItems) {
  try {
    // Get authentication token from session storage
    const token = sessionStorage.getItem('authToken');
    if (!token) {
      alert('Please login to complete your purchase');
      return null;
    }
    
    const response = await fetch('/api/payment/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        cartItems
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Checkout processing failed');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Checkout error:', error);
    alert(`Checkout error: ${error.message}`);
    return null;
  }
}

// Initialize Web3 when the page loads
document.addEventListener('DOMContentLoaded', async () => {
  await initWeb3();
  updateUIWithAccount();
});
