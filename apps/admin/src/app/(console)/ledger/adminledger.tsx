'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { Button, EmptyState, formatUsdt } from '@navrix/ui';
import { adminApi } from '../../../lib/api';
import styles from './ledger.module.css';

interface LedgerRow {
  ledgerUid: string;
  transactionType: string;
  direction: 'CREDIT' | 'DEBIT';
  asset: string;
  amount: string;
  balanceBefore: string;
  balanceAfter: string;
  referenceType: string;
  referenceId: string;
  description: string;
  createdAt: string;
  user: { publicUid: string; name: string; email: string };
}

export default function AdminImmutableLedgerPage() {
  const [page, setPage] = React.useState(1);

  const { data } = useQuery({
    queryKey: ['admin-ledger', page],
    queryFn: () =>
      adminApi<{
        items: LedgerRow[];
        total: number;
        page: number;
        limit: number;
      }>(`/admin/ledger?page=${page}&limit=30`),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / (data?.limit || 30)));

  return (
    <div>
      <div className={styles.toolbar}>
        <div>
          <h1 className="text-2xl font-extrabold">Immutable Double-Entry Ledger</h1>
          <p className="mt-0.5 text-sm opacity-70">
            Append-only financial records — entries are never deleted or mutated; corrections
            strictly use reversing entries
          </p>
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-bold text-emerald-300">
          <ShieldCheck className="h-4 w-4" />
          {total} Immutable Entries
        </span>
      </div>

      <section className={styles.panel}>
        {items.length === 0 ? (
          <EmptyState
            title="Ledger Is Empty"
            description="Approved deposits, interest credits, and settled withdrawals will appear here."
          />
        ) : (
          <>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-700/60 text-xs uppercase opacity-65">
                  <th className="py-3 pr-4">Ledger ID</th>
                  <th className="py-3 pr-4">Account</th>
                  <th className="py-3 pr-4">Type</th>
                  <th className="py-3 pr-4">Amount</th>
                  <th className="py-3 pr-4">Balance Before</th>
                  <th className="py-3 pr-4">Balance After</th>
                  <th className="py-3 pr-4">Reference</th>
                  <th className="py-3">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {items.map((entry) => {
                  const isCredit = entry.direction === 'CREDIT';
                  return (
                    <tr
                      key={entry.ledgerUid}
                      className="border-b border-slate-800/50 last:border-none"
                    >
                      <td className="py-3.5 pr-4 font-mono text-xs font-bold text-amber-400">
                        {entry.ledgerUid}
                      </td>
                      <td className="py-3.5 pr-4 text-xs">
                        <div className="font-semibold">{entry.user.name}</div>
                        <div className="font-mono opacity-65">{entry.user.publicUid}</div>
                      </td>
                      <td className="py-3.5 pr-4 font-mono text-xs font-bold">
                        {entry.transactionType}
                      </td>
                      <td
                        className={`py-3.5 pr-4 font-mono text-xs font-extrabold ${
                          isCredit ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isCredit ? '+' : '-'}
                        {formatUsdt(entry.amount)} {entry.asset}
                      </td>
                      <td className="py-3.5 pr-4 font-mono text-xs opacity-75">
                        {formatUsdt(entry.balanceBefore)}
                      </td>
                      <td className="py-3.5 pr-4 font-mono text-xs font-semibold">
                        {formatUsdt(entry.balanceAfter)}
                      </td>
                      <td className="py-3.5 pr-4 text-xs">
                        <div className="font-mono font-semibold">{entry.referenceId}</div>
                        <div className="max-w-[240px] truncate opacity-65">{entry.description}</div>
                      </td>
                      <td className="py-3.5 text-xs opacity-70 whitespace-nowrap">
                        {new Date(entry.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className={styles.pager}>
              <div className="text-xs opacity-70">
                Page {page} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
