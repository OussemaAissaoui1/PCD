/**
 * Vendor Registration Utility
 * Manually register a vendor on the blockchain from MongoDB data
 */

const Web3 = require('web3');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/Users_DB';

// User schema - keep this in sync with your actual schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String },
  cryptoKey: { type: String },
  photoPath: { type: String }
});

// Load contract ABI
let contractArtifact;
try {
  contractArtifact = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'contracts/artifacts/EnsiBEcommerce.json'), 'utf8')
  );
  console.log('✅ Loaded contract ABI from artifacts');
} catch (error) {
  console.error('❌ Error loading contract artifact:', error.message);
  contractArtifact = { abi: [] };
  process.exit(1);
}

// Contract configuration
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '0xDA0bab807633f07f013f94DD0E6A4F96F8742B53';
const CONTRACT_ABI = contractArtifact.abi;

// Web3 setup
const web3Provider =  'http://localhost:8545';

// Initialize Web3
let web3;
try {
  web3 = new Web3(web3Provider);
  console.log('✅ Web3 initialized with provider:', web3Provider);
} catch (error) {
  console.error('❌ Failed to initialize Web3:', error.message);
  process.exit(1);
}

// Admin wallet for transactions
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;
const ADMIN_ADDRESS = process.env.ADMIN_ADDRESS;

if (!ADMIN_PRIVATE_KEY || !ADMIN_ADDRESS) {
  console.error('❌ Admin wallet not configured. Set ADMIN_PRIVATE_KEY and ADMIN_ADDRESS in your .env file');
  process.exit(1);
}

// Connect to MongoDB
async function connectToMongoDB() {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    return false;
  }
}

// Register a vendor on the blockchain
async function registerVendorOnBlockchain(vendor) {
  try {
    console.log(`Registering vendor ${vendor.email} on the blockchain...`);
    
    // Initialize contract
    const contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);
    
    // Check if vendor is already registered
    const vendorAddress = await contract.methods.vendorsByEmail(vendor.email).call();
    if (vendorAddress !== '0x0000000000000000000000000000000000000000') {
      console.log(`ℹ️ Vendor ${vendor.email} already registered on blockchain with address ${vendorAddress}`);
      return true;
    }
    
    // Create transaction
    const tx = contract.methods.registerVendor(
      vendor.email,
      vendor.name,
      vendor.cryptoKey || '0x0000000000000000000000000000000000000000'
    );
    
    // Calculate gas
    const gas = await tx.estimateGas({ from: ADMIN_ADDRESS });
    
    // Get nonce
    const nonce = await web3.eth.getTransactionCount(ADMIN_ADDRESS);
    
    // Get gas price
    const gasPrice = await web3.eth.getGasPrice();
    
    // Create transaction object
    const txData = {
      from: ADMIN_ADDRESS,
      to: CONTRACT_ADDRESS,
      data: tx.encodeABI(),
      gas,
      gasPrice,
      nonce
    };
    
    // Sign and send transaction
    const signedTx = await web3.eth.accounts.signTransaction(txData, ADMIN_PRIVATE_KEY);
    const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    
    console.log(`✅ Vendor ${vendor.email} registered on blockchain, tx: ${receipt.transactionHash}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to register vendor ${vendor.email} on blockchain:`, error.message);
    return false;
  }
}

// Main function
async function main() {
  // Specify the email of the vendor to register
  const vendorEmail = process.argv[2];
  
  if (!vendorEmail) {
    console.error('❌ Please provide a vendor email as a command-line argument');
    console.log('Usage: node register-vendor.js vendor@example.com');
    process.exit(1);
  }
  
  // Connect to MongoDB
  const isConnected = await connectToMongoDB();
  if (!isConnected) {
    process.exit(1);
  }
  
  // Define User model
  const User = mongoose.model('User', userSchema);
  
  try {
    // Find vendor by email
    const vendor = await User.findOne({ email: vendorEmail });
    
    if (!vendor) {
      console.error(`❌ Vendor with email ${vendorEmail} not found in MongoDB`);
      process.exit(1);
    }
    
    console.log(`Found vendor in MongoDB: ${vendor.name} (${vendor.email})`);
    
    // Register vendor on blockchain
    const success = await registerVendorOnBlockchain(vendor);
    
    if (success) {
      console.log(`✅ Successfully registered vendor ${vendor.email} on the blockchain`);
    } else {
      console.error(`❌ Failed to register vendor ${vendor.email} on the blockchain`);
    }
  } catch (error) {
    console.error('❌ An error occurred:', error.message);
  } finally {
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
  }
}

// Run main function
main().catch(error => {
  console.error('❌ Uncaught error:', error);
  process.exit(1);
});