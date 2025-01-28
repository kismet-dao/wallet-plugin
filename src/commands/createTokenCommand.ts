import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { Connection, clusterApiUrl } from '@solana/web3.js';
import { getWalletData, getWalletKeysForNetwork } from '../utils/walletUtils';
import { getRPCUrl } from '../utils/rpcUtils';
import { NetworkKey, WalletData, XrpWalletKeys } from '../types/wallet';
import { createToken as createEVMToken, TokenDetails as EVMTokenDetails } from '../transactions/ETH/CreateToken';
import { createSolanaToken, TokenDetails as SolTokenDetails } from '../transactions/SOL/CreateToken';
import { createXRPToken, XRPTokenDetails } from '../transactions/XRP/createToken';
import { BondingCurveDeployParams, deployBondingCurve } from '../transactions/ETH/BondingCurve';

interface CommandLineOptions {
    name?: string;
    symbol?: string;
    decimals?: string;
    initialSupply?: string;
    network?: string;
    enableBondingCurve?: boolean;
    initialPrice?: string;
    priceDelta?: string;
    curveType?: string;
    minPrice?: string;
    maxPrice?: string;
    feePercent?: string;
    minTradeSize?: string;
    maxTradeSize?: string;
}

enum CurveType {
  LINEAR = 0,
  EXPONENTIAL = 1,
  LOGARITHMIC = 2
}

const convertNetworkToRPC = (network: NetworkKey): 'ETH' | 'BASE' | 'SOLANA' | 'XRP' => {
  switch (network) {
    case 'eth':
      return 'ETH';
    case 'base':
      return 'BASE';
    case 'sol':
      return 'SOLANA';
    case 'xrp':
    case 'xrptestnet':
      return 'XRP';
    default:
      throw new Error(`Unsupported network for token creation: ${network}`);
  }
};

