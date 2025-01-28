import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import Web3 from 'web3';
import { AbiItem } from 'web3-utils';
import { NetworkKey, WalletData } from '../types/wallet';
import { getWalletData, getWalletKeysForNetwork } from '../utils/walletUtils';
import { getRPCUrl } from '../utils/rpcUtils';
import { getExplorerUrl } from '../utils/explorerUtils';

// Utility functions
const formatPrivateKey = (key: string): string => {
  key = key.startsWith('0x') ? key.slice(2) : key;
  key = key.padStart(64, '0');
  return '0x' + key;
};

const getGasPrice = async (web3: Web3, network: 'eth' | 'base'): Promise<string> => {
  const gasPrice = await web3.eth.getGasPrice();
  const increasedGasPrice = BigInt(gasPrice) * BigInt(15) / BigInt(10);
  return '0x' + increasedGasPrice.toString(16);
};

const getLastTradeTime = async (contract: any, address: string): Promise<number> => {
  try {
    const lastTradeTime = await contract.methods.lastTradeTime(address).call();
    return Number(lastTradeTime);
  } catch (error) {
    console.log('Error getting last trade time:', error);
    return 0;
  }
};

// Contract ABI
const bondingCurveABI: AbiItem[] = [
  {
    "inputs": [{ "internalType": "uint256", "name": "minTokensExpected", "type": "uint256" }],
    "name": "buyTokens",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getCurrentPrice",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "curveParams",
    "outputs": [
      { "internalType": "uint256", "name": "initialPrice", "type": "uint256" },
      { "internalType": "uint256", "name": "delta", "type": "uint256" },
      { "internalType": "uint256", "name": "minPrice", "type": "uint256" },
      { "internalType": "uint256", "name": "maxPrice", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "name": "lastTradeTime",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "ethAmount", "type": "uint256" },
      { "internalType": "uint256", "name": "price", "type": "uint256" }
    ],
    "name": "calculatePurchaseReturn",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// Contract interface
interface BondingCurveContract {
  methods: {
    getCurrentPrice(): {
      call(): Promise<string>;
    };
    curveParams(): {
      call(): Promise<{
        initialPrice: string;
        delta: string;
        minPrice: string;
        maxPrice: string;
      }>;
    };
    lastTradeTime(address: string): {
      call(): Promise<string>;
    };
    calculatePurchaseReturn(ethAmount: string, price: string): {
      call(): Promise<string>;
    };
    buyTokens(minTokensExpected: string): {
      encodeABI(): string;
    };
  };
}

export const buyCommand = new Command('buy')
  .description('Buy tokens from the bonding curve')
  .requiredOption('-n, --network <network>', 'Network to use (eth or base)')
  .requiredOption('-a, --amount <amount>', 'Amount of network tokens to spend (in ETH)')
  .requiredOption('-c, --contract <address>', 'Bonding curve contract address')
  .action(async (options: { network: string; amount: string; contract: string }) => {
    try {
      // Validate network
      const network = options.network.toLowerCase() as NetworkKey;
      if (!['eth', 'base'].includes(network)) {
        throw new Error('Network must be either "eth" or "base"');
      }

      // Get wallet data
      const walletData = await getWalletData<WalletData>(true);
      const wallet = getWalletKeysForNetwork(walletData, network);

      // Initialize Web3
      const rpcUrl = getRPCUrl(network.toUpperCase() as 'ETH' | 'BASE');
      if (!rpcUrl) {
        throw new Error(`${network.toUpperCase()} RPC URL not configured`);
      }
      const web3 = new Web3(rpcUrl);

      // Format private key consistently
      const formattedPrivateKey = formatPrivateKey(wallet.privateKey);

      // Validate amount and convert to wei
      const amountInEth = parseFloat(options.amount);
      if (isNaN(amountInEth) || amountInEth <= 0) {
        throw new Error('Amount must be a positive number');
      }

      // Create contract instance
      const contract = new web3.eth.Contract(bondingCurveABI, options.contract) as any as BondingCurveContract;

      // Check cooling period
      const lastTradeTime = await getLastTradeTime(contract, wallet.address);
      const currentTime = Math.floor(Date.now() / 1000);
      const COOLING_PERIOD = 3600; // 1 hour in seconds

      if (currentTime - lastTradeTime < COOLING_PERIOD) {
        const remainingTime = COOLING_PERIOD - (currentTime - lastTradeTime);
        throw new Error(`Cooling period active. Please wait ${Math.ceil(remainingTime / 60)} minutes before trading again.`);
      }

      // Get current price and curve parameters
      const [currentPriceWei, curveParams] = await Promise.all([
        contract.methods.getCurrentPrice().call(),
        contract.methods.curveParams().call()
      ]);

      // Convert prices to ETH for display
      const currentPrice = web3.utils.fromWei(currentPriceWei, 'ether');
      const minPrice = web3.utils.fromWei(curveParams.minPrice, 'ether');
      const maxPrice = web3.utils.fromWei(curveParams.maxPrice, 'ether');

      // Convert input amount to wei
      const amountInWei = web3.utils.toWei(options.amount, 'ether');

      // Validate amount against price range
      if (BigInt(amountInWei) < BigInt(curveParams.minPrice)) {
        throw new Error(`Amount must be greater than minimum price: ${minPrice} ${network.toUpperCase()}`);
      }
      if (BigInt(amountInWei) > BigInt(curveParams.maxPrice)) {
        throw new Error(`Amount must be less than maximum price: ${maxPrice} ${network.toUpperCase()}`);
      }

      // Calculate expected tokens with higher slippage tolerance
      const expectedTokens = await contract.methods.calculatePurchaseReturn(amountInWei, currentPriceWei).call();
      const minTokensExpected = BigInt(expectedTokens) * BigInt(990) / BigInt(1000); // 1% slippage tolerance

      // Display transaction details
      console.log(chalk.blue('\n┌─────────────────────────────────────┐'));
      console.log(chalk.blue('│') + chalk.yellow(' Purchase Details '.padEnd(34)) + chalk.blue('│'));
      console.log(chalk.blue('├─────────────────────────────────────┤'));
      console.log(chalk.blue('│') + ` Amount: ${amountInEth} ${network.toUpperCase()}`.padEnd(35) + chalk.blue('│'));
      console.log(chalk.blue('│') + ` Current Price: ${currentPrice} ${network.toUpperCase()}`.padEnd(35) + chalk.blue('│'));
      console.log(chalk.blue('│') + ` Price Range: ${minPrice} - ${maxPrice}`.padEnd(35) + chalk.blue('│'));
      console.log(chalk.blue('│') + ` Min Tokens Expected: ${web3.utils.fromWei(minTokensExpected.toString(), 'ether')}`.padEnd(35) + chalk.blue('│'));
      console.log(chalk.blue('└─────────────────────────────────────┘\n'));

      // Get and display current balance
      const balance = await web3.eth.getBalance(wallet.address);
      console.log(chalk.blue(`Current Balance: ${web3.utils.fromWei(balance, 'ether')} ${network.toUpperCase()}`));

      // Confirm purchase
      const { confirm } = await inquirer.prompt<{ confirm: boolean }>([{
        type: 'confirm',
        name: 'confirm',
        message: 'Proceed with purchase?',
        default: false
      }]);

      if (!confirm) {
        console.log(chalk.yellow('\nPurchase cancelled'));
        return;
      }

      // Prepare transaction data
      const txData = contract.methods.buyTokens(minTokensExpected.toString()).encodeABI();

      // Create transaction object with higher gas limit
      const txObject = {
        from: wallet.address,
        to: options.contract,
        value: amountInWei,
        gas: '0x7A1200', // 8,000,000 gas
        gasPrice: await getGasPrice(web3, network as 'eth' | 'base'),
        nonce: '0x' + (await web3.eth.getTransactionCount(wallet.address, 'pending')).toString(16),
        chainId: await web3.eth.getChainId(),
        data: txData
      };

      console.log(chalk.yellow('\nExecuting purchase...'));

      // Sign and send transaction
      const signedTx = await web3.eth.accounts.signTransaction(txObject, formattedPrivateKey);
      
      if (!signedTx.rawTransaction) {
        throw new Error('Failed to sign transaction');
      }

      const txHash = await new Promise<string>((resolve, reject) => {
        web3.eth.sendSignedTransaction(signedTx.rawTransaction as string)
          .on('transactionHash', (hash: string) => resolve(hash))
          .on('error', (error: Error) => {
            console.error('Transaction error details:', error);
            reject(error);
          });
      });

      // Display success message
      console.log(chalk.green('\nPurchase successful!'));
      console.log(chalk.blue('\n┌─────────────────────────────────────┐'));
      console.log(chalk.blue('│') + chalk.yellow(' Transaction Details '.padEnd(34)) + chalk.blue('│'));
      console.log(chalk.blue('├─────────────────────────────────────┤'));
      console.log(chalk.blue('│') + ` Transaction Hash: ${txHash.slice(0, 22)}...`.padEnd(35) + chalk.blue('│'));
      console.log(chalk.blue('└─────────────────────────────────────┘\n'));

      // Show explorer link
      const explorerUrl = getExplorerUrl(network, txHash);
      console.log(chalk.yellow('View on Explorer:'));
      console.log(chalk.cyan(explorerUrl));

    } catch (error) {
      console.error(chalk.red('\nError:'), error instanceof Error ? error.message : String(error));
      if (error instanceof Error && error.message.includes('revert')) {
        console.error(chalk.yellow('\nPossible reasons for revert:'));
        console.error('1. Cooling period is still active');
        console.error('2. Price impact too high');
        console.error('3. Insufficient balance (including gas fees)');
        console.error('4. Contract paused');
      }
      process.exit(1);
    }
  });