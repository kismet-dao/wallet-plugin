// src/transactions/DAG/SendDAG.ts
import { TransactionDetails } from '../../types/transaction';
import dotenv from 'dotenv';
import { dag4, Dag4Types } from '@stardust-collective/dag4';

// Load environment variables
dotenv.config();

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds
const MIN_FEE = 0.00000001; // Minimum fee for faster processing

export const sendDAGTransaction = async (
  transactionDetails: TransactionDetails,
  privateKey: string,
  feeLevel: 'low' | 'medium' | 'high' = 'medium'
): Promise<string> => {
  try {
    const networkVersion = process.env.NETWORK_VERSION || '2.0';
    const isTestnet = process.env.TESTNET === 'true';

    // Connect to network
    dag4.account.connect({
      networkVersion,
      testnet: isTestnet
    });

    // Login with private key
    dag4.account.loginPrivateKey(privateKey);

    // Check if we need to use a fee based on pending transactions
    let finalFee = 0;
    try {
      // First attempt with no fee
      const pendingTx = await dag4.account.transferDag(
        transactionDetails.recipient,
        transactionDetails.amount,
        finalFee,
        false // Disable auto fee estimation
      );
      return pendingTx.hash;
    } catch (error: any) {
      if (error.message && error.message.includes('TransactionLimited')) {
        // If transaction is limited, retry with minimum fee
        console.log('Transaction limited, retrying with minimum fee...');
        finalFee = MIN_FEE;
        
        // Retry with minimum fee
        const pendingTx = await dag4.account.transferDag(
          transactionDetails.recipient,
          transactionDetails.amount,
          finalFee,
          false
        );

        // Wait for transaction to be processed
        let retries = MAX_RETRIES;
        while (retries > 0) {
          try {
            await dag4.account.waitForCheckPointAccepted(pendingTx.hash);
            
            // Verify transaction in block explorer
            const confirmedTx = await dag4.network.getTransaction(pendingTx.hash);
            if (confirmedTx) {
              console.log('Transaction confirmed successfully');
              return pendingTx.hash;
            }
            
            break;
          } catch (retryError) {
            console.warn(`Retry attempt ${MAX_RETRIES - retries + 1} failed:`, retryError);
            retries--;
            
            if (retries === 0) {
              throw new Error(`Transaction failed after ${MAX_RETRIES} attempts`);
            }
            
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          }
        }
        
        return pendingTx.hash;
      }
      throw error;
    }

} catch (error: any) {
    // Check for insufficient balance error
    if (error.message && error.message.includes('InsufficientBalance')) {
      console.error('\nInsufficient balance for transaction.');
      console.log('\nTo get testnet DAG tokens, please use:');
      console.log('wallet faucet --network dag');
      throw new Error('Insufficient balance - use faucet to get testnet tokens');
    }

    console.error('Error sending DAG transaction:', error);
    throw error;
  } finally {
    try {
      await dag4.account.logout();
    } catch (error) {
      console.warn('Error during logout:', error);
    }
  }
};