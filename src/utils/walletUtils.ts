import fs from 'fs/promises';
import inquirer from 'inquirer';
import CryptoJS from 'crypto-js';
import { WalletData, PublicWalletData, NetworkKey, WalletKeys, XrpWalletKeys } from '../types/wallet';
import { logger } from './logger';
import { dag4 } from '@stardust-collective/dag4';

export const getWalletData = async <T extends WalletData | PublicWalletData>(
    requirePrivateKeys = false,
    password?: string,
    context?: any
): Promise<T> => {
    try {
        let walletData: T;

        // Always try to read the encrypted wallet file first
        try {
            const encryptedData = await fs.readFile(
                requirePrivateKeys ? '.wallet.enc' : '.wallet.public.enc',
                'utf8'
            );

            if (requirePrivateKeys) {
                let decryptPassword = password;

                if (!decryptPassword) {
                    const promptConfig = {
                        ...(context?.inquirerOptions || {}),
                        input: context?.rl?.input || process.stdin,
                        output: context?.rl?.output || process.stdout
                    };

                    const answers = await inquirer.prompt<{ password: string }>(
                        [{
                            type: 'password',
                            name: 'password',
                            message: 'Enter your wallet password:',
                        }],
                        promptConfig
                    );
                    decryptPassword = answers.password;

                    if (context?.rl) {
                        context.rl.prompt();
                    }
                }

                try {
                    const bytes = CryptoJS.AES.decrypt(encryptedData, decryptPassword);
                    const decrypted = bytes.toString(CryptoJS.enc.Utf8);

                    if (!decrypted) {
                        throw new Error('Failed to decrypt wallet data');
                    }

                    walletData = JSON.parse(decrypted) as T;
                } catch (error) {
                    throw new Error('Invalid wallet password');
                }
            } else {
                const bytes = CryptoJS.AES.decrypt(encryptedData, 'public-data-key');
                walletData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8)) as T;
            }

            // If we successfully loaded the wallet and have DAG in env, override just the DAG data
            if (requirePrivateKeys && process.env.DAG_PRIVATE_KEY && 'dag' in walletData) {
                const dagAccount = dag4.createAccount(process.env.DAG_PRIVATE_KEY);
                (walletData as any).dag = {
                    privateKey: process.env.DAG_PRIVATE_KEY,
                    publicKey: dagAccount.publicKey,
                    address: dagAccount.address
                };
            }

            return walletData;

        } catch (error) {
            // If file reading or decryption failed and we have DAG in env
            if (requirePrivateKeys && process.env.DAG_PRIVATE_KEY) {
                logger.info('Failed to read wallet file, using DAG from environment variable');
                const dagAccount = dag4.createAccount(process.env.DAG_PRIVATE_KEY);

                // Return a wallet with just DAG data
                return {
                    dag: {
                        privateKey: process.env.DAG_PRIVATE_KEY,
                        publicKey: dagAccount.publicKey,
                        address: dagAccount.address
                    }
                } as T;
            }
            // If no DAG in env either, rethrow the original error
            throw error;
        }

    } catch (error) {
        // Ensure the error is of type Error before passing it to logger.error
        if (error instanceof Error) {
            logger.error('Failed to get wallet data:', error);
        } else {
            logger.error('Failed to get wallet data:', new Error(String(error)));
        }
        throw error;
    }
};
export const getDagPrivateKey = async (password?: string, context?: any): Promise<string> => {
    // First check environment variable
    const envDagPrivateKey = process.env.DAG_PRIVATE_KEY;
    if (envDagPrivateKey) {
        logger.info('Using DAG private key from environment variable');
        return envDagPrivateKey;
    }

    // If no environment variable, get from wallet with a single decryption
    logger.info('Retrieving DAG private key from wallet');
    const walletData = await getWalletData<WalletData>(true, password, context);
    return walletData.dag.privateKey;
};

export const getDagAddress = async (requirePrivateKeys = false): Promise<string> => {
    try {
        const walletData = await getWalletData(requirePrivateKeys);
        return walletData.dag.address;
    } catch (error) {
        // Ensure the error is of type Error before passing it to logger.error
        if (error instanceof Error) {
            logger.error('Failed to retrieve DAG address:', error);
        } else {
            logger.error('Failed to retrieve DAG address:', new Error(String(error)));
        }
        throw error;
    }
};

export const getLatestSnapshotOrdinal = async () => {
    try {
        // Use dag4 from the existing connection
        const latestSnapshot = await dag4.network.getLatestSnapshot();

        if (!latestSnapshot) {
            logger.warn('No snapshot found, using default ordinal 0');
            return 0;
        }

        const ordinal = latestSnapshot.height;
        if (typeof ordinal !== 'number') {
            throw new Error(`Invalid ordinal in snapshot response: ${JSON.stringify(latestSnapshot)}`);
        }

        logger.info('Successfully retrieved latest snapshot ordinal:', {
            ordinal,
            hash: latestSnapshot.hash,
            height: latestSnapshot.height
        });

        return ordinal;
    } catch (error) {
        // Ensure the error is of type Error before passing it to logger.error
        if (error instanceof Error) {
            logger.error('Failed to get latest snapshot ordinal:', error);
        } else {
            logger.error('Failed to get latest snapshot ordinal:', new Error(String(error)));
        }
        throw error;
    }
};

export const convertXrpWalletToWalletKeys = (xrpWallet: XrpWalletKeys, network: 'xrp' | 'xrptestnet'): WalletKeys => {
    const selectedNetwork = network === 'xrp' ? xrpWallet.mainnet : xrpWallet.testnet;
    return {
        address: selectedNetwork.address,
        privateKey: selectedNetwork.privateKey,
        publicKey: selectedNetwork.publicKey
    };
};

export const getWalletKeysForNetwork = (walletData: WalletData, network: NetworkKey): WalletKeys => {
    switch (network) {
        case 'eth':
        case 'base':
            return walletData.eth;
        case 'btc':
            return walletData.btc;
        case 'btctestnet':
            return walletData.btctestnet;
        case 'sol':
            return walletData.sol;
        case 'dag':
            return walletData.dag;
        case 'xrp':
            return convertXrpWalletToWalletKeys(walletData.xrp, 'xrp');
        case 'xrptestnet':
            return convertXrpWalletToWalletKeys(walletData.xrp, 'xrptestnet');
        default:
            throw new Error(`Unsupported network: ${network}`);
    }
};  