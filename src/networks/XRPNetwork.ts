// src/networks/XRPNetwork.ts
import { Network } from './Network';
import { Client, Wallet } from 'xrpl';
import chalk from 'chalk';

export class XRPNetwork extends Network {
    private client: Client;
    
    constructor(rpcUrl: string) {
        super();
        this.isUtxoBased = false;
        this.client = new Client(rpcUrl);
    }

    async initialize() {
        if (!this.client.isConnected()) {
            try {
                await this.client.connect();
                console.log(chalk.green('Successfully connected to XRP network'));
            } catch (error) {
                console.error(chalk.red('Failed to connect to XRP network:'), error);
                throw error;
            }
        }
    }

    async fetchBalance(address: string): Promise<number> {
        try {
            await this.initialize();

            try {
                // Use account_info request with explicit ledger specification
                const accountInfoResponse = await this.client.request({
                    command: 'account_info',
                    account: address,
                    ledger_index: 'validated' // Explicitly request validated ledger
                });

                // Extract and convert balance from drops to XRP
                const balanceInDrops = accountInfoResponse.result.account_data.Balance;
                const balanceInXrp = parseFloat(balanceInDrops) / 1_000_000;

                console.log(chalk.green(`Balance for ${address}: ${balanceInXrp} XRP`));
                return balanceInXrp;
            } catch (accountError: any) {
                // Detailed error logging
                console.error(chalk.yellow('Account Retrieval Details:'), 
                    accountError.data ? JSON.stringify(accountError.data, null, 2) : accountError
                );

                // Specific handling for account not found
                if (accountError.data?.error === 'actNotFound') {
                    console.warn(chalk.yellow(`Account ${address} does not exist or is not activated.`));
                    
                    console.log(chalk.blue(`
XRP Account Activation Notice:
- This account is not active on the XRP Ledger
- Requires at least 1 XRP to be considered activated
- To activate the account:
  1. Send at least 1 XRP from an existing account
  2. Use a testnet faucet for test networks
  3. Ensure correct network (mainnet/testnet)

Wallet Address: ${address}
`));
                }

                // Rethrow the error
                throw accountError;
            }
        } catch (error) {
            console.error(chalk.red('XRP Balance Fetch Error:'), error);
            throw error;
        } finally {
            await this.disconnect();
        }
    }

    calculateBalance(data: string): number {
        return parseFloat(data) / 1_000_000; // Convert drops to XRP
    }

    async disconnect() {
        if (this.client.isConnected()) {
            await this.client.disconnect();
            console.log(chalk.blue('Disconnected from XRP network'));
        }
    }

    async fundTestnetWallet(address: string): Promise<number> {
        try {
            await this.initialize();
    
            // Use the new fundWallet method from xrpl.js 2.0
            // Create a new wallet first
            const newWallet = Wallet.generate();
    
            const fundResult = await this.client.fundWallet(
                newWallet, 
                { 
                    amount: '1' 
                }
            );
    
            console.log(chalk.green(`Funded wallet ${address} with ${fundResult.balance} XRP`));
            return fundResult.balance;
        } catch (error) {
            console.error(chalk.red('Testnet wallet funding failed:'), error);
            throw error;
        } finally {
            await this.disconnect();
        }
    }
}