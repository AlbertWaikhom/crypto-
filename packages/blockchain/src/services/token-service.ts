import { Log, parseEventLogs, formatUnits } from 'viem';
import { BlockchainMode } from '@navrix/types';
import { BlockchainClient } from '../clients/blockchain-client';
import { BEP20_USDT_ABI } from '../contracts/erc20';
import { RawTransferLogData } from '../types';

export class TokenService {
  constructor(private readonly client: BlockchainClient) {}

  /**
   * Decodes all standard ERC-20 / BEP-20 Transfer(from, to, value) events
   * emitted inside a transaction receipt.
   */
  public extractErc20TransferLogs(logs: Log[]): RawTransferLogData[] {
    const parsed = parseEventLogs({
      abi: BEP20_USDT_ABI,
      eventName: 'Transfer',
      logs,
      strict: false,
    });

    const transfers: RawTransferLogData[] = [];
    for (const item of parsed) {
      const args = item.args as {
        from?: `0x${string}`;
        to?: `0x${string}`;
        value?: bigint;
      };
      if (args.from && args.to && typeof args.value === 'bigint') {
        transfers.push({
          tokenContract: item.address,
          from: args.from,
          to: args.to,
          valueRaw: args.value,
        });
      }
    }
    return transfers;
  }

  /**
   * Queries on-chain BEP-20 USDT & native BNB balance of the configured receiving vault
   * for the Master Admin Vault Monitor. Never touches any private key.
   */
  public async getVaultOnChainBalances(walletAddress?: string): Promise<{
    mode: BlockchainMode;
    walletAddress: string;
    usdtBalance: string | null;
    bnbBalance: string | null;
    rpcHealthy: boolean;
  }> {
    const cfg = this.client.getConfig();
    const target = (walletAddress || cfg.receivingWalletAddress) as `0x${string}`;

    if (cfg.mode === BlockchainMode.MOCK) {
      return {
        mode: cfg.mode,
        walletAddress: target,
        usdtBalance: null,
        bnbBalance: null,
        rpcHealthy: true,
      };
    }

    try {
      const viem = this.client.getViemClient();
      const [rawBnb, rawUsdt] = await Promise.all([
        viem.getBalance({ address: target }),
        viem.readContract({
          address: cfg.usdtContractAddress as `0x${string}`,
          abi: BEP20_USDT_ABI,
          functionName: 'balanceOf',
          args: [target],
        }),
      ]);

      return {
        mode: cfg.mode,
        walletAddress: target,
        usdtBalance: formatUnits(rawUsdt, cfg.usdtDecimals),
        bnbBalance: formatUnits(rawBnb, 18),
        rpcHealthy: true,
      };
    } catch {
      return {
        mode: cfg.mode,
        walletAddress: target,
        usdtBalance: null,
        bnbBalance: null,
        rpcHealthy: false,
      };
    }
  }
}

