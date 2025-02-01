import  bip39 from 'bip39';
import  { BIP32Factory } from 'bip32';
import * as ecc from 'tiny-secp256k1';
import  Web3 from 'web3';
import  { Keypair } from '@solana/web3.js';
import  { dag4 } from '@stardust-collective/dag4';
import { Wallet as XrpWallet } from 'xrpl';
import bitcoin from 'bitcoinjs-lib';


// Initialize bip32 with tiny-secp256k1
const bip32 = BIP32Factory(ecc);
const web3 = new Web3();

interface WalletOutput {
  mnemonic: string;
  ethereum: {
    address: string;
    privateKey: string;
    publicKey: string;
    mnemonic: string;
  };
  bitcoin: {
    btcMainNetAddress: string;
    btcMainNetPrivateKey: string;
    btcTestNetAddress: string;
    btcTestNetPrivateKey: string;
    publicKey: string;
  };
  solana: {
    solAddress: string;
    solPrivateKey: string;
    solPublicKey: string;
  };
  dag: {
    address: string;
    privateKey: string;
    publicKey: string;
  };
  xrp: {
    mainnet: {
      address: string;
      privateKey: string;
      publicKey: string;
    };
    testnet: {
      address: string;
      privateKey: string;
      publicKey: string;
    };
  };
}

async function generateWallets(): Promise<WalletOutput> {
  try {
    console.log("🔄 Generating wallets...");

    const mnemonic = bip39.generateMnemonic();
    console.log("✅ Mnemonic generated successfully");

    // Generate all wallets
    const bitcoinWallets = generateBitcoinWallet(mnemonic);
    console.log("✅ Bitcoin wallets generated:", bitcoinWallets);

    const ethereumWallet = generateEthereumWallet(mnemonic);
    console.log("✅ Ethereum wallet generated:", ethereumWallet);

    const solanaWallet = generateSolanaWallet(mnemonic);
    console.log("✅ Solana wallet generated:", solanaWallet);

    const dagWallet = generateDagWallet(mnemonic);
    console.log("✅ DAG wallet generated:", dagWallet);

    const xrpWallets = generateXrpWallets();
    console.log("✅ XRP wallets generated:", xrpWallets);

    return {
      mnemonic,
      ethereum: {
        address: ethereumWallet.address,
        privateKey: ethereumWallet.privateKey,
        publicKey: web3.utils.toHex(web3.eth.accounts.privateKeyToAccount(ethereumWallet.privateKey).address),
        mnemonic
      },
      bitcoin: {
        btcMainNetAddress: bitcoinWallets.mainnet.address,
        btcMainNetPrivateKey: bitcoinWallets.mainnet.privateKey,
        btcTestNetAddress: bitcoinWallets.testnet.address,
        btcTestNetPrivateKey: bitcoinWallets.testnet.privateKey,
        publicKey: bitcoinWallets.publicKey
      },
      solana: {
        solAddress: solanaWallet.address,
        solPrivateKey: solanaWallet.privateKey,
        solPublicKey: solanaWallet.address
      },
      dag: {
        address: dagWallet.address,
        privateKey: dagWallet.privateKey,
        publicKey: dagWallet.publicKey
      },
      xrp: {
        mainnet: {
          address: xrpWallets.mainnet.address,
          privateKey: xrpWallets.mainnet.privateKey ?? "",
          publicKey: xrpWallets.mainnet.publicKey
        },
        testnet: {
          address: xrpWallets.testnet.address,
          privateKey: xrpWallets.testnet.privateKey ?? "",
          publicKey: xrpWallets.testnet.publicKey
        }
      }
    };
  } catch (error) {
    console.error("❌ Error generating wallets:", error);
    throw error;
  }
}

// Function to generate Bitcoin wallet using BIP84 (native SegWit)
function generateBitcoinWallet(mnemonic: string) {
  if (!bip39.validateMnemonic(mnemonic)) {
    throw new Error("Invalid mnemonic");
  }

  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const root = bip32.fromSeed(seed);

  // Derivation paths for Bitcoin using BIP84 (native SegWit)
  const paths = {
    mainnet: "m/84'/0'/0'/0/0",  // Native SegWit for mainnet
    testnet: "m/84'/1'/0'/0/0"   // Native SegWit for testnet
  };

  const bitcoinWallets = {
    mainnet: generateBitcoinAddress(root, paths.mainnet, bitcoin.networks.bitcoin),
    testnet: generateBitcoinAddress(root, paths.testnet, bitcoin.networks.testnet)
  };

  return {
    mainnet: bitcoinWallets.mainnet || { address: '', privateKey: '', publicKey: '' },
    testnet: bitcoinWallets.testnet || { address: '', privateKey: '', publicKey: '' },
    // For the overall public key, you might choose one network's public key:
    publicKey: Buffer.from(root.derivePath(paths.mainnet).publicKey).toString('hex')
  };
}

// Helper function to generate a Bitcoin address for a given derivation path and network
function generateBitcoinAddress(root: any, path: string, network: bitcoin.Network) {
  try {
    const child = root.derivePath(path);
    // Use p2wpkh for native SegWit addresses
    const { address } = bitcoin.payments.p2wpkh({
      pubkey: Buffer.from(child.publicKey),
      network: network
    });

    return {
      address: address || '',
      privateKey: child.toWIF() || '',
      publicKey: Buffer.from(child.publicKey).toString('hex') || ''
    };
  } catch (error) {
    console.error("Error generating Bitcoin address:", error);
    return {
      address: '',
      privateKey: '',
      publicKey: ''
    };
  }
}

function generateEthereumWallet(mnemonic: string) {
  const account = web3.eth.accounts.create();
  return {
    address: account.address,
    privateKey: account.privateKey
  };
}

function generateSolanaWallet(mnemonic: string) {
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const keypair = Keypair.fromSeed(seed.slice(0, 32));

  return {
    address: keypair.publicKey.toBase58(),
    privateKey: Buffer.from(keypair.secretKey).toString('hex')
  };
}

function generateDagWallet(mnemonic: string) {
  const dagAccount = dag4.createAccount();
  dagAccount.loginSeedPhrase(mnemonic);

  return {
    address: dagAccount.address,
    privateKey: dagAccount.keyTrio.privateKey,
    publicKey: dagAccount.publicKey
  };
}

function generateXrpWallets() {
  const mainnetWallet = XrpWallet.generate();
  const testnetWallet = XrpWallet.fromSeed(mainnetWallet.seed || '');

  return {
    mainnet: {
      address: mainnetWallet.classicAddress,
      privateKey: mainnetWallet.seed,
      publicKey: mainnetWallet.publicKey
    },
    testnet: {
      address: testnetWallet.classicAddress,
      privateKey: testnetWallet.seed,
      publicKey: testnetWallet.publicKey
    }
  };
}

export default generateWallets;
