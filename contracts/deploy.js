const { ethers } = require("ethers");
const fs = require("fs");

async function main() {
  // Read the contract ABI and bytecode
  const contractJSON = JSON.parse(fs.readFileSync('./build/contracts/EnsiBEcommerce.json', 'utf8'));
  const abi = contractJSON.abi;
  const bytecode = contractJSON.bytecode;

  
  // Use your private key (keep this secure and never commit to git!)
  const privateKey = process.env.PRIVATE_KEY;
  const wallet = new ethers.Wallet(privateKey, provider);
  
  console.log(`Deploying contract from account: ${wallet.address}`);

  // Create contract factory
  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  
  // Deploy contract
  console.log("Deploying EnsiBEcommerce contract...");
  const contract = await factory.deploy();
  
  // Wait for deployment to finish
  await contract.deployed();
  console.log(`Contract deployed to address: ${contract.address}`);
  
  // Save the contract address to a file for easy access
  fs.writeFileSync(
    "./contract-address.json",
    JSON.stringify({ address: contract.address }, null, 2)
  );
  
  console.log("Deployment complete. Contract address saved to contract-address.json");
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
