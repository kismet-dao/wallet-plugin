import { Command } from 'commander';
import chalk from 'chalk';
import CryptoJS from 'crypto-js';
import fs from 'fs/promises';
import { Wallet as XrpWallet } from 'xrpl';
import { WalletData, PublicWalletData } from '../types/wallet';
import { getWalletData } from '../utils/walletUtils';
import inquirer from 'inquirer';

export const XRPTestnetCommand = new Command('xrp-testnet')
  .description('Migrate XRP wallet to new mainnet/testnet format')
  .action(async () => {
    try {
      // Retrieve existing wallet data
      const walletData = await getWalletData(true) as WalletData;

      // Check if wallet is already in new format
      if (walletData.xrp.mainnet?.address && walletData.xrp.testnet?.address) {
        console.log(chalk.yellow('Wallet is already in new format. No migration needed.'));
        return;
      }

      let mainnetWallet: XrpWallet;
      let testnetWallet: XrpWallet;

      // Validate and create mainnet wallet
      if (walletData.xrp.mainnet?.privateKey) {
        mainnetWallet = XrpWallet.fromSeed(walletData.xrp.mainnet.privateKey);
        
        // Additional validation to ensure wallet integrity
        if (mainnetWallet.classicAddress !== walletData.xrp.mainnet.address) {
          console.warn(chalk.yellow('Warning: Mainnet wallet address mismatch. Using stored address.'));
        }
      } else {
        throw new Error('No mainnet wallet found. Please generate a new wallet instead of migrating.');
      }

      // Generate testnet wallet using a deterministic method
      // We'll use a hash of the mainnet seed to create a consistent testnet seed
      const testnetSeed = CryptoJS.SHA256(walletData.xrp.mainnet.privateKey + 'testnet').toString().slice(0, 32);
      testnetWallet = XrpWallet.fromSeed(testnetSeed);

      console.log(chalk.yellow('\nMigrating XRP Wallet to new format:'));
      console.log(chalk.white(`Existing Mainnet Address: ${mainnetWallet.classicAddress}`));
      console.log(chalk.white(`New Testnet Address: ${testnetWallet.classicAddress}`));

      // Update wallet data with new format, preserving mainnet details
      walletData.xrp = {
        mainnet: {
          address: walletData.xrp.mainnet.address, // Preserve original mainnet address
          privateKey: walletData.xrp.mainnet.privateKey, // Preserve original private key
          publicKey: mainnetWallet.publicKey, // Update public key if needed
        },
        testnet: {
          address: testnetWallet.classicAddress,
          privateKey: testnetSeed,
          publicKey: testnetWallet.publicKey,
        },
        // Add top-level properties using mainnet details
        address: walletData.xrp.mainnet.address,
        privateKey: walletData.xrp.mainnet.privateKey,
        publicKey: mainnetWallet.publicKey
      };

      // Prompt for wallet encryption password
      const { password } = await inquirer.prompt<{ password: string }>([
        {
          type: 'password',
          name: 'password',
          message: 'Enter the wallet encryption password:',
        }
      ]);

      // Save private wallet data
      const walletDataString = JSON.stringify(walletData);
      const encryptedWalletData = CryptoJS.AES.encrypt(walletDataString, password).toString();
      await fs.writeFile('.wallet.enc', encryptedWalletData);

      // Update public wallet data
      const publicData: PublicWalletData = {
        ...await getWalletData(false) as PublicWalletData,
        xrp: {
          address: walletData.xrp.mainnet.address, // Keep original mainnet as default
          mainnet: {
            address: walletData.xrp.mainnet.address,
            publicKey: mainnetWallet.publicKey,
          },
          testnet: {
            address: testnetWallet.classicAddress,
            publicKey: testnetWallet.publicKey,
          }
        }
      };

      const publicDataString = JSON.stringify(publicData);
      const encryptedPublicData = CryptoJS.AES.encrypt(publicDataString, 'public-data-key').toString();
      await fs.writeFile('.wallet.public.enc', encryptedPublicData);

      console.log(chalk.green('\n✔ XRP Wallet successfully migrated to new format'));
      console.log(chalk.yellow('\nKey improvements:'));
      console.log(chalk.white('- Preserved original mainnet address'));
      console.log(chalk.white('- Generated consistent testnet wallet'));
      console.log(chalk.white('- Maintained wallet integrity'));
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
    }
  });
export default XRPTestnetCommand;