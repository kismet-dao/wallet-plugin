import { Command } from 'commander';
import chalk from 'chalk';
import { GasFees } from '../utils/gasFees';
import { NetworkType } from '../types/network';

export const gasCommand = new Command('gas')
  .description('Check current gas fees')
  .option('-n, --network <network>', 'Specify network (eth, btc, btctestnet, base)', 'eth')
  .action(async (options: { network: NetworkType }) => {
    try {
      const gasFees = new GasFees(options.network);
      const fees = await gasFees.fetchGasFees();
      
      if (!fees) {
        console.log(chalk.yellow('\nGas fees not available for this network'));
        return;
      }

      const unit = options.network === 'btc' || options.network === 'btctestnet' ? 'sat/vB' : 'Gwei';
      
      console.log(chalk.yellow(`\nCurrent ${options.network.toUpperCase()} Gas Fees:`));
      console.log(chalk.white(`Low: ${fees.low} ${unit}`));
      console.log(chalk.white(`Medium: ${fees.medium} ${unit}`));
      console.log(chalk.white(`High: ${fees.high} ${unit}`));
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
    }
  });