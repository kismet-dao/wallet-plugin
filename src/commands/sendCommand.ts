// src/commands/SendCommand.ts
import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { Cluster, Connection, clusterApiUrl } from '@solana/web3.js';
import { getWalletData, getWalletKeysForNetwork } from '../utils/walletUtils';
import { sendETHTransaction } from '../transactions/ETH/SendETH';
import { sendSOLTransaction } from '../transactions/SOL/SendSOL';
import { sendXRPTransaction } from '../transactions/XRP/SendXRP';
import { NetworkKey, WalletData } from '../types/wallet';
import { TransactionDetails } from '../types/bitcoin';
import { NetworkType } from '../types/network';
import { sendBTCTransaction } from '../transactions/BTC/SendBTC';
import { sendDAGTransaction } from '../transactions/DAG/SendDAG';
import { logger } from '../utils/logger';

interface SendOptions {
  network: NetworkKey;
  to: string;
  amount: string;
  fee: 'low' | 'medium' | 'high';
}

interface CommanderError extends Error {
  code?: string;
}

interface CustomError {
  message?: string;
}

const getExplorerUrl = (network: NetworkType, txHash: string): string => {
  switch (network) {
    case 'eth':
      return `https://holesky.etherscan.io/tx/${txHash}`;
    case 'base':
      return `https://basescan.org/tx/${txHash}`;
    case 'btctestnet':
      return `https://mempool.space/testnet/tx/${txHash}`;
    case 'btc':
      return `https://mempool.space/tx/${txHash}`;
    case 'sol':
      return `https://explorer.solana.com/tx/${txHash}?cluster=devnet`;
    case 'dag':
      return `https://testnet.dagexplorer.io/transactions/${txHash}`;
    case 'xrp':
      return `https://testnet.xrpl.org/transactions/${txHash}`;
    default:
      return '';
  }
}

// Type guard functions
function isCommanderError(error: unknown): error is CommanderError {
  return error instanceof Error && 'code' in error && error.code === 'commander.executeSubCommandAsync';
}

function isInsufficientBalanceError(error: unknown): boolean {
  return error instanceof Error && error.message.includes('InsufficientBalance');
}

// Helper function to safely extract error message
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return String(error);
}

