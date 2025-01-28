import Web3, { AbiItem } from 'web3';
import { getRPCUrl } from '../../utils/rpcUtils';
import bondingCurveData from './contracts/BondingCurve.json';

const BondingCurveABI = bondingCurveData.abi as AbiItem[];
const BondingCurveBYTECODE = bondingCurveData.bytecode;


// Verified Chainlink Price Feed addresses
const PRICE_FEEDS = {
    eth: '0x694AA1769357215DE4FAC081bf1f309aDC325306',  // ETH/USD on Holesky
    base: '0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70'  // ETH/USD on Base Mainnet
} as const;

export interface BondingCurveDeployParams {
    name: string;
    symbol: string;
    initialSupply: number;
    initialPrice: number;
    delta: number;
    curveType: number;
    minPrice: number;
    maxPrice: number;
    minTradeSize: number;  // Added this
    maxTradeSize: number;  // Added this
    feePercent: number;
    owner: string;
}

export const deployBondingCurve = async (
    params: BondingCurveDeployParams,
    privateKey: string,
    network: 'eth' | 'base'
): Promise<string> => {
    try {
        const web3 = new Web3(getRPCUrl(network.toUpperCase() as 'ETH' | 'BASE'));

        console.log('Converting parameters to wei...');

        // Convert all price values to strings first, then to wei
        const initialPriceWei = web3.utils.toWei(params.initialPrice.toString(), 'ether');
        const deltaPriceWei = web3.utils.toWei(params.delta.toString(), 'ether');
        const minPriceWei = web3.utils.toWei(params.minPrice.toString(), 'ether');
        const maxPriceWei = web3.utils.toWei(params.maxPrice.toString(), 'ether');

        // Set reasonable trade limits
        const minTradeSize = web3.utils.toWei('0.0001', 'ether');
        const maxTradeSize = web3.utils.toWei('10', 'ether');
        const maxTotalSupply = web3.utils.toWei(params.initialSupply.toString(), 'ether');

        // Convert fee percent to basis points (0.1% = 10 basis points)
        const feePercentBasis = Math.floor(Number(params.feePercent) * 100);

        // Get network-specific price feed
        const priceFeedAddress = PRICE_FEEDS[network];
        console.log(`Using ${network.toUpperCase()} Chainlink ETH/USD Price Feed at: ${priceFeedAddress}`);

        // Create bonding curve name and symbol without duplication
        const bondingCurveName = `${params.name} Curve`;
        const bondingCurveSymbol = `${params.symbol}BC`;

        console.log('\nConstructor parameters:', {
            name: bondingCurveName,
            symbol: bondingCurveSymbol,
            curveParams: {
                initialPriceWei,
                deltaPriceWei,
                minPriceWei,
                maxPriceWei
            },
            tradeLimits: {
                minTradeSize,
                maxTradeSize,
                maxTotalSupply
            },
            feePercentBasis,
            priceFeed: priceFeedAddress
        });

        // Encode constructor parameters with fixed naming
        const constructorArgs = web3.eth.abi.encodeParameters(
            ['string', 'string', 
             'tuple(uint256,uint256,uint256,uint256)', 
             'tuple(uint256,uint256,uint256)',
             'uint256', 'address'],
            [
                bondingCurveName,      // No more duplication
                bondingCurveSymbol,    // No more duplication
                [initialPriceWei, deltaPriceWei, minPriceWei, maxPriceWei],
                [minTradeSize, maxTradeSize, maxTotalSupply],
                feePercentBasis,
                priceFeedAddress
            ]
        );


        // Combine bytecode with constructor arguments
        const deployData = (BondingCurveBYTECODE.startsWith('0x') ? BondingCurveBYTECODE : '0x' + BondingCurveBYTECODE) + 
                          constructorArgs.slice(2);

        const formattedPrivateKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
        const account = web3.eth.accounts.privateKeyToAccount(formattedPrivateKey);

        // Get the current balance
        const balance = await web3.eth.getBalance(account.address);
        console.log(`\nCurrent wallet balance: ${web3.utils.fromWei(balance, 'ether')} ${network.toUpperCase()}`);

        const [nonce, chainId] = await Promise.all([
            web3.eth.getTransactionCount(account.address, 'pending'),
            web3.eth.getChainId()
        ]);

        // Estimate gas
        const estimatedGas = await web3.eth.estimateGas({
            from: account.address,
            data: deployData
        });

        const baseGasPrice = await web3.eth.getGasPrice();
        const gasPrice = '0x' + (BigInt(baseGasPrice) * BigInt(15) / BigInt(10)).toString(16);
        const gasLimit = '0x' + Math.floor(Number(estimatedGas) * 1.2).toString(16);

        // Calculate and log deployment cost
        const totalCost = BigInt(estimatedGas) * BigInt(baseGasPrice);
        console.log('\nDeployment cost estimate:');
        console.log(`Gas units: ${estimatedGas}`);
        console.log(`Gas price: ${web3.utils.fromWei(baseGasPrice, 'gwei')} Gwei`);
        console.log(`Total cost: ${web3.utils.fromWei(totalCost.toString(), 'ether')} ${network.toUpperCase()}`);

        // Check if we have enough balance
        if (BigInt(balance) < totalCost) {
            throw new Error(`Insufficient funds for deployment. Need ${web3.utils.fromWei(totalCost.toString(), 'ether')} ${network.toUpperCase()}`);
        }

        const deploymentTx = {
            from: account.address,
            gas: gasLimit,
            gasPrice: gasPrice,
            nonce: '0x' + nonce.toString(16),
            chainId: Number(chainId),
            data: deployData
        };

        console.log('\nDeploying bonding curve contract...');

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

        return deployedContract;

    } catch (error) {
        console.error('Deployment error details:', error);
        throw new Error(`Failed to deploy bonding curve contract on ${network.toUpperCase()}: ${error instanceof Error ? error.message : String(error)}`);
    }
};