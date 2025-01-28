// src/transactions/BTC/CreatePsbt.ts
import * as btc from 'micro-btc-signer';
import { base64 } from '@scure/base';
import { 
  NetworkConfig, 
  TransactionDetails, 
  GasFees, 
  UTXO 
} from '../../types/bitcoin';
import { 
  BTC_TO_SATOSHI, 
  bitcoinMainnet, 
  bitcoinTestnet 
} from '../../constants/bitcoin';

const hexStringToUint8Array = (hexString: string): Uint8Array => {
  const result = new Uint8Array(Math.ceil(hexString.length / 2));
  for (let i = 0; i < hexString.length; i += 2) {
    result[i / 2] = parseInt(hexString.substr(i, 2), 16);
  }
  return result;
};

const wifToPrivateKey = (wif: string, network: 'btc' | 'btctestnet'): Uint8Array => {
  let decoded: Uint8Array;
  try {
    const networkConfig = network === 'btc' ? bitcoinMainnet : bitcoinTestnet;
    decoded = btc.WIF(networkConfig).decode(wif);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Wrong WIF prefix')) {
      console.warn('WIF decode failed, trying alternate network');
      const alternateNetworkConfig = network === 'btc' ? bitcoinTestnet : bitcoinMainnet;
      try {
        decoded = btc.WIF(alternateNetworkConfig).decode(wif);
      } catch (innerError) {
        throw new Error(`Failed to decode WIF for both networks: ${error.message}`);
      }
    } else {
      throw new Error(`Failed to decode WIF: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return decoded;
};

export const CreatePsbt = async (
  transactionDetails: TransactionDetails,
  privateKey: string,
  publicKey: string,
  selectedGasFee: keyof GasFees,
  gasFees: GasFees | null
): Promise<{ rawTxHex: string, feeRate: number, totalFee: number }> => {
  try {
    const { network, utxos, recipient, amount, address } = transactionDetails;

    // Validate UTXOs early
    if (!utxos || utxos.length === 0 || utxos.some(utxo => !utxo.value || utxo.value <= 0)) {
      console.error('UTXO validation failed. UTXOs:', utxos);
      throw new Error('No valid UTXOs available for the transaction');
    }

    console.log('Creating transaction with UTXOs:', utxos);
    console.log('Transaction details:', {
      network,
      recipient,
      amount,
      selectedGasFee,
      gasFees
    });

    const networkConfig = network === 'btc' ? bitcoinMainnet : bitcoinTestnet;
    const publicKeyUint8Array = hexStringToUint8Array(publicKey);
    const p2wpkh = btc.p2wpkh(publicKeyUint8Array, networkConfig);
    const tx = new btc.Transaction();

    let totalInputAmount = BigInt(0);
    utxos.forEach((utxo) => {
      if (!utxo.value) {
        console.error('Invalid UTXO:', utxo);
        throw new Error('Invalid UTXO: missing value');
      }
      totalInputAmount += BigInt(utxo.value);
      tx.addInput({
        txid: utxo.txid,
        index: utxo.vout,
        witnessUtxo: {
          script: p2wpkh.script,
          amount: BigInt(utxo.value),
        },
        redeemScript: p2wpkh.redeemScript,
      });
    });

    const defaultGasFees: GasFees = { low: 1, medium: 2, high: 5 };
    const fees = gasFees || defaultGasFees;

    const estimatedTransactionSize = 227;
    const feeRate = fees[selectedGasFee];
    let estimatedFee = BigInt(Math.max(feeRate, 1)) * BigInt(estimatedTransactionSize);

    if (estimatedFee < BigInt(networkConfig.minimumFee)) {
      estimatedFee = BigInt(networkConfig.minimumFee);
    }

    console.log('Fee calculation:', {
      feeRate,
      estimatedSize: estimatedTransactionSize,
      estimatedFee: estimatedFee.toString()
    });

    const amountInSatoshis = BigInt(Math.round(amount * BTC_TO_SATOSHI));
    const totalAmountToSend = amountInSatoshis + estimatedFee;

    console.log('Amount validation:', {
      totalInputAmount: totalInputAmount.toString(), 
      amountToSend: amountInSatoshis.toString(),
      fee: estimatedFee.toString(),
      totalRequired: totalAmountToSend.toString()
    });

    if (totalInputAmount < totalAmountToSend) {
      throw new Error(
        `Insufficient funds. Required: ${totalAmountToSend.toString()} satoshis, ` +
        `Available: ${totalInputAmount.toString()} satoshis`  
      );
    }

    tx.addOutputAddress(recipient, amountInSatoshis, networkConfig);
    const changeAmount = totalInputAmount - totalAmountToSend;

    if (changeAmount > BigInt(networkConfig.dustThreshold)) {
      console.log(`Adding change output: ${changeAmount.toString()} satoshis`);
      tx.addOutputAddress(address, changeAmount, networkConfig);
    } else {
      console.log(`Change amount (${changeAmount.toString()}) below dust threshold, skipping`);
    }

    const privateKeyUint8Array = wifToPrivateKey(privateKey, network);
    for (let i = 0; i < utxos.length; i++) {
      tx.signIdx(privateKeyUint8Array, i);
    }

    tx.finalize();
    console.log('Transaction created successfully');

    const totalFee = Number(estimatedFee);
  
    return { rawTxHex: tx.hex, feeRate, totalFee };
  } catch (error) {
    console.error('Error in CreatePsbt:', error);
    throw new Error(`Failed to create PSBT: ${error instanceof Error ? error.message : String(error)}`);
  }
};