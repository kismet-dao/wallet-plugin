// createMPToken.ts
import { Client, Wallet, TransactionMetadataBase, Node } from 'xrpl';
import fs from 'fs/promises';

// Define types for MPTokenIssuanceCreate transaction
interface MPTokenIssuanceCreate {
    TransactionType: 'MPTokenIssuanceCreate';
    Account: string;
    AssetScale: number;
    TransferFee: number;
    MaximumAmount: string;
    Flags: number;
    MPTokenMetadata: string;
}

// Updated metadata interface with correct Node type
interface MPTokenIssuanceCreateMetadata extends Omit<TransactionMetadataBase, 'AffectedNodes'> {
    mpt_issuance_id?: string;
    AffectedNodes: Node[];
}

async function createMPToken(config = {}, seed: string) {
    // Default configuration
    const defaultConfig = {
        assetScale: 2,                  // 2 decimal places (e.g., for cents)
        transferFee: 314,               // 0.314% transfer fee
        maximumAmount: "50000000",      // 500,000.00 tokens maximum
        metadata: "Test Token MPT",     // Token metadata
        flags: {
            canLock: true,              // Token can be locked
            requireAuth: true,          // Require authorization to hold
            canEscrow: true,            // Allow escrow
            canTrade: true,             // Can trade on DEX
            canTransfer: true,          // Can transfer between accounts
            canClawback: true           // Issuer can clawback
        },
        rpcUrl: 'wss://xrplcluster.com' // Testnet by default
    };

    // Merge provided config with defaults
    const finalConfig = { ...defaultConfig, ...config };

    const client = new Client(finalConfig.rpcUrl);

    try {
        await client.connect();
        console.log("Connected to XRPL");

        // Log the wallet data file path
        const walletFilePath = '.wallet.enc';
        console.log(`Reading wallet data from file: ${walletFilePath}`);

        // Read wallet data
        let walletData;
        try {
            const encryptedData = await fs.readFile(walletFilePath, 'utf8');
            console.log(`Encrypted wallet data read successfully`);

            // Log the encrypted data (be cautious not to log sensitive information)
            console.log(`Encrypted wallet data: ${encryptedData.slice(0, 20)}...`);

            walletData = JSON.parse(encryptedData);
            console.log(`Wallet data parsed successfully`);
        } catch (error) {
            // Type narrowing to handle 'unknown' type
            if (error instanceof Error) {
                console.error("Failed to create MPToken:", error.message);
                console.error("Error details:", error); // Log the error object for more details
            } else {
                console.error("Failed to create MPToken:", String(error));
            }
        
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }

        // Calculate flags
        let flagValue = 0;
        if (finalConfig.flags.canLock) flagValue |= 0x00000002;      // tfMPTCanLock
        if (finalConfig.flags.requireAuth) flagValue |= 0x00000004;   // tfMPTRequireAuth
        if (finalConfig.flags.canEscrow) flagValue |= 0x00000008;    // tfMPTCanEscrow
        if (finalConfig.flags.canTrade) flagValue |= 0x00000010;     // tfMPTCanTrade
        if (finalConfig.flags.canTransfer) flagValue |= 0x00000020;  // tfMPTCanTransfer
        if (finalConfig.flags.canClawback) flagValue |= 0x00000040;  // tfMPTCanClawback

        console.log(`Calculated flag value: ${flagValue}`);

        // Create MPTokenIssuanceCreate transaction with proper type
        const createTx: MPTokenIssuanceCreate = {
            TransactionType: 'MPTokenIssuanceCreate',
            Account: walletData.xrp.address,
            AssetScale: finalConfig.assetScale,
            TransferFee: finalConfig.transferFee,
            MaximumAmount: finalConfig.maximumAmount,
            Flags: flagValue,
            MPTokenMetadata: Buffer.from(finalConfig.metadata).toString('hex')
        };

        console.log(`Created MPTokenIssuanceCreate transaction:`, createTx);

        // Prepare transaction
        const prepared = await client.autofill(createTx);
        console.log(`Prepared transaction:`, prepared);

        // Create wallet instance
        const wallet = Wallet.fromSeed(seed);
        console.log(`Created wallet instance with address: ${wallet.classicAddress}`);

        // Sign and submit
        const signed = wallet.sign(prepared);
        console.log(`Signed transaction:`, signed);

        const result = await client.submitAndWait(signed.tx_blob);
        console.log(`Submitted transaction result:`, result);

        // Check results
        if (result.result.meta && typeof result.result.meta === 'object') {
            const meta = result.result.meta as MPTokenIssuanceCreateMetadata;

            if (meta.TransactionResult === "tesSUCCESS") {
                if (!meta.mpt_issuance_id) {
                    throw new Error('MPT Issuance ID missing from successful transaction');
                }

                console.log("Token created successfully!");
                console.log("MPT Issuance ID:", meta.mpt_issuance_id);

                // Log affected nodes for debugging
                if (meta.AffectedNodes) {
                    console.log("Affected Nodes:", JSON.stringify(meta.AffectedNodes, null, 2));
                }

                return {
                    success: true,
                    mptIssuanceId: meta.mpt_issuance_id,
                    affectedNodes: meta.AffectedNodes,
                    result,
                    wallet // Include the wallet instance in the result object
                };
            } else {
                throw new Error(`Transaction failed: ${meta.TransactionResult}`);
            }
        }

        throw new Error('Invalid transaction metadata');

    } catch (error) {
        console.error("Failed to create MPToken:", error instanceof Error ? error.message : String(error));
        console.error("Error details:", error); // Log the error object for more details
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error)
        };
    } finally {
        await client.disconnect();
    }
}

interface MPTokenConfig {
    assetScale?: number;
    transferFee?: number;
    maximumAmount?: string;
    metadata?: string;
    flags?: {
        canLock?: boolean;
        requireAuth?: boolean;
        canEscrow?: boolean;
        canTrade?: boolean;
        canTransfer?: boolean;
        canClawback?: boolean;
    };
    rpcUrl?: string;
}

export {
    createMPToken,
    MPTokenConfig,
    MPTokenIssuanceCreate,
    MPTokenIssuanceCreateMetadata
};