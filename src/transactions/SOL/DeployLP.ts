// src/transactions/SOL/CreateLiquidityPool.ts
import { Connection, Keypair, PublicKey, sendAndConfirmTransaction, Transaction } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Liquidity, MAINNET_PROGRAM_ID } from "@raydium-io/raydium-sdk";
import BN from "bn.js";
import bs58 from "bs58";

export async function createLiquidityPool(
  connection: Connection,
  privateKey: string,
  tokenMintA: PublicKey,
  tokenMintB: PublicKey,
  initialPrice: number,
  marketAddress: PublicKey,
  marketProgramId: PublicKey
): Promise<void> {
  const decodedPrivateKey = bs58.decode(privateKey);
  if (decodedPrivateKey.length !== 64) {
    throw new Error(`Invalid private key length: ${decodedPrivateKey.length}`);
  }
  const owner = Keypair.fromSecretKey(decodedPrivateKey);

  const baseAmount = new BN(1000000); // Example base token amount
  const quoteAmount = new BN(1000000); // Example quote token amount
  const startTime = new BN(Math.floor(Date.now() / 1000)); // Current timestamp

  const { address, innerTransactions } = await Liquidity.makeCreatePoolV4InstructionV2Simple({
    connection,
    programId: MAINNET_PROGRAM_ID.AmmV4,
    marketInfo: {
      marketId: marketAddress,
      programId: marketProgramId,
    },
    baseMintInfo: {
      mint: tokenMintA,
      decimals: 6, // Example decimal value for base token
    },
    quoteMintInfo: {
      mint: tokenMintB,
      decimals: 6, // Example decimal value for quote token
    },
    baseAmount,
    quoteAmount,
    startTime,
    ownerInfo: {
      feePayer: owner.publicKey,
      wallet: owner.publicKey,
      tokenAccounts: [], // Provide the necessary token accounts
    },
    associatedOnly: true,
    checkCreateATAOwner: true,
    makeTxVersion: 0, // Specify the transaction version (0 for legacy, 1 for v0)
    feeDestinationId: owner.publicKey, // Specify the fee destination account
  });

  const tx = new Transaction().add(...innerTransactions[0].instructions);
  const signature = await sendAndConfirmTransaction(connection, tx, [owner]);

  console.log(`Liquidity pool created: https://solana.fm/tx/${signature}?cluster=devnet-solana`);
}