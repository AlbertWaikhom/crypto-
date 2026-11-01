import { BlockchainMode, BlockchainNetwork } from '@navrix/types';

export type VerificationFailureCode =
  | 'INVALID_TX_HASH'
  | 'DUPLICATE_TRANSACTION'
  | 'TX_NOT_FOUND'
  | 'TX_REVERTED'
  | 'WRONG_NETWORK'
  | 'NO_TRANSFER_EVENT'
  | 'WRONG_TOKEN_CONTRACT'
  | 'WRONG_RECIPIENT'
  | 'WRONG_AMOUNT'
  | 'INSUFFICIENT_CONFIRMATIONS'
  | 'RPC_ERROR';

export interface BlockchainRuntimeConfig {
  mode: BlockchainMode;
  mainnetEnabled?: boolean;
  network: BlockchainNetwork;
  rpcUrl: string;
  chainId: number;
  usdtContractAddress: string;
  usdtDecimals: number;
  receivingWalletAddress: string;
  requiredConfirmations: number;
}

export interface VerifyDepositInput {
  transactionHash: string;
  expectedReceivingAddress: string;
  expectedTokenContract: string;
  expectedNetwork: BlockchainNetwork;
  expectedAmount: string;
  expectedDecimals?: number;
  requiredConfirmations?: number;
  isAlreadyUsed?: (txHash: string) => Promise<boolean>;
}

export interface RawTransferLogData {
  tokenContract: string;
  from: string;
  to: string;
  valueRaw: bigint;
}

export interface FetchedChainTransaction {
  exists: boolean;
  chainId: number;
  transactionHash: string;
  succeeded: boolean;
  blockNumber: bigint | null;
  currentBlockNumber: bigint;
  blockTimestamp: Date | null;
  transferLogs: RawTransferLogData[];
}

export interface DepositVerificationResult {
  isValid: boolean;
  mode: BlockchainMode;
  transactionHash: string;
  network: BlockchainNetwork;
  chainId: number;
  txSucceeded: boolean;
  blockNumber: bigint | null;
  blockTimestamp: Date | null;
  fromAddress: string | null;
  toAddress: string | null;
  tokenContract: string | null;
  tokenAmount: string | null;
  confirmationCount: number;
  requiredConfirmations: number;
  failureCode?: VerificationFailureCode;
  failureReason?: string;
}

