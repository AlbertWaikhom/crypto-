# Production Deployment Guide

## 1. Environment Checklist

Before deploying NAVRIX to staging or production:

1. **MySQL 8.0 Database (`DATABASE_URL`)**
   - Provision a dedicated MySQL 8.0 instance with InnoDB (`utf8mb4_unicode_ci`), automated backups, and TLS connections.
   - Apply Prisma migrations cleanly (`pnpm --filter @navrix/database exec prisma migrate deploy`).
   - Do **not** run `pnpm db:seed` in production (`seed.ts` includes a hard guard that aborts when `NODE_ENV=production`).
2. **Cryptographic Secrets**
   - Generate unique 64+ character random strings for `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`.
3. **BNB Smart Chain Configuration**
   - Test thoroughly on BNB Smart Chain Testnet (`BLOCKCHAIN_MODE=TESTNET`, Chain ID `97`) using a dedicated RPC provider URL (`BSC_TESTNET_RPC_URL`).
   - When ready for Mainnet (`Chain ID 56`), configure an institutional RPC endpoint (`BSC_RPC_URL`), verify `USDT_CONTRACT_ADDRESS=0x55d398326f99059fF775485246999027B3197955`, verify your public treasury `RECEIVING_WALLET_ADDRESS`, and explicitly set both `BLOCKCHAIN_MODE=MAINNET` and `MAINNET_ENABLED=true`.
4. **Google OAuth 2.0 (Optional Live Mode)**
   - Set `GOOGLE_OAUTH_MODE=LIVE` and `GOOGLE_CLIENT_ID=<your-google-cloud-oauth-client-id>`.

---

## 2. Docker Compose + Nginx Deployment

The root [`docker-compose.yml`](../docker-compose.yml) orchestrates **MySQL 8.0**, **NestJS API**, **Customer Web**, **Admin Console**, and **Nginx**:

```bash
# 1. Create production .env from template and set strong secrets
cp .env.example .env

# 2. Build and start all services
docker compose up --build -d

# 3. Inspect container health and migration logs
docker compose ps
docker compose logs -f api
```

### Service Routing via Nginx ([`infra/nginx/nginx.conf`](../infra/nginx/nginx.conf))

- **Customer Web & API Gateway (`:8080`):**
  - `/` -> `web:3000`
  - `/api/` -> `api:4000/api/`
- **Admin & Master Admin Gateway (`:8081` or `Host: admin.navrix.local`):**
  - `/` -> `admin:3001` (`X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`)
  - `/api/` -> `api:4000/api/`
- **TLS Termination:** Mount your TLS certificates (e.g., Let's Encrypt / Cloudflare Origin CA) into the `nginx` container and add `listen 443 ssl http2;` blocks redirecting HTTP `:80` to HTTPS `:443`.

---

## 3. Master Admin Post-Deployment Verification

1. Sign into the Admin Console as `MASTER_ADMIN` and open **Master Command** (`/master`).
2. Confirm **Ledger Solvency Reconciliation** displays `RECONCILED` with `0.00000000 USDT` discrepancy.
3. Confirm **Live Vault Telemetry** reflects the intended `BLOCKCHAIN_MODE`, `chainId`, `receivingWalletAddress`, and `requiredConfirmations`.
4. Test **Emergency Circuit Breakers** (`DEPOSITS_ENABLED`, `WITHDRAWALS_ENABLED`, `MAINTENANCE_MODE`) during maintenance windows.

