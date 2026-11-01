'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { Button, cn, EmptyState, formatUsdt, StatusBadge } from '@navrix/ui';
import { apiRequest } from '../../../lib/api';
import styles from './dashboard.module.css';

interface WalletOverviewResponse {
  asset: string;
  totalBalance: string;
  availableBalance: string;
  lockedBalance: string;
  investedBalance: string;
  pendingDeposits: string;
  pendingWithdrawals: string;
  totalInterestEarned: string;
  chartSeries: Array<{
    date: string;
    label: string;
    balance: number;
    type: string;
    uid: string;
  }>;
}

export default function CustomerDashboardPage() {
  const { data: wallet, isLoading: walletLoading } = useQuery({
    queryKey: ['wallet-overview'],
    queryFn: () => apiRequest<WalletOverviewResponse>('/wallet'),
  });

  const { data: deposits = [] } = useQuery({
    queryKey: ['my-deposits'],
    queryFn: () =>
      apiRequest<
        Array<{
          depositUid: string;
          requestedAmount: string;
          status: string;
          createdAt: string;
        }>
      >('/deposits'),
  });

  const { data: investments = [] } = useQuery({
    queryKey: ['my-investments'],
    queryFn: () =>
      apiRequest<
        Array<{
          investmentUid: string;
          principalAmount: string;
          interestRate: string;
          status: string;
          maturityDate: string;
        }>
      >('/investments'),
  });

  const { data: withdrawals = [] } = useQuery({
    queryKey: ['my-withdrawals'],
    queryFn: () =>
      apiRequest<
        Array<{
          withdrawalUid: string;
          amount: string;
          status: string;
          createdAt: string;
        }>
      >('/withdrawals'),
  });

  const { data: interestHistory = [] } = useQuery({
    queryKey: ['my-interest-history'],
    queryFn: () =>
      apiRequest<
        Array<{
          interestUid: string;
          periodKey: string;
          amount: string;
          creditedAt: string;
        }>
      >('/investments/interest-history'),
  });

  const kpis = [
    {
      label: 'Total Balance',
      value: wallet?.totalBalance ?? '0.00',
      highlight: true,
      sub: 'Available + Locked + Invested',
    },
    {
      label: 'Available Balance',
      value: wallet?.availableBalance ?? '0.00',
      highlight: false,
      sub: 'Ready for withdrawal',
    },
    {
      label: 'Invested Balance',
      value: wallet?.investedBalance ?? '0.00',
      highlight: false,
      sub: 'Active principal allocation',
    },
    {
      label: 'Pending Deposits',
      value: wallet?.pendingDeposits ?? '0.00',
      highlight: false,
      sub: 'Awaiting payment or review',
    },
    {
      label: 'Pending Withdrawals',
      value: wallet?.pendingWithdrawals ?? '0.00',
      highlight: false,
      sub: 'Locked for outbound settlement',
    },
    {
      label: 'Total Interest Earned',
      value: wallet?.totalInterestEarned ?? '0.00',
      highlight: true,
      sub: 'Immutable ledger yield credits',
    },
  ];

  return (
    <div>
      <div className={styles.headerRow}>
        <div>
          <h1 className="text-2xl font-extrabold">Portfolio Overview</h1>
          <p className="mt-0.5 text-sm opacity-70">
            Real-time balances computed strictly from your immutable USDT ledger
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/deposit">
            <Button variant="gold">
              <ArrowDownToLine className="h-4 w-4" />
              Deposit USDT
            </Button>
          </Link>
          <Link href="/withdraw">
            <Button variant="secondary">
              <ArrowUpFromLine className="h-4 w-4" />
              Withdraw
            </Button>
          </Link>
        </div>
      </div>

      <section className={styles.kpiGrid} aria-label="Financial Summary">
        {kpis.map((card) => (
          <div
            key={card.label}
            className={cn(
              styles.kpiCard,
              card.highlight && styles.kpiCardHighlight,
            )}
          >
            <div className={styles.kpiLabel}>{card.label}</div>
            <div className={styles.kpiValue}>
              {walletLoading ? '...' : `${formatUsdt(card.value)} USDT`}
            </div>
            <div className="mt-1.5 text-xs opacity-60">{card.sub}</div>
          </div>
        ))}
      </section>

      <section className={styles.chartPanel}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold">Ledger Balance Progression</h2>
            <p className="text-xs opacity-65">
              Derived directly from verified ledger entries (no synthetic data)
            </p>
          </div>
          <Link
            href="/transactions"
            className="text-xs font-semibold text-amber-400 hover:underline"
          >
            Full Ledger →
          </Link>
        </div>

        {!wallet?.chartSeries || wallet.chartSeries.length === 0 ? (
          <EmptyState
            title="No Ledger Balance Activity Yet"
            description="Once your first BEP-20 USDT deposit is verified and approved, your immutable equity curve will render here."
            action={
              <Link href="/deposit">
                <Button variant="gold" size="sm">
                  Create First Deposit
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={wallet.chartSeries}>
                <defs>
                  <linearGradient id="navrixGold" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F5B82E" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#F5B82E" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="label"
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  tickFormatter={(v) => `${v} USDT`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0E1526',
                    borderColor: 'rgba(245,184,46,0.35)',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="balance"
                  stroke="#F5B82E"
                  strokeWidth={2.5}
                  fill="url(#navrixGold)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <div className={styles.historyGrid}>
        <section className={styles.historyCard}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold">Recent Deposits</h3>
            <Link
              href="/deposit"
              className="text-xs text-amber-400 hover:underline"
            >
              View All
            </Link>
          </div>
          {deposits.length === 0 ? (
            <p className="py-6 text-center text-xs opacity-60">
              No deposit requests yet.
            </p>
          ) : (
            deposits.slice(0, 4).map((d) => (
              <Link
                key={d.depositUid}
                href={`/deposit/${d.depositUid}`}
                className={styles.rowItem}
              >
                <div>
                  <div className="font-mono text-xs font-semibold text-amber-400">
                    {d.depositUid}
                  </div>
                  <div className="text-xs opacity-65">
                    {new Date(d.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm font-bold">
                    {formatUsdt(d.requestedAmount)} USDT
                  </div>
                  <StatusBadge status={d.status} />
                </div>
              </Link>
            ))
          )}
        </section>

        <section className={styles.historyCard}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold">Active Investments</h3>
            <Link
              href="/investments"
              className="text-xs text-amber-400 hover:underline"
            >
              View All
            </Link>
          </div>
          {investments.length === 0 ? (
            <p className="py-6 text-center text-xs opacity-60">
              No active investment records yet.
            </p>
          ) : (
            investments.slice(0, 4).map((inv) => (
              <Link
                key={inv.investmentUid}
                href={`/investments/${inv.investmentUid}`}
                className={styles.rowItem}
              >
                <div>
                  <div className="font-mono text-xs font-semibold text-amber-400">
                    {inv.investmentUid}
                  </div>
                  <div className="text-xs opacity-65">
                    Rate: {formatUsdt(inv.interestRate)}%
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm font-bold">
                    {formatUsdt(inv.principalAmount)} USDT
                  </div>
                  <StatusBadge status={inv.status} />
                </div>
              </Link>
            ))
          )}
        </section>

        <section className={styles.historyCard}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold">Interest / Yield History</h3>
            <Link
              href="/interest-history"
              className="text-xs text-amber-400 hover:underline"
            >
              View All
            </Link>
          </div>
          {interestHistory.length === 0 ? (
            <p className="py-6 text-center text-xs opacity-60">
              No interest credits recorded yet.
            </p>
          ) : (
            interestHistory.slice(0, 4).map((ir) => (
              <div key={ir.interestUid} className={styles.rowItem}>
                <div>
                  <div className="font-mono text-xs font-semibold">
                    {ir.interestUid}
                  </div>
                  <div className="text-xs opacity-65">Period: {ir.periodKey}</div>
                </div>
                <div className="font-mono text-sm font-bold text-emerald-400">
                  +{formatUsdt(ir.amount)} USDT
                </div>
              </div>
            ))
          )}
        </section>

        <section className={styles.historyCard}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold">Withdrawal Requests</h3>
            <Link
              href="/withdraw"
              className="text-xs text-amber-400 hover:underline"
            >
              View All
            </Link>
          </div>
          {withdrawals.length === 0 ? (
            <p className="py-6 text-center text-xs opacity-60">
              No withdrawal requests yet.
            </p>
          ) : (
            withdrawals.slice(0, 4).map((w) => (
              <div key={w.withdrawalUid} className={styles.rowItem}>
                <div>
                  <div className="font-mono text-xs font-semibold text-amber-400">
                    {w.withdrawalUid}
                  </div>
                  <div className="text-xs opacity-65">
                    {new Date(w.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm font-bold">
                    {formatUsdt(w.amount)} USDT
                  </div>
                  <StatusBadge status={w.status} />
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}

