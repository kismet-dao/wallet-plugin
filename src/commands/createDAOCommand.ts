import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { Connection, clusterApiUrl } from '@solana/web3.js';
import { getWalletData, getWalletKeysForNetwork } from '../utils/walletUtils';
import { WalletData } from '../types/wallet';
import { createDAO, DAOConfig } from '../transactions/SOL/CreateDAO';
import { logger } from '../utils/logger';

interface CommandLineOptions {
  name: string;
  minTokens: string;
  decimals: string;
  yesVotePercentage: string;
  coolOffHours: string;
  exemptProposalCount: string;
}

export const createDAOCommand = new Command('create-dao')
  .description('Create a new DAO on Solana')
  .requiredOption('-n, --name <name>', 'DAO name')
  .requiredOption('-t, --min-tokens <number>', 'Minimum tokens required for governance')
  .requiredOption('-d, --decimals <number>', 'Community token decimals')
  .requiredOption('-v, --yes-vote-percentage <number>', 'Yes vote percentage required')
  .requiredOption('-c, --cool-off-hours <number>', 'Voting cool-off period in hours')
  .requiredOption('-e, --exempt-proposal-count <number>', 'Number of exempt proposals')
  .allowExcessArguments(false)
  .exitOverride()
  .action(async (cmdOptions: CommandLineOptions) => {
    try {
      // Validate numeric inputs
      const minTokens = parseInt(cmdOptions.minTokens);
      const decimals = parseInt(cmdOptions.decimals);
      const yesVotePercentage = parseInt(cmdOptions.yesVotePercentage);
      const coolOffHours = parseInt(cmdOptions.coolOffHours);
      const exemptProposalCount = parseInt(cmdOptions.exemptProposalCount);

      // Validate parameters
      if (isNaN(minTokens) || minTokens <= 0) {
        throw new Error('Minimum tokens must be a positive number');
      }
      if (isNaN(decimals) || decimals < 0 || decimals > 9) {
        throw new Error('Decimals must be between 0 and 9');
      }
      if (isNaN(yesVotePercentage) || yesVotePercentage <= 0 || yesVotePercentage > 100) {
        throw new Error('Yes vote percentage must be between 1 and 100');
      }
      if (isNaN(coolOffHours) || coolOffHours < 0) {
        throw new Error('Cool-off hours must be a positive number');
      }
      if (isNaN(exemptProposalCount) || exemptProposalCount < 0) {
        throw new Error('Exempt proposal count must be a positive number');
      }

      // Get wallet data
      const walletData = await getWalletData<WalletData>(true);
      const networkWallet = getWalletKeysForNetwork(walletData, 'sol');

      if (!networkWallet?.privateKey) {
        throw new Error(
          'No Solana private key found. Please either:\n' +
          '1. Set the SOL_PRIVATE_KEY environment variable, or\n' +
          '2. Create an encrypted wallet using: wallet generate\n' +
          '3. Import an existing key using: wallet import -n sol'
        );
      }

      // Display parameters
      const divider = '─'.repeat(50);
      console.log(chalk.blue('\n┌' + divider + '┐'));
      console.log(chalk.blue('│') + chalk.yellow(' DAO Creation Details '.padEnd(49)) + chalk.blue('│'));
      console.log(chalk.blue('├' + divider + '┤'));
      console.log(chalk.blue('│') + ` Name: ${cmdOptions.name}`.padEnd(49) + chalk.blue('│'));
      console.log(chalk.blue('│') + ` Min Tokens for Governance: ${minTokens}`.padEnd(49) + chalk.blue('│'));
      console.log(chalk.blue('│') + ` Token Decimals: ${decimals}`.padEnd(49) + chalk.blue('│'));
      console.log(chalk.blue('│') + ` Yes Vote Percentage: ${yesVotePercentage}%`.padEnd(49) + chalk.blue('│'));
      console.log(chalk.blue('│') + ` Voting Cool-off: ${coolOffHours} hours`.padEnd(49) + chalk.blue('│'));
      console.log(chalk.blue('│') + ` Exempt Proposals: ${exemptProposalCount}`.padEnd(49) + chalk.blue('│'));
      console.log(chalk.blue('└' + divider + '┘\n'));

      const confirm = await inquirer.prompt<{ proceed: boolean }>([
        {
          type: 'confirm',
          name: 'proceed',
          message: 'Create DAO with these parameters?',
          default: false
        }
      ]);

      if (!confirm.proceed) {
        logger.info('DAO creation cancelled by user');
        console.log(chalk.yellow('DAO creation cancelled'));
        return;
      }

      console.log(chalk.yellow('\nCreating DAO...'));

      const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

      const daoConfig: DAOConfig = {
        name: cmdOptions.name,
        minTokensToCreateGovernance: minTokens,
        communityMintDecimals: decimals,
        communityYesVotePercentage: yesVotePercentage,
        votingCoolOffHours: coolOffHours,
        depositExemptProposalCount: exemptProposalCount
      };

      const realmAddress = await createDAO(
        connection,
        networkWallet.privateKey,
        daoConfig
      );

      logger.info('DAO created successfully', {
        name: cmdOptions.name,
        realmAddress
      });

      // Success message
      console.log(chalk.blue('\n┌' + divider + '┐'));
      console.log(chalk.blue('│') + chalk.green(' DAO Created Successfully '.padEnd(49)) + chalk.blue('│'));
      console.log(chalk.blue('├' + divider + '┤'));
      console.log(chalk.blue('│') + ` DAO Address: ${realmAddress}`.padEnd(49) + chalk.blue('│'));
      console.log(chalk.blue('│') + ` Authority: ${networkWallet.address}`.padEnd(49) + chalk.blue('│'));
      console.log(chalk.blue('└' + divider + '┘\n'));

      console.log(chalk.yellow('\nView on Explorer:'));
      console.log(chalk.cyan(`https://explorer.solana.com/address/${realmAddress}?cluster=devnet`));

    } catch (error: unknown) {
      // Handle different types of errors
      if (error instanceof Error) {
        // Handle commander specific error
        if ('code' in error && error.code === 'commander.executeSubCommandAsync') {
          throw error;
        }

        // Special handling for no wallet/private key errors
        if (error.message.includes('No Solana private key found')) {
          console.error(chalk.red('\nError: Missing Solana Wallet Configuration'));
          console.error(chalk.yellow(error.message));
          process.exit(1);
        }

        // Log the error before throwing
        logger.error('Error creating DAO:', error);
        console.error(chalk.red('\nError:'), error.message);
        throw error;
      } else {
        // Handle non-Error objects
        const errorMessage = typeof error === 'string' ? error : 'An unknown error occurred';
        logger.error('Error creating DAO:', new Error(errorMessage));
        console.error(chalk.red('\nError:'), errorMessage);
        throw new Error(errorMessage);
      }
    }
  });