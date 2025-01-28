import { dag4 } from '@stardust-collective/dag4';
import axios from 'axios';
import { logger } from '../../utils/logger';

interface MetagraphConfig {
    name: string;
    description?: string;
    initialValidators: string[];
    metagraphId?: string;
    networkType?: string;
    customEndpoints?: {
        l0?: string;
        l1?: string;
    };
}

interface MetagraphResponse {
    metagraphId: string;
    transactionId: string;
    status: 'success' | 'error';
    message?: string;
}

export class MetagraphCreator {
    
    private networkType: string;
    private isConnected: boolean = false;
    private walletAddress: string | null = null;
    private account: any | null = null;
    private dagPrivateKey: string | null = null;
    private readonly NETWORKS: { [key: string]: { l0: string; l1: string } } = {
        TESTNET: {
            l0: 'https://session.exchange/global-l0',
            l1: 'https://session.exchange/data-l1'
        },
        MAINNET: {
            l0: 'https://l0-lb-mainnet.constellationnetwork.io',
            l1: 'https://l1-lb-mainnet.constellationnetwork.io'
        }
    };

    constructor(networkType: string = 'TESTNET') {
        this.networkType = networkType.toUpperCase();
        if (!this.NETWORKS[this.networkType]) {
            throw new Error('Invalid network type. Must be TESTNET or MAINNET');
        }
    }

    public async initialize(privateKey: string): Promise<void> {
        this.dagPrivateKey = privateKey;
        await this.connect();
    }

    private async connect(): Promise<void> {
        if (this.isConnected) return;
    
        try {
            if (!this.dagPrivateKey) {
                throw new Error('DAG Private key not set. Call initialize() first');
            }
    
            const urls = this.NETWORKS[this.networkType];
    
            // Create and store account instance
            this.account = dag4.createAccount();
    
            // Connect to network
            this.account.connect({
                networkVersion: process.env.NETWORK_VERSION || '2.0',
                l0Url: urls.l0,
                l1Url: urls.l1,
                testnet: this.networkType !== 'MAINNET'
            });
    
            // Login with private key
            this.account.loginPrivateKey(this.dagPrivateKey);
            this.walletAddress = this.account.address;
            
            this.isConnected = true;
            
            logger.info(`Connected to DAG network: ${this.networkType} with wallet: ${this.walletAddress}`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error(`Failed to connect to DAG network: ${errorMessage}`);
            throw error;
        }
    }

    private async generateProof(message: any): Promise<{
        id: string;
        signature: string;
    }> {
        try {
            if (!this.dagPrivateKey) {
                throw new Error('DAG Private key not set. Call initialize() first');
            }
    
            const networkVersion = process.env.NETWORK_VERSION || '2.0';
            const isTestnet = process.env.TESTNET === 'true';
    
            // Connect to network
            dag4.account.connect({
                networkVersion,
                testnet: isTestnet
            });
    
            // Login with private key
            dag4.account.loginPrivateKey(this.dagPrivateKey);
    
            const encodedMessage = Buffer.from(JSON.stringify(message)).toString('base64');
            const signature = await dag4.keyStore.dataSign(this.dagPrivateKey, encodedMessage);
            
            const publicKey = dag4.account.publicKey;
            if (!publicKey) {
                throw new Error('Public key not available');
            }
    
            const uncompressedPublicKey = publicKey.length === 128 ? '04' + publicKey : publicKey;
            
            return {
                id: uncompressedPublicKey.substring(2),
                signature
            };
        } catch (error) {
            console.error('Error generating proof:', error);
            throw error;
        } finally {
            try {
                await dag4.account.logout();
            } catch (logoutError) {
                console.warn('Error during logout:', logoutError);
            }
        }
    }
    

    private validateConfig(config: MetagraphConfig): void {
        if (!config.name) {
            throw new Error('Metagraph name is required');
        }

        if (!Array.isArray(config.initialValidators) || config.initialValidators.length === 0) {
            throw new Error('At least one initial validator is required');
        }

        // Validate validator addresses
        config.initialValidators.forEach((validator, index) => {
            if (typeof validator !== 'string' || validator.length < 32) {
                throw new Error(`Invalid validator address at index ${index}`);
            }
        });
    }

    // In MetagraphCreator class
    public async createDefaultSessionMetagraph(initialValidator: string) {
    const defaultMetagraphConfig = {
        name: 'Default Session Management',
        description: 'Default metagraph for managing application sessions',
        initialValidators: [initialValidator],
        metagraphId: `default_sessions_${Date.now()}`
    };

    return this.createMetagraph(defaultMetagraphConfig);
}

    public async createMetagraph(config: MetagraphConfig): Promise<MetagraphResponse> {
        try {
            // Validate configuration
            this.validateConfig(config);

            // Ensure connection
            await this.connect();

            const metagraphId = config.metagraphId || 
                `mg_${Date.now()}_${config.name.toLowerCase().replace(/\s+/g, '_')}`;

            logger.info(`Creating metagraph: ${config.name} with ID: ${metagraphId}`);

            // Prepare metagraph creation message
            const message = {
                CreateMetagraph: {
                    name: config.name,
                    description: config.description || '',
                    initialValidators: config.initialValidators,
                    metagraphId: metagraphId,
                    creator: this.walletAddress
                }
            };

            // Generate proof
            const proof = await this.generateProof(message);

            // Prepare transaction body
            const transactionBody = {
                value: { ...message },
                proofs: [proof]
            };

            // Get network URLs
            const urls = config.customEndpoints || this.NETWORKS[this.networkType];

            // Send transaction
            const response = await axios.post(
                `${urls.l1}/data`,
                transactionBody,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Network-Type': this.networkType,
                        'X-Wallet-Address': this.walletAddress
                    },
                    timeout: 30000
                }
            );

            logger.info(`Metagraph created successfully. ID: ${metagraphId}, Transaction: ${response.data?.id}`);

            return {
                metagraphId: metagraphId,
                transactionId: response.data?.id,
                status: 'success'
            };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error(`Failed to create metagraph: ${errorMessage}`);

            return {
                metagraphId: '',
                transactionId: '',
                status: 'error',
                message: errorMessage
            };
        }
    }

    public async getMetagraphStatus(metagraphId: string): Promise<any> {
        try {
            if (!this.isConnected) {
                await this.connect();
            }

            const urls = this.NETWORKS[this.networkType];
            const response = await axios.get(`${urls.l0}/metagraph/${metagraphId}/info`);
            
            return response.data;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error(`Failed to get metagraph status for ${metagraphId}: ${errorMessage}`);
            throw error;
        }
    }

    public disconnect(): void {
        if (this.account) {
            this.account.logout?.();
            this.account = null;
        }
        this.isConnected = false;
        this.walletAddress = null;
        logger.info('Disconnected from DAG network');
    }
}