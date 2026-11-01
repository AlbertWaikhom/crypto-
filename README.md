# NAVRIX — Institutional Crypto Deposit, On-Chain Verification & Immutable Ledger Platform

> **INVEST · TRADE · GROW** — *"Institutional Yields. Absolute On-Chain Transparency."*

**NAVRIX** is a modular, production-grade full-stack cryptocurrency deposit, treasury verification, yield allocation, and withdrawal settlement platform built on a strict **MySQL double-entry ledger** and **BNB Smart Chain (BEP-20 USDT)** verification engine.

Designed with institutional financial invariants at its core, NAVRIX never trusts client-submitted screenshots, amounts, or transaction statuses. Every deposit is verified server-side against on-chain BEP-20 `Transfer` receipt logs via `viem`, routed through an 8-stage state machine with a 24-hour manual compliance review SLA, and settled atomically using MySQL `InnoDB` row-level locking (`SELECT ... FOR UPDATE`).

> **Security & Regulatory Notice:** NAVRIX never stores private keys, mnemonics, or seed phrases anywhere in code, configuration, or database tables. All compliance thresholds, risk disclosures, circuit breakers, and KYC gates are configurable and marked for legal/compliance review prior to live operation.

---

## Core Capabilities

- **Customer Investment Portal (`apps/web`)**
  - Responsive institutional dark/gold UI built with Next.js 15 App Router, React, TypeScript, Tailwind CSS, TanStack Query, React Hook Form + Zod, and Recharts.
  - Email/password authentication + Google OAuth 2.0 Sign-In, email verification, password recovery, refresh-token family rotation with replay revocation, and active session management.
  - Real-time portfolio dashboard with segregated balance buckets (`Available`, `Locked`, `Invested`, `Pending Withdrawal`, `Total Interest Earned`) and authentic zero-data empty states.
  - Dynamic QR-based BEP-20 USDT deposit flow (`DEP-YYYYMMDD-XXXXXX`), mandatory BSC transaction-hash validation (rejecting arbitrary URLs), and optional private payment evidence upload.

- **9-Step BEP-20 Blockchain Verification Engine (`packages/blockchain`)**
  - Powered by `viem` with support for `MOCK` (deterministic local QA), `TESTNET` (BSC Chain `97`), and `MAINNET` (BSC Chain `56` with explicit boot guard).
  - Verifies transaction existence, execution status (`status === 1`), chain ID, official USDT token contract, ERC-20 `Transfer(address,address,uint256)` event logs, exact platform receiving wallet recipient, token amount, minimum block confirmations, and global anti-replay uniqueness.

- **Immutable Double-Entry Financial Ledger (`backend/src/ledger`)**
  - Append-only `ledger_entries` (`DEPOSIT`, `INTEREST`, `WITHDRAWAL`, `WITHDRAWAL_REVERSAL`, `ADJUSTMENT`, `FEE`, `REFUND`) stored at `DECIMAL(24, 8)` precision.
  - Strict concurrency protection via MySQL `InnoDB` transactions, `SELECT ... FOR UPDATE` row locks, unique idempotency keys, and `available_balance >= 0` enforcement.

- **Configurable Yield Engine & Locked Withdrawal Settlement**
  - Admin-configurable investment plans (`PERCENTAGE`, `FIXED_AMOUNT`, `DAILY`, `WEEKLY`, `MONTHLY`, `MATURITY`) with composite `[investment_id, period_key]` deduplication preventing double interest credits.
  - Atomic withdrawal balance locking (`Available -> Locked`), automatic balance unlocking on rejection, and final `WITHDRAWAL` debit posting with outbound BSC transaction hash on completion.

- **Admin & Master Admin Command Center (`apps/admin`)**
  - Strict backend-enforced RBAC (`USER`, `ADMIN`, `SUPER_ADMIN`, `MASTER_ADMIN`).
  - **Master Admin Command Center (`/master`)**: Real-time platform solvency reconciliation (`SUM(wallets) === SUM(ledger credits - debits)` to 8 decimal places), on-chain vault telemetry, emergency circuit breakers (`DEPOSITS_ENABLED`, `WITHDRAWALS_ENABLED`, `MAINTENANCE_MODE`), staff role governance, and tamper-evident `audit_logs`.

---

## Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Portals** | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, CSS Modules, TanStack Query, React Hook Form, Zod, Zustand, Recharts, Lucide Icons |
| **Backend API** | Node.js, NestJS 10, TypeScript, REST (`/api/v1`), Swagger/OpenAPI (`/api/docs`), Pino Structured Logging (secret redaction), Helmet, Throttler |
| **Database & ORM** | MySQL 8.0+ (`InnoDB`, `DECIMAL(24,8)`), Prisma ORM 6 |
| **Authentication** | JWT Access Tokens + HttpOnly Refresh-Token Rotation, `bcryptjs`, Role-Based Access Control |
| **Blockchain** | `viem`, BNB Smart Chain (BEP-20 USDT Mainnet & Testnet), ERC-20 `Transfer` Log Decoding |
| **Monorepo & Infra** | `pnpm` Workspaces, Turborepo, Docker, Docker Compose, Nginx Reverse Proxy, ESLint, Prettier |
| **Automated Testing** | Vitest, Supertest (End-to-End API & Financial Invariants), Playwright |

---

## Repository Structure

