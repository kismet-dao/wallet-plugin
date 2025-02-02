// src/networks/Network.ts
import { Connection } from "@solana/web3.js";
import { INetwork, UTXO } from "../types/network";
import Web3 from "web3";

export abstract class Network implements INetwork {
  public abstract readonly isUtxoBased: boolean;

  abstract fetchBalance(address: string): Promise<number>;
  abstract calculateBalance(data: any): number;
  abstract disconnect(): Promise<void>;
  abstract initialize(): Promise<void>;

  getConnection(): Connection | null {
    return null;
  }

  getWeb3(): Web3 | null {
    return null;
  }

  getUtxos(): UTXO[] {
    return [];
  }
}