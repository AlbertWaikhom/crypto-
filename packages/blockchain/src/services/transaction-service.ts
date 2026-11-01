import { TransactionNotFoundError, TransactionReceiptNotFoundError } from 'viem';
import { BlockchainMode } from '@navrix/types';
import { BlockchainClient } from '../clients/blockchain-client';
import { TokenService } from './token-service';
import { FetchedChainTransaction } from '../types';
import { normalizeHex, parseTokenAmountToUnits } from '../validators';

export class TransactionService {
  private readonly mockRegistry = new Map<string, FetchedChainTransaction>();

  constructor(
    private readonly client: BlockchainClient,
    private readonly tokenService: TokenService,
  ) {}

  /**
   * Allows tests to register explicit mock blockchain receipts.
   */
  public registerMockTransaction(tx: FetchedChainTransaction): void {
    this.mockRegistry.set(normalizeHex(tx.transactionHash), tx);
  }

  public clearMockTransactions(): void {
    this.mockRegistry.clear();
  }

  public async fetchTransaction(
    txHash: string,
    hintExpected?: {
      expectedTo: string;
      expectedTokenContract: string;
      expectedAmount: string;
      decimals: number;
    },
  ): Promise<FetchedChainTransaction> {
    const cfg = this.client.getConfig();
    const normalized = normalizeHex(txHash);

    if (cfg.mode === BlockchainMode.MOCK) {
      if (this.mockRegistry.has(normalized)) {
        return this.mockRegistry.get(normalized)!;
      }
      return this.generateDeterministicMockTx(normalized, hintExpected);
    }

    const viem = this.client.getViemClient();
    const [chainId, currentBlockNumber] = await Promise.all([
      viem.getChainId(),
      viem.getBlockNumber(),
    ]);

    try {
      const receipt = await viem.getTransactionReceipt({
        hash: normalized as `0x${string}`,
      });

      let blockTimestamp: Date | null = null;
      try {
        const block = await viem.getBlock({ blockNumber: receipt.blockNumber });
        blockTimestamp = new Date(Number(block.timestamp) * 1000);
      } catch {
        blockTimestamp = new Date();
      }

      const transferLogs = this.tokenService.extractErc20TransferLogs(receipt.logs);

      return {
        exists: true,
        chainId,
        transactionHash: receipt.transactionHash,
        succeeded: receipt.status === 'success',
        blockNumber: receipt.blockNumber,
        currentBlockNumber,
        blockTimestamp,
        transferLogs,
      };
    } catch (err) {
      if (
        err instanceof TransactionReceiptNotFoundError ||
        err instanceof TransactionNotFoundError
      ) {
        return {
          exists: false,
          chainId,
          transactionHash: normalized,
          succeeded: false,
          blockNumber: null,
          currentBlockNumber,
          blockTimestamp: null,
          transferLogs: [],
        };
      }
      throw err;
    }
  }

