'use client';
import * as React from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Lock,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { Button, CopyButton, EmptyState, formatUsdt, shortenHex, StatusBadge } from '@navrix/ui';
import { apiRequest, ClientApiError } from '../../../lib/api';
import styles from './withdraw.module.css';

export default function WithdrawPage() {
  const queryClient = useQueryClient();
  const [amount, setAmount] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [successMsg, setSuccessMsg] = React.useState(null);

  const { data: me } = useQuery({
    queryKey: ['users-me'],
    queryFn: () => apiRequest('/users/me'),
  });

  const { data: wallet } = useQuery({
    queryKey: ['wallet-overview'],
    queryFn: () => apiRequest('/wallet'),
  });

  const { data: withdrawals = [] } = useQuery({
    queryKey: ['my-withdrawals'],
    queryFn: () => apiRequest('/withdrawals'),
  });

  const registeredWallet = me?.payoutWallet?.address;
  const isSecurityHold = Boolean(me?.payoutWallet?.lockUntil);

  const handleRequestWithdrawal = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!registeredWallet) {
      setError(
        'A mandatory Wallet ID must be registered in Profile Settings before requesting a withdrawal.',
      );
      return;
    }

    setSubmitting(true);
    try {
      const created = await apiRequest('/withdrawals', {
        method: 'POST',
        body: JSON.stringify({
          amount: Number(amount),
        }),
      });
      setAmount('');
      setSuccessMsg(
        `Withdrawal ${created.withdrawalUid} submitted. Requested USDT has been moved to your Locked Balance pending admin review.`,
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['wallet-overview'] }),
        queryClient.invalidateQueries({ queryKey: ['my-withdrawals'] }),
      ]);
    } catch (err) {
      setError(
        err instanceof ClientApiError ? err.message : 'Unable to submit withdrawal request.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-extrabold">Withdraw USDT</h1>
        <p className="mt-0.5 text-xs sm:text-sm opacity-70">
          Request outbound BEP-20 USDT settlement. Withdrawals are securely sent to your verified,
          pre-registered Wallet ID.
        </p>
      </div>

      {/* Mandatory Wallet ID Status Alert */}
      {!registeredWallet ? (
        <div className="mb-5 rounded-2xl border border-rose-500/40 bg-rose-950/25 p-4 sm:p-5 text-rose-200 shadow-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Mandatory Wallet ID Setup Required</h3>
                <p className="text-xs text-rose-300/90 mt-0.5 leading-relaxed">
                  Before you can request withdrawals, platform compliance requires you to save your
                  personal BEP-20 USDT destination Wallet ID in your Profile Settings.
                </p>
              </div>
            </div>
            <Link
              href="/profile"
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 px-4 py-2 text-xs font-bold transition-all shadow shrink-0"
            >
              <span>Setup Wallet ID</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      ) : isSecurityHold ? (
        <div className="mb-5 rounded-2xl border border-amber-500/40 bg-amber-950/25 p-4 sm:p-5 text-amber-200 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Withdrawal Security Hold Active</h3>
              <p className="text-xs text-amber-300/90 mt-0.5 leading-relaxed">
                Your registered Wallet ID was recently updated. For your asset protection, outbound
                withdrawals are on a temporary hold until{' '}
                <strong className="text-white font-mono">
                  {new Date(me.payoutWallet.lockUntil).toLocaleString()}
                </strong>
                .
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className={styles.grid}>
        <section className={styles.card}>
          <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border border-slate-700/60 p-3.5 text-xs">
            <div className="min-w-0">
              <div className="opacity-65">Available Balance</div>
              <div className="mt-1 font-mono text-base sm:text-lg font-extrabold text-emerald-400 truncate">
                {formatUsdt(wallet?.availableBalance)} USDT
              </div>
            </div>
            <div className="min-w-0">
              <div className="opacity-65">Locked Balance</div>
              <div className="mt-1 font-mono text-base sm:text-lg font-extrabold text-amber-400 truncate">
                {formatUsdt(wallet?.lockedBalance)} USDT
              </div>
            </div>
          </div>

          {error ? (
            <div className="mb-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300">
              {error}
            </div>
          ) : null}

          {successMsg ? (
            <div className="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-300">
              {successMsg}
            </div>
          ) : null}

          <form onSubmit={handleRequestWithdrawal} className="space-y-4">
            <div>
              <label htmlFor="wdr-amount" className="mb-1.5 block text-xs font-semibold">
                Withdrawal Amount (USDT)
              </label>
              <input
                id="wdr-amount"
                type="number"
                step="0.01"
                min="1"
                required
                disabled={!registeredWallet || isSecurityHold}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="50.00"
                className={styles.input}
              />
            </div>

            {/* Auto-routed registered Wallet ID */}
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5">
                  <Wallet className="h-3.5 w-3.5 text-amber-400" />
                  <span>Destination Wallet ID</span>
                </span>
                {registeredWallet ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                    <ShieldCheck className="h-3 w-3" />
                    Auto-Routed
                  </span>
                ) : (
                  <Link href="/profile" className="text-[11px] text-amber-400 hover:underline">
                    Add Wallet ID →
                  </Link>
                )}
              </div>

              {registeredWallet ? (
                <div className="rounded-xl border border-slate-700/80 bg-slate-900/80 p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-mono text-xs font-bold text-amber-300 truncate">
                      {registeredWallet}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Network: BNB Smart Chain (BEP-20) · Managed via Profile Settings
                    </div>
                  </div>
                  <CopyButton value={registeredWallet} label="Copy" />
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-rose-500/40 bg-rose-950/20 p-3 text-xs text-rose-300 flex items-center justify-between">
                  <span>No Wallet ID saved</span>
                  <Link href="/profile" className="font-bold underline text-rose-200">
                    Register in Settings
                  </Link>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="wdr-network" className="mb-1.5 block text-xs font-semibold">
                Network
              </label>
              <select id="wdr-network" value="BNB_SMART_CHAIN" disabled className={styles.select}>
                <option value="BNB_SMART_CHAIN">BNB Smart Chain (BEP-20)</option>
              </select>
            </div>

            <Button
              type="submit"
              variant="gold"
              size="lg"
              disabled={!registeredWallet || isSecurityHold || submitting}
              isLoading={submitting}
              className="w-full"
            >
              {!registeredWallet
                ? 'Register Wallet ID to Withdraw'
                : isSecurityHold
                  ? 'Withdrawals Temporarily On Hold'
                  : 'Lock Funds & Submit Withdrawal'}
            </Button>
          </form>
        </section>

        <section className={styles.card}>
          <h2 className="mb-4 text-base font-bold">Withdrawal History</h2>
          {withdrawals.length === 0 ? (
            <EmptyState
              title="No Withdrawals Requested"
              description="Outbound USDT payout requests and their settlement transaction hashes will appear here."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-700/60 text-xs uppercase opacity-65">
                    <th className="py-3 pr-3">ID</th>
                    <th className="py-3 pr-3">Amount</th>
                    <th className="py-3 pr-3">Destination</th>
                    <th className="py-3 pr-3">Outbound Tx</th>
                    <th className="py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.map((w) => (
                    <tr
                      key={w.withdrawalUid}
                      className="border-b border-slate-800/50 last:border-none"
                    >
                      <td className="py-3 pr-3 font-mono text-xs text-amber-400">
                        {w.withdrawalUid}
                      </td>
                      <td className="py-3 pr-3 font-mono font-bold">{formatUsdt(w.amount)} USDT</td>
                      <td className="py-3 pr-3 font-mono text-xs opacity-80">
                        {shortenHex(w.destinationAddress, 6, 4)}
                      </td>
                      <td className="py-3 pr-3 font-mono text-xs opacity-80">
                        {shortenHex(w.transactionHash, 6, 4)}
                      </td>
                      <td className="py-3 text-right">
                        <StatusBadge status={w.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
