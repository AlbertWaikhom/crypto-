'use client';

import * as React from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  ArrowUpRight,
  Blocks,
  CheckCircle2,
  Crown,
  Power,
  RefreshCw,
  ScrollText,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react';
import {
  AuroraBackground,
  Button,
  CopyButton,
  CountUp,
  DecryptedText,
  GradientText,
  ShinyText,
  SpotlightCard,
  StarBorder,
  formatUsdt,
  shortenHex,
} from '@navrix/ui';
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

type BreakerKey = 'DEPOSITS_ENABLED' | 'WITHDRAWALS_ENABLED' | 'MAINTENANCE_MODE';

export default function MasterAdminPage() {
  const queryClient = useQueryClient();
  const [togglingKey, setTogglingKey] = React.useState<BreakerKey | null>(null);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['master-overview'],
    queryFn: () => adminApi<MasterOverviewResponse>('/admin/master/overview'),
  });

  const handleToggleBreaker = async (key: BreakerKey, enabled: boolean) => {
    setTogglingKey(key);
    try {
      await adminApi('/admin/master/circuit-breaker', {
        method: 'POST',
        body: JSON.stringify({ key, enabled }),
      });
      await queryClient.invalidateQueries({ queryKey: ['master-overview'] });
    } finally {
      setTogglingKey(null);
    }
  };

  if (isLoading || !data) {
    return (
      <div className={styles.loadingWrap}>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
        <p className="text-xs font-medium opacity-75">
          Synchronizing Master Admin Solvency & On-Chain Telemetry...
        </p>
      </div>
    );
  }

  const rec = data.reconciliation;
  const totalEquityNum = Number(rec.totalWalletEquity ?? 0);
  const netLedgerNum = Number(rec.netLedgerBalance ?? 0);

  return (
    <div className={styles.masterGrid}>
      {/* Row 1: Compact Sovereign Solvency Bar */}
      <StarBorder color="#F5B82E" speed="7s">
        <AuroraBackground variant="sovereign" intensity="vivid" className={styles.heroStrip}>
          <div className={styles.heroLeft}>
            <div className={styles.badgeLine}>
              <span className={styles.crownTag}>
                <Crown className="h-3 w-3 text-amber-400" />
                <ShinyText text="MASTER SOVEREIGN COMMAND" />
              </span>

              <span className={rec.isReconciled ? styles.solvencyOk : styles.solvencyErr}>
                {rec.isReconciled ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <ShieldAlert className="h-3 w-3" />
                )}
                {rec.isReconciled
                  ? '100% RECONCILED · 0.00000000 DISCREPANCY'
                  : `DISCREPANCY: ${rec.discrepancy} USDT`}
              </span>
            </div>

            <div className={styles.equityLine}>
              <span className={styles.equityNum}>
                <GradientText variant="sovereign">
                  <CountUp value={totalEquityNum} decimals={2} />
                </GradientText>
                <span className={styles.equityUnit}>
                  USDT Total Liability · Checked {new Date(rec.checkedAt).toLocaleTimeString()}
                </span>
              </span>
            </div>
          </div>

          <div className={styles.govBar}>
            <button type="button" onClick={() => refetch()} className={styles.govPill}>
              <RefreshCw
                className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin text-amber-400' : ''}`}
              />
              <span>Verify</span>
            </button>
            <Link href="/admin/admin-users" className={styles.govPill}>
              <Users className="h-3.5 w-3.5 text-amber-400" />
              <span>Admin RBAC</span>
            </Link>
            <Link href="/admin/settings" className={styles.govPill}>
              <Settings className="h-3.5 w-3.5 text-emerald-400" />
              <span>Settings</span>
            </Link>
            <Link href="/admin/audit-logs" className={styles.govPill}>
              <ScrollText className="h-3.5 w-3.5 text-sky-400" />
              <span>Audits</span>
            </Link>
          </div>
        </AuroraBackground>
      </StarBorder>

      {/* Row 2: 4-Column Compact Telemetry Ribbon */}
      <section className={styles.summaryRibbon}>
        <SpotlightCard tone="gold" elevated className={styles.summaryTile}>
          <div className={styles.tileHead}>
            <span className={styles.tileLabel}>Wallet Liability</span>
            <Wallet className="h-3.5 w-3.5 text-amber-400" />
          </div>
          <div className={styles.tileVal}>
            <CountUp value={totalEquityNum} decimals={2} />
            <span className={styles.tileUnit}>USDT</span>
          </div>
        </SpotlightCard>

        <SpotlightCard tone="emerald" elevated className={styles.summaryTile}>
          <div className={styles.tileHead}>
            <span className={styles.tileLabel}>Net Ledger Sum</span>
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div className={styles.tileVal}>
            <CountUp value={netLedgerNum} decimals={2} />
            <span className={styles.tileUnit}>USDT</span>
          </div>
        </SpotlightCard>

        <SpotlightCard tone="cyan" className={styles.summaryTile}>
          <div className={styles.tileHead}>
            <span className={styles.tileLabel}>Tracked Wallets</span>
            <Blocks className="h-3.5 w-3.5 text-sky-400" />
          </div>
          <div className={styles.tileVal}>
            <CountUp value={rec.walletCount} decimals={0} />
          </div>
        </SpotlightCard>

        <SpotlightCard tone="violet" className={styles.summaryTile}>
          <div className={styles.tileHead}>
            <span className={styles.tileLabel}>Active Sessions</span>
            <Activity className="h-3.5 w-3.5 text-purple-400" />
          </div>
          <div className={styles.tileVal}>
            <CountUp value={data.activeSessions} decimals={0} />
          </div>
        </SpotlightCard>
      </section>

      {/* Row 3: 3-Column Sovereign Control Bento Grid (Fits Cleanly in Single Screen!) */}
      <div className={styles.mainBento}>
        {/* Col 1: Double-Entry Solvency Invariant */}
        <SpotlightCard
          tone={rec.isReconciled ? 'emerald' : 'rose'}
          elevated
          className={styles.bentoCard}
        >
          <div className={styles.cardTop}>
            <div>
              <h2 className={styles.cardTitle}>Double-Entry Solvency Proof</h2>
              <p className={styles.cardSub}>Wallet liabilities vs. append-only ledger</p>
            </div>
            <Link href="/admin/ledger" className={styles.textLink}>
              Ledger
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          <div className={styles.kvList}>
            <div className={styles.kvItem}>
              <span className={styles.kvKey}>Sum Available</span>
              <span className={styles.kvVal}>{formatUsdt(rec.sumAvailable)} USDT</span>
            </div>
            <div className={styles.kvItem}>
              <span className={styles.kvKey}>Sum Locked (Payouts)</span>
              <span className={styles.kvVal}>{formatUsdt(rec.sumLocked)} USDT</span>
            </div>
            <div className={styles.kvItem}>
              <span className={styles.kvKey}>Sum Invested</span>
              <span className={styles.kvVal}>{formatUsdt(rec.sumInvested)} USDT</span>
            </div>
            <div className={styles.kvHighlight}>
              <span>Total Equity Liability</span>
              <span data-tabular="true">{formatUsdt(rec.totalWalletEquity)} USDT</span>
            </div>
            <div className={styles.kvItem}>
              <span className={styles.kvKey}>Ledger Credits</span>
              <span className="font-bold text-emerald-400" data-tabular="true">
                +{formatUsdt(rec.totalLedgerCredits)} USDT
              </span>
            </div>
            <div className={styles.kvItem}>
              <span className={styles.kvKey}>Ledger Debits</span>
              <span className="font-bold text-rose-400" data-tabular="true">
                -{formatUsdt(rec.totalLedgerDebits)} USDT
              </span>
            </div>
            <div className={styles.kvItem}>
              <span className="font-bold">Net Ledger Balance</span>
              <span className="font-bold" data-tabular="true">
                {formatUsdt(rec.netLedgerBalance)} USDT
              </span>
            </div>
            <div className={styles.discrepancyBox}>
              <span>Discrepancy</span>
              <span
                className={
                  rec.isReconciled
                    ? 'font-extrabold text-emerald-400'
                    : 'font-extrabold text-rose-400'
                }
                data-tabular="true"
              >
                {rec.discrepancy} USDT
              </span>
            </div>
          </div>
        </SpotlightCard>

        {/* Col 2: BEP-20 Vault + Emergency Circuit Breakers */}
        <SpotlightCard tone="gold" className={styles.bentoCard}>
          <div className={styles.cardTop}>
            <div>
              <h2 className={styles.cardTitle}>Vault & Circuit Breakers</h2>
              <p className={styles.cardSub}>
                Chain {data.runtime.chainId} · {data.runtime.requiredConfirmations} Blks ·{' '}
                {data.runtime.blockchainMode}
              </p>
            </div>
            <span className={styles.modeTag}>{data.runtime.blockchainMode}</span>
          </div>

          <div className={styles.vaultCompactStack}>
            <div className={styles.addrRow}>
              <div className="min-w-0">
                <div className={styles.addrLabel}>Receiving Vault (BEP-20)</div>
                <div className={styles.addrHex} title={data.vaultTelemetry.walletAddress}>
                  <DecryptedText
                    text={shortenHex(data.vaultTelemetry.walletAddress, 10, 8)}
                    speedMs={18}
                  />
                </div>
              </div>
              <CopyButton value={data.vaultTelemetry.walletAddress} label="Copy" />
            </div>

            <div className={styles.addrRow}>
              <div className="min-w-0">
                <div className={styles.addrLabel}>USDT Contract</div>
                <div className={styles.addrHex} title={data.runtime.usdtContractAddress}>
                  {shortenHex(data.runtime.usdtContractAddress, 10, 8)}
                </div>
              </div>
              <CopyButton value={data.runtime.usdtContractAddress} label="Copy" />
            </div>

            <div className={styles.breakerList}>
              <div className={styles.breakerItem}>
                <div className="min-w-0">
                  <div className={styles.breakerTitle}>
                    <span>USDT Deposits</span>
                    <span
                      className={data.runtime.depositsEnabled ? styles.chipLive : styles.chipPaused}
                    >
                      {data.runtime.depositsEnabled ? 'LIVE' : 'PAUSED'}
                    </span>
                  </div>
                </div>
                <Button
                  variant={data.runtime.depositsEnabled ? 'danger' : 'gold'}
                  size="sm"
                  isLoading={togglingKey === 'DEPOSITS_ENABLED'}
                  onClick={() =>
                    handleToggleBreaker('DEPOSITS_ENABLED', !data.runtime.depositsEnabled)
                  }
                  className={styles.compactBreakerBtn}
                >
                  <Power className="h-3 w-3" />
                  {data.runtime.depositsEnabled ? 'Pause' : 'Enable'}
                </Button>
              </div>

              <div className={styles.breakerItem}>
                <div className="min-w-0">
                  <div className={styles.breakerTitle}>
                    <span>USDT Withdrawals</span>
                    <span
                      className={
                        data.runtime.withdrawalsEnabled ? styles.chipLive : styles.chipPaused
                      }
                    >
                      {data.runtime.withdrawalsEnabled ? 'LIVE' : 'PAUSED'}
                    </span>
                  </div>
                </div>
                <Button
                  variant={data.runtime.withdrawalsEnabled ? 'danger' : 'gold'}
                  size="sm"
                  isLoading={togglingKey === 'WITHDRAWALS_ENABLED'}
                  onClick={() =>
                    handleToggleBreaker('WITHDRAWALS_ENABLED', !data.runtime.withdrawalsEnabled)
                  }
                  className={styles.compactBreakerBtn}
                >
                  <Power className="h-3 w-3" />
                  {data.runtime.withdrawalsEnabled ? 'Pause' : 'Enable'}
                </Button>
              </div>

              <div className={styles.breakerItem}>
                <div className="min-w-0">
                  <div className={styles.breakerTitle}>
                    <span>Maintenance Shield</span>
                    <span
                      className={
                        data.runtime.maintenanceMode ? styles.chipPaused : styles.chipStandby
                      }
                    >
                      {data.runtime.maintenanceMode ? 'ACTIVE' : 'OFF'}
                    </span>
                  </div>
                </div>
                <Button
                  variant={data.runtime.maintenanceMode ? 'gold' : 'danger'}
                  size="sm"
                  isLoading={togglingKey === 'MAINTENANCE_MODE'}
                  onClick={() =>
                    handleToggleBreaker('MAINTENANCE_MODE', !data.runtime.maintenanceMode)
                  }
                  className={styles.compactBreakerBtn}
                >
                  <Power className="h-3 w-3" />
                  {data.runtime.maintenanceMode ? 'Disable' : 'Activate'}
                </Button>
              </div>
            </div>
          </div>
        </SpotlightCard>

        {/* Col 3: Executive Security Audit Stream */}
        <SpotlightCard tone="cyan" className={styles.bentoCard}>
          <div className={styles.cardTop}>
            <div>
              <h2 className={styles.cardTitle}>Executive Audit Stream</h2>
              <p className={styles.cardSub}>Live MySQL governance & RBAC feed</p>
            </div>
            <Link href="/admin/audit-logs" className={styles.textLink}>
              All Logs
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          {data.roleBreakdown && data.roleBreakdown.length > 0 ? (
            <div className={styles.roleRow}>
              {data.roleBreakdown.map((r) => (
                <span key={r.role} className={styles.rolePill}>
                  {r.role}: <strong>{r._count._all}</strong>
                </span>
              ))}
            </div>
          ) : null}

          <div className={styles.auditScroll}>
            {data.recentAudits.length === 0 ? (
              <p className="py-10 text-center text-xs opacity-60">No audit events recorded yet.</p>
            ) : (
              data.recentAudits.map((log) => (
                <div key={log.id} className={styles.auditRow}>
                  <div className={styles.auditHead}>
                    <span className={styles.auditAct}>{log.action}</span>
                    <span className={styles.auditTs}>
                      {new Date(log.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className={styles.auditSub}>
                    {log.targetType} ({log.targetId}) · {log.admin?.name || 'System'}
                  </div>
                </div>
              ))
            )}
          </div>
        </SpotlightCard>
      </div>
    </div>
  );
}
