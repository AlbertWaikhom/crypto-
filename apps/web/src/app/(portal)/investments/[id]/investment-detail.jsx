'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { EmptyState, formatUsdt, StatusBadge } from '@navrix/ui';
import { apiRequest } from '../../../../lib/api';
import styles from './investment-detail.module.css';
export default function InvestmentDetailPage() {
  const params = useParams();
  const id = params.id;
  const { data: inv, isLoading } = useQuery({
    queryKey: ['investment-detail', id],
    queryFn: () => apiRequest(`/investments/${id}`),
    enabled: Boolean(id),
  });
  if (isLoading || !inv) {
    return <div className="py-16 text-center text-sm opacity-70">Loading investment...</div>;
  }
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            href="/investments"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Investments
          </Link>
          <h1 className="mt-1 font-mono text-2xl font-extrabold">{inv.investmentUid}</h1>
        </div>
        <StatusBadge status={inv.status} />
      </div>

      <div className={styles.summaryGrid}>
        <div className={styles.metricCard}>
          <div className="text-xs opacity-65">Principal Amount</div>
          <div className="mt-1 font-mono text-xl font-extrabold">
            {formatUsdt(inv.principalAmount)} USDT
          </div>
        </div>
        <div className={styles.metricCard}>
          <div className="text-xs opacity-65">Interest Model & Rate</div>
          <div className="mt-1 font-mono text-xl font-extrabold text-amber-400">
            {formatUsdt(inv.interestRate)}% ({inv.interestModel})
          </div>
        </div>
        <div className={styles.metricCard}>
          <div className="text-xs opacity-65">Total Interest Credited</div>
          <div className="mt-1 font-mono text-xl font-extrabold text-emerald-400">
            +{formatUsdt(inv.interestAmount)} USDT
          </div>
        </div>
        <div className={styles.metricCard}>
          <div className="text-xs opacity-65">Maturity Date</div>
          <div className="mt-1 text-base font-bold">
            {new Date(inv.maturityDate).toLocaleDateString()}
          </div>
        </div>
      </div>

      <section className={styles.panel}>
        <h2 className="mb-4 text-base font-bold">Interest / Profit Ledger Distributions</h2>
        {inv.interestRecords.length === 0 ? (
          <EmptyState
            title="No Interest Cycles Credited Yet"
            description="Each interest distribution creates an independent INT-YYYYMMDD-XXXXXX record and immutable INTEREST ledger entry."
          />
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-700/60 text-xs uppercase opacity-65">
                <th className="py-3 pr-4">Interest UID</th>
                <th className="py-3 pr-4">Period Key</th>
                <th className="py-3 pr-4">Model</th>
                <th className="py-3 pr-4">Rate</th>
                <th className="py-3 pr-4">Credited Amount</th>
                <th className="py-3 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {inv.interestRecords.map((r) => (
                <tr key={r.interestUid} className="border-b border-slate-800/50 last:border-none">
                  <td className="py-3 pr-4 font-mono text-xs text-amber-400">{r.interestUid}</td>
                  <td className="py-3 pr-4 font-mono text-xs">{r.periodKey}</td>
                  <td className="py-3 pr-4 text-xs">{r.calculationModel}</td>
                  <td className="py-3 pr-4 font-mono text-xs">{formatUsdt(r.rateApplied)}%</td>
                  <td className="py-3 pr-4 font-mono font-bold text-emerald-400">
                    +{formatUsdt(r.amount)} USDT
                  </td>
                  <td className="py-3 text-right text-xs opacity-70">
                    {new Date(r.creditedAt).toLocaleString()}
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
