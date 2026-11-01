# Withdrawal Locking & Settlement Lifecycle

## 1. Segregated Wallet Buckets

Every user's MySQL `wallets` row maintains separate `DECIMAL(24, 8)` buckets:
- `availableBalance` — Liquid USDT eligible for immediate withdrawal (primarily credited yield/interest or unallocated funds). **Strictly enforced `>= 0` at all times.**
- `lockedBalance` — Funds atomically reserved while a withdrawal request is under review or awaiting outbound settlement.
- `investedBalance` — Principal actively allocated to `INV-...` positions.

---

## 2. End-to-End Withdrawal Sequence

```mermaid
sequenceDiagram
    actor User as Investor (apps/web)
    participant API as NestJS API (apps/api)
    participant DB as MySQL 8.0
    actor Admin as Admin / Treasury (apps/admin)

    User->>API: POST /api/v1/withdrawals (50 USDT, BEP-20 0x destination)
    API->>API: Validate EVM address, network & circuit breaker
    API->>DB: SELECT wallet FOR UPDATE (verify availableBalance >= 50)
    API->>DB: Move 50 USDT: availableBalance -= 50, lockedBalance += 50
    API->>DB: Create WDR-YYYYMMDD-000001 (status = PENDING_REVIEW)
    API-->>User: Withdrawal queued & funds locked

    alt Rejected by Admin
        Admin->>API: POST /api/v1/admin/withdrawals/:id/reject (reason)
        API->>DB: SELECT withdrawal & wallet FOR UPDATE
        API->>DB: Unlock 50 USDT: lockedBalance -= 50, availableBalance += 50
        API->>DB: status = REJECTED + AuditLog + Notification
    else Approved & Settled Externally on BNB Smart Chain
        Admin->>API: POST /api/v1/admin/withdrawals/:id/approve
        API->>DB: status = APPROVED + AuditLog + Notification
        Note over Admin: Executes BEP-20 transfer from external hardware/multisig treasury
        Admin->>API: POST /api/v1/admin/withdrawals/:id/complete (66-char outbound 0x txHash)
        API->>DB: SELECT withdrawal & wallet FOR UPDATE
        API->>DB: Deduct lockedBalance -= 50 & insert immutable WITHDRAWAL DEBIT LedgerEntry
        API->>DB: Insert OUTBOUND blockchain_transactions row + status = COMPLETED + AuditLog
    end
```

---

## 3. Withdrawal State Transition Machine

```mermaid
stateDiagram-v2
    [*] --> PENDING_REVIEW: Locks availableBalance -> lockedBalance
    PENDING_REVIEW --> APPROVED: Admin approves for treasury payout
    PENDING_REVIEW --> REJECTED: Admin rejects (unlocks funds to availableBalance)

    APPROVED --> PROCESSING: Treasury broadcast in progress
    APPROVED --> COMPLETED: Outbound BSC txHash recorded & WITHDRAWAL ledger debit posted
    APPROVED --> REJECTED: Cancelled prior to broadcast (unlocks funds)
    APPROVED --> FAILED: Failed prior to settlement

    PROCESSING --> COMPLETED: Outbound BSC txHash confirmed
    PROCESSING --> FAILED: Broadcast failed

    COMPLETED --> [*]
    REJECTED --> [*]
    FAILED --> [*]
```

