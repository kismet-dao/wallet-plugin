import { 
  Connection, 
  Keypair, 
  PublicKey, 
  Transaction,
  Cluster
} from "@solana/web3.js";
import { AnchorProvider } from "@project-serum/anchor";
import { TokenListProvider, Strategy, TokenInfo } from '@solana/spl-token-registry';
import VaultImpl, { 
  VaultImplementation,
  VaultState,
  KEEPER_URL
} from "@mercurial-finance/vault-sdk";
import { BN } from "bn.js";
import bs58 from "bs58";

async function fetchTokenRegistry(): Promise<TokenInfo[]> {
  const tokenListProvider = new TokenListProvider();
  const tokenList = await tokenListProvider.resolve(Strategy.CDN);
  return tokenList.getList();
}

export async function createMeteoraLiquidityPool(
  connection: Connection,
  privateKey: string,
  tokenMintA: PublicKey,
  tokenMintB: PublicKey,
  initialLiquidity: number,
  options?: {
    cluster?: Cluster;
    affiliateId?: PublicKey;
  }
): Promise<void> {
  // Decode and validate private key
  const decodedPrivateKey = bs58.decode(privateKey);
  if (decodedPrivateKey.length !== 64) {
    throw new Error(`Invalid private key length: ${decodedPrivateKey.length}`);
  }
  
  // Create wallet from private key
  const wallet = Keypair.fromSecretKey(decodedPrivateKey);

  // Set up provider
  const provider = new AnchorProvider(
    connection,
    {
      publicKey: wallet.publicKey,
      signTransaction: async (tx: Transaction) => {
        tx.partialSign(wallet);
        return tx;
      },
      signAllTransactions: async (txs: Transaction[]) => {
        txs.forEach(tx => tx.partialSign(wallet));
        return txs;
      }
    },
    { commitment: 'confirmed' }
  );

  // Fetch token information from registry
  const tokenRegistry = await fetchTokenRegistry();
  const tokenAInfo = tokenRegistry.find((token: TokenInfo) => 
    token.address === tokenMintA.toString()
  );
  const tokenBInfo = tokenRegistry.find((token: TokenInfo) => 
    token.address === tokenMintB.toString()
  );

  if (!tokenAInfo || !tokenBInfo) {
    throw new Error('Token information not found in registry');
  }

  // Create vault instances for both tokens
  const vaultA = await VaultImpl.create(
    connection,
    new PublicKey(tokenAInfo.address),
    {
      cluster: options?.cluster || 'mainnet-beta',
      affiliateId: options?.affiliateId
    }
  );

  const vaultB = await VaultImpl.create(
    connection,
    new PublicKey(tokenBInfo.address),
    {
      cluster: options?.cluster || 'mainnet-beta',
      affiliateId: options?.affiliateId
    }
  );

  // Calculate deposit amounts based on initial liquidity
  const depositAmountA = new BN(initialLiquidity * 10 ** tokenAInfo.decimals);
  const depositAmountB = new BN(initialLiquidity * 10 ** tokenBInfo.decimals);

  // Create deposit transactions
  const depositTxA = await vaultA.deposit(
    wallet.publicKey, 
    depositAmountA
  );
  const depositTxB = await vaultB.deposit(
    wallet.publicKey, 
    depositAmountB
  );

  // Send and confirm transactions
  const depositResultA = await provider.sendAndConfirm(depositTxA);
  console.log(`Token A deposit confirmed: https://solana.fm/tx/${depositResultA}?cluster=${options?.cluster || 'mainnet-beta'}-solana`);

  const depositResultB = await provider.sendAndConfirm(depositTxB);
  console.log(`Token B deposit confirmed: https://solana.fm/tx/${depositResultB}?cluster=${options?.cluster || 'mainnet-beta'}-solana`);

  // Get vault details after deposits
  const vaultDetailsA = await getVaultDetails(vaultA, wallet.publicKey);
  const vaultDetailsB = await getVaultDetails(vaultB, wallet.publicKey);

  console.log('Pool created successfully');
  console.log('Vault A Details:', vaultDetailsA);
  console.log('Vault B Details:', vaultDetailsB);
}

async function getVaultDetails(vault: VaultImplementation, ownerPublicKey: PublicKey) {
  const withdrawableAmount = await vault.getWithdrawableAmount(ownerPublicKey);
  const vaultSupply = await vault.getVaultSupply();
  
  return {
    lpSupply: vaultSupply.toString(),
    withdrawableAmount: withdrawableAmount.toString(),
    virtualPrice: withdrawableAmount.toNumber() / vaultSupply.toNumber() || 0
  };
}