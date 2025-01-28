import Web3, { AbiItem } from 'web3';
import { getRPCUrl } from '../../utils/rpcUtils';
import createTokenData from './contracts/CreateToken.json';

const ERC20_ABI = createTokenData.abi as AbiItem[];
const ERC20_BYTECODE = createTokenData.bytecode;

export interface TokenDetails {
  name: string;
  symbol: string;
  decimals: number;
  initialSupply: number;
  network: 'eth' | 'base';
}

const formatPrivateKey = (key: string): string => {
  key = key.startsWith('0x') ? key.slice(2) : key;
  key = key.padStart(64, '0');
  return '0x' + key;
};

const getGasPrice = async (web3: Web3, network: 'eth' | 'base'): Promise<string> => {
  const gasPrice = await web3.eth.getGasPrice();
  // 50% increase for token deployment to ensure it goes through
  const increasedGasPrice = BigInt(gasPrice) * BigInt(15) / BigInt(10);
  return '0x' + increasedGasPrice.toString(16);
};

export const createToken = async (
    tokenDetails: TokenDetails,
    privateKey: string
): Promise<string> => {
    try {
        if (!tokenDetails || !tokenDetails.network) {
            throw new Error('Token details and network are required');
        }

        const rpcUrl = getRPCUrl(tokenDetails.network.toUpperCase() as 'ETH' | 'BASE');
        if (!rpcUrl) {
            throw new Error(`${tokenDetails.network.toUpperCase()} RPC URL not configured`);
        }

        const web3 = new Web3(rpcUrl);
        web3.eth.transactionBlockTimeout = 100;
        web3.eth.transactionPollingTimeout = 180000;

        const formattedPrivateKey = formatPrivateKey(privateKey);
        const account = web3.eth.accounts.privateKeyToAccount(formattedPrivateKey);
        web3.eth.accounts.wallet.add(account);

        // Get necessary transaction parameters
        const [nonce, chainId] = await Promise.all([
            web3.eth.getTransactionCount(account.address, 'pending'),
            web3.eth.getChainId()
        ]);

        console.log(`Using nonce: ${nonce}`);
        console.log(`Chain ID: ${chainId}`);

        const balance = await web3.eth.getBalance(account.address);
        console.log(`Current wallet balance: ${web3.utils.fromWei(balance, 'ether')} ${tokenDetails.network.toUpperCase()}`);

        const initialSupplyBigInt = BigInt(tokenDetails.initialSupply) * 
            BigInt(10) ** BigInt(tokenDetails.decimals);

        const contract = new web3.eth.Contract(ERC20_ABI);

        // Ensure bytecode has 0x prefix
        const bytecode = ERC20_BYTECODE.startsWith('0x') ? ERC20_BYTECODE : `0x${ERC20_BYTECODE}`;

        // Encode constructor parameters
        const constructorArgs = web3.eth.abi.encodeParameters(
            ['string', 'string', 'uint8', 'uint256'],
            [
                tokenDetails.name,
                tokenDetails.symbol,
                tokenDetails.decimals,
                initialSupplyBigInt.toString()
            ]
        );

        // Combine bytecode with encoded constructor arguments (ensure 0x prefix)
        const deployData = bytecode + constructorArgs.slice(2);

        // Estimate gas with 0x-prefixed data
        const estimatedGas = await web3.eth.estimateGas({
            from: account.address,
            data: deployData
        });

        const gasPrice = await getGasPrice(web3, tokenDetails.network);
        const gasLimit = '0x' + Math.floor(Number(estimatedGas) * 1.2).toString(16);

        console.log('\nDeployment parameters:');
        console.log(`Gas Limit: ${parseInt(gasLimit, 16)}`);
        console.log(`Gas Price: ${web3.utils.fromWei(BigInt(gasPrice).toString(), 'gwei')} Gwei`);
        console.log(`Nonce: ${nonce}`);

        // Create deployment transaction
        const deploymentTx = {
            from: account.address,
            gas: gasLimit,
            gasPrice: gasPrice,
            nonce: '0x' + nonce.toString(16),
            chainId: Number(chainId),
            data: deployData // This is now guaranteed to have 0x prefix
        };

        // Sign and send transaction
        const signedTx = await web3.eth.accounts.signTransaction(deploymentTx, formattedPrivateKey);
        
        if (!signedTx.rawTransaction) {
            throw new Error('Failed to sign deployment transaction');
        }

        const deployedContract = await new Promise<string>((resolve, reject) => {
            web3.eth.sendSignedTransaction(signedTx.rawTransaction as string)
                .on('transactionHash', (hash: string) => {
                    console.log(`Transaction hash: ${hash}`);
                })
                .on('receipt', (receipt) => {
                    if (receipt.contractAddress) {
                        resolve(receipt.contractAddress);
                    } else {
                        reject(new Error('No contract address in transaction receipt'));
                    }
                })
                .on('error', (error: Error) => reject(error));
        });

        console.log(`\nContract deployed successfully at: ${deployedContract}`);
        return deployedContract;

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to create token on ${tokenDetails.network.toUpperCase()}: ${errorMessage}`);
    }
};