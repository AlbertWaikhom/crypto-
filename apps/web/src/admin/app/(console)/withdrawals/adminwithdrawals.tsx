'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ExternalLink, LockOpen, Send, XCircle } from 'lucide-react';
import { Button, CopyButton, EmptyState, formatUsdt, shortenHex, StatusBadge } from '@navrix/ui';
import { adminApi, AdminApiError } from '../../../lib/api';
import styles from './withdrawals.module.css';

interface WithdrawalRow {
  withdrawalUid: string;
  amount: string;
  feeAmount: string;
  netAmount: string;
  asset: string;
  network: string;
  destinationAddress: string;
  status: string;
  transactionHash: string | null;
  rejectionReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
  completedAt: string | null;
  user: {
    publicUid: string;
    name: string;
    email: string;
    payoutWalletAddress?: string | null;
    payoutWalletUpdatedAt?: string | null;
  };
  admin?: { publicUid: string; name: string } | null;
}

export default function AdminWithdrawalsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = React.useState('');
  const [feedback, setFeedback] = React.useState<{
    type: 'ok' | 'err';
    message: string;
  } | null>(null);

  const [rejectTarget, setRejectTarget] = React.useState<WithdrawalRow | null>(null);
  const [rejectReason, setRejectReason] = React.useState('');

  const [completeTarget, setCompleteTarget] = React.useState<WithdrawalRow | null>(null);
  const [outboundTxHash, setOutboundTxHash] = React.useState('');

  const { data: withdrawals = [] } = useQuery({
    queryKey: ['admin-withdrawals', statusFilter],
    queryFn: () =>
      adminApi<WithdrawalRow[]>(
        `/admin/withdrawals${statusFilter ? `?status=${statusFilter}` : ''}`,
      ),
  });

  const invalidateAll = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-withdrawals'] });
    void queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
    void queryClient.invalidateQueries({ queryKey: ['admin-master'] });
  };

  const approveMutation = useMutation({
    mutationFn: (uid: string) => adminApi(`/admin/withdrawals/${uid}/approve`, { method: 'POST' }),
    onSuccess: (_, uid) => {
      setFeedback({
        type: 'ok',
        message: `Withdrawal ${uid} approved for outbound treasury settlement.`,
      });
      invalidateAll();
    },
    onError: (err) => {
      setFeedback({
        type: 'err',
        message: err instanceof AdminApiError ? err.message : 'Approval failed.',
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (payload: { uid: string; reason: string }) =>
      adminApi(`/admin/withdrawals/${payload.uid}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: payload.reason }),
      }),
    onSuccess: (_, vars) => {
      setFeedback({
        type: 'ok',
        message: `Withdrawal ${vars.uid} rejected — locked USDT atomically returned to available balance.`,
      });
      setRejectTarget(null);
      setRejectReason('');
      invalidateAll();
    },
    onError: (err) => {
      setFeedback({
        type: 'err',
        message: err instanceof AdminApiError ? err.message : 'Rejection failed.',
      });
    },
  });

  const completeMutation = useMutation({
    mutationFn: (payload: { uid: string; transactionHash: string }) =>
      adminApi(`/admin/withdrawals/${payload.uid}/complete`, {
        method: 'POST',
        body: JSON.stringify({ transactionHash: payload.transactionHash }),
      }),
    onSuccess: (_, vars) => {
      setFeedback({
        type: 'ok',
        message: `Withdrawal ${vars.uid} settled on-chain and final WITHDRAWAL debit recorded in immutable ledger.`,
      });
      setCompleteTarget(null);
      setOutboundTxHash('');
      invalidateAll();
    },
    onError: (err) => {
      setFeedback({
        type: 'err',
        message: err instanceof AdminApiError ? err.message : 'Completion failed.',
      });
    },
  });

  return (
    <div>
      <div className={styles.toolbar}>
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold">Withdrawal Settlement Queue</h1>
          <p className="mt-0.5 text-xs sm:text-sm opacity-70">
            Review locked BEP-20 payout requests, unlock rejected funds, or record outbound BNB
            Smart Chain settlement hashes
          </p>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={styles.select}
          aria-label="Filter withdrawals by status"
        >
          <option value="">All Statuses</option>
          <option value="PENDING_REVIEW">PENDING_REVIEW</option>
          <option value="APPROVED">APPROVED</option>
          <option value="PROCESSING">PROCESSING</option>
          <option value="COMPLETED">COMPLETED</option>
          <option value="REJECTED">REJECTED</option>
        </select>
      </div>

      {feedback ? (
        <div
          className={`mb-4 rounded-xl border px-4 py-3 text-sm font-medium ${
            feedback.type === 'ok'
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
              : 'border-rose-500/40 bg-rose-500/10 text-rose-300'
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      {rejectTarget ? (
        <div className={styles.modalCard}>
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="text-base font-bold text-rose-400">
              Reject &amp; Unlock Funds — {rejectTarget.withdrawalUid} (
              {formatUsdt(rejectTarget.amount)} USDT)
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setRejectTarget(null);
                setRejectReason('');
              }}
            >
              Cancel
            </Button>
          </div>
          <p className="text-xs opacity-70 mb-3">
            Rejecting this request immediately unlocks{' '}
            <span className="font-mono font-bold">{formatUsdt(rejectTarget.amount)} USDT</span> from{' '}
            <span className="font-mono">lockedBalance</span> back to {rejectTarget.user.publicUid}
            &apos;s <span className="font-mono">availableBalance</span> and writes an immutable
            audit record.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Mandatory rejection reason (minimum 5 characters)..."
              className={styles.input}
            />
            <Button
              variant="danger"
              isLoading={rejectMutation.isPending}
              disabled={rejectReason.trim().length < 5}
              onClick={() =>
                rejectMutation.mutate({
                  uid: rejectTarget.withdrawalUid,
                  reason: rejectReason.trim(),
                })
              }
            >
              <LockOpen className="h-4 w-4" />
              Confirm Reject &amp; Unlock
            </Button>
          </div>
        </div>
      ) : null}

      {completeTarget ? (
        <div className={styles.modalCard}>
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="text-base font-bold text-amber-400">
              Complete Outbound Settlement — {completeTarget.withdrawalUid} (Net:{' '}
              {formatUsdt(completeTarget.netAmount)} USDT)
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setCompleteTarget(null);
                setOutboundTxHash('');
              }}
            >
              Cancel
            </Button>
          </div>
          <div className="mb-3 rounded-lg border border-slate-700/60 bg-slate-900/40 p-3 text-xs space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="opacity-70">Destination BEP-20 Wallet:</span>
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <span className="font-mono font-bold text-emerald-400 break-all">
                  {completeTarget.destinationAddress}
                </span>
                <CopyButton value={completeTarget.destinationAddress} />
              </div>
            </div>
            {completeTarget.user.payoutWalletAddress && (
              <div className="flex items-center gap-1.5 text-[11px]">
                {completeTarget.user.payoutWalletAddress.toLowerCase() ===
                completeTarget.destinationAddress.toLowerCase() ? (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Verified: Matches investor&apos;s registered Wallet ID in profile settings.
                  </span>
                ) : (
                  <span className="text-rose-400 font-semibold flex items-center gap-1">
                    <XCircle className="h-3.5 w-3.5" />
                    Warning: Differs from registered Wallet ID (
                    {completeTarget.user.payoutWalletAddress}).
                  </span>
                )}
              </div>
            )}
            <div className="opacity-70 pt-1">
              Platform never stores private keys. Execute payout externally from treasury
              multisig/hardware wallet, then paste the 66-char BSC transaction hash below.
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={outboundTxHash}
              onChange={(e) => setOutboundTxHash(e.target.value)}
              placeholder="0x... (66-character outbound BNB Smart Chain transaction hash)"
              className={`${styles.input} font-mono`}
            />
            <Button
              variant="gold"
              isLoading={completeMutation.isPending}
              disabled={outboundTxHash.trim().length !== 66}
              onClick={() =>
                completeMutation.mutate({
                  uid: completeTarget.withdrawalUid,
                  transactionHash: outboundTxHash.trim(),
                })
              }
            >
              <Send className="h-4 w-4" />
              Record Settlement &amp; Debit Ledger
            </Button>
          </div>
        </div>
      ) : null}

      <section className={styles.panel}>
        {withdrawals.length === 0 ? (
          <EmptyState
            title="No Withdrawals Match Filter"
            description="Customer BEP-20 USDT withdrawal requests will appear here."
          />
        ) : (
          <table className="w-full min-w-[740px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-700/60 text-xs uppercase opacity-65">
                <th className="py-3 pr-4">Withdrawal ID</th>
                <th className="py-3 pr-4">Investor</th>
                <th className="py-3 pr-4">Locked / Net</th>
                <th className="py-3 pr-4">Destination (BEP-20)</th>
                <th className="py-3 pr-4">Outbound Tx</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {withdrawals.map((w) => (
                <tr key={w.withdrawalUid} className="border-b border-slate-800/50 last:border-none">
                  <td className="py-3.5 pr-4 font-mono text-xs font-bold text-amber-400">
                    {w.withdrawalUid}
                    <div className="font-sans text-[11px] font-normal opacity-60">
                      {new Date(w.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="py-3.5 pr-4 text-xs">
                    <div className="font-semibold">{w.user.name}</div>
                    <div className="font-mono opacity-65">{w.user.publicUid}</div>
                  </td>
                  <td className="py-3.5 pr-4 font-mono text-xs">
                    <div className="font-bold">{formatUsdt(w.amount)} USDT</div>
                    <div className="text-emerald-400">Net: {formatUsdt(w.netAmount)} USDT</div>
                  </td>
                  <td className="py-3.5 pr-4 font-mono text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-amber-300">
                        {shortenHex(w.destinationAddress, 8, 6)}
                      </span>
                      <CopyButton value={w.destinationAddress} />
                    </div>
                    {w.user.payoutWalletAddress ? (
                      w.user.payoutWalletAddress.toLowerCase() ===
                      w.destinationAddress.toLowerCase() ? (
                        <div className="text-[10px] text-emerald-400 font-sans flex items-center gap-1 mt-0.5">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Verified Wallet ID</span>
                        </div>
                      ) : (
                        <div className="text-[10px] text-rose-400 font-sans flex items-center gap-1 mt-0.5">
                          <span>⚠ Mismatched address</span>
                        </div>
                      )
                    ) : (
                      <div className="text-[10px] text-slate-500 font-sans italic mt-0.5">
                        No Wallet Registered
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 pr-4 font-mono text-xs">
                    {w.transactionHash ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400">
                        {shortenHex(w.transactionHash, 8, 6)}
                        <ExternalLink className="h-3 w-3 opacity-70" />
                      </span>
                    ) : (
                      <span className="opacity-45">—</span>
                    )}
                  </td>
                  <td className="py-3.5 pr-4">
                    <StatusBadge status={w.status} />
                    {w.rejectionReason ? (
                      <div className="mt-1 max-w-[180px] truncate text-[11px] text-rose-400">
                        {w.rejectionReason}
                      </div>
                    ) : null}
                  </td>
                  <td className="py-3.5 text-right">
                    <div className={styles.actionRow}>
                      {w.status === 'PENDING_REVIEW' ? (
                        <>
                          <Button
                            variant="gold"
                            size="sm"
                            isLoading={approveMutation.isPending}
                            onClick={() => approveMutation.mutate(w.withdrawalUid)}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Approve
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => {
                              setCompleteTarget(null);
                              setRejectTarget(w);
                            }}
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Reject
                          </Button>
                        </>
                      ) : null}

                      {w.status === 'APPROVED' || w.status === 'PROCESSING' ? (
                        <>
                          <Button
                            variant="gold"
                            size="sm"
                            onClick={() => {
                              setRejectTarget(null);
                              setCompleteTarget(w);
                            }}
                          >
                            <Send className="h-3.5 w-3.5" />
                            Complete Tx
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => {
                              setCompleteTarget(null);
                              setRejectTarget(w);
                            }}
                          >
                            Reject
                          </Button>
                        </>
                      ) : null}
                    </div>
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
