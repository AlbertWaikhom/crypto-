import { Injectable } from '@nestjs/common';
import { BLOCKCHAIN_DEFAULTS } from '@navrix/config';
import { BlockchainMode, BlockchainNetwork } from '@navrix/types';
import { PrismaService } from '../common/prisma.service';

export interface PlatformRuntimeSettings {
  blockchainMode: BlockchainMode;
  blockchainNetwork: BlockchainNetwork;
  chainId: number;
  usdtContractAddress: string;
  receivingWalletAddress: string;
  requiredConfirmations: number;
  minDeposit: number;
  maxDeposit: number;
  minWithdrawal: number;
  maxWithdrawal: number;
  depositExpiryMinutes: number;
  reviewSlaHours: number;
  depositsEnabled: boolean;
  withdrawalsEnabled: boolean;
  maintenanceMode: boolean;
}

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllMap(): Promise<Record<string, string>> {
    const rows = await this.prisma.systemSetting.findMany();
    const map: Record<string, string> = {};
    for (const r of rows) {
      map[r.key] = r.value;
    }
    return map;
  }

  async getRuntimeSettings(): Promise<PlatformRuntimeSettings> {
    const map = await this.getAllMap();
    const mode =
      ((map.BLOCKCHAIN_MODE || process.env.BLOCKCHAIN_MODE) as BlockchainMode) ||
      BlockchainMode.MOCK;
    const isMainnet = mode === BlockchainMode.MAINNET;

    return {
      blockchainMode: mode,
      blockchainNetwork: BlockchainNetwork.BNB_SMART_CHAIN,
      chainId: Number(
        map.CHAIN_ID ||
          (isMainnet
            ? BLOCKCHAIN_DEFAULTS.mainnetChainId
            : BLOCKCHAIN_DEFAULTS.testnetChainId),
      ),
      usdtContractAddress:
        map.USDT_CONTRACT_ADDRESS ||
        (isMainnet
          ? process.env.USDT_CONTRACT_ADDRESS ||
            BLOCKCHAIN_DEFAULTS.mainnetUsdtContract
          : process.env.USDT_TESTNET_CONTRACT_ADDRESS ||
            BLOCKCHAIN_DEFAULTS.testnetUsdtContract),
      receivingWalletAddress:
        map.RECEIVING_WALLET_ADDRESS ||
        process.env.RECEIVING_WALLET_ADDRESS ||
        BLOCKCHAIN_DEFAULTS.defaultReceivingAddress,
      requiredConfirmations: Number(
        map.REQUIRED_CONFIRMATIONS || process.env.REQUIRED_CONFIRMATIONS || 12,
      ),
      minDeposit: Number(map.MIN_DEPOSIT || process.env.MIN_DEPOSIT || 10),
      maxDeposit: Number(map.MAX_DEPOSIT || process.env.MAX_DEPOSIT || 100000),
      minWithdrawal: Number(map.MIN_WITHDRAWAL || process.env.MIN_WITHDRAWAL || 20),
      maxWithdrawal: Number(map.MAX_WITHDRAWAL || process.env.MAX_WITHDRAWAL || 50000),
      depositExpiryMinutes: Number(
        map.DEPOSIT_EXPIRY_MINUTES || process.env.DEPOSIT_EXPIRY_MINUTES || 120,
      ),
      reviewSlaHours: Number(
        map.REVIEW_SLA_HOURS || process.env.REVIEW_SLA_HOURS || 24,
      ),
      depositsEnabled: (map.DEPOSITS_ENABLED ?? 'true') === 'true',
      withdrawalsEnabled: (map.WITHDRAWALS_ENABLED ?? 'true') === 'true',
      maintenanceMode: (map.MAINTENANCE_MODE ?? 'false') === 'true',
    };
  }

  async upsertSetting(params: {
    key: string;
    value: string;
    description?: string;
    category?: string;
    isPublic?: boolean;
    updatedById: string;
  }) {
    const existing = await this.prisma.systemSetting.findUnique({
      where: { key: params.key },
    });

    const updated = await this.prisma.systemSetting.upsert({
      where: { key: params.key },
      update: {
        value: params.value,
        description: params.description ?? existing?.description,
        updatedById: params.updatedById,
      },
      create: {
        key: params.key,
        value: params.value,
        category: params.category || 'GENERAL',
        isPublic: params.isPublic ?? false,
        description: params.description,
        updatedById: params.updatedById,
      },
    });

    return { oldValue: existing?.value ?? null, updated };
  }
}

