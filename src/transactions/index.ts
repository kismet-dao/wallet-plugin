// src/transactions/index.ts

// BTC Transaction Exports
export { sendBTCTransaction } from './BTC/SendBTC';
export { CreatePsbt } from './BTC/CreatePsbt';
export { broadcastTransaction } from './BTC/BroadcastTransaction';

// DAG Transaction Exports
export { sendDAGTransaction } from './DAG/SendDAG';

// ETH Transaction Exports
export { sendETHTransaction } from './ETH/SendETH';

// Export types and interfaces
export type { 
  TransactionDetails,
  ETHTransactionObject 
} from '../types/transaction';