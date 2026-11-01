import { createPublicClient, http, PublicClient } from 'viem';
import { bsc, bscTestnet } from 'viem/chains';
import { BlockchainMode, BlockchainNetwork } from '@navrix/types';
import { BLOCKCHAIN_DEFAULTS } from '@navrix/config';
import { BlockchainRuntimeConfig } from '../types';

export class BlockchainClient {
  private readonly config: BlockchainRuntimeConfig;
  private readonly publicClient: PublicClient | null;

  constructor(overrides: Partial<BlockchainRuntimeConfig> = {}) {
    const mode =
      overrides.mode ??
      ((process.env.BLOCKCHAIN_MODE as BlockchainMode) || BlockchainMode.MOCK);
    const mainnetEnabled =
      overrides.mainnetEnabled ?? process.env.MAINNET_ENABLED === 'true';

    if (mode === BlockchainMode.MAINNET && !mainnetEnabled) {
      throw new Error(
        'SAFETY GUARD: BLOCKCHAIN_MODE=MAINNET requires explicit MAINNET_ENABLED=true configuration.',
      );
    }

    const isMainnet = mode === BlockchainMode.MAINNET;
    const defaultChainId = isMainnet
      ? BLOCKCHAIN_DEFAULTS.mainnetChainId
      : BLOCKCHAIN_DEFAULTS.testnetChainId;
    const defaultUsdt = isMainnet
      ? process.env.USDT_CONTRACT_ADDRESS || BLOCKCHAIN_DEFAULTS.mainnetUsdtContract
      : process.env.USDT_TESTNET_CONTRACT_ADDRESS ||
        BLOCKCHAIN_DEFAULTS.testnetUsdtContract;
    const defaultRpc = isMainnet
      ? process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org/'
      : process.env.BSC_TESTNET_RPC_URL ||
        'https://data-seed-prebsc-1-s1.binance.org:8545/';

    this.config = {
      mode,
      mainnetEnabled,
      network: overrides.network ?? BlockchainNetwork.BNB_SMART_CHAIN,
      rpcUrl: overrides.rpcUrl ?? defaultRpc,
      chainId: overrides.chainId ?? defaultChainId,
      usdtContractAddress: overrides.usdtContractAddress ?? defaultUsdt,
      usdtDecimals:
        overrides.usdtDecimals ?? Number(process.env.USDT_DECIMALS || 18),
      receivingWalletAddress:
        overrides.receivingWalletAddress ??
        (process.env.RECEIVING_WALLET_ADDRESS ||
          BLOCKCHAIN_DEFAULTS.defaultReceivingAddress),
      requiredConfirmations:
        overrides.requiredConfirmations ??
        Number(process.env.REQUIRED_CONFIRMATIONS || 12),
    };

    if (this.config.mode === BlockchainMode.MOCK) {
      this.publicClient = null;
    } else {
      const chain = isMainnet ? bsc : bscTestnet;
      this.publicClient = createPublicClient({
        chain,
        transport: http(this.config.rpcUrl, {
          timeout: 15_000,
          retryCount: 2,
        }),
      });
    }
  }

  public getConfig(): BlockchainRuntimeConfig {
    return { ...this.config };
  }

  public getViemClient(): PublicClient {
    if (!this.publicClient) {
      throw new Error('Viem RPC client is not active when BLOCKCHAIN_MODE=MOCK.');
    }
    return this.publicClient;
  }
}

