# NAVRIX REST API Reference

Base URL: `http://localhost:4000/api/v1`  
Interactive OpenAPI / Swagger UI: `http://localhost:4000/api/docs`

---

## 1. Standard Response Envelopes

### Success Envelope
```json
{
  "success": true,
  "data": { "...": "..." },
  "meta": {
    "requestId": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
  }
}
```

### Error Envelope
```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_TRANSACTION_HASH",
    "message": "This blockchain transaction hash has already been used and cannot credit another deposit."
  }
}
```

Sensitive fields (`passwordHash`, `refreshTokenHash`, `twoFactorSecretEnc`, stack traces) are automatically stripped by `ResponseEnvelopeInterceptor` and `ApiExceptionFilter`.

---

## 2. Authentication & Session Endpoints (`/api/v1/auth`)

| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | Public | Creates `USR-000001` account, zeroed USDT wallet, compliance record, and session tokens |
| `POST` | `/auth/login` | Public | Email/password login with 5-attempt / 15-minute lockout protection; sets `HttpOnly` refresh cookie |
| `POST` | `/auth/google` | Public | Google OAuth 2.0 login (`LIVE` tokeninfo audience verification or `MOCK` local mode) |
| `POST` | `/auth/refresh` | Cookie / Body | Rotates refresh token and revokes entire session family if token replay is detected |
| `POST` | `/auth/logout` | Cookie / JWT | Revokes active session and clears `HttpOnly` refresh cookie |
| `POST` | `/auth/verify-email` | Public | Marks email verified via one-time hashed verification token |
| `POST` | `/auth/forgot-password` | Public | Issues time-limited hashed password reset token |
| `POST` | `/auth/reset-password` | Public | Resets password and revokes existing sessions |
| `POST` | `/auth/change-password` | `USER`+ | Verifies current password and updates hash |
| `GET` | `/auth/sessions` | `USER`+ | Lists active non-revoked sessions |
| `DELETE` | `/auth/sessions/:id` | `USER`+ | Revokes a specific session |

---

## 3. Customer Financial Endpoints

| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/users/me` | `USER`+ | Returns public user profile & compliance acceptance timestamps |
| `PATCH` | `/users/me` | `USER`+ | Updates name / phone |
| `PUT` | `/users/compliance` | `USER`+ | Saves residency, tax jurisdiction, and legal disclosure acceptances |
| `GET` | `/wallet` | `USER`+ | Returns real `totalBalance`, `availableBalance`, `lockedBalance`, `investedBalance`, pending totals & chart series |
| `GET` | `/wallet/ledger` | `USER`+ | Paginated immutable double-entry ledger history for authenticated user |
| `GET` | `/deposits/config` | `USER`+ | Returns active BEP-20 receiving address, dynamic QR payload, network warning & active plans |
| `POST` | `/deposits` | `USER`+ | Creates `DEP-YYYYMMDD-000001` in `PENDING_PAYMENT` (zero immediate balance credit) |
| `GET` | `/deposits` | `USER`+ | Lists user's deposit requests |
| `GET` | `/deposits/:id` | `USER`+ | Deposit details, QR instructions, blockchain verification summary & 24h SLA status |
| `POST` | `/deposits/:id/submit-payment` | `USER`+ | Multipart upload of mandatory 66-char BSC `transactionHash` + optional magic-byte-verified screenshot |
| `GET` | `/deposits/:id/screenshot` | Owner / Admin | Authorized stream of private payment screenshot |
| `GET` | `/investments/plans` | Public / `USER`+ | Lists active configurable investment plans |
| `GET` | `/investments` | `USER`+ | Lists user's `INV-...` investment positions |
| `GET` | `/investments/:id` | `USER`+ | Investment detail and credited `INT-...` yield records |
| `GET` | `/investments/interest/history` | `USER`+ | Chronological yield/interest history |
| `POST` | `/withdrawals` | `USER`+ | Validates BEP-20 address & balance, locks `availableBalance -> lockedBalance`, creates `WDR-...` |
| `GET` | `/withdrawals` | `USER`+ | Lists user's withdrawal requests |
| `GET` | `/notifications` | `USER`+ | Lists in-app notifications & unread count |
| `PATCH` | `/notifications/:id/read` | `USER`+ | Marks single or `all` notifications read |

---

## 4. Admin & Master Admin Endpoints (`/api/v1/admin`)

All `/admin/*` routes enforce **both** `JwtAuthGuard` and `RolesGuard` on the backend.

| Method | Endpoint | Minimum Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/admin/dashboard` | `ADMIN` | Real-time operational metrics, SLA queue counts, and recent activity |
| `GET` | `/admin/master/overview` | `SUPER_ADMIN` / `MASTER_ADMIN` | Platform solvency reconciliation (`0.00000000` discrepancy check), live vault telemetry & circuit breakers |
| `POST` | `/admin/master/circuit-breaker` | `SUPER_ADMIN` / `MASTER_ADMIN` | Toggles `DEPOSITS_ENABLED`, `WITHDRAWALS_ENABLED`, or `MAINTENANCE_MODE` with audit trail |
| `GET` | `/admin/deposits` | `ADMIN` | Lists all customer deposits with filterable status |
| `GET` | `/admin/deposits/:id` | `ADMIN` | Full side-by-side comparison of user request vs authoritative on-chain BEP-20 receipt |
| `POST` | `/admin/deposits/:id/verify` | `ADMIN` | Triggers live server-side Viem BEP-20 blockchain verification |
| `POST` | `/admin/deposits/:id/approve` | `ADMIN` | Re-verifies chain receipt, posts immutable `DEPOSIT` ledger credit & activates `INV-...` position |
| `POST` | `/admin/deposits/:id/reject` | `ADMIN` | Rejects deposit with mandatory reason, audit log & customer notification |
| `GET` | `/admin/investments` | `ADMIN` | Lists all customer investment records |
| `POST` | `/admin/investments/:id/interest` | `ADMIN` | Calculates & credits period yield (`PERCENTAGE`, `FIXED_AMOUNT`, `DAILY`, `WEEKLY`, `MONTHLY`, `MATURITY`) |
| `POST` | `/admin/investment-plans` | `SUPER_ADMIN` / `MASTER_ADMIN` | Creates or updates configurable vault plans |
| `GET` | `/admin/withdrawals` | `ADMIN` | Lists withdrawal queue |
| `POST` | `/admin/withdrawals/:id/approve` | `ADMIN` | Approves withdrawal for external treasury settlement |
| `POST` | `/admin/withdrawals/:id/reject` | `ADMIN` | Rejects withdrawal and atomically unlocks USDT back to `availableBalance` |
| `POST` | `/admin/withdrawals/:id/complete` | `ADMIN` | Records outbound 66-char BSC `transactionHash` and posts final `WITHDRAWAL` debit ledger entry |
| `GET` | `/admin/users` | `ADMIN` | Lists platform users & segregated wallet balances |
| `PATCH` | `/admin/users/:uid/status` | `ADMIN` | Suspends (and revokes sessions) or activates user account |
| `GET` | `/admin/admin-users` | `SUPER_ADMIN` / `MASTER_ADMIN` | Lists administrative staff accounts |
| `PATCH` | `/admin/users/:uid/role` | `MASTER_ADMIN` | Assigns or revokes `ADMIN`, `SUPER_ADMIN`, or `MASTER_ADMIN` role |
| `GET` | `/admin/ledger` | `ADMIN` | Paginated global immutable ledger explorer |
| `GET` | `/admin/blockchain-transactions` | `ADMIN` | Verified inbound & outbound BNB Smart Chain transaction registry |
| `GET` | `/admin/audit-logs` | `ADMIN` | Read-only immutable administrative audit log viewer |
| `GET` / `PUT` | `/admin/settings` | `SUPER_ADMIN` / `MASTER_ADMIN` | View & update runtime system parameters |

