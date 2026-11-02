'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Button, EmptyState, formatUsdt, StatusBadge } from '@navrix/ui';
import { apiRequest } from '../../../lib/api';
import styles from './investments.module.css';
export default function InvestmentsPage() {
  const { data: plans = [] } = useQuery({
    queryKey: ['investment-plans'],
    queryFn: () => apiRequest('/investments/plans'),
  });
  const { data: investments = [] } = useQuery({
    queryKey: ['my-investments'],
    queryFn: () => apiRequest('/investments'),
  });
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Investments & Yield Vaults</h1>
          <p className="mt-0.5 text-sm opacity-70">
            Approved USDT deposits activate dedicated investment records tracked independently from
            your original deposit ledger entry.
          </p>
        </div>
        <Link href="/deposit">
          <Button variant="gold">New Deposit Allocation</Button>
        </Link>
      </div>

      {plans.length > 0 ? (
        <section className={styles.plansGrid}>
          {plans.map((p) => (
            <div key={p.code} className={styles.planCard}>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-amber-400">{p.code}</span>
                <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-bold text-amber-300">
                  {Number(p.interestRate).toFixed(2)}% ({p.interestModel})
                </span>
              </div>
              <h2 className="mt-2 text-lg font-bold">{p.name}</h2>
              <p className="mt-1 text-xs opacity-70">{p.description}</p>
              <div className="mt-4 flex items-center justify-between border-t border-slate-700/50 pt-3 text-xs">
                <span>Duration: {p.durationDays} Days</span>
                <span>
                  Min: {formatUsdt(p.minAmount, 0)} USDT · Max: {formatUsdt(p.maxAmount, 0)} USDT
                </span>
              </div>
            </div>
          ))}
        </section>
      ) : null}

      <section className={styles.listPanel}>
        <h2 className="mb-4 text-base font-bold">Your Investment Positions</h2>
        {investments.length === 0 ? (
          <EmptyState
            title="No Investment Records"
            description="When an administrator verifies and approves your BEP-20 USDT deposit, an INV-YYYYMMDD-XXXXXX position will appear here."
          />
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-700/60 text-xs uppercase opacity-65">
                <th className="py-3 pr-4">Investment ID</th>
                <th className="py-3 pr-4">Principal</th>
                <th className="py-3 pr-4">Model & Rate</th>
                <th className="py-3 pr-4">Credited Yield</th>
                <th className="py-3 pr-4">Maturity</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 text-right">Details</th>
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
                  <td className="py-3.5 pr-4 font-mono font-bold">
                    {formatUsdt(inv.principalAmount)} USDT
                  </td>
                  <td className="py-3.5 pr-4 text-xs">
                    {inv.interestModel} · {formatUsdt(inv.interestRate)}%
                  </td>
                  <td className="py-3.5 pr-4 font-mono text-emerald-400 font-semibold">
                    +{formatUsdt(inv.interestAmount)} USDT
                  </td>
                  <td className="py-3.5 pr-4 text-xs">
                    {new Date(inv.maturityDate).toLocaleDateString()}
                  </td>
                  <td className="py-3.5 pr-4">
                    <StatusBadge status={inv.status} />
                  </td>
                  <td className="py-3.5 text-right">
                    <Link href={`/investments/${inv.investmentUid}`}>
                      <Button variant="outline" size="sm">
                        View
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
