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
  const depositId = params.id;
  const qc = useQueryClient();

  const [verifiedAmount, setVerifiedAmount] = React.useState('');
  const [adminNotes, setAdminNotes] = React.useState('');
  const [rejectionReason, setRejectionReason] = React.useState('');
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [screenshotUrl, setScreenshotUrl] = React.useState<string | null>(null);

  const {
    data: deposit,
    isLoading,
    error,
  } = useQuery<AdminDepositDetail>({
    queryKey: ['admin-deposit', depositId],
    queryFn: () => adminApi.getDeposit(depositId),
    enabled: Boolean(depositId),
  });

  React.useEffect(() => {
    if (deposit?.requestedAmount && !verifiedAmount) {
      setVerifiedAmount(deposit.requestedAmount);
    }
  }, [deposit?.requestedAmount, verifiedAmount]);

  React.useEffect(() => {
    let active = true;
    if (deposit?.submission?.screenshotStorageKey) {
      fetchAuthorizedScreenshotObjectUrl(deposit.submission.screenshotStorageKey)
        .then((url) => {
          if (active) setScreenshotUrl(url);
        })
        .catch(() => {});
    }
    return () => {
      active = false;
      if (screenshotUrl) {
        URL.revokeObjectURL(screenshotUrl);
      }
    };
  }, [deposit?.submission?.screenshotStorageKey]);

  async function handleApprove(e: React.FormEvent) {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);
    setIsSubmitting(true);
    try {
      const result = await adminApi.approveDeposit(depositId, {
        verifiedAmount: verifiedAmount ? parseFloat(verifiedAmount) : undefined,
        adminNotes: adminNotes || undefined,
      });
      setActionSuccess(
        `Deposit approved successfully. Ledger transaction ID: ${result.ledgerTransactionId}`,
      );
      qc.invalidateQueries({ queryKey: ['admin-deposit', depositId] });
      qc.invalidateQueries({ queryKey: ['admin-deposits'] });
    } catch (err) {
      setActionError(err instanceof AdminApiError ? err.message : 'Failed to approve deposit.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleReject(e: React.FormEvent) {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      setActionError('A rejection reason is required.');
      return;
    }
    setActionError(null);
    setActionSuccess(null);
    setIsSubmitting(true);
    try {
      await adminApi.rejectDeposit(depositId, {
        rejectionReason: rejectionReason.trim(),
        adminNotes: adminNotes || undefined,
      });
      setActionSuccess('Deposit rejected.');
      qc.invalidateQueries({ queryKey: ['admin-deposit', depositId] });
      qc.invalidateQueries({ queryKey: ['admin-deposits'] });
    } catch (err) {
      setActionError(err instanceof AdminApiError ? err.message : 'Failed to reject deposit.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className={styles.loadingWrap}>
        <RefreshCw className={styles.spinner} />
        <p>Loading deposit review packet...</p>
      </div>
    );
  }

  if (error || !deposit) {
    return (
      <div className={styles.errorWrap}>
        <p className={styles.errorText}>
          {error instanceof AdminApiError ? error.message : 'Deposit not found or unauthorized.'}
        </p>
        <Link href="/deposits">
          <Button variant="secondary" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Deposits
          </Button>
        </Link>
      </div>
    );
  }

  const isPending = deposit.status === 'PAYMENT_SUBMITTED' || deposit.status === 'AWAITING_PAYMENT';
  const blockchainTx = deposit.blockchainTx;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Link href="/deposits" className={styles.backLink}>
            <ArrowLeft className="h-4 w-4" /> Deposits
          </Link>
          <h1 className={styles.pageTitle}>Review Deposit</h1>
          <code className={styles.depositUid}>{deposit.depositUid}</code>
        </div>
        <StatusBadge status={deposit.status} />
      </div>

      {actionSuccess && (
        <div className={styles.bannerSuccess}>
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className={styles.bannerError}>
          <XCircle className="h-5 w-5 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      <div className={styles.twoCol}>
        <div className={styles.col}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Investor Details</h2>
            <div className={styles.detailGrid}>
              <div className={styles.detailItem}>
                <span className={styles.label}>Name</span>
                <span className={styles.value}>{deposit.user.name}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.label}>Email</span>
                <span className={styles.value}>{deposit.user.email}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.label}>Investor UID</span>
                <span className={styles.valueCode}>{deposit.user.publicUid}</span>
              </div>
              {deposit.user.phone && (
                <div className={styles.detailItem}>
                  <span className={styles.label}>Phone</span>
                  <span className={styles.value}>{deposit.user.phone}</span>
                </div>
              )}
            </div>
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Order Specification</h2>
            <div className={styles.detailGrid}>
              <div className={styles.detailItem}>
                <span className={styles.label}>Requested Amount</span>
                <span className={styles.valueStrong}>{formatUsdt(deposit.requestedAmount)}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.label}>Asset & Network</span>
                <span className={styles.value}>
                  {deposit.token} ({deposit.network})
                </span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.label}>Created At</span>
                <span className={styles.value}>{new Date(deposit.createdAt).toLocaleString()}</span>
              </div>
              {deposit.submittedAt && (
                <div className={styles.detailItem}>
                  <span className={styles.label}>Submitted At</span>
                  <span className={styles.value}>
                    {new Date(deposit.submittedAt).toLocaleString()}
                  </span>
                </div>
              )}
              {deposit.reviewDeadline && (
                <div className={styles.detailItem}>
                  <span className={styles.label}>SLA Deadline</span>
                  <span className={styles.value}>
                    {new Date(deposit.reviewDeadline).toLocaleString()}
                  </span>
                </div>
              )}
              {deposit.rejectionReason && (
                <div className={styles.detailItemFull}>
                  <span className={styles.label}>Rejection Reason</span>
                  <span className={styles.valueError}>{deposit.rejectionReason}</span>
                </div>
              )}
            </div>
            <div className={styles.addressRow}>
              <span className={styles.label}>Receiving Vault Address</span>
              <div className={styles.copyRow}>
                <code className={styles.codeSmall}>{deposit.receivingAddress}</code>
                <CopyButton text={deposit.receivingAddress} />
              </div>
            </div>
          </div>

          {deposit.submission && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Investor Submission Proof</h2>
              <div className={styles.addressRow}>
                <span className={styles.label}>Reported Tx Hash</span>
                <div className={styles.copyRow}>
                  <code className={styles.codeSmall}>{deposit.submission.transactionHash}</code>
                  <CopyButton text={deposit.submission.transactionHash} />
                </div>
              </div>
              {deposit.submission.notes && (
                <div className={styles.detailItemFull}>
                  <span className={styles.label}>Investor Notes</span>
                  <p className={styles.value}>{deposit.submission.notes}</p>
                </div>
              )}
              {screenshotUrl && (
                <div className={styles.screenshotWrap}>
                  <span className={styles.label}>Payment Screenshot</span>
                  <img
                    src={screenshotUrl}
                    alt="Payment Screenshot"
                    className={styles.screenshotImg}
                    onClick={() => window.open(screenshotUrl, '_blank')}
                  />
                  <p className={styles.hint}>Click image to view in new tab</p>
                </div>
              )}
            </div>
          )}

          {blockchainTx && (
            <div className={styles.card}>
              <div className={styles.cardHeaderRow}>
                <h2 className={styles.cardTitle}>Automated On-Chain Telemetry</h2>
                <span className={blockchainTx.isValid ? styles.badgeValid : styles.badgeInvalid}>
                  {blockchainTx.isValid ? 'VALID' : 'FLAGGED / INVALID'}
                </span>
              </div>
              <div className={styles.detailGrid}>
                <div className={styles.detailItem}>
                  <span className={styles.label}>Verification Mode</span>
                  <span className={styles.value}>{blockchainTx.verificationMode}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.label}>Block Confirmations</span>
                  <span className={styles.value}>{blockchainTx.confirmationCount}</span>
                </div>
                {blockchainTx.tokenAmount && (
                  <div className={styles.detailItem}>
                    <span className={styles.label}>On-Chain Amount</span>
                    <span className={styles.valueStrong}>
                      {formatUsdt(blockchainTx.tokenAmount)}
                    </span>
                  </div>
                )}
                {blockchainTx.fromAddress && (
                  <div className={styles.detailItemFull}>
                    <span className={styles.label}>From Address</span>
                    <code className={styles.codeSmall}>{blockchainTx.fromAddress}</code>
                  </div>
                )}
                {blockchainTx.failureReason && (
                  <div className={styles.detailItemFull}>
                    <span className={styles.label}>Failure Analysis</span>
                    <span className={styles.valueError}>
                      {blockchainTx.failureCode}: {blockchainTx.failureReason}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {isPending && (
          <div className={styles.col}>
            <div className={styles.actionCard}>
              <h2 className={styles.cardTitle}>Operational Action</h2>
              <form onSubmit={handleApprove} className={styles.formSection}>
                <h3 className={styles.sectionSubtitle}>Option A: Confirm & Credit Deposit</h3>
                <p className={styles.sectionHint}>
                  Crediting will update the user's available ledger balance and create an immutable
                  credit entry.
                </p>
                <div className={styles.field}>
                  <label htmlFor="verifiedAmount" className={styles.fieldLabel}>
                    Verified Amount (USDT)
                  </label>
                  <input
                    id="verifiedAmount"
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={verifiedAmount}
                    onChange={(e) => setVerifiedAmount(e.target.value)}
                    className={styles.input}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="approveNotes" className={styles.fieldLabel}>
                    Admin Notes (Optional)
                  </label>
                  <textarea
                    id="approveNotes"
                    rows={2}
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="e.g. Verified via BSCScan tx hash confirmation"
                    className={styles.textarea}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  {isSubmitting
                    ? 'Processing...'
                    : `Approve & Credit ${formatUsdt(verifiedAmount || deposit.requestedAmount)}`}
                </Button>
              </form>

              <hr className={styles.divider} />

              <form onSubmit={handleReject} className={styles.formSection}>
                <h3 className={styles.sectionSubtitleError}>Option B: Reject Deposit</h3>
                <p className={styles.sectionHint}>
                  Investor will receive an immediate notification with this rejection explanation.
                </p>
                <div className={styles.field}>
                  <label htmlFor="rejectionReason" className={styles.fieldLabel}>
                    Rejection Reason (Required)
                  </label>
                  <textarea
                    id="rejectionReason"
                    rows={3}
                    required
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="e.g. Invalid transaction hash; payment not received on-chain; amount mismatch."
                    className={styles.textarea}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  variant="destructive"
                  className="w-full"
                >
                  {isSubmitting ? 'Processing...' : 'Reject Deposit Order'}
                </Button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
