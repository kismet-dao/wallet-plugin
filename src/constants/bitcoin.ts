// src/constants/bitcoin.ts
import { NetworkConfig } from "../types/bitcoin";

export const BTC_TO_SATOSHI = 100000000;

export const bitcoinMainnet: NetworkConfig = {
  bech32: 'bc',
  pubKeyHash: 0x00,
  scriptHash: 0x05,
  wif: 0x80,
  minimumFee: 1000,
  dustThreshold: 546,
  defaultSequence: 0xffffffff
};

export const bitcoinTestnet: NetworkConfig = {
  bech32: 'tb',
  pubKeyHash: 0x6f,
  scriptHash: 0xc4,
  wif: 0xef,
  minimumFee: 1000,
  dustThreshold: 546,
  defaultSequence: 0xffffffff
};