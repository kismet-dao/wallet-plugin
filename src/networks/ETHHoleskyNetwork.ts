// src/networks/ETHHoleskyNetwork.ts
import { Network } from './Network';
import Web3 from 'web3';
import { Web3Network } from '../types/network';
import { NETWORK_DEFAULTS } from '../constants/networks';

export class ETHHoleskyNetwork extends Network implements Web3Network {
  private web3: Web3;

  constructor(rpcUrl: string) {
    super();
    this.isUtxoBased = false;
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

  // Provide an empty implementation for the disconnect method
  async disconnect(): Promise<void> {
    // No specific disconnection logic required for ETHHoleskyNetwork
  }

  async initialize(): Promise<void> {
    // No specific initialization logic required for this network
  }
}