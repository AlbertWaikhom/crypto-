'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Crown, ShieldAlert } from 'lucide-react';
import { Button, CopyButton, formatUsdt } from '@navrix/ui';
import { adminApi } from '../../../lib/api';
import styles from './master.module.css';

interface MasterOverviewResponse {
  reconciliation: {
    isReconciled: boolean;
    walletCount: number;
    sumAvailable: string;
    sumLocked: string;
    sumInvested: string;
    totalWalletEquity: string;
    totalLedgerCredits: string;
    totalLedgerDebits: string;
    netLedgerBalance: string;
    discrepancy: string;
    checkedAt: string;
  };
  vaultTelemetry: {
    mode: string;
    walletAddress: string;
    usdtBalance: string | null;
    bnbBalance: string | null;
    rpcHealthy: boolean;
  };
  runtime: {
    blockchainMode: string;
    chainId: number;
    usdtContractAddress: string;
    receivingWalletAddress: string;
    requiredConfirmations: number;
    depositsEnabled: boolean;
    withdrawalsEnabled: boolean;
    maintenanceMode: boolean;
  };
  roleBreakdown: Array<{ role: string; _count: { _all: number } }>;
  activeSessions: number;
  recentAudits: Array<{
    id: string;
    action: string;
    targetType: string;
    targetId: string;
    ipAddress: string | null;
    createdAt: string;
    admin?: { publicUid: string; name: string; role: string } | null;
  }>;
}

