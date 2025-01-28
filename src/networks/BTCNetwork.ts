// src/networks/BTCNetwork.ts
import { BTCNetworkBase } from './BTCNetworkBase';

export class BTCNetwork extends BTCNetworkBase {
  protected getEndpoints(): string[] {
    return [
      'https://mempool.space/api/address/{address}/utxo',
      'https://blockstream.info/api/address/{address}/utxo'
    ];
  }

  protected getNetworkName(): string {
    return 'BTC';
  }
}