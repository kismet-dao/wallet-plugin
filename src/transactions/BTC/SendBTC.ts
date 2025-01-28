import { GasFees } from '../../utils/gasFees';
import { CreatePsbt } from './CreatePsbt';
import { broadcastTransaction } from './BroadcastTransaction';
import { TransactionDetails, UTXO } from '../../types/bitcoin';
import { getNetworkInstance } from '../../networks';
import { isUTXONetwork } from '../../utils/typeGaurd';

export const sendBTCTransaction = async (
  transactionDetails: TransactionDetails,
  privateKey: string,
  publicKey: string,
  fee: 'low' | 'medium' | 'high'
): Promise<{ txHash: string; feeRate: number; totalFee: number }> => {
  try {
    const network = getNetworkInstance(transactionDetails.network);
    if (!isUTXONetwork(network)) {
      throw new Error('Selected network does not support UTXO operations');
    }

    console.log(`Fetching UTXOs for address: ${transactionDetails.address}`);
    await network.fetchBalance(transactionDetails.address);
    const utxos = network.getUtxos();

    if (!utxos || utxos.length === 0) {
      throw new Error(`No UTXOs found for address ${transactionDetails.address}. Balance may be 0 or network issue.`);
    }

    // Fix: Validate each UTXO has required properties without the incorrect vout check
    const validUtxos = utxos.filter((utxo): utxo is UTXO => {
      if (!utxo.txid || typeof utxo.vout !== 'number' || typeof utxo.value !== 'number') {
        console.warn('Invalid UTXO found:', utxo);
        return false;
      }
      return true;
    });

    if (validUtxos.length === 0) {
      throw new Error('No valid UTXOs available for transaction');
    }

    const totalAvailable = validUtxos.reduce((sum, utxo) => sum + utxo.value, 0);
    const amountInSatoshis = Math.round(transactionDetails.amount * 1e8);

    console.log(`Available balance: ${totalAvailable / 1e8} BTC`);
    console.log(`Amount to send: ${transactionDetails.amount} BTC`);

    if (totalAvailable < amountInSatoshis) {
      throw new Error(
        `Insufficient funds. Required: ${transactionDetails.amount} BTC, ` +
        `Available: ${totalAvailable / 1e8} BTC`
      );
    }

    const gasFees = new GasFees(transactionDetails.network);
    const fees = await gasFees.fetchGasFees();

    if (!fees) {
      throw new Error('Failed to fetch gas fees');
    }

    console.log('Creating transaction...');
    // Create a new transaction details object with the validated UTXOs
    const transactionWithUtxos: TransactionDetails = {
      ...transactionDetails,
      utxos: validUtxos
    };

    const { rawTxHex, feeRate, totalFee } = await CreatePsbt(
      transactionWithUtxos,
      privateKey,
      publicKey,
      fee,
      fees
    );

    console.log('Broadcasting transaction...');
    const txHash = await broadcastTransaction(rawTxHex, transactionDetails.network);

    return { txHash, feeRate, totalFee };
  } catch (error) {
    console.error('Error in sendBTCTransaction:', error);
    throw new Error(`Transaction failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};