export default function MasterAdminPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['master-overview'],
    queryFn: () => adminApi<MasterOverviewResponse>('/admin/master/overview'),
  });

  const handleToggleBreaker = async (
    key: 'DEPOSITS_ENABLED' | 'WITHDRAWALS_ENABLED' | 'MAINTENANCE_MODE',
    enabled: boolean,
  ) => {
    await adminApi('/admin/master/circuit-breaker', {
      method: 'POST',
      body: JSON.stringify({ key, enabled }),
    });
    await queryClient.invalidateQueries({ queryKey: ['master-overview'] });
  };

  if (isLoading || !data) {
    return (
      <div className="py-16 text-center text-sm opacity-70">
        Loading Master Admin telemetry...
      </div>
    );
  }

  const rec = data.reconciliation;

  return (
    <div>
      <section className={styles.heroBanner}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-amber-400">
              <Crown className="h-4 w-4" />
              Master Admin Executive Command Center
            </div>
            <h1 className="mt-1 text-2xl font-extrabold">
              Global Solvency, On-Chain Vault & Circuit Governance
            </h1>
            <p className="mt-1 text-xs opacity-75">
              Real-time cryptographic reconciliation between user wallet
              liabilities and the append-only double-entry ledger.
            </p>
          </div>

          <div
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold ${
              rec.isReconciled
                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                : 'border-rose-500/40 bg-rose-500/15 text-rose-300'
            }`}
          >
            {rec.isReconciled ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <ShieldAlert className="h-4 w-4" />
            )}
            {rec.isReconciled
              ? 'LEDGER 100% RECONCILED (0.00000000 DISCREPANCY)'
              : `DISCREPANCY ALERT: ${rec.discrepancy} USDT`}
          </div>
        </div>
      </section>

      <div className={styles.twoCol}>
        <section className={styles.panel}>
          <h2 className="text-base font-bold mb-4">
            Double-Entry Ledger Solvency Proof
          </h2>
          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between">
              <span className="opacity-70">Tracked User Wallets:</span>
              <span className="font-mono font-bold">{rec.walletCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-70">Sum Available Balance:</span>
              <span className="font-mono">{formatUsdt(rec.sumAvailable)} USDT</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-70">Sum Locked (Pending Payouts):</span>
              <span className="font-mono">{formatUsdt(rec.sumLocked)} USDT</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-70">Sum Invested Principal:</span>
              <span className="font-mono">{formatUsdt(rec.sumInvested)} USDT</span>
            </div>
            <div className="border-t border-slate-700/60 pt-2 flex justify-between font-bold text-amber-400">
              <span>Total User Equity Liability:</span>
              <span className="font-mono">
                {formatUsdt(rec.totalWalletEquity)} USDT
              </span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-70">Immutable Ledger Credits:</span>
              <span className="font-mono text-emerald-400">
                +{formatUsdt(rec.totalLedgerCredits)} USDT
              </span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-70">Immutable Ledger Debits:</span>
              <span className="font-mono text-rose-400">
                -{formatUsdt(rec.totalLedgerDebits)} USDT
              </span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Net Immutable Ledger Sum:</span>
              <span className="font-mono">
                {formatUsdt(rec.netLedgerBalance)} USDT
              </span>
            </div>
          </div>
        </section>

        <section className={styles.panel}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold">
              Receiving Vault & Blockchain Monitor
            </h2>
            <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 font-mono text-xs font-bold text-amber-300">
              MODE: {data.runtime.blockchainMode}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <div className="opacity-65 mb-1">
                Configured BEP-20 Receiving Vault (Public Only — No Private Keys)
              </div>
              <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-700/60 p-2.5 font-mono">
                <span className="truncate">
                  {data.vaultTelemetry.walletAddress}
                </span>
                <CopyButton
                  value={data.vaultTelemetry.walletAddress}
                  label="Copy"
                />
              </div>
            </div>

            <div className="flex justify-between">
              <span className="opacity-70">Active Chain ID:</span>
              <span className="font-mono font-bold">
                {data.runtime.chainId} (BNB Smart Chain)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-70">Configured USDT Contract:</span>
              <span className="font-mono">
                {data.runtime.usdtContractAddress}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-70">Required Confirmations:</span>
              <span className="font-mono font-bold">
                {data.runtime.requiredConfirmations} Blocks
              </span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-70">On-Chain Vault USDT Balance:</span>
              <span className="font-mono font-bold text-emerald-400">
                {data.vaultTelemetry.usdtBalance !== null
                  ? `${formatUsdt(data.vaultTelemetry.usdtBalance)} USDT`
                  : 'MOCK MODE (No Live RPC Query)'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-70">Active User/Admin Sessions:</span>
              <span className="font-mono font-bold">{data.activeSessions}</span>
            </div>
          </div>
        </section>
      </div>

      <div className={styles.twoCol}>
        <section className={styles.panel}>
          <h2 className="text-base font-bold mb-1">
            Emergency Platform Circuit Breakers
          </h2>
          <p className="text-xs opacity-65 mb-4">
            Instant runtime controls persisted in MySQL with mandatory
            EMERGENCY_PAUSE_TOGGLED audit logging.
          </p>

          <div className={styles.breakerRow}>
            <div>
              <div className="text-sm font-bold">Customer USDT Deposits</div>
              <div className="text-xs opacity-65">
                Status:{' '}
                {data.runtime.depositsEnabled ? 'ENABLED' : 'PAUSED'}
              </div>
            </div>
            <Button
              variant={data.runtime.depositsEnabled ? 'danger' : 'gold'}
              size="sm"
              onClick={() =>
                handleToggleBreaker(
                  'DEPOSITS_ENABLED',
                  !data.runtime.depositsEnabled,
                )
              }
            >
              {data.runtime.depositsEnabled
                ? 'Pause Deposits'
                : 'Enable Deposits'}
            </Button>
          </div>

          <div className={styles.breakerRow}>
            <div>
              <div className="text-sm font-bold">Customer USDT Withdrawals</div>
              <div className="text-xs opacity-65">
                Status:{' '}
                {data.runtime.withdrawalsEnabled ? 'ENABLED' : 'PAUSED'}
              </div>
            </div>
            <Button
              variant={data.runtime.withdrawalsEnabled ? 'danger' : 'gold'}
              size="sm"
              onClick={() =>
                handleToggleBreaker(
                  'WITHDRAWALS_ENABLED',
                  !data.runtime.withdrawalsEnabled,
                )
              }
            >
              {data.runtime.withdrawalsEnabled
                ? 'Pause Withdrawals'
                : 'Enable Withdrawals'}
            </Button>
          </div>

          <div className={styles.breakerRow}>
            <div>
              <div className="text-sm font-bold">Global Maintenance Mode</div>
              <div className="text-xs opacity-65">
                Status: {data.runtime.maintenanceMode ? 'ACTIVE' : 'OFF'}
              </div>
            </div>
            <Button
              variant={data.runtime.maintenanceMode ? 'gold' : 'danger'}
              size="sm"
              onClick={() =>
                handleToggleBreaker(
                  'MAINTENANCE_MODE',
                  !data.runtime.maintenanceMode,
                )
              }
            >
              {data.runtime.maintenanceMode
                ? 'Exit Maintenance'
                : 'Activate Maintenance'}
            </Button>
          </div>
        </section>

        <section className={styles.panel}>
          <h2 className="text-base font-bold mb-4">
            Live Executive Security Audit Feed
          </h2>
          <div className="space-y-2.5 max-h-80 overflow-y-auto">
            {data.recentAudits.map((log) => (
              <div
                key={log.id}
                className="rounded-xl border border-slate-800 p-3 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-amber-400">
                    {log.action}
                  </span>
                  <span className="opacity-60">
                    {new Date(log.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                <div className="mt-1 opacity-80">
                  Target: {log.targetType} ({log.targetId}) · Actor:{' '}
                  {log.admin?.name || 'System'} ({log.admin?.role || '—'})
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

