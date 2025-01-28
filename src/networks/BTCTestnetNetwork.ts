// src/networks/BTCTestnetNetwork.ts
import { BTCNetworkBase } from './BTCNetworkBase';

// src/networks/BTCTestnetNetwork.ts
export class BTCTestnetNetwork extends BTCNetworkBase {
  protected getEndpoints(): string[] {
    return [
      'https://blockstream.info/testnet/api/address/{address}/utxo',
      'https://mempool.space/testnet4/api/address/{address}/utxo'
    ];
  }

  protected getNetworkName(): string {
    return 'BTCTestnet';
  }
}
