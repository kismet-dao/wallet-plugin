import { 
  Keypair, 
  PublicKey, 
  SystemProgram, 
  Transaction, 
  Connection,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import bs58 from 'bs58';
import { TransactionDetails } from '../../types/transaction';
import { pollForConfirmation } from '../../utils/pollingUtils';

export const sendSOLTransaction = async (
  transactionDetails: TransactionDetails,
  privateKey: string,
  solConnection: Connection
): Promise<string> => {
  try {
    const decodedPrivateKey = bs58.decode(privateKey);
    if (decodedPrivateKey.length !== 64) {
      throw new Error(`Invalid private key length: ${decodedPrivateKey.length}`);
    }

    const senderKeypair = Keypair.fromSecretKey(decodedPrivateKey);
    const recipientPubkey = new PublicKey(transactionDetails.recipient);
    
    // Check if recipient account exists and get minimum rent
    const recipientAccount = await solConnection.getAccountInfo(recipientPubkey);
    const minimumRent = await solConnection.getMinimumBalanceForRentExemption(0);
    
    // Calculate total amount needed (transfer amount + rent if account doesn't exist)
    const transferAmountLamports = Math.round(transactionDetails.amount * LAMPORTS_PER_SOL);
    const totalAmount = !recipientAccount ? transferAmountLamports + minimumRent : transferAmountLamports;

    // Check sender has sufficient balance
    const senderBalance = await solConnection.getBalance(senderKeypair.publicKey);
    if (senderBalance < totalAmount) {
      throw new Error(`Insufficient balance. Need ${totalAmount / LAMPORTS_PER_SOL} SOL (including rent), but have ${senderBalance / LAMPORTS_PER_SOL} SOL`);
    }

    const transaction = new Transaction();
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: senderKeypair.publicKey,
        toPubkey: recipientPubkey,
        lamports: totalAmount,
      })
    );

    // Get recent blockhash and sign transaction
    const { blockhash } = await solConnection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = senderKeypair.publicKey;

    const signature = await solConnection.sendTransaction(transaction, [senderKeypair]);

    // Wait for confirmation
    await pollForConfirmation(
      async () => {
        const status = await solConnection.getSignatureStatus(signature);
        return status?.value?.confirmationStatus || 'pending';
      }
    );

    return signature;
  } catch (error) {
    throw new Error(`Transaction failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};