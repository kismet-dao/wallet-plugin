import { TransactionDetails, ETHTransactionObject } from '../../types/transaction';
import { ETHHoleskyNetwork, BASENetwork } from '../../networks';
import Web3 from 'web3';
import { getRPCUrl } from '../../utils/rpcUtils';  // Import getRPCUrl

const formatPrivateKey = (key: string): string => {
  key = key.startsWith('0x') ? key.slice(2) : key;
  key = key.padStart(64, '0');
  return '0x' + key;
};

const getGasPrice = async (web3: Web3, network: 'eth' | 'base'): Promise<string> => {
  const gasPrice = await web3.eth.getGasPrice();
  // 10% increase
  const increasedGasPrice = BigInt(gasPrice) * BigInt(11) / BigInt(10);
  return '0x' + increasedGasPrice.toString(16); // Convert to hex string
};

export const sendETHTransaction = async (
  transactionDetails: TransactionDetails,
  privateKey: string,
  network: 'eth' | 'base' = 'eth'
): Promise<string> => {
  try {
    // Fetch the rpcUrl for the specified network
    const rpcUrl = getRPCUrl(network.toUpperCase() as 'SOLANA' | 'ETH' | 'BASE');

    // Pass rpcUrl when creating network instances
    const networkInstance = network === 'eth' 
      ? new ETHHoleskyNetwork(rpcUrl)  // Pass rpcUrl to ETHHoleskyNetwork
      : new BASENetwork(rpcUrl);  // Pass rpcUrl to BASENetwork

    const web3 = networkInstance.getWeb3();

    const chainId = await web3.eth.getChainId();
    const nonce = await web3.eth.getTransactionCount(transactionDetails.address, 'pending');
    const gasPrice = await getGasPrice(web3, network);

    const txObject: ETHTransactionObject = {
      from: transactionDetails.address,
      to: transactionDetails.recipient,
      value: web3.utils.toWei(transactionDetails.amount.toString(), 'ether'),
      gas: '0x5208', // 21000 in hex
      gasPrice: gasPrice,
      nonce: '0x' + nonce.toString(16), // Convert to hex string
      chainId: Number(chainId),
    };

    const formattedPrivateKey = formatPrivateKey(privateKey);
    const signedTx = await web3.eth.accounts.signTransaction(txObject, formattedPrivateKey);
    
    if (!signedTx.rawTransaction) {
      throw new Error('Failed to sign transaction');
    }

    const txHash = await new Promise<string>((resolve, reject) => {
      web3.eth.sendSignedTransaction(signedTx.rawTransaction as string)
        .on('transactionHash', (hash: string) => resolve(hash))
        .on('error', (error: Error) => reject(error));
    });

    return txHash;
  } catch (error) {
    throw new Error(`Transaction failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};
