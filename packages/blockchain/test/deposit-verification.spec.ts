import { describe, expect, it } from 'vitest';
import { BLOCKCHAIN_DEFAULTS } from '@navrix/config';
import { BlockchainMode, BlockchainNetwork } from '@navrix/types';
import { BlockchainClient, createBlockchainSuite } from '../src';

const RECEIVING_WALLET = BLOCKCHAIN_DEFAULTS.defaultReceivingAddress;
const USDT_CONTRACT = BLOCKCHAIN_DEFAULTS.testnetUsdtContract;

describe('@navrix/blockchain DepositVerificationService (9-Step BEP-20 Verification)', () => {
  it('enforces explicit MAINNET_ENABLED=true safety guard when BLOCKCHAIN_MODE=MAINNET', () => {
    expect(
      () =>
        new BlockchainClient({
          mode: BlockchainMode.MAINNET,
          mainnetEnabled: false,
        }),
    ).toThrow(/SAFETY GUARD/);

    const enabledClient = new BlockchainClient({
      mode: BlockchainMode.MAINNET,
      mainnetEnabled: true,
    });
    expect(enabledClient.getConfig().chainId).toBe(56);
  });

  it('verifies a valid BEP-20 USDT transfer to the platform receiving wallet', async () => {
    const { verificationService } = createBlockchainSuite({
      mode: BlockchainMode.MOCK,
      receivingWalletAddress: RECEIVING_WALLET,
      usdtContractAddress: USDT_CONTRACT,
      requiredConfirmations: 12,
    });

    const txHash =
      '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

    const result = await verificationService.verifyDepositTransaction({
      transactionHash: txHash,
      expectedReceivingAddress: RECEIVING_WALLET,
      expectedTokenContract: USDT_CONTRACT,
      expectedNetwork: BlockchainNetwork.BNB_SMART_CHAIN,
      expectedAmount: '250.5',
    });

    expect(result.isValid).toBe(true);
    expect(result.txSucceeded).toBe(true);
    expect(result.toAddress?.toLowerCase()).toBe(RECEIVING_WALLET.toLowerCase());
    expect(result.tokenContract?.toLowerCase()).toBe(USDT_CONTRACT.toLowerCase());
    expect(result.tokenAmount).toBe('250.5');
    expect(result.confirmationCount).toBeGreaterThanOrEqual(12);
  });

  it('rejects invalid transaction hash format and explorer URLs', async () => {
    const { verificationService } = createBlockchainSuite({
      mode: BlockchainMode.MOCK,
    });

    const badFormat = await verificationService.verifyDepositTransaction({
      transactionHash: 'https://bscscan.com/tx/0x1234',
      expectedReceivingAddress: RECEIVING_WALLET,
      expectedTokenContract: USDT_CONTRACT,
      expectedNetwork: BlockchainNetwork.BNB_SMART_CHAIN,
      expectedAmount: '100',
    });

    expect(badFormat.isValid).toBe(false);
    expect(badFormat.failureCode).toBe('INVALID_TX_HASH');
  });

  it('prevents duplicate / replay use of an already-credited transaction hash', async () => {
    const { verificationService } = createBlockchainSuite({
      mode: BlockchainMode.MOCK,
    });

    const usedHash =
      '0xaaaa567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

    const result = await verificationService.verifyDepositTransaction({
      transactionHash: usedHash,
      expectedReceivingAddress: RECEIVING_WALLET,
      expectedTokenContract: USDT_CONTRACT,
      expectedNetwork: BlockchainNetwork.BNB_SMART_CHAIN,
      expectedAmount: '100',
      isAlreadyUsed: async (hash) => hash === usedHash,
    });

    expect(result.isValid).toBe(false);
    expect(result.failureCode).toBe('DUPLICATE_TRANSACTION');
  });

  it('detects TX_NOT_FOUND, TX_REVERTED, WRONG_NETWORK, and NO_TRANSFER_EVENT', async () => {
    const { verificationService } = createBlockchainSuite({
      mode: BlockchainMode.MOCK,
    });

    const baseInput = {
      expectedReceivingAddress: RECEIVING_WALLET,
      expectedTokenContract: USDT_CONTRACT,
      expectedNetwork: BlockchainNetwork.BNB_SMART_CHAIN,
      expectedAmount: '100',
    };

    const notFound = await verificationService.verifyDepositTransaction({
      ...baseInput,
      transactionHash: `0xdead${'0'.repeat(60)}`,
    });
    expect(notFound.isValid).toBe(false);
    expect(notFound.failureCode).toBe('TX_NOT_FOUND');

    const reverted = await verificationService.verifyDepositTransaction({
      ...baseInput,
      transactionHash: `0xfa11${'0'.repeat(60)}`,
    });
    expect(reverted.isValid).toBe(false);
    expect(reverted.failureCode).toBe('TX_REVERTED');

    const wrongChain = await verificationService.verifyDepositTransaction({
      ...baseInput,
      transactionHash: `0xbad9${'0'.repeat(60)}`,
    });
    expect(wrongChain.isValid).toBe(false);
    expect(wrongChain.failureCode).toBe('WRONG_NETWORK');

    const noTransfer = await verificationService.verifyDepositTransaction({
      ...baseInput,
      transactionHash: `0xeeee${'0'.repeat(60)}`,
    });
    expect(noTransfer.isValid).toBe(false);
    expect(noTransfer.failureCode).toBe('NO_TRANSFER_EVENT');
  });

  it('detects WRONG_TOKEN_CONTRACT, WRONG_RECIPIENT, WRONG_AMOUNT, and INSUFFICIENT_CONFIRMATIONS', async () => {
    const { verificationService } = createBlockchainSuite({
      mode: BlockchainMode.MOCK,
      requiredConfirmations: 12,
    });

    const baseInput = {
      expectedReceivingAddress: RECEIVING_WALLET,
      expectedTokenContract: USDT_CONTRACT,
      expectedNetwork: BlockchainNetwork.BNB_SMART_CHAIN,
      expectedAmount: '100',
    };

    const wrongToken = await verificationService.verifyDepositTransaction({
      ...baseInput,
      transactionHash: `0xbadc${'0'.repeat(60)}`,
    });
    expect(wrongToken.isValid).toBe(false);
    expect(wrongToken.failureCode).toBe('WRONG_TOKEN_CONTRACT');

    const wrongRecipient = await verificationService.verifyDepositTransaction({
      ...baseInput,
      transactionHash: `0xbad0${'0'.repeat(60)}`,
    });
    expect(wrongRecipient.isValid).toBe(false);
    expect(wrongRecipient.failureCode).toBe('WRONG_RECIPIENT');

    const wrongAmount = await verificationService.verifyDepositTransaction({
      ...baseInput,
      transactionHash: `0xbada${'0'.repeat(60)}`,
    });
    expect(wrongAmount.isValid).toBe(false);
    expect(wrongAmount.failureCode).toBe('WRONG_AMOUNT');
    expect(wrongAmount.tokenAmount).toBe('50');

    const lowConf = await verificationService.verifyDepositTransaction({
      ...baseInput,
      transactionHash: `0x0001${'0'.repeat(60)}`,
    });
    expect(lowConf.isValid).toBe(false);
    expect(lowConf.failureCode).toBe('INSUFFICIENT_CONFIRMATIONS');
    expect(lowConf.confirmationCount).toBe(2);
  });
});
