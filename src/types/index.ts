// src/types/index.ts

// Network-related types
export type { 
    NetworkType,
    NetworkConfig,
    INetwork,
    IUTXONetwork,
    Web3Network,
    SolanaNetwork,
    FeeRates,
    UTXO 
  } from './network';
  
  // Bitcoin-specific types
  export type {
    NetworkConfig as BitcoinNetworkConfig,
    UTXO as BitcoinUTXO,
    TransactionInput,
    TransactionDetails as BTCTransactionDetails,
    GasFees as BitcoinGasFees
  } from './bitcoin';
  
  // Transaction-related types
  export type {
    TransactionDetails,
    ETHTransactionObject
  } from './transaction';
  
  // Wallet-related types
  export type {
    NetworkKey,
    WalletAddress,
    WalletKeys,
    XrpWalletKeys,
    WalletData,
    PublicWalletData,
    APIWalletResponse
  } from './wallet';
  
  // Re-export common types with namespacing
  export * as NetworkTypes from './network';
  export * as BitcoinTypes from './bitcoin';
  export * as TransactionTypes from './transaction';
  export * as WalletTypes from './wallet';