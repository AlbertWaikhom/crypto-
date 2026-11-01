export * from './types';
export * from './validators';
export * from './contracts/erc20';
export * from './clients/blockchain-client';
export * from './services/token-service';
export * from './services/confirmation-service';
export * from './services/transaction-service';
export * from './services/deposit-verification-service';

import { BlockchainClient } from './clients/blockchain-client';
import { TokenService } from './services/token-service';
import { ConfirmationService } from './services/confirmation-service';
import { TransactionService } from './services/transaction-service';
import { DepositVerificationService } from './services/deposit-verification-service';
import { BlockchainRuntimeConfig } from './types';

export function createBlockchainSuite(
  overrides: Partial<BlockchainRuntimeConfig> = {},
) {
  const client = new BlockchainClient(overrides);
  const tokenService = new TokenService(client);
  const confirmationService = new ConfirmationService();
  const transactionService = new TransactionService(client, tokenService);
  const verificationService = new DepositVerificationService(
    client,
    transactionService,
    confirmationService,
  );

  return {
    client,
    tokenService,
    confirmationService,
    transactionService,
    verificationService,
  };
}

