'use client';

import * as React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  Clock,
  Coins,
  FileSpreadsheet,
  RefreshCw,
  ShieldCheck,
  Users,
} from 'lucide-react';
import {
  AnimatedTabs,
  AuroraBackground,
  CountUp,
  EmptyState,
  GradientText,
  ShinyText,
  SpotlightCard,
  StarBorder,
  StatusBadge,
  formatUsdt,
  type SpotlightTone,
} from '@navrix/ui';
import { adminApi } from '../../../lib/api';
import styles from './admin-dashboard.module.css';

interface AdminDashboardData {
  totalUsers: number;
  pendingDeposits: number;
  approvedDeposits: number;
  pendingWithdrawals: number;
  overdueReviews: number;
  totalDeposited: string;
  totalWithdrawn: string;
  totalInterestCredited: string;
  recentDeposits: Array<{
    depositUid: string;
    requestedAmount: string;
    status: string;
    createdAt: string;
    user: { publicUid: string; name: string };
  }>;
  recentWithdrawals: Array<{
    withdrawalUid: string;
    amount: string;
    status: string;
    createdAt: string;
    user: { publicUid: string; name: string };
  }>;
}

export default function AdminDashboardPage() {
  const [queueTab, setQueueTab] = React.useState<string>('deposits');

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => adminApi<AdminDashboardData>('/admin/dashboard'),
  });

  const totalDepositedNum = Number(data?.totalDeposited ?? 0);
  const totalWithdrawnNum = Number(data?.totalWithdrawn ?? 0);
  const totalInterestNum = Number(data?.totalInterestCredited ?? 0);
  const pendingDeposits = data?.pendingDeposits ?? 0;
  const approvedDeposits = data?.approvedDeposits ?? 0;
  const pendingWithdrawals = data?.pendingWithdrawals ?? 0;
  const overdueReviews = data?.overdueReviews ?? 0;
  const totalUsers = data?.totalUsers ?? 0;

  const netRetained = Math.max(0, totalDepositedNum - totalWithdrawnNum);

  const volumeBars = React.useMemo(
    () => [
      { name: 'Deposited', amount: totalDepositedNum, color: '#f5b82e' },
      { name: 'Yield', amount: totalInterestNum, color: '#10b981' },
      { name: 'Withdrawn', amount: totalWithdrawnNum, color: '#38bdf8' },
    ],
    [totalDepositedNum, totalInterestNum, totalWithdrawnNum],
  );

  const hasVolume =
    totalDepositedNum > 0 || totalInterestNum > 0 || totalWithdrawnNum > 0;

  const kpiTiles: Array<{
    label: string;
    value: number;
    decimals: number;
    unit?: string;
    tone: SpotlightTone;
    elevated?: boolean;
    icon: React.ReactNode;
  }> = [
    {
      label: 'Deposited',
      value: totalDepositedNum,
      decimals: 2,
      unit: 'USDT',
      tone: 'gold',
      elevated: true,
      icon: <ArrowDownToLine className="h-3.5 w-3.5 text-amber-400" />,
    },
    {
      label: 'Yield Credited',
      value: totalInterestNum,
      decimals: 2,
      unit: 'USDT',
      tone: 'emerald',
      elevated: true,
      icon: <Coins className="h-3.5 w-3.5 text-emerald-400" />,
    },
    {
      label: 'Withdrawn',
      value: totalWithdrawnNum,
      decimals: 2,
      unit: 'USDT',
      tone: 'cyan',
      icon: <ArrowUpFromLine className="h-3.5 w-3.5 text-sky-400" />,
    },
    {
      label: 'Accounts',
      value: totalUsers,
      decimals: 0,
      tone: 'slate',
      icon: <Users className="h-3.5 w-3.5 text-slate-300" />,
    },
    {
      label: 'Pending In',
      value: pendingDeposits,
      decimals: 0,
      tone: pendingDeposits > 0 ? 'gold' : 'slate',
      elevated: pendingDeposits > 0,
      icon: <Clock className="h-3.5 w-3.5 text-amber-300" />,
    },
    {
      label: 'Approved In',
      value: approvedDeposits,
      decimals: 0,
      tone: 'emerald',
      icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />,
    },
    {
      label: 'Pending Out',
      value: pendingWithdrawals,
      decimals: 0,
      tone: pendingWithdrawals > 0 ? 'cyan' : 'slate',
      elevated: pendingWithdrawals > 0,
      icon: <ArrowUpFromLine className="h-3.5 w-3.5 text-sky-300" />,
    },
    {
      label: '>24h Overdue',
      value: overdueReviews,
      decimals: 0,
      tone: overdueReviews > 0 ? 'rose' : 'emerald',
      elevated: overdueReviews > 0,
      icon:
        overdueReviews > 0 ? (
          <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
        ) : (
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
        ),
    },
  ];

  const recentDeposits = data?.recentDeposits ?? [];
  const recentWithdrawals = data?.recentWithdrawals ?? [];

  const tabItems = [
    { id: 'deposits', label: 'Deposits', count: recentDeposits.length },
    { id: 'withdrawals', label: 'Withdrawals', count: recentWithdrawals.length },
  ];

  return (
    <div className={styles.deckGrid}>
      {/* Row 1: Compact Single-Line Operations Bar */}
      <StarBorder color="#F5B82E" speed="8s">
        <AuroraBackground variant="emerald" intensity="vivid" className={styles.heroStrip}>
          <div className={styles.heroLeft}>
            <div className={styles.metaRow}>
              <span className={styles.opsTag}>
                <ShinyText text="TREASURY OPS DECK" />
              </span>
              <span
                className={
                  overdueReviews > 0 ? styles.slaAlert : styles.slaHealthy
                }
              >
                {overdueReviews > 0 ? (
                  <>
                    <AlertTriangle className="h-3 w-3" />
                    {overdueReviews} Over 24h SLA
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-3 w-3" />
                    24h SLA Healthy
                  </>
                )}
              </span>
            </div>

            <div className={styles.flowLine}>
              <span className={styles.flowNumber}>
                {isLoading ? (
                  <span className="opacity-50">0.00</span>
                ) : (
                  <GradientText variant="sovereign">
                    <CountUp value={netRetained} decimals={2} />
                  </GradientText>
                )}
                <span className={styles.flowUnit}>USDT Net Retained Flow</span>
              </span>
            </div>
          </div>

          <div className={styles.quickBar}>
            <button
              type="button"
              onClick={() => refetch()}
              className={styles.syncPill}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin text-amber-400' : ''}`}
              />
              <span>Sync</span>
            </button>
            <Link href="/deposits" className={styles.pillPrimary}>
              <ArrowDownToLine className="h-3.5 w-3.5" />
              <span>Deposits ({pendingDeposits})</span>
            </Link>
            <Link href="/withdrawals" className={styles.pillSecondary}>
              <ArrowUpFromLine className="h-3.5 w-3.5 text-sky-400" />
              <span>Payouts ({pendingWithdrawals})</span>
            </Link>
            <Link href="/interest" className={styles.pillSecondary}>
              <Coins className="h-3.5 w-3.5 text-emerald-400" />
              <span>Interest</span>
            </Link>
            <Link href="/ledger" className={styles.pillSecondary}>
              <FileSpreadsheet className="h-3.5 w-3.5 text-amber-400" />
              <span>Ledger</span>
            </Link>
          </div>
        </AuroraBackground>
      </StarBorder>

      {/* Row 2: Compact 4x2 Telemetry Ribbon */}
      <section className={styles.kpiGrid}>
        {kpiTiles.map((tile) => (
          <SpotlightCard
            key={tile.label}
            tone={tile.tone}
            elevated={tile.elevated}
            className={styles.kpiTile}
          >
            <div className={styles.kpiTop}>
              <span className={styles.kpiLabel}>{tile.label}</span>
              {tile.icon}
            </div>
            <div className={styles.kpiVal}>
              {isLoading ? (
                '...'
              ) : (
                <>
                  <CountUp value={tile.value} decimals={tile.decimals} />
                  {tile.unit ? (
                    <span className={styles.kpiUnit}>{tile.unit}</span>
                  ) : null}
                </>
              )}
            </div>
          </SpotlightCard>
        ))}
      </section>

      {/* Row 3: 3-Column Bento Workspace */}
      <div className={styles.mainBento}>
        {/* Col 1: Capital Volume BarChart */}
        <SpotlightCard tone="gold" className={styles.bentoCard}>
          <div className={styles.cardTop}>
            <div>
              <h2 className={styles.cardTitle}>Capital Flow Volume</h2>
              <p className={styles.cardSub}>Settled MySQL totals (USDT)</p>
            </div>
            <Link href="/ledger" className={styles.textLink}>
              Ledger
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          {!hasVolume ? (
            <div className={styles.emptyBox}>
              <EmptyState
                compact
                title="No Settled Capital Volume"
                description="Approved deposits, yield accruals, and payouts render here."
              />
            </div>
          ) : (
            <div className={styles.barCanvas}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={volumeBars}
                  margin={{ top: 6, right: 6, left: -16, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="rgba(148, 163, 184, 0.1)"
                  />
                  <XAxis
                    dataKey="name"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(148, 163, 184, 0.06)' }}
                    contentStyle={{
                      backgroundColor: 'rgba(11, 17, 32, 0.96)',
                      borderColor: 'rgba(245, 184, 46, 0.35)',
                      borderRadius: '10px',
                      fontSize: '11px',
                    }}
                    formatter={(val: number) => [`${formatUsdt(val)} USDT`, 'Volume']}
                  />
                  <Bar dataKey="amount" radius={[8, 8, 3, 3]} maxBarSize={52}>
                    {volumeBars.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </SpotlightCard>

        {/* Col 2: Queue & SLA Health */}
        <SpotlightCard tone="cyan" className={styles.bentoCard}>
          <div className={styles.cardTop}>
            <div>
              <h2 className={styles.cardTitle}>Pipeline Health</h2>
              <p className={styles.cardSub}>Live review counters</p>
            </div>
          </div>

          <div className={styles.pipelineList}>
            {[
              {
                label: 'Deposit Reviews',
                count: pendingDeposits,
                href: '/deposits',
                color: '#f5b82e',
              },
              {
                label: 'Withdrawal Payouts',
                count: pendingWithdrawals,
                href: '/withdrawals',
                color: '#38bdf8',
              },
              {
                label: 'Approved Deposits',
                count: approvedDeposits,
                href: '/deposits',
                color: '#10b981',
              },
              {
                label: 'Overdue >24h SLA',
                count: overdueReviews,
                href: '/deposits',
                color: overdueReviews > 0 ? '#f43f5e' : '#10b981',
              },
            ].map((row) => (
              <Link key={row.label} href={row.href} className={styles.pipelineRow}>
                <span className="flex items-center gap-2 min-w-0">
                  <span
                    className={styles.dot}
                    style={{ backgroundColor: row.color }}
                  />
                  <span className="truncate text-xs font-semibold">
                    {row.label}
                  </span>
                </span>
                <span className="flex items-center gap-1.5 shrink-0">
                  <span className={styles.countPill}>{row.count}</span>
                  <ChevronRight className="h-3 w-3 opacity-55" />
                </span>
              </Link>
            ))}
          </div>
        </SpotlightCard>

        {/* Col 3: Tabbed Live Review Queue */}
        <SpotlightCard tone="gold" className={styles.bentoCard}>
          <div className={styles.queueTop}>
            <AnimatedTabs
              compact
              items={tabItems}
              activeId={queueTab}
              onChange={setQueueTab}
              layoutGroupId="nv-compact-admin-tabs"
            />
            <Link
              href={queueTab === 'deposits' ? '/deposits' : '/withdrawals'}
              className={styles.textLink}
            >
              Open Queue
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          <div className={styles.queueScroll}>
            {queueTab === 'deposits' ? (
              recentDeposits.length === 0 ? (
                <p className={styles.emptyText}>No recent deposit submissions.</p>
              ) : (
                recentDeposits.map((d) => (
                  <Link
                    key={d.depositUid}
                    href={`/deposits/${d.depositUid}`}
                    className={styles.queueRow}
                  >
                    <div className="min-w-0">
                      <div className={styles.rowUid}>{d.depositUid}</div>
                      <div className={styles.rowUser}>
                        {d.user.name} · {d.user.publicUid}
                      </div>
                    </div>
                    <div className={styles.rowRight}>
                      <span className={styles.rowAmt}>
                        {formatUsdt(d.requestedAmount)} USDT
                      </span>
                      <StatusBadge status={d.status} />
                    </div>
                  </Link>
                ))
              )
            ) : recentWithdrawals.length === 0 ? (
              <p className={styles.emptyText}>No withdrawal requests in queue.</p>
            ) : (
              recentWithdrawals.map((w) => (
                <Link
                  key={w.withdrawalUid}
                  href="/withdrawals"
                  className={styles.queueRow}
                >
                  <div className="min-w-0">
                    <div className={styles.rowUid}>{w.withdrawalUid}</div>
                    <div className={styles.rowUser}>
                      {w.user.name} · {w.user.publicUid}
                    </div>
                  </div>
                  <div className={styles.rowRight}>
                    <span className={styles.rowAmt}>
                      {formatUsdt(w.amount)} USDT
                    </span>
                    <StatusBadge status={w.status} />
                  </div>
                </Link>
              ))
            )}
          </div>
        </SpotlightCard>
      </div>
    </div>
  );
}
