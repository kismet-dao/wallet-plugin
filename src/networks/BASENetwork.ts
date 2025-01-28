import { Network } from './Network';
import Web3 from 'web3';
import { Web3Network } from '../types/network';

export class BASENetwork extends Network implements Web3Network {
  private web3: Web3;
  private initialized: boolean = false;

  constructor(rpcUrl: string) {
    super();
    this.isUtxoBased = false;
    this.web3 = new Web3(rpcUrl);
  }

  async initialize(): Promise<void> {
    try {
      // Test connection by getting network ID
      await this.web3.eth.net.getId();
      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize BASE network: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async disconnect(): Promise<void> {
    try {
      const provider = this.web3.currentProvider;
      if (provider && typeof provider === 'object' && 'disconnect' in provider) {
        await (provider as any).disconnect();
      }
      this.initialized = false;
    } catch (error) {
      throw new Error(`Failed to disconnect from BASE network: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async fetchBalance(address: string): Promise<number> {
    try {
      const balance = await this.web3.eth.getBalance(address);
      const balanceInEther = this.web3.utils.fromWei(balance, 'ether');
      return parseFloat(balanceInEther);
    } catch (error) {
      console.error('Error fetching BASE balance:', error);
      throw error;
    }
  }

  getWeb3(): Web3 {
    return this.web3;
  }

  calculateBalance(data: string): number {
    return parseFloat(data);
  }
}