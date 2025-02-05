// src/networks/SOLNetwork.ts
import { Network } from './Network';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { SolanaNetwork } from '../types/network';

export class SOLNetwork extends Network implements SolanaNetwork {
  public readonly isUtxoBased = false as const;
  private connection: Connection;

  constructor(rpcUrl: string) {
    super();
    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  async fetchBalance(address: string): Promise<number> {
    try {
      const publicKey = new PublicKey(address);
      const balance = await this.connection.getBalance(publicKey);
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      console.error('Error fetching SOL balance:', error);
      throw error;
    }
  }

  getConnection(): Connection {
    return this.connection;
  }

  calculateBalance(data: number): number {
    return data / LAMPORTS_PER_SOL;
  }

  async disconnect(): Promise<void> {
    // No specific disconnection logic required
  }
  
  async initialize(): Promise<void> {
    // No specific initialization logic required
  }
}