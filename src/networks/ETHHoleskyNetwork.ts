// src/networks/ETHHoleskyNetwork.ts
import { Network } from './Network';
import Web3 from 'web3';
import { Web3Network } from '../types/network';

export class ETHHoleskyNetwork extends Network implements Web3Network {
  public readonly isUtxoBased = false as const;
  private web3: Web3;

  constructor(rpcUrl: string) {
    super();
    this.web3 = new Web3(rpcUrl);
  }

  async fetchBalance(address: string): Promise<number> {
    try {
      const balance = await this.web3.eth.getBalance(address);
      const balanceInEther = this.web3.utils.fromWei(balance, 'ether');
      return parseFloat(balanceInEther);
    } catch (error) {
      console.error('Error fetching ETH balance:', error);
      throw error;
    }
  }

  getWeb3(): Web3 {
    return this.web3;
  }

  calculateBalance(data: string): number {
    return parseFloat(data);
  }

  async disconnect(): Promise<void> {
    // No specific disconnection logic required
  }

  async initialize(): Promise<void> {
    // No specific initialization logic required
  }
}