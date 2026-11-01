import { BlockchainNetwork } from '@navrix/types';
import { BlockchainClient } from '../clients/blockchain-client';
import { ConfirmationService } from './confirmation-service';
import { TransactionService } from './transaction-service';
import {
  DepositVerificationResult,
  VerificationFailureCode,
  VerifyDepositInput,
} from '../types';
import {
  addressesEqual,
  formatUnitsToDecimal,
  isValidBscTxHash,
  normalizeHex,
  parseTokenAmountToUnits,
} from '../validators';

export class DepositVerificationService {
  constructor(
    private readonly client: BlockchainClient,
    private readonly transactionService: TransactionService,
    private readonly confirmationService: ConfirmationService,
  ) {}

  /**
   * Authoritative 9-step server-side BEP-20 USDT deposit verification.
   * Never trusts screenshots, client amounts, or client status claims.
   */
  public async verifyDepositTransaction(
    input: VerifyDepositInput,
  ): Promise<DepositVerificationResult> {
    const cfg = this.client.getConfig();
    const decimals = input.expectedDecimals ?? cfg.usdtDecimals;
    const requiredConfirmations =
      input.requiredConfirmations ?? cfg.requiredConfirmations;
    const rawHash = (input.transactionHash || '').trim();

    const fail = (
      failureCode: VerificationFailureCode,
      failureReason: string,
      partial: Partial<DepositVerificationResult> = {},
    ): DepositVerificationResult => ({
      isValid: false,
      mode: cfg.mode,
      transactionHash: isValidBscTxHash(rawHash) ? normalizeHex(rawHash) : rawHash,
      network: input.expectedNetwork,
      chainId: cfg.chainId,
      txSucceeded: false,
      blockNumber: null,
      blockTimestamp: null,
      fromAddress: null,
      toAddress: null,
      tokenContract: null,
      tokenAmount: null,
      confirmationCount: 0,
      requiredConfirmations,
      failureCode,
      failureReason,
      ...partial,
    });

    // Step 0: Hash format check
    if (!isValidBscTxHash(rawHash)) {
      return fail(
        'INVALID_TX_HASH',
        'Invalid BNB Smart Chain transaction hash format. Expected 0x followed by 64 hex characters.',
      );
    }

    const normalizedHash = normalizeHex(rawHash);

    // Step 9 (Early Check): Duplicate / replay prevention
    if (input.isAlreadyUsed) {
      const alreadyUsed = await input.isAlreadyUsed(normalizedHash);
      if (alreadyUsed) {
        return fail(
          'DUPLICATE_TRANSACTION',
          'This blockchain transaction hash has already been used for another deposit.',
        );
      }
    }

    // Network config sanity check
    if (input.expectedNetwork !== BlockchainNetwork.BNB_SMART_CHAIN) {
      return fail('WRONG_NETWORK', 'Unsupported blockchain network requested.');
    }

    let chainTx;
    try {
      chainTx = await this.transactionService.fetchTransaction(normalizedHash, {
        expectedTo: input.expectedReceivingAddress,
        expectedTokenContract: input.expectedTokenContract,
        expectedAmount: input.expectedAmount,
        decimals,
      });
    } catch (err) {
      return fail(
        'RPC_ERROR',
        `Unable to reach BNB Smart Chain RPC node: ${(err as Error).message}`,
      );
    }

    // Step 1: Transaction exists
    if (!chainTx.exists) {
      return fail(
        'TX_NOT_FOUND',
        'Transaction hash was not found on BNB Smart Chain.',
      );
    }

    const confirmationCount = this.confirmationService.calculateConfirmations(
      chainTx.blockNumber,
      chainTx.currentBlockNumber,
    );

    // Step 3: Correct chain ID
    if (chainTx.chainId !== cfg.chainId) {
      return fail(
        'WRONG_NETWORK',
        `Transaction occurred on chain ID ${chainTx.chainId}, expected ${cfg.chainId}.`,
        {
          chainId: chainTx.chainId,
          txSucceeded: chainTx.succeeded,
          blockNumber: chainTx.blockNumber,
          blockTimestamp: chainTx.blockTimestamp,
          confirmationCount,
        },
      );
    }

    // Step 2: Transaction succeeded
    if (!chainTx.succeeded) {
      return fail(
        'TX_REVERTED',
        'Blockchain transaction failed or reverted on-chain.',
        {
          txSucceeded: false,
          blockNumber: chainTx.blockNumber,
          blockTimestamp: chainTx.blockTimestamp,
          confirmationCount,
        },
      );
    }

    // Step 4: Contains ERC-20 Transfer event
    if (chainTx.transferLogs.length === 0) {
      return fail(
        'NO_TRANSFER_EVENT',
        'Transaction does not contain any BEP-20/ERC-20 Transfer event.',
        {
          txSucceeded: true,
          blockNumber: chainTx.blockNumber,
          blockTimestamp: chainTx.blockTimestamp,
          confirmationCount,
        },
      );
    }

    // Step 5: Token contract matches configured USDT contract
    const contractMatches = chainTx.transferLogs.filter((l) =>
      addressesEqual(l.tokenContract, input.expectedTokenContract),
    );
    if (contractMatches.length === 0) {
      const firstLog = chainTx.transferLogs[0]!;
      return fail(
        'WRONG_TOKEN_CONTRACT',
        `Transferred token contract (${firstLog.tokenContract}) does not match configured BEP-20 USDT contract.`,
        {
          txSucceeded: true,
          blockNumber: chainTx.blockNumber,
          blockTimestamp: chainTx.blockTimestamp,
          fromAddress: firstLog.from,
          toAddress: firstLog.to,
          tokenContract: firstLog.tokenContract,
          tokenAmount: formatUnitsToDecimal(firstLog.valueRaw, decimals),
          confirmationCount,
        },
      );
    }

    // Step 6: Recipient matches platform receiving address
    const recipientMatches = contractMatches.filter((l) =>
      addressesEqual(l.to, input.expectedReceivingAddress),
    );
    if (recipientMatches.length === 0) {
      const firstContractLog = contractMatches[0]!;
      return fail(
        'WRONG_RECIPIENT',
        `Transfer recipient (${firstContractLog.to}) does not match platform receiving wallet (${input.expectedReceivingAddress}).`,
        {
          txSucceeded: true,
          blockNumber: chainTx.blockNumber,
          blockTimestamp: chainTx.blockTimestamp,
          fromAddress: firstContractLog.from,
          toAddress: firstContractLog.to,
          tokenContract: firstContractLog.tokenContract,
          tokenAmount: formatUnitsToDecimal(firstContractLog.valueRaw, decimals),
          confirmationCount,
        },
      );
    }

    // Sum matching transfers in case of batched Transfer logs to receiving address
    const totalTransferredRaw = recipientMatches.reduce(
      (acc, l) => acc + l.valueRaw,
      0n,
    );
    const primaryLog = recipientMatches[0]!;
    const actualAmountFormatted = formatUnitsToDecimal(totalTransferredRaw, decimals);
    const expectedAmountRaw = parseTokenAmountToUnits(input.expectedAmount, decimals);

    // Step 7: Exact amount check
    if (totalTransferredRaw !== expectedAmountRaw) {
      return fail(
        'WRONG_AMOUNT',
        `On-chain USDT amount (${actualAmountFormatted} USDT) does not match deposit amount (${input.expectedAmount} USDT).`,
        {
          txSucceeded: true,
          blockNumber: chainTx.blockNumber,
          blockTimestamp: chainTx.blockTimestamp,
          fromAddress: primaryLog.from,
          toAddress: primaryLog.to,
          tokenContract: primaryLog.tokenContract,
          tokenAmount: actualAmountFormatted,
          confirmationCount,
        },
      );
    }

    // Step 8: Sufficient confirmations
    if (
      !this.confirmationService.hasSufficientConfirmations(
        confirmationCount,
        requiredConfirmations,
      )
    ) {
      return fail(
        'INSUFFICIENT_CONFIRMATIONS',
        `Transaction has ${confirmationCount} confirmations; ${requiredConfirmations} confirmations are required.`,
        {
          txSucceeded: true,
          blockNumber: chainTx.blockNumber,
          blockTimestamp: chainTx.blockTimestamp,
          fromAddress: primaryLog.from,
          toAddress: primaryLog.to,
          tokenContract: primaryLog.tokenContract,
          tokenAmount: actualAmountFormatted,
          confirmationCount,
        },
      );
    }

    return {
      isValid: true,
      mode: cfg.mode,
      transactionHash: normalizedHash,
      network: input.expectedNetwork,
      chainId: chainTx.chainId,
      txSucceeded: true,
      blockNumber: chainTx.blockNumber,
      blockTimestamp: chainTx.blockTimestamp,
      fromAddress: primaryLog.from,
      toAddress: primaryLog.to,
      tokenContract: primaryLog.tokenContract,
      tokenAmount: actualAmountFormatted,
      confirmationCount,
      requiredConfirmations,
    };
  }
}

