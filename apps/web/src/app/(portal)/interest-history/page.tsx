'use client';

import { useQuery } from '@tanstack/react-query';
import { EmptyState, formatUsdt } from '@navrix/ui';
import { apiRequest } from '../../../lib/api';
import styles from './interest-history.module.css';

export default function InterestHistoryPage() {
  const { data: records = [] } = useQuery({
    queryKey: ['my-interest-history'],
    queryFn: () =>
      apiRequest<
        Array<{
          interestUid: string;
          periodKey: string;
          calculationModel: string;
          rateApplied: string;
          principalSnapshot: string;
          amount: string;
          creditedAt: string;
          investment?: { investmentUid: string };
        }>
      >('/investments/interest-history'),
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold">Interest & Yield History</h1>
        <p className="mt-0.5 text-sm opacity-70">
          Every yield credit generates a dedicated ledger entry and is protected
          against duplicate period payouts.
        </p>
      </div>

      <section className={styles.panel}>
        {records.length === 0 ? (
          <EmptyState
            title="No Interest Records Yet"
            description="Yield distributions credited to your active investment positions will be itemized here."
          />
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-700/60 text-xs uppercase opacity-65">
                <th className="py-3 pr-4">Interest ID</th>
                <th className="py-3 pr-4">Investment</th>
                <th className="py-3 pr-4">Period</th>
                <th className="py-3 pr-4">Principal Snapshot</th>
                <th className="py-3 pr-4">Model / Rate</th>
                <th className="py-3 pr-4">Credited</th>
                <th className="py-3 text-right">Date</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr
                  key={r.interestUid}
                  className="border-b border-slate-800/50 last:border-none"
                >
                  <td className="py-3.5 pr-4 font-mono text-xs font-semibold text-amber-400">
                    {r.interestUid}
                  </td>
                  <td className="py-3.5 pr-4 font-mono text-xs">
                    {r.investment?.investmentUid || '—'}
                  </td>
                  <td className="py-3.5 pr-4 font-mono text-xs">{r.periodKey}</td>
                  <td className="py-3.5 pr-4 font-mono text-xs">
                    {formatUsdt(r.principalSnapshot)} USDT
                  </td>
                  <td className="py-3.5 pr-4 text-xs">
                    {r.calculationModel} ({formatUsdt(r.rateApplied)}%)
                  </td>
                  <td className="py-3.5 pr-4 font-mono font-bold text-emerald-400">
                    +{formatUsdt(r.amount)} USDT
                  </td>
                  <td className="py-3.5 text-right text-xs opacity-75">
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

