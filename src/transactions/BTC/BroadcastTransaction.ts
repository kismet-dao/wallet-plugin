// src/transactions/BTC/BroadcastTransaction.ts
import axios, { AxiosError, AxiosResponse } from 'axios';

export const broadcastTransaction = async (
  txHex: string, 
  network: 'btc' | 'btctestnet'
): Promise<string> => {
  const endpoints = network === 'btc'
    ? [
        'https://mempool.space/api/tx',
        'https://blockstream.info/api/tx'
      ]
    : [
        'https://mempool.space/testnet4/api/tx',
      ];

  const contentTypes = ['text/plain', 'application/json'] as const;
  let lastError: Error | null = null;
  let lastResponseData: any = null;
  
  for (const baseUrl of endpoints) {
    for (const contentType of contentTypes) {
      try {
        console.log(`Attempting broadcast to ${baseUrl} with ${contentType}`);
        
        const data = contentType === 'application/json' ? { txHex } : txHex;
        const response = await axios.post(baseUrl, data, {
          headers: { 'Content-Type': contentType },
          timeout: 30000
        });

        if (response.status === 200) {
          const txId = typeof response.data === 'string'
            ? response.data
            : response.data.txid || JSON.stringify(response.data);
          
          console.log(`Transaction broadcast successful on ${baseUrl}`);
          return txId;
        }
      } catch (error) {
        const axiosError = error as AxiosError;
        lastError = error as Error;
        lastResponseData = axiosError.response?.data;
        
        console.warn(
          `Failed for ${baseUrl} with ${contentType}:`,
          axiosError.response?.data || axiosError.message
        );
        
        if (axiosError.response?.status === 400) {
          const errorMsg = typeof lastResponseData === 'string' 
            ? lastResponseData 
            : JSON.stringify(lastResponseData);
          throw new Error(`Invalid transaction: ${errorMsg}`);
        }
        continue;
      }
    }
  }
  
  throw new Error(
    `Failed to broadcast transaction: ${
      lastResponseData 
        ? JSON.stringify(lastResponseData) 
        : lastError?.message || 'Unknown error'
    }`
  );
};