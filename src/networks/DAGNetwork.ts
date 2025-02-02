// src/networks/DAGNetwork.ts
import { Network } from './Network';
import { dag4 } from '@stardust-collective/dag4';

export class DAGNetwork extends Network {
    public readonly isUtxoBased = false as const;
    private networkType: string;
    private l0Url: string;
    private l1Url: string;
    private networkVersion: string;
    private isTestnet: boolean;

    constructor(networkType?: string) {
        super();
        // Determine network type from environment or parameter
        this.networkType = (networkType || process.env.NETWORK_TYPE || 'TESTNET').toUpperCase();
        
        // Network version from environment
        this.networkVersion = process.env.NETWORK_VERSION || '2.0';
        
        // Testnet flag from environment
        this.isTestnet = process.env.TESTNET === 'true';

        // Default to testnet URLs if not specified
        this.l0Url = process.env.GLOBAL_L0_URL || 'https://l0-lb-testnet.constellationnetwork.io';
        this.l1Url = process.env.METAGRAPH_L1_DATA_URL || 'https://l1-lb-testnet.constellationnetwork.io';
    }

    async initialize(): Promise<void> {
        try {
            await dag4.account.connect({
                networkVersion: this.networkVersion,
                testnet: this.isTestnet,
                l0Url: this.l0Url,
                l1Url: this.l1Url
            });
        } catch (error) {
            throw new Error(`Failed to initialize DAG network: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    async disconnect(): Promise<void> {
    }
    
    async fetchBalance(address: string): Promise<number> {
        try {
            // Connect to network with environment-based configuration
            dag4.account.connect({
                networkVersion: this.networkVersion,
                testnet: this.isTestnet,
                l0Url: this.l0Url,
                l1Url: this.l1Url
            });

            // Fetch balance using dag4 method
            const balanceResponse = await dag4.network.getAddressBalance(address);
            
            // Log the full balance response for investigation
            console.log('DAG Balance Raw Response', { 
                address, 
                rawResponse: JSON.stringify(balanceResponse) 
            });

            // Attempt to extract balance
            let balance: number;
            if (typeof balanceResponse === 'number') {
                balance = balanceResponse;
            } else if (typeof balanceResponse === 'object') {
                // Use type assertion to access potential properties
                const responseAny = balanceResponse as any;
                balance = responseAny.balance || 
                          responseAny.value || 
                          responseAny.amount || 
                          0;
            } else {
                balance = 0;
            }

            console.log('DAG Balance Retrieved', { 
                address, 
                balance,
                extractedFrom: typeof balanceResponse
            });

            return Number(balance);
        } catch (error) {
            const errorMessage = error instanceof Error 
                ? error.message 
                : String(error);
            
            console.error('Error fetching DAG balance', {
                message: errorMessage,
                address: address,
                networkType: this.networkType
            });

            throw error;
        }
    }

    calculateBalance(balance: number): number {
        return balance;
    }

    getNetworkDetails() {
        return {
            networkType: this.networkType,
            networkVersion: this.networkVersion,
            isTestnet: this.isTestnet,
            l0Url: this.l0Url,
            l1Url: this.l1Url
        };
    }
}