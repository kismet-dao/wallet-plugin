import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import CryptoJS from 'crypto-js';
import axios from 'axios';
import fs from 'fs/promises';
import { WalletData, PublicWalletData, APIWalletResponse } from '../types/wallet';
import { dag4 } from '@stardust-collective/dag4';
import { Wallet as XrpWallet } from 'xrpl';

const API_BASE_URL = 'http://localhost:8081/api';

export const generateCommand = new Command('generate')
  .description('Generate a new wallet using Spring Boot API')
  .action(async () => {
    try {
      console.log(chalk.yellow('Connecting to API and generating new wallet...'));
      console.log(chalk.blue(`Using API endpoint: ${API_BASE_URL}`));
      
      const response = await axios.get<APIWalletResponse>(`${API_BASE_URL}/public/wallet/generate`);
      const walletData = response.data;
      
      console.log('\n' + chalk.green('Wallet generated successfully!'));
      console.log(chalk.red('\n⚠️  IMPORTANT: Save these details securely! ⚠️'));
      console.log(chalk.red('Never share your private keys or mnemonic phrase with anyone!\n'));

      console.log(chalk.yellow('Mnemonic Phrase:'));
      const words = walletData.ethereum.mnemonic.split(' ');
      words.forEach((word, index) => {
        console.log(chalk.white(`${(index + 1).toString().padStart(2, '0')}. ${word}`));
      });

      // Generate DAG wallet
      const mnemonic = walletData.ethereum.mnemonic;
      const dagAccount = dag4.createAccount();
      dagAccount.loginSeedPhrase(mnemonic);

      const dagAddress = dagAccount.address;
      const dagPublicKey = dagAccount.publicKey;
      const dagPrivateKey = dagAccount.keyTrio.privateKey;

      // XRP wallet generation part
      const xrpMainnetWallet = XrpWallet.generate();

      // Ensure we have valid values for mainnet
      const mainnetAddress = xrpMainnetWallet.classicAddress ?? '';
      const mainnetPublicKey = xrpMainnetWallet.publicKey ?? '';
      const mainnetSeed = xrpMainnetWallet.seed ?? '';

      // Use the mainnet seed to generate the testnet wallet
      const xrpTestnetWallet = XrpWallet.fromSeed(mainnetSeed);

      // Ensure we have valid values for testnet
      const testnetAddress = xrpTestnetWallet.classicAddress ?? '';
      const testnetPublicKey = xrpTestnetWallet.publicKey ?? '';
      const testnetSeed = mainnetSeed; // Use the same seed for both

      console.log('Debug - XRP Mainnet Wallet:', {
          address: mainnetAddress,
          publicKey: mainnetPublicKey,
          seed: mainnetSeed
      });

      console.log('Debug - XRP Testnet Wallet:', {
          address: testnetAddress,
          publicKey: testnetPublicKey,
          seed: testnetSeed
      });

      if (!xrpMainnetWallet.classicAddress || !xrpMainnetWallet.publicKey || !xrpMainnetWallet.seed ||
          !xrpTestnetWallet.classicAddress || !xrpTestnetWallet.publicKey) {
          throw new Error('Failed to generate XRP wallet credentials');
      }

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
          address: dagAddress,
          privateKey: dagPrivateKey,
          publicKey: dagPublicKey,
        },
        xrp: {
          mainnet: {
            address: mainnetAddress,
            privateKey: mainnetSeed,
            publicKey: mainnetPublicKey,
          },
          testnet: {
            address: testnetAddress,
            privateKey: testnetSeed,
            publicKey: testnetPublicKey,
          },
          address: mainnetAddress,        // Add these top-level properties
          privateKey: mainnetSeed,
          publicKey: mainnetPublicKey
        },
        mnemonic: walletData.ethereum.mnemonic,
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
        dag: { address: dagAddress, publicKey: dagPublicKey },
        xrp: {
          address: xrpMainnetWallet.classicAddress,
          mainnet: {
            address: xrpMainnetWallet.classicAddress,
            publicKey: xrpMainnetWallet.publicKey,
          },
          testnet: {
            address: xrpTestnetWallet.classicAddress,
            publicKey: xrpTestnetWallet.publicKey,
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