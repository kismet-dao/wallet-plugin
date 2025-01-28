import { Network } from './Network';
import { dag4 } from '@stardust-collective/dag4';

export class DAGNetwork extends Network {
    private networkType: string;
    private l0Url: string;
    private l1Url: string;
    private networkVersion: string;
    private isTestnet: boolean;

    constructor(networkType?: string) {
        super();
        this.isUtxoBased = false;

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

        /**
     * Initialize DAG network connection
     * @returns {Promise<void>}
     */
        async initialize(): Promise<void> {
        }
    
        /**
         * Disconnect from DAG network
         * @returns {Promise<void>}
         */
        async disconnect(): Promise<void> {
        }

        
    /**
     * Fetch wallet balance
     * @param {string} address - DAG wallet address
     * @returns {Promise<number>} Wallet balance
     */
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
            // Standardize error logging
            const errorMessage = error instanceof Error 
                ? error.message 
                : String(error);
            
            const errorDetails = {
                message: errorMessage,
                address: address,
                networkType: this.networkType
            };

            console.error('Error fetching DAG balance', errorDetails);

            // Rethrow the original error
            throw error;
        }
    }

    /**
     * Calculate balance (same as fetch in this case)
     * @param {number} balance - Raw balance 
     * @returns {number} Processed balance
     */
    calculateBalance(balance: number): number {
        return balance; // DAG doesn't require conversion like Solana
    }

    /**
     * Get network connection details
     * @returns {Object} Network connection information
     */
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