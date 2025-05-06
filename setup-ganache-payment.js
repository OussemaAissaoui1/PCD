/**
 * Ganache Payment Setup Script
 * 
 * This script:
 * 1. Checks if Ganache is running
 * 2. Deploys the Transaction contract to Ganache
 * 3. Updates the .env file with the contract address
 */

const Web3 = require('web3');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
require('dotenv').config();

// Ganache URL
const GANACHE_URL = process.env.GANACHE_URL || 'http://localhost:7545';

// Initialize Web3
const web3 = new Web3(GANACHE_URL);

// Main function
async function setup() {
  try {
    console.log('📦 Setting up Ganache payment system...');
    
    // Step 1: Check if required packages are installed
    console.log('Checking for required dependencies...');
    try {
      require('web3');
      console.log('✅ Web3 is installed');
    } catch (err) {
      console.log('🔄 Installing Web3...');
      execSync('npm install web3', { stdio: 'inherit' });
    }
    
    // Step 2: Check if Ganache is running
    console.log('Checking if Ganache is running...');
    try {
      await web3.eth.getNodeInfo();
      const networkId = await web3.eth.net.getId();
      const accounts = await web3.eth.getAccounts();
      
      console.log(`✅ Connected to Ganache at ${GANACHE_URL}`);
      console.log(`📊 Network ID: ${networkId}`);
      console.log(`👤 Available accounts: ${accounts.length}`);
      console.log(`🔑 First account: ${accounts[0]}`);
    } catch (err) {
      console.error('❌ Failed to connect to Ganache');
      console.error('Please make sure Ganache is running and accessible at ' + GANACHE_URL);
      console.error('You can install Ganache from https://www.trufflesuite.com/ganache');
      console.error('Error details:', err.message);
      process.exit(1);
    }
    
    // Step 3: Deploy the contract
    console.log('\n🚀 Deploying Transaction contract to Ganache...');
    
    // Execute the deployment script
    try {
      console.log('Running deployment script...');
      require('./contracts/deploy.js'); 
      console.log('✅ Contract deployed successfully');
    } catch (err) {
      console.error('❌ Failed to deploy contract:', err);
      process.exit(1);
    }
    
    // Step 4: Setup complete
    console.log('\n✨ Ganache payment setup complete!');
    console.log('You can now use the payment system in your application.');
  } catch (error) {
    console.error('Error during setup:', error);
    process.exit(1);
  }
}

// Run setup
setup();