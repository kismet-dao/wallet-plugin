// src/networks/index.ts
import { Network } from './Network';
import { BTCNetwork } from './BTCNetwork';
import { BTCTestnetNetwork } from './BTCTestnetNetwork';
import { ETHHoleskyNetwork } from './ETHHoleskyNetwork';
import { SOLNetwork } from './SOLNetwork';
import { BASENetwork } from './BASENetwork';
import { DAGNetwork } from './DAGNetwork';
import { XRPNetwork } from './XRPNetwork';
import { getRPCUrl } from '../utils/rpcUtils';

// Update NetworkType to include XRP variations
type NetworkType = 'btc' | 'btctestnet' | 'eth' | 'sol' | 'base' | 'dag' | 'xrp' | 'xrpmainnet' | 'xrptestnet';

export const getNetworkInstance = (network: string): Network => {
    let rpcUrl: string | undefined;

    switch (network.toLowerCase()) {
        case 'eth':
            rpcUrl = getRPCUrl('ETH');
            break;
        case 'sol':
            rpcUrl = getRPCUrl('SOLANA');
            break;
        case 'base':
            rpcUrl = getRPCUrl('BASE');
            break;
        case 'dag':
            rpcUrl = getRPCUrl('DAG');
            break;
        case 'xrp':
        case 'xrpmainnet':
            rpcUrl = getRPCUrl('XRP');
            break;
        case 'xrptestnet':
            rpcUrl = getRPCUrl('XRPTESTNET');
            break;
        default:
            rpcUrl = undefined;
            break;
    }

    switch (network.toLowerCase() as NetworkType) {
        case 'btc':
            return new BTCNetwork();
        case 'btctestnet':
            return new BTCTestnetNetwork();
        case 'eth':
            if (!rpcUrl) throw new Error('ETH RPC URL is missing.');
            return new ETHHoleskyNetwork(rpcUrl);
        case 'sol':
            if (!rpcUrl) throw new Error('SOL RPC URL is missing.');
            return new SOLNetwork(rpcUrl);
        case 'base':
            if (!rpcUrl) throw new Error('BASE RPC URL is missing.');
            return new BASENetwork(rpcUrl);
        case 'dag':
            if (!rpcUrl) throw new Error('DAG RPC URL is missing.');
            return new DAGNetwork(rpcUrl);
        case 'xrp':
        case 'xrpmainnet':
            if (!rpcUrl) throw new Error('XRP RPC URL is missing.');
            return new XRPNetwork(rpcUrl);
        case 'xrptestnet':
            if (!rpcUrl) throw new Error('XRP Testnet RPC URL is missing.');
            return new XRPNetwork(rpcUrl);
        default:
            throw new Error(`Unsupported blockchain network: ${network}`);
    }
};

export { 
    Network, 
    BTCNetwork, 
    BTCTestnetNetwork, 
    ETHHoleskyNetwork, 
    SOLNetwork, 
    BASENetwork,
    DAGNetwork,
    XRPNetwork,
    type NetworkType
};