'use client';

import * as React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Blocks, CheckCircle2, XCircle } from 'lucide-react';
import {
  CopyButton,
  EmptyState,
  formatUsdt,
  shortenHex,
} from '@navrix/ui';
import { adminApi } from '../../../lib/api';
import styles from './blockchain-txs.module.css';

interface BlockchainTxRow {
  id: string;
  transactionHash: string;
  direction: 'INBOUND' | 'OUTBOUND';
  verificationMode: string;
  network: string;
  chainId: number;
  blockNumber: number | null;
  fromAddress: string | null;
  toAddress: string | null;
  tokenContract: string | null;
  tokenAmount: string | null;
  confirmationCount: number;
  txSucceeded: boolean;
  isValid: boolean;
  failureCode: string | null;
  failureReason: string | null;
  verifiedAt: string;
  deposit?: { depositUid: string; status: string } | null;
  withdrawal?: { withdrawalUid: string; status: string } | null;
}

export default function AdminBlockchainTransactionsPage() {
  const { data: txs = [] } = useQuery({
    queryKey: ['admin-blockchain-txs'],
    queryFn: () =>
      adminApi<BlockchainTxRow[]>('/admin/blockchain-transactions'),
  });

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1 className="text-2xl font-extrabold flex items-center gap-2">
            <Blocks className="h-6 w-6 text-amber-400" />
            Verified BNB Smart Chain Transactions
          </h1>
          <p className="mt-0.5 text-sm opacity-70">
            Authoritative BEP-20 Transfer log receipts verified server-side via
            Viem (unique transactionHash enforced at MySQL index level)
          </p>
        </div>
      </div>

      <section className={styles.panel}>
        {txs.length === 0 ? (
          <EmptyState
            title="No Blockchain Transactions Recorded"
            description="Verified inbound deposit receipts and outbound withdrawal settlements will appear here."
          />
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-700/60 text-xs uppercase opacity-65">
                <th className="py-3 pr-4">Direction / Mode</th>
                <th className="py-3 pr-4">Transaction Hash</th>
                <th className="py-3 pr-4">From -&gt; To</th>
                <th className="py-3 pr-4">Token Amount</th>
                <th className="py-3 pr-4">Block / Conf</th>
                <th className="py-3 pr-4">Linked Record</th>
                <th className="py-3">Validity</th>
              </tr>
            </thead>
            <tbody>
              {txs.map((tx) => (
                <tr
                  key={tx.id}
                  className="border-b border-slate-800/50 last:border-none"
                >
                  <td className="py-3.5 pr-4 text-xs">
                    <span
                      className={`rounded px-2 py-0.5 font-mono font-bold ${
                        tx.direction === 'INBOUND'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-sky-500/15 text-sky-400'
                      }`}
                    >
                      {tx.direction}
                    </span>
                    <div className="mt-1 font-mono text-[11px] opacity-65">
                      {tx.verificationMode} · Chain {tx.chainId}
                    </div>
                  </td>
                  <td className="py-3.5 pr-4 font-mono text-xs">
                    <div className="flex items-center gap-1.5">
                      <span>{shortenHex(tx.transactionHash, 10, 8)}</span>
                      <CopyButton value={tx.transactionHash} />
                    </div>
                  </td>
                  <td className="py-3.5 pr-4 font-mono text-xs">
                    <div>
                      <span className="opacity-55">F:</span>{' '}
                      {shortenHex(tx.fromAddress, 6, 4)}
                    </div>
                    <div className="text-amber-300">
                      <span className="opacity-55">T:</span>{' '}
                      {shortenHex(tx.toAddress, 6, 4)}
                    </div>
                  </td>
                  <td className="py-3.5 pr-4 font-mono font-bold">
                    {tx.tokenAmount
                      ? `${formatUsdt(tx.tokenAmount)} USDT`
                      : '—'}
                  </td>
                  <td className="py-3.5 pr-4 font-mono text-xs">
                    <div>#{tx.blockNumber ?? '—'}</div>
                    <div className="opacity-65">
                      {tx.confirmationCount} confirmations
                    </div>
                  </td>
                  <td className="py-3.5 pr-4 font-mono text-xs">
                    {tx.deposit ? (
                      <Link
                        href={`/deposits/${tx.deposit.depositUid}`}
                        className="text-amber-400 underline"
                      >
                        {tx.deposit.depositUid}
                      </Link>
                    ) : tx.withdrawal ? (
                      <span className="text-sky-400">
                        {tx.withdrawal.withdrawalUid}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-3.5 text-xs">
                    {tx.isValid ? (
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-400">
                        <CheckCircle2 className="h-4 w-4" />
                        VALID
                      </span>
                    ) : (
                      <div>
                        <span className="inline-flex items-center gap-1 font-bold text-rose-400">
                          <XCircle className="h-4 w-4" />
                          {tx.failureCode || 'INVALID'}
                        </span>
                        {tx.failureReason ? (
                          <div className="mt-0.5 max-w-[200px] truncate text-[11px] opacity-70">
                            {tx.failureReason}
                          </div>
                        ) : null}
                      </div>
                    )}
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

