# Security Controls & Compliance Architecture

## 1. Custody & Private Key Policy

- **Zero Private Keys in Software:** NAVRIX **never** stores, accepts, logs, or processes private keys, mnemonics, or seed phrases in environment variables, MySQL tables, or client applications.
- **Public Receiving Address Only:** Customer deposit QR codes encode solely the configured public BEP-20 receiving wallet address (`0x98386622d3937c0A3582E07aEc06041C3fb7b521`).
- **External Treasury Signing:** Outbound withdrawals are signed externally (e.g., Safe multisig or hardware wallet) and settled in NAVRIX by recording the verified 66-character outbound BNB Smart Chain transaction hash.

---

## 2. Authentication, Sessions & Role-Based Access Control

- **Password Security:** Passwords enforce complexity (`>= 8` chars, uppercase, lowercase, digit) and are hashed with `bcrypt` (`12` rounds).
- **Brute-Force Lockout:** 5 consecutive failed password attempts lock the account for 15 minutes (`429 ACCOUNT_TEMPORARILY_LOCKED`).
- **Rotating Refresh Tokens & Replay Detection:** Refresh tokens are delivered in `HttpOnly`, `SameSite=Lax` cookies, stored in MySQL (`user_sessions`) only as SHA-256 hashes, and grouped by `familyId`. Replaying an already-rotated refresh token immediately revokes the entire session family (`REFRESH_TOKEN_REUSE_DETECTED`).
- **Google OAuth 2.0:** Supports server-side Google ID token audience (`aud === GOOGLE_CLIENT_ID`) and `email_verified` validation when `GOOGLE_OAUTH_MODE=LIVE`, plus safe deterministic local sign-in when `GOOGLE_OAUTH_MODE=MOCK`.
- **Backend-Enforced RBAC:** Four hierarchical roles (`USER` < `ADMIN` < `SUPER_ADMIN` < `MASTER_ADMIN`) are enforced on every NestJS route via `JwtAuthGuard` and `RolesGuard`. Self-approval of an admin's own deposit is explicitly blocked (`SELF_APPROVAL_FORBIDDEN`).

---

## 3. Private Upload Hardening & Anti-Tampering

- **Magic-Byte Inspection:** Optional payment screenshots uploaded via `POST /api/v1/deposits/:id/submit-payment` are inspected at the binary magic-byte header level (`PNG`: `89 50 4E 47`, `JPEG`: `FF D8 FF`, `WebP`: `RIFF....WEBP`) and capped at `5 MB`. Spoofed executables or scripts renamed `.png` are rejected (`400`).
- **Private Storage Outside Public Web Root:** Uploaded files are renamed to random UUID filenames and stored outside all Next.js/Nginx public static folders. Access requires an authenticated owner or admin JWT via `GET /api/v1/deposits/:id/screenshot`.
- **Zero Trust in Screenshots:** Payment screenshots are stored strictly as optional operator reference; ledger credits depend exclusively on server-side `viem` blockchain receipt verification.

---

## 4. Logging Redaction & Audit Integrity

- **Structured Pino Redaction:** `LoggerModule` redacts `authorization`, `cookie`, `password`, `currentPassword`, `newPassword`, `idToken`, `refreshToken`, and `set-cookie` headers from all structured logs.
- **Immutable Audit Trail:** `AuditService` exposes **only** `record()` and `listLogs()` — zero update or delete methods exist. Every admin login, deposit verification/approval/rejection, interest credit, plan change, withdrawal action, user suspension, role mutation, setting change, and Master Admin circuit-breaker toggle records `oldValue`, `newValue`, `ipAddress`, `userAgent`, and `requestId`.

---

## 5. Legal & Regulatory Compliance Notice

- NAVRIX makes **no hard-coded claims** of regulatory licensing, banking status, deposit insurance, or guaranteed investment returns.
- All compliance-sensitive parameters (`MIN_DEPOSIT`, `MAX_DEPOSIT`, `MIN_WITHDRAWAL`, `MAX_WITHDRAWAL`, `REVIEW_SLA_HOURS`, circuit breakers, and residency/tax/risk disclosures in `packages/config`) are configurable and must be reviewed by qualified legal and compliance counsel before operating in any jurisdiction.

