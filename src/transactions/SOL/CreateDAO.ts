import {
    Connection,
    Keypair,
    PublicKey,
    SystemProgram,
    Transaction,
    sendAndConfirmTransaction,
    TransactionInstruction
  } from "@solana/web3.js";
  import {
    PROGRAM_VERSION,
    getGovernanceProgramVersion,
    createInstructionData,
    getGovernanceAccounts,
    withCreateRealm,
    withSetRealmAuthority,
    GoverningTokenConfigAccountArgs,
    GoverningTokenType,
    SetRealmAuthorityAction,
    MintMaxVoteWeightSource,
    MintMaxVoteWeightSourceType,
    GOVERNANCE_PROGRAM_SEED,
    VoteTipping
  } from "@solana/spl-governance";
  import { getAssociatedTokenAddress, createMint } from "@solana/spl-token";
  import bs58 from "bs58";
  import BN from "bn.js";
  
  // Derive Governance Program ID (same as in CLI)
  const GOVERNANCE_PROGRAM_ID = new PublicKey("GovER5Lthms3bLBqWub97yVrMmEogzX7xNjdXpPPCVZw");
  
  export interface DAOConfig {
    name: string;
    minTokensToCreateGovernance: number;
    communityMintDecimals: number;
    communityYesVotePercentage: number;  // percentage (0-100)
    votingCoolOffHours: number;
    depositExemptProposalCount: number;
  }
  
  export async function createDAO(
    connection: Connection,
    privateKey: string,
    config: DAOConfig
  ): Promise<string> {
    try {
      // Decode and validate private key
      const decodedPrivateKey = bs58.decode(privateKey);
      if (decodedPrivateKey.length !== 64) {
        throw new Error(`Invalid private key length: ${decodedPrivateKey.length}`);
      }
      const payer = Keypair.fromSecretKey(decodedPrivateKey);
  
      // Create community token mint
      const communityMint = await createMint(
        connection,
        payer,
        payer.publicKey,
        payer.publicKey,
        config.communityMintDecimals
      );
  
      // Configure governance token settings
      const communityTokenConfig: GoverningTokenConfigAccountArgs = {
        voterWeightAddin: undefined,
        maxVoterWeightAddin: undefined,
        tokenType: GoverningTokenType.Liquid
      };
  
      // Create base transaction
      const instructions: TransactionInstruction[] = [];
  
      // Calculate realm address
      const [realmAddress] = PublicKey.findProgramAddressSync(
        [Buffer.from(GOVERNANCE_PROGRAM_SEED), Buffer.from(config.name)],
        GOVERNANCE_PROGRAM_ID
      );
  
      // Get program version
      const programVersion = await getGovernanceProgramVersion(
        connection,
        GOVERNANCE_PROGRAM_ID
      );
  
      // Convert min tokens to BN
      const minTokens = new BN(config.minTokensToCreateGovernance.toString());
  
      // Add create realm instruction
      await withCreateRealm(
        instructions,
        GOVERNANCE_PROGRAM_ID,
        programVersion,
        config.name,
        payer.publicKey,
        communityMint,
        payer.publicKey,
        undefined, // No council mint
        MintMaxVoteWeightSource.FULL_SUPPLY_FRACTION,
        minTokens as any, // Type assertion for BN compatibility
        communityTokenConfig
      );
  
      // Add set realm authority instruction
      withSetRealmAuthority(
        instructions,
        GOVERNANCE_PROGRAM_ID,
        programVersion,
        realmAddress,
        payer.publicKey,
        payer.publicKey,
        SetRealmAuthorityAction.SetChecked
      );
  
      // Create and send transaction
      const transaction = new Transaction().add(...instructions);
      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [payer],
        { commitment: 'confirmed' }
      );
  
      console.log(`\nDAO "${config.name}" created successfully!`);
      console.log(`Transaction: https://explorer.solana.com/tx/${signature}`);
      console.log(`Realm Address: ${realmAddress.toString()}`);
      console.log(`Community Mint: ${communityMint.toString()}`);
  
      return realmAddress.toString();
    } catch (error) {
      throw new Error(`Failed to create DAO: ${error instanceof Error ? error.message : String(error)}`);
    }
  }