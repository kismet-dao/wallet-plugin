import { Client, Wallet, Payment } from 'xrpl';
import { GasFees } from '../../utils/gasFees';
import { getRPCUrl } from '../../utils/rpcUtils';
import { logger } from '../../utils/logger';
import { dropsToXrp, xrpToDrops } from 'xrpl';

interface XRPTransactionParams {
  address: string;
  recipient: string;
  amount: number;
}

export async function sendXRPTransaction(
  params: XRPTransactionParams,
  seed: string,
  feeLevel: 'low' | 'medium' | 'high' = 'medium'
): Promise<string> {
  const client = new Client(getRPCUrl('XRP'));

  try {
    await client.connect();
    logger.info(`Connected to XRP node for transaction from ${params.address}`);

    // Create wallet from the seed
    let wallet: Wallet;
    try {
      console.log("Debug - Using seed format:", seed.substring(0, 10) + '...');

      // Create wallet directly from seed
      wallet = Wallet.fromSeed(seed);
      console.log("Debug - Created wallet address:", wallet.classicAddress);

      // Verify the wallet matches our address
      if (wallet.classicAddress !== params.address) {
        throw new Error(`Address mismatch. Expected: ${params.address}, Got: ${wallet.classicAddress}`);
      }
    } catch (error) {
      // Ensure the error is of type Error before throwing
      if (error instanceof Error) {
        throw new Error(`Failed to create wallet: ${error.message}`);
      } else {
        throw new Error(`Failed to create wallet: ${String(error)}`);
      }
    }

    // Get account info and verify account exists
    const accountInfo = await client.request({
      command: 'account_info',
      account: params.address,
      ledger_index: 'validated',
    });

    const balance = dropsToXrp(accountInfo.result.account_data.Balance);

    // Get latest validated ledger info
    const serverInfo = await client.request({
      command: 'server_info',
    });

    const latestLedger = serverInfo.result.info.validated_ledger?.seq;
    if (!latestLedger) {
      throw new Error('Could not get latest validated ledger sequence');
    }

    // Fetch and validate fees
    const gasFees = new GasFees('xrp');
    const fees = await gasFees.fetchGasFees();

    if (!fees) {
      throw new Error('Failed to fetch XRP fees');
    }

    const fee = fees[feeLevel];
    const amountInDrops = xrpToDrops(params.amount);
    const feeInDrops = xrpToDrops(fee);
    const totalNeeded = params.amount + fee;

    if (Number(balance) < totalNeeded) {
      throw new Error(`InsufficientBalance: Need ${totalNeeded} XRP but account only has ${balance} XRP`);
    }

    // Construct payment transaction
    const payment: Payment = {
      TransactionType: 'Payment',
      Account: params.address,
      Destination: params.recipient,
      Amount: amountInDrops,
      Fee: feeInDrops,
      LastLedgerSequence: latestLedger + 20, // Give ~2 minutes for transaction to validate
    };

    // Prepare and submit transaction
    const prepared = await client.autofill(payment);
    logger.info(`Transaction prepared for ${params.amount} XRP`);

    const signed = wallet.sign(prepared);
    const submitResult = await client.submitAndWait(signed.tx_blob);

    // Validate result
    if (submitResult.result.meta && typeof submitResult.result.meta === 'object') {
      const result = submitResult.result.meta.TransactionResult;

      if (result !== 'tesSUCCESS') {
        throw new Error(`Transaction failed with code: ${result}`);
      }

      if (!submitResult.result.validated) {
        throw new Error('Transaction was not validated by the network');
      }
    } else {
      throw new Error('Invalid transaction metadata received');
    }

    const txHash = submitResult.result.hash;
    logger.info(`XRP transaction successful - Hash: ${txHash}`);

    return txHash;
  } catch (error) {
    // Ensure the error is of type Error before logging
    if (error instanceof Error) {
      logger.error(`XRP transaction failed: ${error.message}`);
    } else {
      logger.error(`XRP transaction failed: ${String(error)}`);
    }
    throw error;
  } finally {
    await client.disconnect();
  }
}