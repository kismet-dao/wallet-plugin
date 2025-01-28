import { Network } from './Network';
import { IUTXONetwork, UTXO } from '../types/network';
import axios, { AxiosResponse } from 'axios';

export abstract class BTCNetworkBase extends Network implements IUTXONetwork {
  public isUtxoBased = true as const;
  protected utxos: UTXO[] = [];
  private initialized: boolean = false;

  protected abstract getEndpoints(): string[];
  protected abstract getNetworkName(): string;

  constructor() {
    super();
    this.isUtxoBased = true;
  }

  async initialize(): Promise<void> {
    try {
      // Test connection using genesis block address
      const genesisAddress = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';
      const endpoints = this.getEndpoints();
      
      // Try each endpoint until one works
      for (const endpoint of endpoints) {
        try {
          const url = endpoint.replace('{address}', genesisAddress);
          const response = await axios.get(url);
          
          if (response.status === 200) {
            this.initialized = true;
            console.log(`${this.getNetworkName()}: Successfully initialized with endpoint ${endpoint}`);
            return;
          }
        } catch (error) {
          console.warn(
            `${this.getNetworkName()}: Failed to initialize with endpoint ${endpoint}:`,
            error instanceof Error ? error.message : String(error)
          );
          continue;
        }
      }
      
      throw new Error('All endpoints failed initialization check');
    } catch (error) {
      this.initialized = false;
      throw new Error(
        `Failed to initialize ${this.getNetworkName()} network: ` +
        `${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async disconnect(): Promise<void> {
    try {
      // Clear cached UTXOs and reset state
      this.utxos = [];
      this.initialized = false;
      console.log(`${this.getNetworkName()}: Successfully disconnected`);
    } catch (error) {
      throw new Error(
        `Failed to disconnect from ${this.getNetworkName()} network: ` +
        `${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async fetchBalance(address: string): Promise<number> {
    if (!this.initialized) {
      throw new Error(`${this.getNetworkName()} network not initialized. Call initialize() first.`);
    }

    const endpoints = this.getEndpoints();
    let lastError: Error | null = null;

    for (const url of endpoints) {
      try {
        const finalUrl = url.replace('{address}', address);
        const response: AxiosResponse<UTXO[]> = await axios.get(finalUrl);
        
        if (response.status === 200 && Array.isArray(response.data)) {
          console.log(`${this.getNetworkName()}: API response data:`, response.data);
          
          // Filter only confirmed UTXOs
          const confirmedUtxos = response.data.filter(utxo => 
            utxo.status?.confirmed && 
            utxo.value && 
            typeof utxo.vout === 'number' &&
            utxo.txid
          );

          if (confirmedUtxos.length === 0) {
            console.warn('No confirmed UTXOs found');
            continue;
          }

          // Verify UTXOs are still spendable
          const spendableUtxos = await this.verifySpendableUtxos(confirmedUtxos);
          
          if (spendableUtxos.length > 0) {
            this.setUtxos(spendableUtxos);
            return this.calculateBalance(spendableUtxos);
          } else {
            console.warn('No spendable UTXOs found, trying next endpoint');
            continue;
          }
        }
      } catch (error) {
        lastError = error as Error;
        console.warn(
          `${this.getNetworkName()}: Failed to fetch from ${url}:`,
          error instanceof Error ? error.message : String(error)
        );
      }
    }

    throw new Error(
      `No spendable UTXOs found for address ${address}. ` +
      `Please check if you have received any transactions or if they are confirmed.`
    );
  }

  protected async verifySpendableUtxos(utxos: UTXO[]): Promise<UTXO[]> {
    const spendableUtxos: UTXO[] = [];
    const isTestnet = this.getNetworkName() === 'BTCTestnet';
    
    for (const utxo of utxos) {
      try {
        // Use blockstream.info API for verification
        const blockstreamUrl = isTestnet
          ? `https://blockstream.info/testnet/api/tx/${utxo.txid}/outspends`
          : `https://blockstream.info/api/tx/${utxo.txid}/outspends`;
        
        const response = await axios.get(blockstreamUrl);
        
        if (response.status === 200 && Array.isArray(response.data)) {
          // Check if the specific output (vout) is unspent
          const outputStatus = response.data[utxo.vout];
          if (outputStatus && !outputStatus.spent) {
            spendableUtxos.push(utxo);
            console.log(`Verified UTXO ${utxo.txid}:${utxo.vout} is spendable`);
          } else {
            console.warn(`UTXO ${utxo.txid}:${utxo.vout} has been spent`);
          }
        }
      } catch (error) {
        console.warn(
          `Failed to verify UTXO ${utxo.txid}:${utxo.vout}:`,
          error instanceof Error ? error.message : String(error)
        );
      }
    }

    return spendableUtxos;
  }

  calculateBalance(data: UTXO[]): number {
    if (!Array.isArray(data)) {
      console.error('Expected data to be an array');
      return 0;
    }
    return data.reduce((acc, utxo) => acc + utxo.value, 0);
  }

  protected setUtxos(data: UTXO[]): void {
    if (!Array.isArray(data)) {
      console.error('Expected data to be an array');
      return;
    }
    this.utxos = data;
    console.log(`${this.getNetworkName()}: UTXOs set:`, this.utxos);
  }

  getUtxos(): UTXO[] {
    return this.utxos;
  }
}