  /**
   * Safe deterministic mock mode generator:
   * - 0xdead... => transaction not found
   * - 0xfa11... => transaction reverted (status 0)
   * - 0xbad9... => wrong network / chainId
   * - 0xeeee... => native transfer without ERC-20 Transfer log
   * - 0xbadc... => wrong token contract
   * - 0xbad0... => wrong recipient wallet
   * - 0xbada... => wrong transferred amount
   * - 0x0001... => insufficient confirmations (2 vs 12)
   * - Otherwise => valid simulated BSC BEP-20 USDT transfer
   */
  private generateDeterministicMockTx(
    normalizedHash: string,
    hint?: {
      expectedTo: string;
      expectedTokenContract: string;
      expectedAmount: string;
      decimals: number;
    },
  ): FetchedChainTransaction {
    const cfg = this.client.getConfig();
    const baseBlock = 45_200_000n;
    const currentBlock = baseBlock + 19n; // 20 confirmations by default
    const decimals = hint?.decimals ?? cfg.usdtDecimals;
    const defaultAmountRaw = parseTokenAmountToUnits(
      hint?.expectedAmount || '100',
      decimals,
    );
    const defaultContract = hint?.expectedTokenContract || cfg.usdtContractAddress;
    const defaultRecipient = hint?.expectedTo || cfg.receivingWalletAddress;
    const mockSender = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';

    if (normalizedHash.startsWith('0xdead')) {
      return {
        exists: false,
        chainId: cfg.chainId,
        transactionHash: normalizedHash,
        succeeded: false,
        blockNumber: null,
        currentBlockNumber: currentBlock,
        blockTimestamp: null,
        transferLogs: [],
      };
    }

    if (normalizedHash.startsWith('0xfa11') || normalizedHash.startsWith('0xfail')) {
      return {
        exists: true,
        chainId: cfg.chainId,
        transactionHash: normalizedHash,
        succeeded: false,
        blockNumber: baseBlock,
        currentBlockNumber: currentBlock,
        blockTimestamp: new Date(),
        transferLogs: [],
      };
    }

    if (normalizedHash.startsWith('0xbad9')) {
      return {
        exists: true,
        chainId: 1, // Ethereum mainnet instead of BSC
        transactionHash: normalizedHash,
        succeeded: true,
        blockNumber: baseBlock,
        currentBlockNumber: currentBlock,
        blockTimestamp: new Date(),
        transferLogs: [
          {
            tokenContract: defaultContract,
            from: mockSender,
            to: defaultRecipient,
            valueRaw: defaultAmountRaw,
          },
        ],
      };
    }

    if (normalizedHash.startsWith('0xeeee')) {
      return {
        exists: true,
        chainId: cfg.chainId,
        transactionHash: normalizedHash,
        succeeded: true,
        blockNumber: baseBlock,
        currentBlockNumber: currentBlock,
        blockTimestamp: new Date(),
        transferLogs: [],
      };
    }

    if (normalizedHash.startsWith('0xbadc')) {
      return {
        exists: true,
        chainId: cfg.chainId,
        transactionHash: normalizedHash,
        succeeded: true,
        blockNumber: baseBlock,
        currentBlockNumber: currentBlock,
        blockTimestamp: new Date(),
        transferLogs: [
          {
            tokenContract: '0x000000000000000000000000000000000000beef',
            from: mockSender,
            to: defaultRecipient,
            valueRaw: defaultAmountRaw,
          },
        ],
      };
    }

    if (normalizedHash.startsWith('0xbad0')) {
      return {
        exists: true,
        chainId: cfg.chainId,
        transactionHash: normalizedHash,
        succeeded: true,
        blockNumber: baseBlock,
        currentBlockNumber: currentBlock,
        blockTimestamp: new Date(),
        transferLogs: [
          {
            tokenContract: defaultContract,
            from: mockSender,
            to: '0x1111111111111111111111111111111111111111',
            valueRaw: defaultAmountRaw,
          },
        ],
      };
    }

    if (normalizedHash.startsWith('0xbada')) {
      return {
        exists: true,
        chainId: cfg.chainId,
        transactionHash: normalizedHash,
        succeeded: true,
        blockNumber: baseBlock,
        currentBlockNumber: currentBlock,
        blockTimestamp: new Date(),
        transferLogs: [
          {
            tokenContract: defaultContract,
            from: mockSender,
            to: defaultRecipient,
            valueRaw: defaultAmountRaw / 2n,
          },
        ],
      };
    }

    if (normalizedHash.startsWith('0x0001')) {
      return {
        exists: true,
        chainId: cfg.chainId,
        transactionHash: normalizedHash,
        succeeded: true,
        blockNumber: currentBlock - 1n, // only 2 confirmations
        currentBlockNumber: currentBlock,
        blockTimestamp: new Date(),
        transferLogs: [
          {
            tokenContract: defaultContract,
            from: mockSender,
            to: defaultRecipient,
            valueRaw: defaultAmountRaw,
          },
        ],
      };
    }

    return {
      exists: true,
      chainId: cfg.chainId,
      transactionHash: normalizedHash,
      succeeded: true,
      blockNumber: baseBlock,
      currentBlockNumber: currentBlock,
      blockTimestamp: new Date(),
      transferLogs: [
        {
          tokenContract: defaultContract,
          from: mockSender,
          to: defaultRecipient,
          valueRaw: defaultAmountRaw,
        },
      ],
    };
  }
}
