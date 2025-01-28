// src/constants/network.ts
export const NETWORK_DEFAULTS = {
  SOLANA_RPC_URL: 'https://api.mainnet-beta.solana.com',
  ETH_RPC_URL: 'https://rpc.holesky.ethpandaops.io',
  BASE_RPC_URL: 'https://mainnet.base.org',
  API_URL: 'http://localhost:8081',
  DAG_L0_URL: 'https://l0-lb-testnet.constellationnetwork.io',
  DAG_L1_URL: 'https://l1-lb-testnet.constellationnetwork.io',
  XRP_RPC_URL: 'wss://xrplcluster.com',
  XRP_TESTNET_RPC_URL: 'wss://testnet.xrpl-labs.com/'
} as const;
  
  