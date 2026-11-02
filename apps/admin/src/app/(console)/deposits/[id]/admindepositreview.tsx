'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, RefreshCw, XCircle } from 'lucide-react';
import { Button, CopyButton, formatUsdt, StatusBadge } from '@navrix/ui';
import { adminApi, AdminApiError, fetchAuthorizedScreenshotObjectUrl } from '../../../../lib/api';
import styles from './deposit-review.module.css';

interface AdminDepositDetail {
  depositUid: string;
  requestedAmount: string;
  verifiedAmount: string | null;
  token: string;
  network: string;
  receivingAddress: string;
  status: string;
  createdAt: string;
  submittedAt: string | null;
  reviewDeadline: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  user: { publicUid: string; name: string; email: string; phone: string | null };
  submission?: {
    transactionHash: string;
    screenshotStorageKey: string | null;
    notes: string | null;
    createdAt: string;
  } | null;
  blockchainTx?: {
    transactionHash: string;
    verificationMode: string;
    isValid: boolean;
    txSucceeded: boolean;
    tokenAmount: string | null;
    fromAddress: string | null;
    toAddress: string | null;
    tokenContract: string | null;
    blockNumber: string | null;
    confirmationCount: number;
    failureCode: string | null;
    failureReason: string | null;
    verifiedAt: string;
  } | null;
}