export const createTokenCommand = new Command('create-token')
  .description('Create a new token (ERC-20 on ETH/BASE, SPL on Solana, or Token on XRP)')
  .option('-n, --name <name>', 'Token name')
  .option('-s, --symbol <symbol>', 'Token symbol')
  .option('-d, --decimals <number>', 'Number of decimals')
  .option('-i, --initial-supply <number>', 'Initial token supply', '1000000')
  .option('--network <network>', 'Network to deploy on (eth, base, sol, or xrp)', 'eth')
  .option('--enable-bonding-curve', 'Enable bonding curve for token (ETH/BASE only)')
  .option('--initial-price <number>', 'Initial token price', '0.1')
  .option('--price-delta <number>', 'Price increase per token', '0.0001')
  .option('--curve-type <type>', 'Bonding curve type (linear, exponential, logarithmic)', 'linear')
  .option('--min-price <number>', 'Minimum token price')
  .option('--max-price <number>', 'Maximum token price')
  .option('--fee-percent <number>', 'Fee percentage', '0.1')
  .option('--min-trade-size <number>', 'Minimum trade size', '0.00001')
  .option('--max-trade-size <number>', 'Maximum trade size', '10')
  .action(async (cmdOptions: CommandLineOptions) => {
    try {
      // Validate required parameters
      if (!cmdOptions.name) {
        throw new Error('Token name is required');
      }
      if (!cmdOptions.symbol) {
        throw new Error('Token symbol is required');
      }

      const network = (cmdOptions.network?.toLowerCase() || 'eth') as NetworkKey;
      if (!['eth', 'base', 'sol', 'xrp', 'xrptestnet'].includes(network)) {
        throw new Error('Network must be either "eth", "base", "sol", "xrp", or "xrptestnet"');
      }

      // Warn if bonding curve is enabled for unsupported networks
      if ((network === 'sol' || network === 'xrp') && cmdOptions.enableBondingCurve) {
        console.log(chalk.yellow(`\nWarning: Bonding curves are not supported on ${network.toUpperCase()}. This option will be ignored.`));
        cmdOptions.enableBondingCurve = false;
      }

      const walletData = await getWalletData<WalletData>(true);
      const wallet = getWalletKeysForNetwork(walletData, network);

      // Determine default decimals based on network
      const defaultDecimals = network === 'sol' 
        ? '9' 
        : network === 'xrp' 
          ? '6'  // XRP tokens typically use 6 decimal places 
          : '18';
      const decimals = parseInt(cmdOptions.decimals || defaultDecimals);
      const initialSupply = parseInt(cmdOptions.initialSupply || '1000000');

      // Display parameters
      const divider = '─'.repeat(50);
      console.log(chalk.blue('\n┌' + divider + '┐'));
      console.log(chalk.blue('│') + chalk.yellow(' Token Creation Details '.padEnd(49)) + chalk.blue('│'));
      console.log(chalk.blue('├' + divider + '┤'));
      console.log(chalk.blue('│') + ` Name: ${cmdOptions.name}`.padEnd(49) + chalk.blue('│'));
      console.log(chalk.blue('│') + ` Symbol: ${cmdOptions.symbol}`.padEnd(49) + chalk.blue('│'));
      console.log(chalk.blue('│') + ` Decimals: ${decimals}`.padEnd(49) + chalk.blue('│'));
      console.log(chalk.blue('│') + ` Initial Supply: ${initialSupply}`.padEnd(49) + chalk.blue('│'));
      console.log(chalk.blue('│') + ` Network: ${network.toUpperCase()}`.padEnd(49) + chalk.blue('│'));

      // Show bonding curve details only for EVM networks
      if (cmdOptions.enableBondingCurve && network !== 'sol' && network !== 'xrp') {
        console.log(chalk.blue('├' + divider + '┤'));
        console.log(chalk.blue('│') + chalk.yellow(' Bonding Curve Settings '.padEnd(49)) + chalk.blue('│'));
        console.log(chalk.blue('│') + ` Initial Price: ${cmdOptions.initialPrice}`.padEnd(49) + chalk.blue('│'));
        console.log(chalk.blue('│') + ` Price Delta: ${cmdOptions.priceDelta}`.padEnd(49) + chalk.blue('│'));
        if (cmdOptions.curveType) {
          console.log(chalk.blue('│') + ` Curve Type: ${cmdOptions.curveType.toUpperCase()}`.padEnd(49) + chalk.blue('│'));
        }
      }
      console.log(chalk.blue('└' + divider + '┘\n'));

      // Confirm creation
      const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'Create token with these parameters?',
          default: false
        }
      ]);

      if (!confirm) {
        console.log(chalk.yellow('\nToken creation cancelled'));
        return;
      }

      let tokenAddress: string;

      switch (network) {
        case 'sol':
          const solConnection = new Connection(clusterApiUrl('devnet'), 'confirmed');
          const solTokenDetails: SolTokenDetails = {
            name: cmdOptions.name,
            symbol: cmdOptions.symbol,
            decimals,
            initialSupply
          };

          tokenAddress = await createSolanaToken(
            solConnection,
            wallet.privateKey,
            solTokenDetails
          );

          console.log(chalk.yellow('\nView on Explorer:'));
          console.log(chalk.cyan(`https://explorer.solana.com/address/${tokenAddress}?cluster=devnet`));
          break;
          case 'xrp':
            case 'xrptestnet':
                const xrpTokenDetails: XRPTokenDetails = {
                    name: cmdOptions.name,
                    symbol: cmdOptions.symbol,
                    decimals,
                    initialSupply,
                    maximumAmount: (initialSupply * Math.pow(10, decimals)).toString(),
                    flags: {
                        canFreeze: true,
                        canClawback: false
                    },
                    network
                };
            
                // Explicitly use the testnet wallet details for xrptestnet
                const xrpWallet = walletData.xrp;
                const networkSpecificWallet = {
                    privateKey: network === 'xrptestnet' 
                        ? xrpWallet.testnet.privateKey 
                        : xrpWallet.mainnet.privateKey,
                    address: network === 'xrptestnet' 
                        ? xrpWallet.testnet.address 
                        : xrpWallet.mainnet.address
                };
            
                const xrpWalletStructure = {
                    mainnet: {
                        privateKey: xrpWallet.mainnet.privateKey,
                        address: xrpWallet.mainnet.address
                    },
                    testnet: {
                        privateKey: xrpWallet.testnet.privateKey,
                        address: xrpWallet.testnet.address
                    }
                };
                
                const xrpTokenResult = await createXRPToken(
                    xrpTokenDetails,
                    xrpWalletStructure
                );
            
                tokenAddress = xrpTokenResult.tokenAddress;
            
                console.log(chalk.yellow('\nView on Explorer:'));
                if (network === 'xrptestnet') {
                    console.log(chalk.cyan(`https://testnet.xrpl.org/token/${tokenAddress}`));
                } else {
                    console.log(chalk.cyan(`https://livenet.xrpl.org/token/${tokenAddress}`));
                }
                break;
        default:  // EVM networks (eth, base)
          const rpcUrl = getRPCUrl(convertNetworkToRPC(network));
          if (!rpcUrl) {
            throw new Error(`${network.toUpperCase()} RPC URL not configured`);
          }

          const tokenDetails: EVMTokenDetails = {
            name: cmdOptions.name,
            symbol: cmdOptions.symbol,
            decimals,
            initialSupply,
            network: (network === 'eth' || network === 'base' ? network : 'eth')
          };

          tokenAddress = await createEVMToken(
            tokenDetails,
            wallet.privateKey
          );

          if (cmdOptions.enableBondingCurve) {
            console.log(chalk.yellow('\nDeploying bonding curve...'));

            // Convert string curve type to enum value
            const curveType = cmdOptions.curveType ? 
              CurveType[cmdOptions.curveType.toUpperCase() as keyof typeof CurveType] || CurveType.LINEAR :
              CurveType.LINEAR;

            const bondingCurveParams: BondingCurveDeployParams = {
              name: cmdOptions.name + ' Bonding Curve',
              symbol: cmdOptions.symbol + '-BC',
              initialSupply,
              initialPrice: parseFloat(cmdOptions.initialPrice || '0.1'),
              delta: parseFloat(cmdOptions.priceDelta || '0.0001'),
              curveType, 
              minPrice: parseFloat(cmdOptions.minPrice || String(parseFloat(cmdOptions.initialPrice || '0.1') * 0.5)),
              maxPrice: parseFloat(cmdOptions.maxPrice || String(parseFloat(cmdOptions.initialPrice || '0.1') * 10)),
              minTradeSize: parseFloat(cmdOptions.minTradeSize || '0.00001'),
              maxTradeSize: parseFloat(cmdOptions.maxTradeSize || '10'),
              feePercent: parseFloat(cmdOptions.feePercent || '0.1'),
              owner: wallet.address
            };

            // Similarly for bonding curve
            const bondingCurveAddress = await deployBondingCurve(
              bondingCurveParams,
              wallet.privateKey,
              (network === 'eth' || network === 'base' ? network : 'eth')
            );

            console.log(chalk.blue('\n┌' + divider + '┐'));
            console.log(chalk.blue('│') + chalk.yellow(' Bonding Curve Deployed '.padEnd(49)) + chalk.blue('│'));
            console.log(chalk.blue('├' + divider + '┤'));
            console.log(chalk.blue('│') + ` Bonding Curve Address: ${bondingCurveAddress}`.padEnd(49) + chalk.blue('│'));
            console.log(chalk.blue('└' + divider + '┘\n'));
          }

          const explorerUrl = network === 'eth'
            ? `https://holesky.etherscan.io/token/${tokenAddress}`
            : `https://basescan.org/token/${tokenAddress}`;

          console.log(chalk.yellow('\nView on Explorer:'));
          console.log(chalk.cyan(explorerUrl));
          break;
      }

      // Success message
      console.log(chalk.blue('\n┌' + divider + '┐'));
      console.log(chalk.blue('│') + chalk.green(' Token Created Successfully '.padEnd(49)) + chalk.blue('│'));
      console.log(chalk.blue('├' + divider + '┤'));
      console.log(chalk.blue('│') + ` Token Address: ${tokenAddress}`.padEnd(49) + chalk.blue('│'));
      console.log(chalk.blue('│') + ` Owner: ${wallet.address}`.padEnd(49) + chalk.blue('│'));
      console.log(chalk.blue('└' + divider + '┘\n'));

    } catch (error) {
      console.error(chalk.red('\nError creating token:'), error instanceof Error ? error.message : String(error));

      throw error; 
    }
  });