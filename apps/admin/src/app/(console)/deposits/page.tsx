'use client';

import * as React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Button,
  EmptyState,
  formatUsdt,
  shortenHex,
  StatusBadge,
} from '@navrix/ui';
import { adminApi } from '../../../lib/api';
import styles from './deposits.module.css';

export default function AdminDepositsQueuePage() {
  const [statusFilter, setStatusFilter] = React.useState('');

  const { data: deposits = [] } = useQuery({
    queryKey: ['admin-deposits', statusFilter],
    queryFn: () =>
      adminApi<
        Array<{
          depositUid: string;
          requestedAmount: string;
          verifiedAmount: string | null;
          network: string;
          status: string;
          submittedAt: string | null;
          reviewDeadline: string | null;
          createdAt: string;
          user: { publicUid: string; name: string; email: string };
          submission?: { transactionHash: string } | null;
          blockchainTx?: {
            isValid: boolean;
            tokenAmount: string | null;
            confirmationCount: number;
          } | null;
        }>
      >(`/admin/deposits${statusFilter ? `?status=${statusFilter}` : ''}`),
  });

  return (
    <div>
      <div className={styles.toolbar}>
        <div>
          <h1 className="text-2xl font-extrabold">Deposit Verification Queue</h1>
          <p className="mt-0.5 text-sm opacity-70">
            Verify BEP-20 transaction receipts on BNB Smart Chain before
            authorizing immutable ledger credits
          </p>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={styles.select}
          aria-label="Filter deposits by status"
        >
          <option value="">All Statuses</option>
          <option value="UNDER_REVIEW">UNDER_REVIEW</option>
          <option value="PAYMENT_SUBMITTED">PAYMENT_SUBMITTED</option>
          <option value="BLOCKCHAIN_DETECTED">BLOCKCHAIN_DETECTED</option>
          <option value="PENDING_PAYMENT">PENDING_PAYMENT</option>
          <option value="APPROVED">APPROVED</option>
          <option value="REJECTED">REJECTED</option>
        </select>
      </div>

      <section className={styles.panel}>
        {deposits.length === 0 ? (
          <EmptyState
            title="No Deposits Match Filter"
            description="Customer USDT deposit requests will populate here in real time."
          />
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-700/60 text-xs uppercase opacity-65">
                <th className="py-3 pr-4">Deposit ID</th>
                <th className="py-3 pr-4">Investor</th>
                <th className="py-3 pr-4">Requested</th>
                <th className="py-3 pr-4">On-Chain Actual</th>
                <th className="py-3 pr-4">Tx Hash</th>
                <th className="py-3 pr-4">Chain Check</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 text-right">Review</th>
              </tr>
            </thead>
            <tbody>
              {deposits.map((d) => (
                <tr
                  key={d.depositUid}
                  className="border-b border-slate-800/50 last:border-none"
                >
                  <td className="py-3.5 pr-4 font-mono text-xs font-bold text-amber-400">
                    {d.depositUid}
                  </td>
                  <td className="py-3.5 pr-4 text-xs">
                    <div className="font-semibold">{d.user.name}</div>
                    <div className="opacity-65 font-mono">{d.user.publicUid}</div>
                  </td>
                  <td className="py-3.5 pr-4 font-mono font-bold">
                    {formatUsdt(d.requestedAmount)} USDT
                  </td>
                  <td className="py-3.5 pr-4 font-mono text-emerald-400">
                    {d.blockchainTx?.tokenAmount
                      ? `${formatUsdt(d.blockchainTx.tokenAmount)} USDT`
                      : '—'}
                  </td>
                  <td className="py-3.5 pr-4 font-mono text-xs">
                    {shortenHex(d.submission?.transactionHash, 8, 6)}
                  </td>
                  <td className="py-3.5 pr-4 text-xs">
                    {d.blockchainTx ? (
                      <span
                        className={
                          d.blockchainTx.isValid
                            ? 'font-bold text-emerald-400'
                            : 'font-bold text-rose-400'
                        }
                      >
                        {d.blockchainTx.isValid
                          ? `VALID (${d.blockchainTx.confirmationCount} conf)`
                          : 'FAILED'}
                      </span>
                    ) : (
                      <span className="opacity-50">Unchecked</span>
                    )}
                  </td>
                  <td className="py-3.5 pr-4">
                    <StatusBadge status={d.status} />
                  </td>
                  <td className="py-3.5 text-right">
                    <Link href={`/deposits/${d.depositUid}`}>
                      <Button variant="gold" size="sm">
                        Inspect
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

