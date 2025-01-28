import { Command } from 'commander';
import chalk from 'chalk';
import { getWalletData } from '../utils/walletUtils';
import { PublicWalletData, NetworkKey } from '../types/wallet';
import QRCode from 'qrcode';
import axios from 'axios';
import inquirer from 'inquirer';

async function requestDAGFaucet(address: string): Promise<void> {
  try {
    const response = await axios.get(`https://faucet.constellationnetwork.io/testnet/faucet/${address}`);
    console.log(chalk.green('DAG faucet request successful!'));
    console.log(chalk.green('Transaction hash:'), response.data.txHash);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(chalk.red('Error requesting DAG from faucet:'), error.message);
    } else {
      console.error(chalk.red('Error requesting DAG from faucet:'), 'An unknown error occurred');
    }
  }
}


export const faucetCommand = new Command('faucet')
  .description('Get faucet information for test networks')
  .option('-n, --network <network>', 'Network (btctestnet, eth, sol, dag)', 'btctestnet')
  .action(async (options: { network: NetworkKey }) => {
    try {
      const walletData = await getWalletData<PublicWalletData>(false);
      let address: string;
      let networkInfo: {
        name: string;
        faucets: string[];
        waitTime: string;
        instructions: string[];
      };


      switch (options.network) {
        case 'eth':
          address = walletData.eth.address;
          networkInfo = {
            name: 'Ethereum Holesky Testnet',
            faucets: [
              'faucet.quicknode.com/holesky/eth',
              'holesky-faucet.pk910.de',
              'www.holeskychain.com'
            ],
            waitTime: '2-5 minutes',
            instructions: [
              'Visit any of the faucets above',
              'Connect your wallet or paste your address',
              'Complete verification if required',
              'Wait for test ETH to arrive'
            ]
          };
          break;
        case 'sol':
          address = walletData.sol.address;
          networkInfo = {
            name: 'Solana Devnet',
            faucets: [
              'solfaucet.com',
              'faucet.solana.com',
              'quicknode.com/solana-faucet'
            ],
            waitTime: '30 seconds',
            instructions: [
              'Visit any of the faucets above',
              'Paste your Solana address',
              'Select airdrop amount (typically 1-2 SOL)',
              'Wait for devnet SOL to arrive'
            ]
          };
          break;
          case 'dag':
            address = walletData.dag.address;
            networkInfo = {
              name: 'DAG Testnet',
              faucets: [
                'https://faucet.constellationnetwork.io/testnet/faucet/<YOUR WALLET ADDRESS>'
              ],
              waitTime: '1-2 minutes',
              instructions: [
                'Confirm the request to automatically receive DAG tokens from the faucet',
                'Wait for the tokens to arrive in your wallet'
              ]
            };
            break;
        default: // btctestnet
          address = walletData.btctestnet.address;
          networkInfo = {
            name: 'Bitcoin Testnet',
            faucets: [
              'coinfaucet.eu/btc-testnet',
              'bitcoinfaucet.uo1.net',
              'testnet-faucet.mempool.co'
            ],
            waitTime: '5-10 minutes',
            instructions: [
              'Visit any of the faucets above',
              'Copy and paste your testnet address',
              'Complete captcha if required',
              'Wait for testnet BTC to arrive'
            ]
          };
      }

      if (options.network === 'dag') {
        const confirmRequest = await inquirer.prompt<{ request: boolean }>([
          {
            type: 'confirm',
            name: 'request',
            message: 'Do you want to request DAG tokens from the faucet?',
            default: false
          }
        ]);

        if (confirmRequest.request) {
          console.log(chalk.yellow('Requesting DAG tokens from the faucet...'));
          await requestDAGFaucet(address);
        } else {
          console.log(chalk.yellow('You can request DAG tokens later by visiting:'));
          console.log(chalk.blue(`https://faucet.constellationnetwork.io/testnet/faucet/${address}`));
        }
      }

      const divider = '─'.repeat(50);
      console.log(chalk.blue('\n┌' + divider + '┐'));
      console.log(chalk.blue('│') + chalk.yellow(` ${networkInfo.name} Faucet Information `.padEnd(49)) + chalk.blue('│'));
      console.log(chalk.blue('├' + divider + '┤'));
      console.log(chalk.blue('│') + ' Your address:'.padEnd(49) + chalk.blue('│'));
      console.log(chalk.blue('│') + ` ${address}`.padEnd(49) + chalk.blue('│'));
      console.log(chalk.blue('├' + divider + '┤'));
      console.log(chalk.blue('│') + ' Available faucets:'.padEnd(49) + chalk.blue('│'));
      networkInfo.faucets.forEach((faucet, index) => {
        console.log(chalk.blue('│') + ` ${index + 1}. ${faucet}`.padEnd(49) + chalk.blue('│'));
      });
      console.log(chalk.blue('├' + divider + '┤'));
      console.log(chalk.blue('│') + ' Instructions:'.padEnd(49) + chalk.blue('│'));
      networkInfo.instructions.forEach(instruction => {
        console.log(chalk.blue('│') + ` ${instruction}`.padEnd(49) + chalk.blue('│'));
      });
      console.log(chalk.blue('│') + ` Expected wait time: ${networkInfo.waitTime}`.padEnd(49) + chalk.blue('│'));
      console.log(chalk.blue('└' + divider + '┘'));

      console.log('\nQR Code for your address:');
      const qr = await QRCode.toString(address, { type: 'terminal', small: true });
      console.log(qr);

      console.log(chalk.yellow('\nNote: After receiving tokens, wait for at'));
      console.log(chalk.yellow('least one confirmation before attempting to send.'));
      console.log(chalk.white('\nTo check your balance:'));
      console.log(chalk.green(`wallet balance --network ${options.network}`));

    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
    }
  });