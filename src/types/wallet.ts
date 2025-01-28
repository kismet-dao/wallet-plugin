// Supported blockchain network keys
export type NetworkKey = 'eth' | 'btc' | 'btctestnet' | 'base' | 'sol' | 'dag' | 'xrp' | 'xrptestnet';

// Interface for a basic wallet address with public key
export interface WalletAddress {
  address: string;
  publicKey: string;
}

// Detailed wallet keys including private key
export interface WalletKeys {
  address: string;
  privateKey: string;
  publicKey: string;
  bondingCurveAddress?: string; // Optional bonding curve address
}

export interface XrpWalletKeys {
  mainnet: {
      address: string;
      privateKey: string;
      publicKey: string;
  };
  testnet: {
      address: string;
      privateKey: string;
      publicKey: string;
  };
  address: string;        // Add these three lines to match WalletKeys
  privateKey: string;
  publicKey: string;
}

// Comprehensive wallet data for multiple networks
export interface WalletData {
  eth: WalletKeys;
  btc: WalletKeys;
  btctestnet: WalletKeys;
  base: WalletKeys;
  sol: WalletKeys;
  dag: WalletKeys;
  xrp: XrpWalletKeys;
  mnemonic: string;
  createdAt: string;
}

// Public wallet data (without private keys)
export interface PublicWalletData {
  eth: WalletAddress;
  btc: WalletAddress;
  btctestnet: WalletAddress;
  base: WalletAddress;
  sol: WalletAddress;
  dag: WalletAddress;
  xrp: {
    address: string;
    mainnet: WalletAddress;
    testnet: WalletAddress;
  };
  createdAt: string;
}

// API response structure for wallet creation
export interface APIWalletResponse {
  ethereum: {
    address: string;
    privateKey: string;
    publicKey: string;
    mnemonic: string;
  };
  bitcoin: {
    btcMainNetAddress: string;
    btcMainNetPrivateKey: string;
    btcTestNetAddress: string;
    btcTestNetPrivateKey: string;
    publicKey: string;
  };
  solana: {
    solAddress: string;
    solPrivateKey: string;
    solPublicKey: string;
  };
  ripple?: { // Optional since it's generated client-side
    address: string;
    privateKey: string;
    publicKey: string;
  };
}