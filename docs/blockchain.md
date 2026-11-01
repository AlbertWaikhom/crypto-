# BNB Smart Chain (BEP-20) Verification Engine

Implemented in [`packages/blockchain`](../packages/blockchain/src/index.ts) using `viem`.

## 1. Execution Modes & Mainnet Safety Guard

| `BLOCKCHAIN_MODE` | Chain ID | Default RPC / Behavior | Safety Controls |
| :--- | :--- | :--- | :--- |
| `MOCK` (Default) | `97` | Deterministic local simulator (zero external RPC calls required) | Safe for local dev, CI, Vitest & Playwright suites |
| `TESTNET` | `97` | BNB Smart Chain Testnet RPC (`BSC_TESTNET_RPC_URL`) | Verifies real testnet BEP-20 `Transfer` receipts via `viem` |
| `MAINNET` | `56` | BNB Smart Chain Mainnet RPC (`BSC_RPC_URL`) | **Refuses to boot unless `MAINNET_ENABLED=true` is explicitly set** |

Default Public BEP-20 Receiving Wallet:
`0x98386622d3937c0A3582E07aEc06041C3fb7b521`

Mainnet BEP-20 USDT Contract:
`0x55d398326f99059fF775485246999027B3197955`

---

## 2. Authoritative 9-Step Deposit Verification

`DepositVerificationService.verifyDepositTransaction()` enforces all 9 checks in order:

1. **Format Validation (`INVALID_TX_HASH`):** Must match `^0x[a-fA-F0-9]{64}$`. Block explorer URLs (e.g. `https://bscscan.com/tx/...`) are rejected immediately.
2. **Duplicate / Replay Protection (`DUPLICATE_TRANSACTION`):** Rejects any hash already stored in `payment_submissions` or `blockchain_transactions`.
3. **Transaction Existence (`TX_NOT_FOUND`):** Fetches on-chain receipt via `viem.getTransactionReceipt`.
4. **Chain Verification (`WRONG_NETWORK`):** Confirms RPC `chainId` matches expected network (`97` for Testnet, `56` for Mainnet).
5. **Execution Status (`TX_REVERTED`):** Confirms `receipt.status === 'success'`. Reverted transactions cannot credit balances.
6. **ERC-20 Transfer Event Presence (`NO_TRANSFER_EVENT`):** Decodes receipt logs against `event Transfer(address indexed from, address indexed to, uint256 value)`. Native BNB transfers without BEP-20 logs are rejected.
7. **Token Contract Match (`WRONG_TOKEN_CONTRACT`):** Confirms `log.address` equals the configured BEP-20 USDT contract (prevents fake/spoofed ERC-20 tokens).
8. **Recipient Address Match (`WRONG_RECIPIENT`):** Confirms `Transfer.to` equals the platform's configured BEP-20 receiving wallet address.
9. **Exact Amount & Confirmations (`WRONG_AMOUNT`, `INSUFFICIENT_CONFIRMATIONS`):** Compares raw `uint256` units (`parseUnits`) against the deposit amount and checks `(currentBlock - txBlock + 1) >= requiredConfirmations` (default `12`).

---

## 3. Deterministic `MOCK` Mode Test Prefixes

When `BLOCKCHAIN_MODE=MOCK`, developers and automated tests can trigger every verification outcome deterministically using valid 66-character hexadecimal prefixes:

| Transaction Hash Prefix | Simulated On-Chain Scenario | Resulting `failureCode` |
| :--- | :--- | :--- |
| `0xdead0000...` | Transaction not found on chain | `TX_NOT_FOUND` |
| `0xfa110000...` | Transaction reverted (`status = 0`) | `TX_REVERTED` |
| `0xbad90000...` | Wrong chain ID (`1` instead of BSC) | `WRONG_NETWORK` |
| `0xeeee0000...` | Native transfer with no ERC-20 `Transfer` log | `NO_TRANSFER_EVENT` |
| `0xbadc0000...` | Transfer from unconfigured fake token contract | `WRONG_TOKEN_CONTRACT` |
| `0xbad00000...` | Transfer sent to wrong recipient wallet | `WRONG_RECIPIENT` |
| `0xbada0000...` | Transferred amount is 50% of requested amount | `WRONG_AMOUNT` |
| `0x00010000...` | Only 2 block confirmations (`< 12` required) | `INSUFFICIENT_CONFIRMATIONS` |
| Any other valid `0x` + 64 hex | Valid confirmed BEP-20 USDT transfer to vault | `isValid: true` (20 confirmations) |

