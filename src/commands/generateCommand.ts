import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import CryptoJS from 'crypto-js';
import fs from 'fs/promises';
import { WalletData, PublicWalletData } from '../types/wallet';
import generateWallets from '../utils/createWallet.js';

export const generateCommand = new Command('generate')
  .description('Generate a new wallet locally')
  .action(async () => {
    try {
      console.log(chalk.yellow('Generating new wallet locally...'));
      
      const walletData = await generateWallets();
      
      console.log('\n' + chalk.green('Wallet generated successfully!'));
      console.log(chalk.red('\n⚠️  IMPORTANT: Save these details securely! ⚠️'));
      console.log(chalk.red('Never share your private keys or mnemonic phrase with anyone!\n'));

      console.log(chalk.yellow('Mnemonic Phrase:'));
      const words = walletData.mnemonic.split(' ');
      words.forEach((word: string, index: number) => {
        console.log(chalk.white(`${(index + 1).toString().padStart(2, '0')}. ${word}`));
      });
      
      const answers = await inquirer.prompt<{ password: string; confirmPassword: string }>([
        {
          type: 'password',
          name: 'password',
          message: 'Enter a password to encrypt your wallet:',
          validate: (value: string) => value.length >= 8 || 'Password must be at least 8 characters'
        },
        {
          type: 'password',
          name: 'confirmPassword',
          message: 'Confirm your password:',
          validate: (value: string, answers: { password: string }) => 
            value === answers.password || 'Passwords do not match'
        }
      ]);

      // Create wallet data object
      const walletDataObj: WalletData = {
        eth: {
          address: walletData.ethereum.address,
          privateKey: walletData.ethereum.privateKey,
          publicKey: walletData.ethereum.publicKey,
        },
        btc: {
          address: walletData.bitcoin.btcMainNetAddress,
          privateKey: walletData.bitcoin.btcMainNetPrivateKey,
          publicKey: walletData.bitcoin.publicKey,
        },
        btctestnet: {
          address: walletData.bitcoin.btcTestNetAddress,
          privateKey: walletData.bitcoin.btcTestNetPrivateKey,
          publicKey: walletData.bitcoin.publicKey,
        },
        base: {
          address: walletData.ethereum.address,
          privateKey: walletData.ethereum.privateKey,
          publicKey: walletData.ethereum.publicKey,
        },
        sol: {
          address: walletData.solana.solAddress,
          privateKey: walletData.solana.solPrivateKey,
          publicKey: walletData.solana.solPublicKey,
        },
        dag: {
          address: walletData.dag.address,
          privateKey: walletData.dag.privateKey,
          publicKey: walletData.dag.publicKey,
        },
        xrp: {
          mainnet: {
            address: walletData.xrp.mainnet.address,
            privateKey: walletData.xrp.mainnet.privateKey,
            publicKey: walletData.xrp.mainnet.publicKey,
          },
          testnet: {
            address: walletData.xrp.testnet.address,
            privateKey: walletData.xrp.testnet.privateKey,
            publicKey: walletData.xrp.testnet.publicKey,
          },
          address: walletData.xrp.mainnet.address,
          privateKey: walletData.xrp.mainnet.privateKey,
          publicKey: walletData.xrp.mainnet.publicKey
        },
        mnemonic: walletData.mnemonic,
        createdAt: new Date().toISOString(),
      };

      // Store private data
      const walletDataString = JSON.stringify(walletDataObj);
      const encryptedWalletData = CryptoJS.AES.encrypt(walletDataString, answers.password).toString();
      await fs.writeFile('.wallet.enc', encryptedWalletData);

      // Store public data
      const publicData: PublicWalletData = {
        eth: { address: walletDataObj.eth.address, publicKey: walletDataObj.eth.publicKey },
        btc: { address: walletDataObj.btc.address, publicKey: walletDataObj.btc.publicKey },
        btctestnet: { address: walletDataObj.btctestnet.address, publicKey: walletDataObj.btctestnet.publicKey },
        base: { address: walletDataObj.base.address, publicKey: walletDataObj.base.publicKey },
        sol: { address: walletDataObj.sol.address, publicKey: walletDataObj.sol.publicKey },
        dag: { address: walletDataObj.dag.address, publicKey: walletDataObj.dag.publicKey },
        xrp: {
          address: walletDataObj.xrp.mainnet.address,
          mainnet: {
            address: walletDataObj.xrp.mainnet.address,
            publicKey: walletDataObj.xrp.mainnet.publicKey,
          },
          testnet: {
            address: walletDataObj.xrp.testnet.address,
            publicKey: walletDataObj.xrp.testnet.publicKey,
          }
        },
        createdAt: walletDataObj.createdAt
      };

      const publicDataString = JSON.stringify(publicData);
      const encryptedPublicData = CryptoJS.AES.encrypt(publicDataString, 'public-data-key').toString();
      await fs.writeFile('.wallet.public.enc', encryptedPublicData);

      console.log(chalk.yellow('\nWallet Addresses:'));
      console.log(chalk.white(`ETH: ${walletDataObj.eth.address}`));
      console.log(chalk.white(`BTC: ${walletDataObj.btc.address}`));
      console.log(chalk.white(`BASE: ${walletDataObj.base.address}`));
      console.log(chalk.white(`SOL: ${walletDataObj.sol.address}`));
      console.log(chalk.white(`DAG: ${walletDataObj.dag.address}`));
      console.log(chalk.white(`XRP Mainnet: ${walletDataObj.xrp.mainnet.address}`));
      console.log(chalk.white(`XRP Testnet: ${walletDataObj.xrp.testnet.address}`));
      
      console.log(chalk.green('\n✔ Wallet encrypted and saved successfully'));
      console.log(chalk.yellow('To decrypt your wallet, use the "decrypt" command with your password'));
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
    }
  });