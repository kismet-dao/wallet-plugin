import Web3, { AbiItem, TransactionReceipt } from 'web3';
import { getRPCUrl } from '../../utils/rpcUtils';
import { getWalletData, getWalletKeysForNetwork } from '../../utils/walletUtils';
import { NetworkKey, WalletData } from '../../types/wallet';
import { getExplorerUrl } from '../../utils/explorerUtils';

interface BondingCurveContract {
    methods: {
      getCurrentPrice(): {
        call(): Promise<string>;
      };
      minPrice(): {
        call(): Promise<string>;
      };
      maxPrice(): {
        call(): Promise<string>;
      };
      calculatePurchaseReturn(ethAmount: string, price: string): {
        call(): Promise<string>;
      };
      buyTokens(minTokensExpected: string): {
        call(): Promise<void>;
        send(options: any): Promise<any>;
        estimateGas(options: any): Promise<number>;
        encodeABI(): string;
      };
      tradeLimits(): {
        call(): Promise<{minTradeSize: string; maxTradeSize: string; maxTotalSupply: string}>;
      };
    };
}

const BONDING_CURVE_ABI = [
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "minTokensExpected",
          "type": "uint256"
        }
      ],
      "name": "buyTokens",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getCurrentPrice",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "ethAmount",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "price",
          "type": "uint256"
        }
      ],
      "name": "calculatePurchaseReturn",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "pure",
      "type": "function"
    }
  ];

export async function buyERC20Tokens(
  network: NetworkKey,
  amount: string,
  bondingCurveAddress: string
): Promise<void> {
  try {
    // Validate parameters
    if (!amount || isNaN(parseFloat(amount))) {
      throw new Error('Amount must be a valid number');
    }
    if (parseFloat(amount) <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    // Initialize Web3 and contract
    const web3 = new Web3(getRPCUrl(network.toUpperCase() as 'ETH' | 'BASE'));
    const walletData = await getWalletData<WalletData>(true);
    const wallet = getWalletKeysForNetwork(walletData, network);
    const contract = new web3.eth.Contract(BONDING_CURVE_ABI, bondingCurveAddress) as any as BondingCurveContract;

    // Get contract limits and current state
    const [currentPrice, minPrice, maxPrice, tradeLimits] = await Promise.all([
      contract.methods.getCurrentPrice().call(),
      contract.methods.minPrice().call(),
      contract.methods.maxPrice().call(),
      contract.methods.tradeLimits().call()
    ]);

    // Convert amount to wei
    const amountInWei = web3.utils.toWei(amount, 'ether');

    // Validate trade size
    if (BigInt(amountInWei) < BigInt(tradeLimits.minTradeSize)) {
      throw new Error(`Amount too small. Minimum: ${web3.utils.fromWei(tradeLimits.minTradeSize, 'ether')} ${network.toUpperCase()}`);
    }
    if (BigInt(amountInWei) > BigInt(tradeLimits.maxTradeSize)) {
      throw new Error(`Amount too large. Maximum: ${web3.utils.fromWei(tradeLimits.maxTradeSize, 'ether')} ${network.toUpperCase()}`);
    }

    console.log('\nContract State:');
    console.log(`Current Price: ${web3.utils.fromWei(currentPrice, 'ether')} ${network.toUpperCase()}`);
    console.log(`Min Price: ${web3.utils.fromWei(minPrice, 'ether')} ${network.toUpperCase()}`);
    console.log(`Max Price: ${web3.utils.fromWei(maxPrice, 'ether')} ${network.toUpperCase()}`);

    // Calculate expected tokens with slippage
    const expectedTokens = await contract.methods.calculatePurchaseReturn(amountInWei, currentPrice).call();
    const minTokensExpected = (BigInt(expectedTokens) * BigInt(95)) / BigInt(100); // 5% slippage

    // Get transaction parameters
    const [nonce, chainId] = await Promise.all([
      web3.eth.getTransactionCount(wallet.address, 'pending'),
      web3.eth.getChainId()
    ]);

    const baseGasPrice = await web3.eth.getGasPrice();
    const gasPrice = '0x' + (BigInt(baseGasPrice) * BigInt(15) / BigInt(10)).toString(16);

    // Prepare buy transaction
    const buyTxObject = {
      from: wallet.address,
      to: bondingCurveAddress,
      value: '0x' + BigInt(amountInWei).toString(16),
      gas: '0x' + (300000).toString(16), // Fixed gas limit for predictability
      gasPrice: gasPrice,
      nonce: '0x' + nonce.toString(16),
      chainId: chainId,
      data: contract.methods.buyTokens(minTokensExpected.toString()).encodeABI()
    };

    console.log('\nTransaction Details:');
    console.log(`Amount to spend: ${amount} ${network.toUpperCase()}`);
    console.log(`Expected tokens: ${web3.utils.fromWei(expectedTokens, 'ether')}`);
    console.log(`Minimum tokens (with 5% slippage): ${web3.utils.fromWei(minTokensExpected.toString(), 'ether')}`);

    // Sign and send transaction
    const signedTx = await web3.eth.accounts.signTransaction(buyTxObject, wallet.privateKey);
    
    if (!signedTx.rawTransaction) {
      throw new Error('Failed to sign transaction');
    }

   // Send transaction and handle receipt
   console.log('\nSending transaction...');
   const receipt: TransactionReceipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

   // Convert transaction hash to string
   const txHash = receipt.transactionHash.toString();

   console.log('\nTransaction successful!');
   console.log(`Transaction hash: ${txHash}`);
   console.log(`View on explorer: ${getExplorerUrl(network, txHash)}`);

  } catch (error) {
    console.error('Transaction details:', error);
    if (error instanceof Error && error.message.includes('execution reverted')) {
      console.error('\nPossible reasons for failure:');
      console.error('1. Cooling period active (must wait 1 hour between trades)');
      console.error('2. Price impact too high');
      console.error('3. Contract paused');
    }
    throw new Error(`Failed to buy tokens: ${error instanceof Error ? error.message : String(error)}`);
  }
}