export const sendCommand = new Command('send')
  .description('Send cryptocurrency')
  .requiredOption('-n, --network <network>', 'Network to use (eth, btc, btctestnet, base, sol, dag, xrp)')
  .requiredOption('-t, --to <address>', 'Recipient address')
  .requiredOption('-a, --amount <amount>', 'Amount to send')
  .option('-f, --fee <fee>', 'Fee level (low, medium, high)', 'medium')
  .allowExcessArguments(false)
  .exitOverride()
  .action(async (options: SendOptions) => {
    try {
      // Validate parameters
      if (!options.to) {
        throw new Error('Recipient address (--to) is required');
      }
      if (!options.amount || isNaN(parseFloat(options.amount))) {
        throw new Error('Amount (--amount) must be a valid number');
      }
      if (parseFloat(options.amount) <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      const walletData = await getWalletData<WalletData>(true);
      let txHash: string = '';
    
      const networkWallet = getWalletKeysForNetwork(walletData, options.network);
      
      // Display transaction box
      const divider = '─'.repeat(50);
      console.log(chalk.blue('\n┌' + divider + '┐'));
      console.log(chalk.blue('│') + chalk.yellow(' Transaction Details '.padEnd(49)) + chalk.blue('│'));
      console.log(chalk.blue('├' + divider + '┤'));
      console.log(chalk.blue('│') + ` Network: ${options.network.toUpperCase()}`.padEnd(49) + chalk.blue('│'));
      console.log(chalk.blue('│') + ` To: ${options.to}`.padEnd(49) + chalk.blue('│'));
      console.log(chalk.blue('│') + ` Amount: ${options.amount} ${options.network.toUpperCase()}`.padEnd(49) + chalk.blue('│'));
      console.log(chalk.blue('│') + ` Fee Level: ${options.fee}`.padEnd(49) + chalk.blue('│'));
      console.log(chalk.blue('└' + divider + '┘\n'));

      const confirm = await inquirer.prompt<{ proceed: boolean }>([
        {
          type: 'confirm',
          name: 'proceed',
          message: 'Proceed with transaction?',
          default: false
        }
      ]);

      if (!confirm.proceed) {
        logger.info('Transaction cancelled by user');
        console.log(chalk.yellow('Transaction cancelled'));
        return;
      }

      console.log(chalk.yellow('\nPreparing transaction...'));

      if (options.network === 'xrp') {
        console.log('Debug - XRP private key format:', networkWallet.privateKey.substring(0, 10) + '...');
      }


      switch (options.network) {
        case 'btc':
        case 'btctestnet':
          const transactionDetails: TransactionDetails = {
            network: options.network,
            address: networkWallet.address,
            recipient: options.to,
            amount: parseFloat(options.amount),
            utxos: []
          };

          const { txHash: btcHash, feeRate, totalFee } = await sendBTCTransaction(
            transactionDetails,
            networkWallet.privateKey,
            networkWallet.publicKey,
            options.fee
          );
          txHash = btcHash;

          // Display fee details for BTC transactions
          console.log(chalk.blue('│') + ` Fee Rate: ${feeRate} sat/vB`.padEnd(49) + chalk.blue('│'));
          console.log(chalk.blue('│') + ` Total Fee: ${totalFee} sats`.padEnd(49) + chalk.blue('│'));
          break;

        case 'sol':
          const cluster: Cluster = 'devnet';
          const solConnection = new Connection(clusterApiUrl(cluster), 'confirmed');
          txHash = await sendSOLTransaction(
            {
              address: networkWallet.address,
              recipient: options.to,
              amount: parseFloat(options.amount)
            },
            networkWallet.privateKey,
            solConnection
          );
          break;

        case 'dag':
          txHash = await sendDAGTransaction(
            {
              address: networkWallet.address,
              recipient: options.to,
              amount: parseFloat(options.amount)
            },
            networkWallet.privateKey,
            options.fee
          );
          break;

        case 'xrp':
          txHash = await sendXRPTransaction(
            {
              address: networkWallet.address,
              recipient: options.to,
              amount: parseFloat(options.amount)
            },
            networkWallet.privateKey,
            options.fee
          );
          break;

        case 'eth':
        case 'base':
          txHash = await sendETHTransaction(
            {
              address: networkWallet.address,
              recipient: options.to,
              amount: parseFloat(options.amount)
            },
            networkWallet.privateKey,
            options.network
          );
          break;

        default:
          throw new Error(`Unsupported network: ${options.network}`);
      }

      logger.info('Transaction sent successfully', { 
        network: options.network, 
        txHash, 
        amount: options.amount 
      });

      console.log(chalk.green('\nTransaction sent successfully!'));
      console.log(chalk.white(`Transaction Hash: ${txHash}`));

      const explorerUrl = getExplorerUrl(options.network, txHash);
      if (explorerUrl) {
        console.log(chalk.yellow(`\nView transaction: ${explorerUrl}`));
      }

    } catch (err: unknown) {
      // Type guard for Commander.js errors
      if (isCommanderError(err)) {
        throw err;
      }

      // Convert unknown error to a typed error object
      const error = err as CustomError;
      
      // Log error details - safely access message property
      logger.error(`Transaction failed on ${options.network}: ${getErrorMessage(err)}`);

      // Handle insufficient balance errors - safely check message property
      if (isInsufficientBalanceError(err)) {
        console.error(chalk.red('\nInsufficient balance for transaction.'));
        console.log(chalk.yellow('\nTo get testnet tokens, use:'));
        console.log(chalk.cyan(`wallet faucet --network ${options.network}`));
        return;
      }

      // General error display with safe error message extraction
      console.error(chalk.red('Error:'), getErrorMessage(err));
    }
  });

