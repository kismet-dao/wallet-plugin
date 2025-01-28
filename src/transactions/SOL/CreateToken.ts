import {
  Connection,
  Keypair,
  SystemProgram,
  Transaction,
  clusterApiUrl,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  ExtensionType,
  TOKEN_2022_PROGRAM_ID,
  createInitializeMintInstruction,
  getMintLen,
  createInitializeMetadataPointerInstruction,
  getMint,
  getMetadataPointerState,
  getTokenMetadata,
  TYPE_SIZE,
  LENGTH_SIZE,
} from "@solana/spl-token";
import {
  createInitializeInstruction,
  createUpdateFieldInstruction,
  pack,
  TokenMetadata,
} from "@solana/spl-token-metadata";
import bs58 from "bs58";

export interface TokenDetails {
  name: string;
  symbol: string;
  decimals: number;
  initialSupply: number;
}

export async function createSolanaToken(
  connection: Connection,
  privateKey: string,
  tokenDetails: TokenDetails
): Promise<string> {
  const decodedPrivateKey = bs58.decode(privateKey);
  if (decodedPrivateKey.length !== 64) {
    throw new Error(`Invalid private key length: ${decodedPrivateKey.length}`);
  }
  const payer = Keypair.fromSecretKey(decodedPrivateKey);
  const mintKeypair = Keypair.generate();
  const mint = mintKeypair.publicKey;

  const metaData: TokenMetadata = {
    updateAuthority: payer.publicKey,
    mint: mint,
    name: tokenDetails.name,
    symbol: tokenDetails.symbol,
    uri: "",
    additionalMetadata: [],
  };

  const metadataExtension = TYPE_SIZE + LENGTH_SIZE;
  const metadataLen = pack(metaData).length;

  const mintLen = getMintLen([ExtensionType.MetadataPointer]);
  const lamports = await connection.getMinimumBalanceForRentExemption(
    mintLen + metadataExtension + metadataLen,
  );

  const createAccountInstruction = SystemProgram.createAccount({
    fromPubkey: payer.publicKey,
    newAccountPubkey: mint,
    space: mintLen,
    lamports,
    programId: TOKEN_2022_PROGRAM_ID,
  });

  const initializeMetadataPointerInstruction =
    createInitializeMetadataPointerInstruction(
      mint,
      payer.publicKey,
      mint,
      TOKEN_2022_PROGRAM_ID,
    );

  const initializeMintInstruction = createInitializeMintInstruction(
    mint,
    tokenDetails.decimals,
    payer.publicKey,
    null,
    TOKEN_2022_PROGRAM_ID,
  );

  const initializeMetadataInstruction = createInitializeInstruction({
    programId: TOKEN_2022_PROGRAM_ID,
    metadata: mint,
    updateAuthority: payer.publicKey,
    mint: mint,
    mintAuthority: payer.publicKey,
    name: metaData.name,
    symbol: metaData.symbol,
    uri: metaData.uri,
  });

  let transaction = new Transaction().add(
    createAccountInstruction,
    initializeMetadataPointerInstruction,
    initializeMintInstruction,
    initializeMetadataInstruction,
  );

  let transactionSignature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [payer, mintKeypair],
  );

  console.log(
    "\nCreate Mint Account:",
    `https://solana.fm/tx/${transactionSignature}?cluster=devnet-solana`,
  );

  const mintInfo = await getMint(
    connection,
    mint,
    "confirmed",
    TOKEN_2022_PROGRAM_ID,
  );

  const metadataPointer = getMetadataPointerState(mintInfo);
  console.log("\nMetadata Pointer:", JSON.stringify(metadataPointer, null, 2));

  const metadata = await getTokenMetadata(
    connection,
    mint,
  );
  console.log("\nMetadata:", JSON.stringify(metadata, null, 2));

  return mint.toString();
}