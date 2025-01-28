import { FeeRates, NetworkType } from '../types/network';
import Web3 from 'web3';
import axios from 'axios';
import { getRPCUrl } from './rpcUtils';
import { dag4 } from '@stardust-collective/dag4';
import { Client } from 'xrpl';

export class GasFees {
  private network: NetworkType;
  private defaultFees: Record<NetworkType, FeeRates>;

  constructor(network: NetworkType) {
    this.network = network;
    this.defaultFees = {
      btc: { low: 8, medium: 12, high: 20 },
      btctestnet: { low: 1, medium: 2, high: 5 },
      eth: { low: 30, medium: 40, high: 50 },
      base: { low: 0.001, medium: 0.002, high: 0.003 },
      sol: { low: 0, medium: 0, high: 0 },
      dag: { low: 0.01, medium: 0.02, high: 0.03 },
      xrp: { low: 0.000010, medium: 0.000012, high: 0.000015 },
      xrpmainnet: { low: 0.000010, medium: 0.000012, high: 0.000015 },
      xrptestnet: { low: 0.000010, medium: 0.000012, high: 0.000015 }
    };
  }

  async fetchGasFees(): Promise<FeeRates | null> {
    try {
      switch (this.network) {
        case 'btc':
        case 'btctestnet':
          const fees = await this.fetchBTCFees();
          return fees || this.defaultFees[this.network];
        case 'eth':
        case 'base':
          return await this.fetchETHFees();
        case 'dag':
          return await this.fetchDAGFees();
        case 'xrp':
        case 'xrpmainnet':
        case 'xrptestnet':
          return await this.fetchXRPFees();
        case 'sol':
          return this.defaultFees[this.network];
        default:
          return null;
      }
    } catch (error) {
      console.warn('Error fetching gas fees, using defaults:', error);
      return this.defaultFees[this.network] || null;
    }
  }

  private async fetchDAGFees(): Promise<FeeRates | null> {
    try {
      const feeRecommendation = await dag4.account.getFeeRecommendation();

      return {
        low: parseFloat((feeRecommendation * 0.8).toFixed(4)),
        medium: feeRecommendation,
        high: parseFloat((feeRecommendation * 1.2).toFixed(4))
      };
    } catch (error) {
      console.error('Error fetching DAG fees:', error);
      return this.defaultFees.dag;
    }
  }

  private async fetchXRPFees(): Promise<FeeRates | null> {
    let client: Client | null = null;
    try {
        const rpcUrl = getRPCUrl('XRP');
        client = new Client(rpcUrl);
        await client.connect();
        
        // Get network fee information using the fee command
        const feeResponse = await client.request({
            command: 'fee'
        });
        
        // Extract fees from response and convert from drops to XRP
        const baseFee = Number(feeResponse.result.drops.base_fee) / 1000000;
        const openLedgerFee = Number(feeResponse.result.drops.open_ledger_fee) / 1000000;
        
        return {
            low: parseFloat(baseFee.toFixed(6)),
            medium: parseFloat(openLedgerFee.toFixed(6)),
            high: parseFloat((openLedgerFee * 1.2).toFixed(6))
        };
    } catch (error) {
        console.error('Error fetching XRP fees:', error);
        return this.defaultFees.xrp;
    } finally {
        if (client) {
            await client.disconnect().catch(error => {
                console.warn('Error disconnecting XRP client:', error);
            });
        }
    }
  }

  private async fetchBTCFees(): Promise<FeeRates | null> {
    const endpoints = this.network === 'btc'
      ? ['https://mempool.space/api/v1/fees/recommended']
      : ['https://mempool.space/testnet4/api/v1/fees/recommended'];

    for (const api of endpoints) {
      try {
        const { data } = await axios.get<{
          minimumFee: number;
          halfHourFee: number;
          fastestFee: number;
        }>(api, {
          timeout: 10000,
          headers: { 'Accept': 'application/json' }
        });

        if (data) {
          console.log(`Successfully fetched fees from ${api}:`, data);
          return {
            low: data.minimumFee || this.defaultFees[this.network].low,
            medium: data.halfHourFee || this.defaultFees[this.network].medium,
            high: data.fastestFee || this.defaultFees[this.network].high
          };
        }
      } catch (error) {
        console.warn(`Failed to fetch fees from ${api}:`, error);
      }
    }
    return this.defaultFees[this.network];
  }

  private async fetchETHFees(): Promise<FeeRates | null> {
    try {
      const rpcUrl = getRPCUrl(this.network.toUpperCase() as 'SOLANA' | 'ETH' | 'BASE');
      if (!rpcUrl) throw new Error(`RPC URL not configured for network: ${this.network}`);

      const web3 = new Web3(rpcUrl);
      const gasPrice = await web3.eth.getGasPrice();
      const gasPriceGwei = web3.utils.fromWei(gasPrice, 'gwei');
      const basePrice = parseFloat(gasPriceGwei);

      return {
        low: parseFloat((basePrice * 0.9).toFixed(2)),
        medium: parseFloat(basePrice.toFixed(2)),
        high: parseFloat((basePrice * 1.1).toFixed(2))
      };
    } catch (error) {
      console.error(`Error fetching ETH fees for ${this.network}:`, error);
      return null;
    }
  }

  getCurrentDefaultFees(): FeeRates {
    return this.defaultFees[this.network];
  }
}