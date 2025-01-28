// src/types/bitcoin.ts
export interface NetworkConfig {
    bech32: string;
    pubKeyHash: number;
    scriptHash: number;
    wif: number;
    minimumFee: number;
    dustThreshold: number;
    defaultSequence: number;
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
  
  export interface TransactionInput {
    txid: string;
    index: number;
    witnessUtxo: {
      script: Uint8Array;
      amount: bigint;
    };
    redeemScript: Uint8Array;
  }
  
  export interface TransactionDetails {
    network: 'btc' | 'btctestnet';
    address: string;
    recipient: string;
    amount: number;
    utxos?: UTXO[];
  }
  
  export interface GasFees {
    low: number;
    medium: number;
    high: number;
  }