export default function AdminDepositReviewPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const queryClient = useQueryClient();

  const [rejectReason, setRejectReason] = React.useState('');
  const [busyAction, setBusyAction] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [screenshotUrl, setScreenshotUrl] = React.useState<string | null>(null);

  const { data: dep, isLoading } = useQuery({
    queryKey: ['admin-deposit-detail', id],
    queryFn: () => adminApi<AdminDepositDetail>(`/admin/deposits/${id}`),
    enabled: Boolean(id),
  });

  React.useEffect(() => {
    let active = true;
    if (dep?.submission?.screenshotStorageKey) {
      fetchAuthorizedScreenshotObjectUrl(dep.depositUid).then((url) => {
        if (active && url) setScreenshotUrl(url);
      });
    }
    return () => {
      active = false;
    };
  }, [dep?.depositUid, dep?.submission?.screenshotStorageKey]);

  const refreshAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin-deposit-detail', id] }),
      queryClient.invalidateQueries({ queryKey: ['admin-deposits'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] }),
    ]);
  };

  const handleVerify = async () => {
    setError(null);
    setNotice(null);
    setBusyAction('VERIFY');
    try {
      const res = await adminApi<{
        verification: { isValid: boolean; failureReason?: string };
      }>(`/admin/deposits/${id}/verify`, { method: 'POST' });
      setNotice(
        res.verification.isValid
          ? 'On-chain BEP-20 transfer verified successfully!'
          : `Verification failed: ${res.verification.failureReason}`,
      );
      await refreshAll();
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Blockchain verification call failed.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleApprove = async () => {
    setError(null);
    setNotice(null);
    setBusyAction('APPROVE');
    try {
      await adminApi(`/admin/deposits/${id}/approve`, { method: 'POST' });
      setNotice(
        'Deposit re-verified on-chain, approved, credited to immutable ledger, and investment activated!',
      );
      await refreshAll();
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Deposit approval failed.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleReject = async () => {
    if (rejectReason.trim().length < 5) {
      setError('Enter a clear rejection reason (minimum 5 characters).');
      return;
    }
    setError(null);
    setNotice(null);
    setBusyAction('REJECT');
    try {
      await adminApi(`/admin/deposits/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: rejectReason }),
      });
      setNotice('Deposit rejected and audit trail recorded.');
      await refreshAll();
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Deposit rejection failed.');
    } finally {
      setBusyAction(null);
    }
  };

  if (isLoading || !dep) {
    return (
      <div className="py-16 text-center text-sm opacity-70">Loading deposit review dossier...</div>
    );
  }

  const canProcess = !['APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED'].includes(dep.status);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/deposits"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Deposits Queue
          </Link>
          <h1 className="mt-1 font-mono text-2xl font-extrabold">{dep.depositUid}</h1>
        </div>
        <StatusBadge status={dep.status} />
      </div>

      {error ? (
        <div className="mb-5 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3.5 text-xs text-rose-300">
          {error}
        </div>
      ) : null}

      {notice ? (
        <div className="mb-5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3.5 text-xs text-emerald-300">
          {notice}
        </div>
      ) : null}

      <div className={styles.grid}>
        <section className={styles.card}>
          <h2 className="mb-3 text-base font-bold">Customer Request & Payment Submission</h2>

          <div className={styles.kvRow}>
            <span className="opacity-65">Deposit ID</span>
            <span className="font-mono font-bold text-amber-400">{dep.depositUid}</span>
          </div>
          <div className={styles.kvRow}>
            <span className="opacity-65">User</span>
            <span className="font-semibold">
              {dep.user.name} ({dep.user.publicUid}) · {dep.user.email}
            </span>
          </div>
          <div className={styles.kvRow}>
            <span className="opacity-65">Requested Amount</span>
            <span className="font-mono font-bold">
              {formatUsdt(dep.requestedAmount)} {dep.token}
            </span>
          </div>
          <div className={styles.kvRow}>
            <span className="opacity-65">Network</span>
            <span>{dep.network} (BEP-20)</span>
          </div>
          <div className={styles.kvRow}>
            <span className="opacity-65">Receiving Address</span>
            <span className="font-mono text-right break-all">{dep.receivingAddress}</span>
          </div>
          <div className={styles.kvRow}>
            <span className="opacity-65">Submitted Tx Hash</span>
            <div className="flex items-center gap-2">
              <span className="font-mono break-all text-right">
                {dep.submission?.transactionHash || 'Not submitted'}
              </span>
              {dep.submission?.transactionHash ? (
                <CopyButton value={dep.submission.transactionHash} label="Copy" />
              ) : null}
            </div>
          </div>
          <div className={styles.kvRow}>
            <span className="opacity-65">Created Time</span>
            <span>{new Date(dep.createdAt).toLocaleString()}</span>
          </div>
          <div className={styles.kvRow}>
            <span className="opacity-65">Submitted Time</span>
            <span>{dep.submittedAt ? new Date(dep.submittedAt).toLocaleString() : '—'}</span>
          </div>

          {screenshotUrl ? (
            <div className="mt-4">
              <div className="mb-2 text-xs font-semibold opacity-75">
                Supporting Screenshot (Never authoritative proof of payment):
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={screenshotUrl}
                alt="Submitted payment evidence"
                className="max-h-64 rounded-xl border border-slate-700 object-contain"
              />
            </div>
          ) : null}
        </section>

        <section className={styles.card}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold">Authoritative Blockchain Verification</h2>
            {dep.blockchainTx ? (
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  dep.blockchainTx.isValid
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-rose-500/20 text-rose-300'
                }`}
              >
                {dep.blockchainTx.isValid ? 'ON-CHAIN VALID' : 'ON-CHAIN INVALID'}
              </span>
            ) : null}
          </div>

          <div className={styles.kvRow}>
            <span className="opacity-65">Blockchain Tx Status</span>
            <span>
              {dep.blockchainTx
                ? dep.blockchainTx.txSucceeded
                  ? 'SUCCESS (0x1)'
                  : 'FAILED / NOT FOUND'
                : 'Not verified yet'}
            </span>
          </div>
          <div className={styles.kvRow}>
            <span className="opacity-65">Actual Blockchain Amount</span>
            <span className="font-mono font-bold text-emerald-400">
              {dep.blockchainTx?.tokenAmount
                ? `${formatUsdt(dep.blockchainTx.tokenAmount)} USDT`
                : '—'}
            </span>
          </div>
          <div className={styles.kvRow}>
            <span className="opacity-65">Sender Address</span>
            <span className="font-mono break-all text-right">
              {dep.blockchainTx?.fromAddress || '—'}
            </span>
          </div>
          <div className={styles.kvRow}>
            <span className="opacity-65">Receiver Address</span>
            <span className="font-mono break-all text-right">
              {dep.blockchainTx?.toAddress || '—'}
            </span>
          </div>
          <div className={styles.kvRow}>
            <span className="opacity-65">Token Contract</span>
            <span className="font-mono break-all text-right">
              {dep.blockchainTx?.tokenContract || '—'}
            </span>
          </div>
          <div className={styles.kvRow}>
            <span className="opacity-65">Block Number</span>
            <span className="font-mono">{dep.blockchainTx?.blockNumber || '—'}</span>
          </div>
          <div className={styles.kvRow}>
            <span className="opacity-65">Confirmation Count</span>
            <span className="font-mono font-bold">{dep.blockchainTx?.confirmationCount ?? 0}</span>
          </div>
          {dep.blockchainTx?.failureReason ? (
            <div className="mt-3 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-200">
              <strong>Verification Failure:</strong> {dep.blockchainTx.failureReason}
            </div>
          ) : null}

          {canProcess ? (
            <div className="mt-6 space-y-4 border-t border-slate-700/60 pt-5">
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  isLoading={busyAction === 'VERIFY'}
                  onClick={handleVerify}
                >
                  <RefreshCw className="h-4 w-4" />
                  VERIFY ON-CHAIN
                </Button>

                <Button
                  type="button"
                  variant="gold"
                  isLoading={busyAction === 'APPROVE'}
                  onClick={handleApprove}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  APPROVE & CREDIT LEDGER
                </Button>
              </div>

              <div className="space-y-2 pt-2">
                <label className="block text-xs font-semibold opacity-75">
                  Rejection Reason (Required to Reject)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Reason for rejecting deposit..."
                    className={styles.input}
                  />
                  <Button
                    type="button"
                    variant="danger"
                    isLoading={busyAction === 'REJECT'}
                    onClick={handleReject}
                  >
                    <XCircle className="h-4 w-4" />
                    REJECT
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
