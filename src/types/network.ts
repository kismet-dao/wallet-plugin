// src/types/network.ts
import { Connection } from '@solana/web3.js';
import Web3 from 'web3';


export interface Web3Network {
  getWeb3(): Web3;
}

export interface SolanaNetwork {
  getConnection(): Connection;
}

export interface INetwork {
    isUtxoBased: boolean;
    fetchBalance(address: string): Promise<number>;
    calculateBalance(data: any): number;
    getConnection?(): Connection | null;
    getWeb3?(): Web3 | null;
    getUtxos?(): UTXO[];
  }
  
  export interface IUTXONetwork extends INetwork {
    isUtxoBased: true;
    getUtxos(): UTXO[];
  }
  
// In types/network.ts
export type NetworkType = 
  'eth' | 'btc' | 'btctestnet' | 'sol' | 'base' | 'dag' | 
  'xrp' | 'xrpmainnet' | 'xrptestnet';
  
// Common interfaces used across different networks
export interface FeeRates {
  low: number;
  medium: number;
  high: number;
}

export interface UTXO {
  txid: string;
  vout: number;
  value: number;
  status?: {
    confirmed: boolean;
    block_height?: number;
    block_hash?: string;
    block_time?: number;
  };
}
