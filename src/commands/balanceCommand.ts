// src/wallet/commands/balanceCommand.ts
import { Command } from 'commander';
import chalk from 'chalk';
import { getWalletData } from '../utils/walletUtils';
import { getNetworkInstance } from '../networks';
import { NetworkType } from '../types/network';
import { PublicWalletData } from '../types/wallet';

export const balanceCommand = new Command('balance')
  .description('Check wallet balance')
  .option('-n, --network <network>', 'Specify network (eth, btc, btctestnet, sol, base, dag, xrp)', 'eth')
  .action(async (options: { network: NetworkType }) => {
    try {
      const walletData = await getWalletData(false) as PublicWalletData;
      const network = getNetworkInstance(options.network);
      let address: string;

      switch (options.network) {
        case 'eth':
        case 'base':
          address = walletData.eth.address;
          break;
        case 'btc':
          address = walletData.btc.address;
          break;
        case 'btctestnet':
          address = walletData.btctestnet.address;
          break;
        case 'sol':
          address = walletData.sol.address;
          break;
        case 'dag':
          address = walletData.dag.address;
          break;
            case 'xrp':
              address = walletData.xrp.address;
              break;
            case 'xrpmainnet':
              address = walletData.xrp.mainnet.address;
              break;
            case 'xrptestnet':
              address = walletData.xrp.testnet.address;
              break;
        default:
          throw new Error('Unsupported network');
      }

      console.log(chalk.yellow(`\nFetching balance for ${options.network.toUpperCase()} address: ${address}`));

      // Initialize and connect to the network only for XRP
      if (options.network === 'xrp') {
        await network.initialize();
      }

      const balance = await network.fetchBalance(address);

      // Format balance based on network
      if (options.network === 'btc' || options.network === 'btctestnet') {
        // Display balance in both satoshis and BTC
        const satoshis = BigInt(balance);
        const btc = Number(satoshis) / 100_000_000;
        console.log(chalk.green(`\nBalance: ${satoshis.toString()} satoshis (${btc.toFixed(8)} BTC)`));
      } else if (options.network === 'dag') {
        // Convert DAG balance from smallest unit
        const dagBalance = Number(balance) / 100_000_000;
        console.log(chalk.green(`\nBalance: ${dagBalance.toFixed(8)} DAG (${balance} microDAG)`));
      } else if (options.network === 'xrp') {
        // XRP balance is already in full XRP units, display with 6 decimal places
        console.log(chalk.green(`\nBalance: ${Number(balance).toFixed(6)} XRP`));
      } else {
        // Display balance directly for other networks
        console.log(chalk.green(`\nBalance: ${balance} ${options.network.toUpperCase()}`));
      }

      // Disconnect from the network only for XRP
      if (options.network === 'xrp') {
        await network.disconnect();
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
    }
  });