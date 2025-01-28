import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { getWalletData } from '../utils/walletUtils';
import { WalletData } from '../types/wallet';
import { maskString } from '../utils/securityUtils';

export const decryptCommand = new Command('decrypt')
  .description('Securely view wallet information')
  .option('-s, --show-private', 'Show private keys (requires confirmation)')
  .option('-m, --show-mnemonic', 'Show mnemonic phrase (requires confirmation)')
  .action(async (options, cmd) => {
    try {
      // Get shared context from command
      const context = cmd.context || {};
      
      // Configure inquirer to use shared readline interface if available
      const promptOptions = context.inquirerOptions || {};
      
      const walletData = await getWalletData(true) as WalletData;

      // Always show public information
      console.log(chalk.yellow('\nWallet Information:'));
      
      // Ethereum
      console.log(chalk.white('\nEthereum:'));
      console.log(chalk.white(`Address: ${walletData.eth.address}`));
      console.log(chalk.white(`Public Key: ${walletData.eth.publicKey}`));
      
      // Bitcoin
      console.log(chalk.white('\nBitcoin:'));
      console.log(chalk.white(`Address: ${walletData.btc.address}`));
      console.log(chalk.white(`Public Key: ${walletData.btc.publicKey}`));
      
      // Solana
      console.log(chalk.white('\nSolana:'));
      console.log(chalk.white(`Address: ${walletData.sol.address}`));
      console.log(chalk.white(`Public Key: ${walletData.sol.publicKey}`));

      // DAG
      console.log(chalk.white('\nDAG:'));
      console.log(chalk.white(`Address: ${walletData.dag.address}`));
      console.log(chalk.white(`Public Key: ${walletData.dag.publicKey}`));

      console.log(chalk.white('\nXRP:'));
      console.log(chalk.white(`Mainnet Address: ${walletData.xrp.mainnet.address}`));
      console.log(chalk.white(`Mainnet Public Key: ${walletData.xrp.mainnet.publicKey}`));
      console.log(chalk.white(`Testnet Address: ${walletData.xrp.testnet.address}`));
      console.log(chalk.white(`Testnet Public Key: ${walletData.xrp.testnet.publicKey}`));

      // Creation date if available
      if (walletData.createdAt) {
        console.log(chalk.yellow('\nWallet Created:'));
        console.log(chalk.white(new Date(walletData.createdAt).toLocaleString()));
      }

      // Handle private key display with confirmation
      if (options.showPrivate) {
        const { showPrivateKeys } = await inquirer.prompt<{ showPrivateKeys: boolean }>(
          [
            {
              type: 'confirm',
              name: 'showPrivateKeys',
              message: chalk.red('WARNING: You are about to display private keys. Are you sure?'),
              default: false
            }
          ],
          promptOptions // Use shared readline interface
        );

        if (showPrivateKeys) {
          console.log(chalk.red('\nPrivate Keys (DO NOT SHARE):'));
          console.log(chalk.red(`Ethereum: ${maskString(walletData.eth.privateKey)}`));
          console.log(chalk.red(`Bitcoin: ${maskString(walletData.btc.privateKey)}`));
          console.log(chalk.red(`Solana: ${maskString(walletData.sol.privateKey)}`));
          console.log(chalk.red(`DAG: ${maskString(walletData.dag.privateKey)}`));
          console.log(chalk.red(`XRP Mainnet: ${maskString(walletData.xrp.mainnet.privateKey)}`));
          console.log(chalk.red(`XRP Testnet: ${maskString(walletData.xrp.testnet.privateKey)}`));
          const { showFullKeys } = await inquirer.prompt<{ showFullKeys: boolean }>(
            [
              {
                type: 'confirm',
                name: 'showFullKeys',
                message: chalk.red('Reveal full private keys? This is not recommended.'),
                default: false
              }
            ],
            promptOptions // Use shared readline interface
          );

          if (showFullKeys) {
            console.log(chalk.red('\nFull Private Keys:'));
            console.log(chalk.red(`Ethereum: ${walletData.eth.privateKey}`));
            console.log(chalk.red(`Bitcoin: ${walletData.btc.privateKey}`));
            console.log(chalk.red(`Solana: ${walletData.sol.privateKey}`));
            console.log(chalk.red(`DAG: ${walletData.dag.privateKey}`));
            console.log(chalk.red(`XRP Mainnet: ${walletData.xrp.mainnet.privateKey}`));
            console.log(chalk.red(`XRP Testnet: ${walletData.xrp.testnet.privateKey}`));
          }
        }
      }

      // Handle mnemonic display with confirmation
      if (options.showMnemonic) {
        const { showMnemonic } = await inquirer.prompt<{ showMnemonic: boolean }>(
          [
            {
              type: 'confirm',
              name: 'showMnemonic',
              message: chalk.red('WARNING: You are about to display your mnemonic phrase. Are you sure?'),
              default: false
            }
          ],
          promptOptions // Use shared readline interface
        );

        if (showMnemonic) {
          console.log(chalk.yellow('\nMnemonic Phrase:'));
          const words = walletData.mnemonic.split(' ');
          words.forEach((word, index) => {
            console.log(chalk.red(`${(index + 1).toString().padStart(2, '0')}. ${word}`));
          });
        }
      }

      // Security reminder
      console.log(chalk.yellow('\nSecurity Reminder:'));
      console.log(chalk.white('- Never share private keys or mnemonic phrases'));
      console.log(chalk.white('- Clear your terminal history after viewing sensitive information'));
      console.log(chalk.white('- Ensure no one is watching your screen'));

      // Restore prompt if readline interface is available
      if (context.rl) {
        context.rl.prompt();
      }

    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
      // Restore prompt even on error if readline interface is available
      if (cmd.context?.rl) {
        cmd.context.rl.prompt();
      }
    }
  });