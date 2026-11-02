'use client';
import * as React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, EmptyState, formatUsdt, shortenHex, StatusBadge } from '@navrix/ui';
import { evmAddressSchema } from '@navrix/validation';
import { apiRequest, ClientApiError } from '../../../lib/api';
import styles from './withdraw.module.css';
export default function WithdrawPage() {
  const queryClient = useQueryClient();
  const [amount, setAmount] = React.useState('');
  const [destinationAddress, setDestinationAddress] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [successMsg, setSuccessMsg] = React.useState(null);
  const { data: wallet } = useQuery({
    queryKey: ['wallet-overview'],
    queryFn: () => apiRequest('/wallet'),
  });
  const { data: withdrawals = [] } = useQuery({
    queryKey: ['my-withdrawals'],
    queryFn: () => apiRequest('/withdrawals'),
  });
  const handleRequestWithdrawal = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    const addrCheck = evmAddressSchema.safeParse(destinationAddress);
    if (!addrCheck.success) {
      setError(addrCheck.error.issues[0]?.message || 'Invalid BEP-20 destination address.');
      return;
    }
    setSubmitting(true);
    try {
      const created = await apiRequest('/withdrawals', {
        method: 'POST',
        body: JSON.stringify({
          amount: Number(amount),
          destinationAddress: addrCheck.data,
          network: 'BNB_SMART_CHAIN',
        }),
      });
      setAmount('');
      setDestinationAddress('');
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
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold">Withdraw USDT</h1>
        <p className="mt-0.5 text-sm opacity-70">
          Request outbound BEP-20 USDT settlement. Requested funds are immediately locked to prevent
          negative balances or double-spending.
        </p>
      </div>

      <div className={styles.grid}>
        <section className={styles.card}>
          <div className="mb-4 grid grid-cols-2 gap-3 rounded-xl border border-slate-700/60 p-3.5 text-xs">
            <div>
              <div className="opacity-65">Available Balance</div>
              <div className="mt-1 font-mono text-lg font-extrabold text-emerald-400">
                {formatUsdt(wallet?.availableBalance)} USDT
              </div>
            </div>
            <div>
              <div className="opacity-65">Locked Balance</div>
              <div className="mt-1 font-mono text-lg font-extrabold text-amber-400">
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
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="50.00"
                className={styles.input}
              />
            </div>

            <div>
              <label htmlFor="wdr-address" className="mb-1.5 block text-xs font-semibold">
                Destination BEP-20 Wallet Address
              </label>
              <input
                id="wdr-address"
                type="text"
                required
                value={destinationAddress}
                onChange={(e) => setDestinationAddress(e.target.value)}
                placeholder="0x..."
                className={styles.input}
              />
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
              isLoading={submitting}
              className="w-full"
            >
              Lock Funds & Submit Withdrawal
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
              <table className="w-full text-left text-sm">
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
