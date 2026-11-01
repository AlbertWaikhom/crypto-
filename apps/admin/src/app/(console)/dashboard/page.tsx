'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Button, cn, formatUsdt, StatusBadge } from '@navrix/ui';
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
  const { data } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => adminApi<AdminDashboardData>('/admin/dashboard'),
  });

  const stats = [
    { label: 'Total Users', value: String(data?.totalUsers ?? 0), gold: false },
    {
      label: 'Pending Deposits',
      value: String(data?.pendingDeposits ?? 0),
      gold: true,
    },
    {
      label: 'Approved Deposits',
      value: String(data?.approvedDeposits ?? 0),
      gold: false,
    },
    {
      label: 'Pending Withdrawals',
      value: String(data?.pendingWithdrawals ?? 0),
      gold: true,
    },
    {
      label: 'Total Deposited',
      value: `${formatUsdt(data?.totalDeposited)} USDT`,
      gold: true,
    },
    {
      label: 'Total Withdrawn',
      value: `${formatUsdt(data?.totalWithdrawn)} USDT`,
      gold: false,
    },
    {
      label: 'Total Interest Credited',
      value: `${formatUsdt(data?.totalInterestCredited)} USDT`,
      gold: false,
    },
    {
      label: '>24h SLA Overdue',
      value: String(data?.overdueReviews ?? 0),
      gold: (data?.overdueReviews ?? 0) > 0,
    },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Operations Dashboard</h1>
          <p className="mt-0.5 text-sm opacity-70">
            Real-time platform metrics derived strictly from verified MySQL
            ledger and transaction tables
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/deposits">
            <Button variant="gold" size="sm">
              Review Deposits ({data?.pendingDeposits ?? 0})
            </Button>
          </Link>
          <Link href="/withdrawals">
            <Button variant="secondary" size="sm">
              Process Withdrawals ({data?.pendingWithdrawals ?? 0})
            </Button>
          </Link>
        </div>
      </div>

      <section className={styles.kpiGrid}>
        {stats.map((s) => (
          <div
            key={s.label}
            className={cn(styles.kpiCard, s.gold && styles.kpiGold)}
          >
            <div className="text-xs font-semibold uppercase tracking-wider opacity-65">
              {s.label}
            </div>
            <div className="mt-2 font-mono text-xl font-extrabold">
              {s.value}
            </div>
          </div>
        ))}
      </section>

      <div className={styles.queuesGrid}>
        <section className={styles.queueCard}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold">Latest Deposit Submissions</h2>
            <Link
              href="/deposits"
              className="text-xs font-semibold text-amber-400 hover:underline"
            >
              Open Full Queue →
            </Link>
          </div>
          <div className="space-y-3">
            {(data?.recentDeposits ?? []).map((d) => (
              <Link
                key={d.depositUid}
                href={`/deposits/${d.depositUid}`}
                className="flex items-center justify-between rounded-xl border border-slate-800 p-3 hover:border-amber-500/40"
              >
                <div>
                  <div className="font-mono text-xs font-bold text-amber-400">
                    {d.depositUid}
                  </div>
                  <div className="text-xs opacity-75">
                    {d.user.name} ({d.user.publicUid})
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm font-bold">
                    {formatUsdt(d.requestedAmount)} USDT
                  </div>
                  <StatusBadge status={d.status} />
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className={styles.queueCard}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold">Latest Withdrawal Requests</h2>
            <Link
              href="/withdrawals"
              className="text-xs font-semibold text-amber-400 hover:underline"
            >
              Manage Payouts →
            </Link>
          </div>
          <div className="space-y-3">
            {(data?.recentWithdrawals ?? []).map((w) => (
              <div
                key={w.withdrawalUid}
                className="flex items-center justify-between rounded-xl border border-slate-800 p-3"
              >
                <div>
                  <div className="font-mono text-xs font-bold text-amber-400">
                    {w.withdrawalUid}
                  </div>
                  <div className="text-xs opacity-75">
                    {w.user.name} ({w.user.publicUid})
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm font-bold">
                    {formatUsdt(w.amount)} USDT
                  </div>
                  <StatusBadge status={w.status} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

