// src/types/network.ts
import { Connection } from '@solana/web3.js';
import Web3 from 'web3';

// Network Type Definitions
export type NetworkType = 
  | 'eth' 
  | 'btc' 
  | 'btctestnet' 
  | 'sol' 
  | 'base' 
  | 'dag' 
  | 'xrp' 
  | 'xrpmainnet' 
  | 'xrptestnet';

// Base Network Interface
export interface INetwork {
  readonly isUtxoBased: boolean;
  fetchBalance(address: string): Promise<number>;
  calculateBalance(data: any): number;
  initialize(): Promise<void>;
  disconnect(): Promise<void>;
}

// UTXO Network Interface
export interface IUTXONetwork extends INetwork {
  readonly isUtxoBased: true;
  getUtxos(): UTXO[];
}

// Web3 Network Interface
export interface Web3Network extends INetwork {
  readonly isUtxoBased: false;
  getWeb3(): Web3;
}

// Solana Network Interface
export interface SolanaNetwork extends INetwork {
  readonly isUtxoBased: false;
  getConnection(): Connection;
}

// Fee Structure
export interface FeeRates {
  readonly low: number;
  readonly medium: number;
  readonly high: number;
}

// UTXO Type
export interface UTXO {
  readonly txid: string;
  readonly vout: number;
  readonly value: number;
  readonly status?: {
    readonly confirmed: boolean;
    readonly block_height?: number;
    readonly block_hash?: string;
    readonly block_time?: number;
  };
}

// Network Configuration
export interface NetworkConfig {
  readonly rpcUrl?: string;
  readonly chainId?: number;
  readonly isTestnet?: boolean;
  readonly explorerUrl?: string;
}

// Network Status
export interface NetworkStatus {
  readonly isConnected: boolean;
  readonly latestBlock?: number;
  readonly peerCount?: number;
  readonly syncStatus?: 'synced' | 'syncing' | 'not_synced';
}

// Network Connection Options
export interface NetworkConnectionOptions {
  readonly timeout?: number;
  readonly retries?: number;
  readonly headers?: Record<string, string>;
}