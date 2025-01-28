// src/types/transaction.ts
export interface TransactionDetails {
    address: string;
    recipient: string;
    amount: number;
  }
  
  export interface ETHTransactionObject {
    from: string;
    to: string;
    value: string;
    gas: number | string;
    gasPrice: number | string;
    nonce: number | string;
    chainId: number;
  }