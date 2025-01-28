// src/utils/explorerUtils.ts
import { NetworkType } from '../types/network';

export const getExplorerUrl = (network: NetworkType, txHash: string): string => {
  switch (network) {
    case 'eth':
      return `https://holesky.etherscan.io/tx/${txHash}`;
    case 'base':
      return `https://basescan.org/tx/${txHash}`;
    case 'btctestnet':
      return `https://mempool.space/testnet/tx/${txHash}`;
    case 'btc':
      return `https://mempool.space/tx/${txHash}`;
    case 'sol':
      return `https://explorer.solana.com/tx/${txHash}?cluster=devnet`;
    case 'dag':
      return `https://testnet.dagexplorer.io/transactions/${txHash}`;
      case 'xrp':
        return `https://livenet.xrpl.org/transactions/${txHash}`;
    default:
      return '';
  }
};
