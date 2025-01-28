import { Command } from 'commander';
import chalk from 'chalk';
import Web3 from 'web3';
import { AbiItem } from 'web3-utils';
import { NetworkKey } from '../types/wallet';
import { getRPCUrl } from '../utils/rpcUtils';

const BONDING_CURVE_ABI: AbiItem[] = [
  {
    "inputs": [],
    "name": "getCurrentPrice",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "minPrice",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "maxPrice",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

export const checkPriceCommand = new Command('check-price')
  .description('Check the current price and price range of the bonding curve')
  .requiredOption('-n, --network <network>', 'Network to use (eth or base)')
  .requiredOption('-c, --contract <address>', 'Bonding curve contract address')
  .action(async (options: { network: string; contract: string }) => {
    try {
      // Validate network
      const network = options.network.toLowerCase() as NetworkKey;
      if (!['eth', 'base'].includes(network)) {
        throw new Error('Network must be either "eth" or "base"');
      }

      // Initialize Web3
      const rpcUrl = getRPCUrl(network.toUpperCase() as 'ETH' | 'BASE');
      if (!rpcUrl) {
        throw new Error(`${network.toUpperCase()} RPC URL not configured`);
      }
      const web3 = new Web3(rpcUrl);

      // Create contract instance
      const contract = new web3.eth.Contract(BONDING_CURVE_ABI, options.contract);

      // Get contract parameters
      const results = await Promise.all([
        contract.methods.getCurrentPrice().call(),
        contract.methods.decimals().call(),
        contract.methods.minPrice().call(),
        contract.methods.maxPrice().call()
      ]);

      // Ensure results are not void or empty arrays before processing
      const isValidResult = (result: any): result is string => {
        return typeof result === 'string' && result !== undefined && result !== null && result !== '';
      };

      const [currentPriceWei, decimals, minPriceWei, maxPriceWei] = results;

      // Check if all results are valid
      if (!isValidResult(currentPriceWei) || !isValidResult(decimals) || !isValidResult(minPriceWei) || !isValidResult(maxPriceWei)) {
        throw new Error('One or more contract methods returned invalid values.');
      }

      // Convert prices to ETH for display
      const currentPrice = web3.utils.fromWei(currentPriceWei, 'ether');
      const minPrice = web3.utils.fromWei(minPriceWei, 'ether');
      const maxPrice = web3.utils.fromWei(maxPriceWei, 'ether');

      // Log the values to debug
      console.log("Current Price (in wei):", currentPriceWei);
      console.log("Min Price (in wei):", minPriceWei);
      console.log("Max Price (in wei):", maxPriceWei);
      console.log("Current Price (in ether):", currentPrice);
      console.log("Min Price (in ether):", minPrice);
      console.log("Max Price (in ether):", maxPrice);

      // If the current price is unexpectedly large, adjust it here (debugging purposes)
      const amountInWei = '10000000000000000';  // Example purchase amount in wei (equivalent to 0.01 BASE)
      const expectedTokens = Number(BigInt(amountInWei) * BigInt(1e18) / BigInt(currentPriceWei)) / 1e18;

      console.log(`Expected Tokens: ${expectedTokens}`);

      // Display the price details
      console.log(chalk.blue('\n┌─────────────────────────────────────┐'));
      console.log(chalk.blue('│') + chalk.yellow(' Price Details '.padEnd(34)) + chalk.blue('│'));
      console.log(chalk.blue('├─────────────────────────────────────┤'));
      console.log(chalk.blue('│') + ` Current Price: ${currentPrice} ${network.toUpperCase()}`.padEnd(35) + chalk.blue('│'));
      console.log(chalk.blue('│') + ` Price Range: ${minPrice} - ${maxPrice}`.padEnd(35) + chalk.blue('│'));
      console.log(chalk.blue('└─────────────────────────────────────┘\n'));

    } catch (error) {
      console.error(chalk.red('\nError:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });
