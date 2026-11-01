'use client';

import * as React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Coins } from 'lucide-react';
import { Button, EmptyState, formatUsdt, StatusBadge } from '@navrix/ui';
import { adminApi } from '../../../lib/api';
import styles from './investments.module.css';

interface InvestmentRow {
  investmentUid: string;
  principalAmount: string;
  asset: string;
  startDate: string;
  maturityDate: string | null;
  interestModel: string;
  interestRate: string;
  interestAmount: string;
  status: string;
  user: { publicUid: string; name: string; email: string };
  plan?: { code: string; name: string } | null;
  interestRecords: Array<{
    interestUid: string;
    periodKey: string;
    amount: string;
    creditedAt: string;
  }>;
}

export default function AdminInvestmentsPage() {
  const { data: investments = [] } = useQuery({
    queryKey: ['admin-investments'],
    queryFn: () => adminApi<InvestmentRow[]>('/admin/investments'),
  });

  const activeCount = investments.filter((i) => i.status === 'ACTIVE').length;
  const totalPrincipal = investments.reduce(
    (sum, i) => sum + Number(i.principalAmount || 0),
    0,
  );
  const totalYield = investments.reduce(
    (sum, i) => sum + Number(i.interestAmount || 0),
    0,
  );

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1 className="text-2xl font-extrabold">Active Investment Positions</h1>
          <p className="mt-0.5 text-sm opacity-70">
            Separate principal allocations linked to verified BEP-20 deposits —
            original deposit ledger records remain immutable
          </p>
        </div>

        <Link href="/interest">
          <Button variant="gold">
            <Coins className="h-4 w-4" />
            Open Interest Engine
          </Button>
        </Link>
      </div>

      <div className={styles.summaryGrid}>
        <div className={styles.metricCard}>
          <div className="text-xs uppercase tracking-wider opacity-65">
            Active Positions
          </div>
          <div className="mt-1 font-mono text-2xl font-extrabold text-amber-400">
            {activeCount} / {investments.length}
          </div>
        </div>
        <div className={styles.metricCard}>
          <div className="text-xs uppercase tracking-wider opacity-65">
            Total Principal Allocated
          </div>
          <div className="mt-1 font-mono text-2xl font-extrabold">
            {formatUsdt(totalPrincipal)} USDT
          </div>
        </div>
        <div className={styles.metricCard}>
          <div className="text-xs uppercase tracking-wider opacity-65">
            Cumulative Yield Credited
          </div>
          <div className="mt-1 font-mono text-2xl font-extrabold text-emerald-400">
            +{formatUsdt(totalYield)} USDT
          </div>
        </div>
      </div>

      <section className={styles.panel}>
        {investments.length === 0 ? (
          <EmptyState
            title="No Investment Records Yet"
            description="Approving a verified USDT deposit automatically creates a dedicated INV- position."
          />
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-700/60 text-xs uppercase opacity-65">
                <th className="py-3 pr-4">Investment ID</th>
                <th className="py-3 pr-4">Investor</th>
                <th className="py-3 pr-4">Vault Plan</th>
                <th className="py-3 pr-4">Principal</th>
                <th className="py-3 pr-4">Model / Rate</th>
                <th className="py-3 pr-4">Credited Yield</th>
                <th className="py-3 pr-4">Maturity</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 text-right">Yield</th>
              </tr>
            </thead>
            <tbody>
              {investments.map((inv) => (
                <tr
                  key={inv.investmentUid}
                  className="border-b border-slate-800/50 last:border-none"
                >
                  <td className="py-3.5 pr-4 font-mono text-xs font-bold text-amber-400">
                    {inv.investmentUid}
                  </td>
                  <td className="py-3.5 pr-4 text-xs">
                    <div className="font-semibold">{inv.user.name}</div>
                    <div className="font-mono opacity-65">{inv.user.publicUid}</div>
                  </td>
                  <td className="py-3.5 pr-4 text-xs">
                    <div className="font-semibold">
                      {inv.plan?.name || 'Standard Vault'}
                    </div>
                    <div className="font-mono opacity-60">
                      {inv.plan?.code || 'CUSTOM'}
                    </div>
                  </td>
                  <td className="py-3.5 pr-4 font-mono font-bold">
                    {formatUsdt(inv.principalAmount)} {inv.asset}
                  </td>
                  <td className="py-3.5 pr-4 font-mono text-xs">
                    <div>{inv.interestModel}</div>
                    <div className="text-amber-400">
                      {Number(inv.interestRate).toFixed(2)}%
                    </div>
                  </td>
                  <td className="py-3.5 pr-4 font-mono text-emerald-400 font-bold">
                    +{formatUsdt(inv.interestAmount)} USDT
                    <div className="text-[11px] font-normal opacity-65">
                      {inv.interestRecords.length} cycle(s)
                    </div>
                  </td>
                  <td className="py-3.5 pr-4 text-xs opacity-75">
                    {inv.maturityDate
                      ? new Date(inv.maturityDate).toLocaleDateString()
                      : 'Open'}
                  </td>
                  <td className="py-3.5 pr-4">
                    <StatusBadge status={inv.status} />
                  </td>
                  <td className="py-3.5 text-right">
                    <Link
                      href={`/interest?investment=${encodeURIComponent(
                        inv.investmentUid,
                      )}`}
                    >
                      <Button variant="secondary" size="sm">
                        Credit Yield
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

