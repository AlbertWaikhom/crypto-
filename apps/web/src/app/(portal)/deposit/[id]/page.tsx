'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Share2,
  Upload,
} from 'lucide-react';
import { BLOCKCHAIN_DEFAULTS } from '@navrix/config';
import { Button, CopyButton, formatUsdt, StatusBadge } from '@navrix/ui';
import { bscTxHashSchema } from '@navrix/validation';
import { apiRequest, ClientApiError } from '../../../../lib/api';
import styles from './deposit-detail.module.css';

interface DepositDetailDto {
  depositUid: string;
  requestedAmount: string;
  verifiedAmount: string | null;
  token: string;
  network: string;
  networkLabel: string;
  receivingAddress: string;
  status: string;
  submittedAt: string | null;
  reviewDeadline: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  expiresAt: string;
  createdAt: string;
  hasScreenshot: boolean;
  transactionHash: string | null;
  blockchainVerification: {
    transactionHash: string;
    mode: string;
    isValid: boolean;
    actualAmount: string | null;
    fromAddress: string | null;
    toAddress: string | null;
    tokenContract: string | null;
    blockNumber: string | null;
    confirmationCount: number;
    failureReason: string | null;
  } | null;
}

export default function DepositDetailPage() {
  const params = useParams<{ id: string }>();
  const depositId = params.id;
  const queryClient = useQueryClient();

  const [txHash, setTxHash] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [screenshot, setScreenshot] = React.useState<File | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const { data: deposit, isLoading } = useQuery({
    queryKey: ['deposit-detail', depositId],
    queryFn: () => apiRequest<DepositDetailDto>(`/deposits/${depositId}`),
    enabled: Boolean(depositId),
  });

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedHash = bscTxHashSchema.safeParse(txHash);
    if (!parsedHash.success) {
      setError(
        parsedHash.error.issues[0]?.message || 'Invalid BSC transaction hash.',
      );
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('transactionHash', parsedHash.data);
      if (notes.trim()) {
        formData.append('notes', notes.trim());
      }
      if (screenshot) {
        formData.append('screenshot', screenshot);
      }

      await apiRequest(`/deposits/${depositId}/submit-payment`, {
        method: 'POST',
        body: formData,
      });

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['deposit-detail', depositId],
        }),
        queryClient.invalidateQueries({ queryKey: ['my-deposits'] }),
        queryClient.invalidateQueries({ queryKey: ['wallet-overview'] }),
      ]);
    } catch (err) {
      setError(
        err instanceof ClientApiError
          ? err.message
          : 'Failed to submit payment transaction hash.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleShare = async () => {
    if (!deposit) return;
    const text = `Send ${deposit.requestedAmount} USDT on BNB Smart Chain (BEP-20) to ${deposit.receivingAddress}`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: deposit.depositUid, text });
      } catch {
        // cancelled
      }
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
    }
  };

  if (isLoading || !deposit) {
    return <div className="py-16 text-center text-sm opacity-70">Loading deposit record...</div>;
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/deposit"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Deposit USDT
          </Link>
          <h1 className="mt-1.5 text-2xl font-extrabold font-mono">
            {deposit.depositUid}
          </h1>
        </div>
        <StatusBadge status={deposit.status} />
      </div>

      <div className={styles.grid}>
        <section className={styles.card}>
          <div className="flex items-center justify-between border-b border-slate-700/50 pb-3">
            <div>
              <div className="text-xs opacity-65">You are sending</div>
              <div className="font-mono text-2xl font-extrabold text-amber-400">
                {formatUsdt(deposit.requestedAmount)} {deposit.token}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs opacity-65">Network</div>
              <div className="text-sm font-bold">{deposit.networkLabel}</div>
            </div>
          </div>

          <div className={styles.qrFrame}>
            <QRCodeSVG value={deposit.receivingAddress} size={200} level="M" />
            <span className="mt-2 text-[11px] font-bold text-slate-700">
              BNB SMART CHAIN (BEP-20)
            </span>
          </div>

          <div className="mb-1 text-center text-xs font-semibold opacity-70">
            Receiving Address
          </div>
          <div className={styles.addressPill}>{deposit.receivingAddress}</div>

          <div className="mt-3 flex items-center justify-center gap-3">
            <CopyButton
              value={deposit.receivingAddress}
              label="COPY ADDRESS"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleShare}
            >
              <Share2 className="h-3.5 w-3.5" />
              Share
            </Button>
          </div>

          <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-xs text-amber-200">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
              <span>{BLOCKCHAIN_DEFAULTS.networkWarning}</span>
            </div>
          </div>
        </section>

        <section className={styles.card}>
          {deposit.status === 'PENDING_PAYMENT' ? (
            <>
              <h2 className="text-lg font-bold">Submit Blockchain Payment</h2>
              <p className="mt-1 text-xs opacity-70">
                After transferring {formatUsdt(deposit.requestedAmount)} USDT on
                BNB Smart Chain, paste your 66-character transaction hash below.
              </p>

              {error ? (
                <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300">
                  {error}
                </div>
              ) : null}

              <form onSubmit={handleSubmitPayment} className="mt-5 space-y-4">
                <div>
                  <label
                    htmlFor="tx-hash"
                    className="mb-1.5 block text-xs font-semibold"
                  >
                    Transaction Hash (Mandatory) *
                  </label>
                  <input
                    id="tx-hash"
                    type="text"
                    required
                    value={txHash}
                    onChange={(e) => setTxHash(e.target.value)}
                    placeholder="0x..."
                    className={styles.input}
                  />
                  <p className="mt-1 text-[11px] opacity-60">
                    Paste only the 0x... transaction hash, not a BscScan URL.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="screenshot-file"
                    className="mb-1.5 block text-xs font-semibold"
                  >
                    Payment Screenshot (Optional Supporting Evidence)
                  </label>
                  <label
                    htmlFor="screenshot-file"
                    className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-600 p-4 text-xs hover:border-amber-500/60"
                  >
                    <Upload className="h-4 w-4 text-amber-400" />
                    <span>
                      {screenshot
                        ? screenshot.name
                        : 'Upload PNG, JPG, or WebP (Max 5 MB)'}
                    </span>
                  </label>
                  <input
                    id="screenshot-file"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) =>
                      setScreenshot(e.target.files?.[0] ?? null)
                    }
                  />
                </div>

                <div>
                  <label
                    htmlFor="payment-notes"
                    className="mb-1.5 block text-xs font-semibold"
                  >
                    Reference Notes (Optional)
                  </label>
                  <input
                    id="payment-notes"
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional wallet memo"
                    className={styles.input}
                  />
                </div>

                <Button
                  type="submit"
                  variant="gold"
                  size="lg"
                  isLoading={submitting}
                  className="w-full"
                >
                  Submit Payment for Verification
                </Button>
              </form>
            </>
          ) : (
            <div className="space-y-4">
              <h2 className="text-lg font-bold">Payment Verification Status</h2>

              {['PAYMENT_SUBMITTED', 'BLOCKCHAIN_DETECTED', 'UNDER_REVIEW'].includes(
                deposit.status,
              ) ? (
                <div className={styles.slaNotice}>
                  <div className="flex items-start gap-2.5">
                    <Clock className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-bold text-amber-300">
                        Expected Review: Within 24 Hours
                      </div>
                      <p className="mt-1 text-xs opacity-90">
                        {BLOCKCHAIN_DEFAULTS.reviewSlaNotice}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              {deposit.status === 'APPROVED' ? (
                <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-xs text-emerald-200 flex items-center gap-2.5">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                  <span>
                    Deposit verified on-chain and credited to your immutable
                    ledger ({formatUsdt(deposit.verifiedAmount)} USDT).
                  </span>
                </div>
              ) : null}

              {deposit.status === 'REJECTED' && deposit.rejectionReason ? (
                <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs text-rose-200">
                  <strong>Rejection Reason:</strong> {deposit.rejectionReason}
                </div>
              ) : null}

              <div className="space-y-2.5 rounded-xl border border-slate-700/60 p-4 text-xs">
                <div className="flex justify-between gap-3">
                  <span className="opacity-65">Submitted Tx Hash:</span>
                  <span className="font-mono break-all text-right">
                    {deposit.transactionHash || '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-65">Submitted At:</span>
                  <span>
                    {deposit.submittedAt
                      ? new Date(deposit.submittedAt).toLocaleString()
                      : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-65">24h Review Target:</span>
                  <span>
                    {deposit.reviewDeadline
                      ? new Date(deposit.reviewDeadline).toLocaleString()
                      : '—'}
                  </span>
                </div>
                {deposit.blockchainVerification ? (
                  <>
                    <div className="flex justify-between">
                      <span className="opacity-65">On-Chain Status:</span>
                      <span
                        className={
                          deposit.blockchainVerification.isValid
                            ? 'font-bold text-emerald-400'
                            : 'font-bold text-amber-400'
                        }
                      >
                        {deposit.blockchainVerification.isValid
                          ? 'VERIFIED MATCH'
                          : deposit.blockchainVerification.failureReason ||
                            'PENDING CHECK'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-65">Confirmations:</span>
                      <span className="font-mono">
                        {deposit.blockchainVerification.confirmationCount}
                      </span>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

