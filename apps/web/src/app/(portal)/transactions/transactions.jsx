'use client';
import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { EmptyState, formatUsdt, StatusBadge } from '@navrix/ui';
import { apiRequest } from '../../../lib/api';
import styles from './transactions.module.css';
export default function TransactionsPage() {
  const [filterType, setFilterType] = React.useState('');
  const { data } = useQuery({
    queryKey: ['wallet-ledger', filterType],
    queryFn: () => apiRequest(`/wallet/ledger?limit=60${filterType ? `&type=${filterType}` : ''}`),
  });
  const entries = data?.items ?? [];
  return (
    <div>
      <div className={styles.toolbar}>
        <div>
          <h1 className="text-2xl font-extrabold">Immutable Ledger History</h1>
          <p className="mt-0.5 text-sm opacity-70">
            Append-only double-entry audit trail recording balance before and balance after every
            mutation
          </p>
        </div>

        <select
          aria-label="Filter transaction type"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="">All Ledger Types</option>
          <option value="DEPOSIT">DEPOSIT</option>
          <option value="INTEREST">INTEREST</option>
          <option value="WITHDRAWAL">WITHDRAWAL</option>
          <option value="ADJUSTMENT">ADJUSTMENT</option>
          <option value="REFUND">REFUND</option>
        </select>
      </div>

      <section className={styles.panel}>
        {entries.length === 0 ? (
          <EmptyState
            title="No Ledger Entries Found"
            description="Your immutable ledger entries (DEPOSIT, INTEREST, WITHDRAWAL) will appear here once transactions are finalized."
          />
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-700/60 text-xs uppercase opacity-65">
                <th className="py-3 pr-4">Ledger ID</th>
                <th className="py-3 pr-4">Type</th>
                <th className="py-3 pr-4">Amount</th>
                <th className="py-3 pr-4">Balance Before</th>
                <th className="py-3 pr-4">Balance After</th>
                <th className="py-3 pr-4">Reference</th>
                <th className="py-3 text-right">Date</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.ledgerUid} className="border-b border-slate-800/50 last:border-none">
                  <td className="py-3.5 pr-4 font-mono text-xs text-amber-400">{e.ledgerUid}</td>
                  <td className="py-3.5 pr-4">
                    <StatusBadge status={e.transactionType} />
                  </td>
                  <td
                    className={`py-3.5 pr-4 font-mono font-bold ${
                      e.direction === 'CREDIT' ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {e.direction === 'CREDIT' ? '+' : '-'}
                    {formatUsdt(e.amount)} {e.asset}
                  </td>
                  <td className="py-3.5 pr-4 font-mono text-xs opacity-75">
                    {formatUsdt(e.balanceBefore)} {e.asset}
                  </td>
                  <td className="py-3.5 pr-4 font-mono text-xs font-semibold">
                    {formatUsdt(e.balanceAfter)} {e.asset}
                  </td>
                  <td className="py-3.5 pr-4 font-mono text-xs">{e.referenceId}</td>
                  <td className="py-3.5 text-right text-xs opacity-70">
                    {new Date(e.createdAt).toLocaleString()}
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
