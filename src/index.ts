// src/index.ts
import { Network } from './networks/Network';
import { BTCNetwork } from './networks/BTCNetwork';
import { BTCTestnetNetwork } from './networks/BTCTestnetNetwork';
import { ETHHoleskyNetwork } from './networks/ETHHoleskyNetwork';
import { SOLNetwork } from './networks/SOLNetwork';
import { BASENetwork } from './networks/BASENetwork';
import { DAGNetwork } from './networks/DAGNetwork';
import { XRPNetwork } from './networks/XRPNetwork';
import { NETWORK_DEFAULTS } from './constants/networks';
import * as transactions from './transactions';
import * as types from './types';
import * as utils from './utils';

// Re-export all types
export * from './types';

// Re-export all utilities
export * from './utils';

// Factory function to create network instances
export function createNetworkInstance(network: string, config = {}): Network {
    const networkType = network.toLowerCase() as types.NetworkType;
    
    switch (networkType) {
        case 'btc':
            return new BTCNetwork();
        case 'btctestnet':
            return new BTCTestnetNetwork();
        case 'eth':
            return new ETHHoleskyNetwork(NETWORK_DEFAULTS.ETH_RPC_URL);
        case 'sol':
            return new SOLNetwork(NETWORK_DEFAULTS.SOLANA_RPC_URL);
        case 'base':
            return new BASENetwork(NETWORK_DEFAULTS.BASE_RPC_URL);
        case 'dag':
            return new DAGNetwork();
        case 'xrp':
            return new XRPNetwork(NETWORK_DEFAULTS.XRP_RPC_URL);
        case 'xrptestnet':
            return new XRPNetwork(NETWORK_DEFAULTS.XRP_TESTNET_RPC_URL);
        default:
            throw new Error(`Unsupported network type: ${network}`);
    }
}

// Export network-related classes and types
export {
    Network,
    BTCNetwork,
    BTCTestnetNetwork,
    ETHHoleskyNetwork,
    SOLNetwork,
    BASENetwork,
    DAGNetwork,
    XRPNetwork,
    NETWORK_DEFAULTS
};

// Export all transaction-related functionality
export { transactions };

// Export types namespace
export { types };

// Export utils namespace
export { utils };