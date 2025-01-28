import { Cluster } from '@solana/web3.js';

export function getSolanaCluster(network: string): Cluster {
  switch (network) {
    case 'mainnet':
    case 'main':
      return 'mainnet-beta';
    case 'test':
    case 'testnet':
      return 'testnet';
    case 'dev':
    case 'devnet':
    default:
      return 'devnet';
  }
}