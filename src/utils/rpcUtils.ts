// src/utils/rpcUtils.ts
import { NETWORK_DEFAULTS } from '../constants/networks';

export const getRPCUrl = (network: 'SOLANA' | 'ETH' | 'BASE' | 'DAG' | 'XRP' | 'XRPTESTNET'): string => {
  switch (network) {
    case 'SOLANA':
      return process.env.SOLANA_RPC_URL || NETWORK_DEFAULTS.SOLANA_RPC_URL;
    case 'ETH':
      return process.env.ETH_RPC_URL || NETWORK_DEFAULTS.ETH_RPC_URL;
    case 'BASE':
      return process.env.BASE_RPC_URL || NETWORK_DEFAULTS.BASE_RPC_URL;
    case 'DAG':
      return process.env.DAG_L0_URL || NETWORK_DEFAULTS.DAG_L0_URL;
    case 'XRP':
      return process.env.XRP_RPC_URL || NETWORK_DEFAULTS.XRP_RPC_URL;
    case 'XRPTESTNET':
      return process.env.XRP_TESTNET_RPC_URL || NETWORK_DEFAULTS.XRP_TESTNET_RPC_URL;
    default:
      throw new Error(`Unsupported network: ${network}`);
  }
};