```text
crypto/
├── backend/                # Dedicated NestJS 10 REST API, Ledger, Auth, Deposits, Withdrawals & Admin Services (:4000)
├── apps/
│   ├── web/                # Customer Investment & Deposit Portal — Next.js 15 (:3000)
│   └── admin/              # Operations Admin & Master Admin Command Center — Next.js 15 (:3001)
├── packages/
│   ├── blockchain/         # Viem BEP-20 transaction receipt & ERC-20 Transfer verification engine
│   ├── config/             # Shared TypeScript configs, network constants & compliance boundaries
│   ├── database/           # Prisma MySQL schema (18 models), SQL migrations, UID sequence generator & seed
│   ├── types/              # Domain enums, Deposit/Withdrawal state machines, RBAC & API DTO contracts
│   ├── ui/                 # Shared accessible UI primitives (Button, Card, StatusBadge, CopyButton, EmptyState)
│   └── validation/         # Shared Zod schemas (BSC tx hash, BEP-20 address, financial amounts, auth policies)
├── infra/
│   ├── docker/             # Multi-stage production Dockerfiles (api, web, admin)
│   └── nginx/              # Nginx reverse proxy configuration
├── e2e/                    # Playwright end-to-end browser workflow specifications
└── docs/                   # Architecture, database, API, blockchain, security & deployment documentation
```

---

## MySQL Database Schema (18 Core Tables)

Defined in [`packages/database/prisma/schema.prisma`](packages/database/prisma/schema.prisma):

1. `users` — Customer & administrative accounts with readable public IDs (`USR-000001`)
2. `user_sessions` — Refresh-token rotation families & IP/user-agent session tracking
3. `auth_tokens` — Single-use SHA-256 hashed email verification & password reset tokens
4. `compliance_profiles` — Configurable KYC status, tax residency & legal consent timestamps
5. `wallets` — Segregated `available_balance`, `locked_balance`, `invested_balance`, `pending_withdrawal`
6. `ledger_entries` — Append-only double-entry financial ledger with `balance_before` / `balance_after`
7. `deposits` — 8-state BEP-20 deposit lifecycle (`PENDING_PAYMENT` → `APPROVED` / `REJECTED`) + 24h SLA
8. `payment_submissions` — Unique `transaction_hash` anti-replay constraint + private screenshot storage key
9. `blockchain_transactions` — Verified on-chain block, sender, recipient, token contract, amount & confirmations
10. `investment_plans` — Configurable interest calculation models, rates, durations & min/max bounds
11. `investments` — Individual active principal allocations (`INV-YYYYMMDD-XXXXXX`)
12. `interest_records` — Yield distributions guarded by `UNIQUE(investment_id, period_key)`
13. `withdrawals` — Locked BEP-20 payout requests (`WDR-YYYYMMDD-XXXXXX`) & outbound settlement tx hash
14. `notifications` — In-app & multi-channel lifecycle alerts
15. `audit_logs` — Immutable administrative action log with `old_value` / `new_value` JSON diffs
16. `system_settings` — Runtime wallet address, transaction limits, SLAs & emergency circuit breakers
17. `uid_sequences` — Atomic readable identifier counters (`USR`, `DEP`, `INV`, `WDR`, `LED`, `INT`)
18. `idempotency_records` — Duplicate mutation replay protection

---

## Local Setup & Development

> **Note:** Environment files (`.env`) and local database connection connectors are intentionally excluded from version control via `.gitignore`.

### 1. Prerequisites
- **Node.js** `>= 20.0.0`
- **pnpm** `>= 9.0.0`
- **MySQL** `8.0+` (or compatible MariaDB `10.6+`)

### 2. Environment Configuration
Create your local `.env` and `backend/.env` files (never commit secrets to Git):

```env
NODE_ENV=development
API_PORT=4000
WEB_URL=http://localhost:3000
ADMIN_URL=http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1

DATABASE_URL="mysql://<db_user>:<db_password>@<db_host>:3306/<db_name>?connection_limit=5&pool_timeout=30"

JWT_SECRET="<min_32_byte_random_access_secret>"
JWT_REFRESH_SECRET="<min_32_byte_random_refresh_secret>"

BLOCKCHAIN_MODE=MOCK
MAINNET_ENABLED=false
BLOCKCHAIN_NETWORK=BNB_SMART_CHAIN
RECEIVING_WALLET_ADDRESS="<your_public_bep20_usdt_receiving_address>"
REQUIRED_CONFIRMATIONS=12
```

### 3. Install Dependencies & Apply MySQL Migrations

```bash
pnpm install
pnpm db:generate
pnpm db:deploy
pnpm db:seed
```

### 4. Run Services

```bash
# Run Backend (:4000), Customer Web (:3000), and Admin Console (:3001) concurrently
pnpm dev

# Or run services individually
pnpm dev:backend
pnpm dev:web
pnpm dev:admin
```

| Service | Default Local URL |
| :--- | :--- |
| **Customer Portal (`@navrix/web`)** | `http://localhost:3000` |
| **Admin & Master Console (`@navrix/admin`)** | `http://localhost:3001` |
| **Backend REST API & Swagger (`@navrix/backend`)** | `http://localhost:4000/api/docs` |

---

## Verification & Testing

```bash
# Execute unit tests (types, validation, blockchain) & Supertest E2E financial transaction suite
pnpm test

# Full-monorepo TypeScript verification
pnpm typecheck

# Full production build across all packages and applications
pnpm build
```

---

## Documentation Suite

- [System Architecture & Module Boundaries](docs/architecture.md)
- [MySQL Database Schema & Financial Invariants](docs/database.md)
- [REST API Reference & Standard Envelopes](docs/api.md)
- [BNB Smart Chain / BEP-20 Verification Engine](docs/blockchain.md)
- [Deposit Lifecycle & 8-Stage State Machine](docs/deposit-flow.md)
- [Withdrawal Balance Locking & Settlement Flow](docs/withdrawal-flow.md)
- [Security Controls & Regulatory Boundaries](docs/security.md)
- [Docker & Nginx Production Deployment Guide](docs/deployment.md)
