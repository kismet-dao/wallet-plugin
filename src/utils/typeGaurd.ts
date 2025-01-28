import { INetwork, IUTXONetwork } from "../types/network";

// src/utils/typeGuards.ts
export const isUTXONetwork = (network: INetwork): network is IUTXONetwork => {
    return network.isUtxoBased === true && 'getUtxos' in network;
  };
  