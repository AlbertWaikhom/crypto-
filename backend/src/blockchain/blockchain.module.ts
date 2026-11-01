import { Global, Injectable, Logger, Module } from '@nestjs/common';
import {
  createBlockchainSuite,
  DepositVerificationResult,
} from '@navrix/blockchain';
import { BlockchainNetwork } from '@navrix/types';
import { SettingsService } from '../settings/settings.service';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class BlockchainApiService {
  private readonly logger = new Logger(BlockchainApiService.name);

  constructor(
    private readonly settingsService: SettingsService,
    private readonly prisma: PrismaService,
  ) {}

  async verifyDepositOnChain(params: {
    depositId: string;
    transactionHash: string;
    expectedAmount: string;
    expectedReceivingAddress: string;
  }): Promise<DepositVerificationResult> {
    const runtime = await this.settingsService.getRuntimeSettings();
    const suite = createBlockchainSuite({
      mode: runtime.blockchainMode,
      chainId: runtime.chainId,
      usdtContractAddress: runtime.usdtContractAddress,
      receivingWalletAddress: runtime.receivingWalletAddress,
      requiredConfirmations: runtime.requiredConfirmations,
    });

    const result = await suite.verificationService.verifyDepositTransaction({
      transactionHash: params.transactionHash,
      expectedReceivingAddress: params.expectedReceivingAddress,
      expectedTokenContract: runtime.usdtContractAddress,
      expectedNetwork: BlockchainNetwork.BNB_SMART_CHAIN,
      expectedAmount: params.expectedAmount,
      requiredConfirmations: runtime.requiredConfirmations,
      isAlreadyUsed: async (normalizedHash: string) => {
        const [existingSub, existingChainTx] = await Promise.all([
          this.prisma.paymentSubmission.findUnique({
            where: { transactionHash: normalizedHash },
            select: { depositId: true },
          }),
          this.prisma.blockchainTransaction.findUnique({
            where: { transactionHash: normalizedHash },
            select: { depositId: true, withdrawalId: true },
          }),
        ]);

        if (existingSub && existingSub.depositId !== params.depositId) {
          return true;
        }
        if (
          existingChainTx &&
          (existingChainTx.withdrawalId !== null ||
            (existingChainTx.depositId !== null &&
              existingChainTx.depositId !== params.depositId))
        ) {
          return true;
        }
        return false;
      },
    });

    if (!result.isValid) {
      this.logger.warn({
        event: 'BLOCKCHAIN_VERIFICATION_FAILED',
        depositId: params.depositId,
        txHash: result.transactionHash,
        mode: result.mode,
        failureCode: result.failureCode,
        confirmations: result.confirmationCount,
      });
    }

    return result;
  }

  async getVaultTelemetry() {
    const runtime = await this.settingsService.getRuntimeSettings();
    const suite = createBlockchainSuite({
      mode: runtime.blockchainMode,
      chainId: runtime.chainId,
      usdtContractAddress: runtime.usdtContractAddress,
      receivingWalletAddress: runtime.receivingWalletAddress,
      requiredConfirmations: runtime.requiredConfirmations,
    });
    return suite.tokenService.getVaultOnChainBalances(runtime.receivingWalletAddress);
  }
}

@Global()
@Module({
  providers: [BlockchainApiService],
  exports: [BlockchainApiService],
})
export class BlockchainApiModule {}

