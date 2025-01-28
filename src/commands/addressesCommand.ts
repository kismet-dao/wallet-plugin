// src/wallet/commands/addressesCommand.js
import { Command } from 'commander';
import chalk from 'chalk';
import { getWalletData } from '../utils/walletUtils';
import { PublicWalletData } from '../types/wallet';
import { logger } from '../utils/logger';

export const addressesCommand = new Command('addresses')
    .description('View all wallet addresses')
    .action(async function(options) {
        try {
            const walletData = await getWalletData(false) as PublicWalletData;
            
            console.log(chalk.yellow('\nWallet Addresses:'));
            console.log(chalk.white('Ethereum/Base:'));
            console.log(chalk.white(`${walletData.eth.address}`));
            
            console.log(chalk.white('\nBitcoin:'));
            console.log(chalk.white(`${walletData.btc.address}`));
            
            console.log(chalk.white('\nBitcoin Testnet:'));
            console.log(chalk.white(`${walletData.btctestnet.address}`));
            
            console.log(chalk.white('\nSolana:'));
            console.log(chalk.white(`${walletData.sol.address}`));

            console.log(chalk.white('\nDAG:'));
            console.log(chalk.white(`${walletData.dag.address}`));

            console.log(chalk.white('\nXRP:'));
            // Safely access XRP addresses with fallbacks
            console.log(chalk.white(`Mainnet: ${walletData.xrp?.mainnet?.address || 'N/A'}`));
            console.log(chalk.white(`Testnet: ${walletData.xrp?.testnet?.address || 'N/A'}`));

            if (walletData.createdAt) {
                console.log(chalk.yellow('\nWallet Created:'));
                console.log(chalk.white(new Date(walletData.createdAt).toLocaleString()));
            }

        } catch (error: unknown) {
            if (error instanceof Error) {
                logger.error('Error displaying wallet addresses:', error);
            } else {
                logger.error('Error displaying wallet addresses:', new Error(String(error)));
            }
        
            const errorMessage = error instanceof Error 
                ? error.message 
                : typeof error === 'string'
                ? error
                : 'An unknown error occurred';
            console.error(chalk.red('Error:'), errorMessage);
        }
    });

export default addressesCommand;