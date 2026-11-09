'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { AlertTriangle, ArrowRight, Share2 } from 'lucide-react';
import { BLOCKCHAIN_DEFAULTS } from '@navrix/config';
import {
  Button,
  cn,
  CopyButton,
  EmptyState,
  formatUsdt,
  shortenHex,
  StatusBadge,
} from '@navrix/ui';
import { apiRequest, ClientApiError } from '../../../lib/api';
import styles from './deposit.module.css';
export default function DepositPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [amount, setAmount] = React.useState('100');
  const [planCode, setPlanCode] = React.useState('');
  const [creating, setCreating] = React.useState(false);
  const [error, setError] = React.useState(null);
  const { data: config } = useQuery({
    queryKey: ['deposit-config'],
    queryFn: () => apiRequest('/deposits/config'),
  });
  const { data: deposits = [] } = useQuery({
    queryKey: ['my-deposits'],
    queryFn: () => apiRequest('/deposits'),
  });
  React.useEffect(() => {
    if (!planCode && config?.plans?.[0]?.code) {
      setPlanCode(config.plans[0].code);
    }
  }, [config, planCode]);
  const receivingAddress = config?.receivingAddress || BLOCKCHAIN_DEFAULTS.defaultReceivingAddress;
  const handleCreateDeposit = async (e) => {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      const created = await apiRequest('/deposits', {
        method: 'POST',
        body: JSON.stringify({
          amount: Number(amount),
          network: 'BNB_SMART_CHAIN',
          planCode: planCode || undefined,
        }),
      });
      await queryClient.invalidateQueries({ queryKey: ['my-deposits'] });
      router.push(`/deposit/${created.depositUid}`);
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : 'Unable to create deposit request.');
    } finally {
      setCreating(false);
    }
  };
  const handleShare = async () => {
    const shareText = `USDT Deposit (${BLOCKCHAIN_DEFAULTS.networkDisplayName}): ${receivingAddress}`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'NAVRIX USDT (BEP-20) Receiving Address',
          text: shareText,
        });
      } catch {
        // User cancelled share sheet
      }
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(shareText);
    }
  };
  return (
    <div>
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-extrabold">Deposit USDT</h1>
        <p className="mt-1 text-xs sm:text-sm opacity-70">
          Create a tracked deposit request, transfer BEP-20 USDT, and submit your transaction hash
          for on-chain verification.
        </p>
      </div>

      <div className={styles.layoutGrid}>
        <section className={cn(styles.panel, styles.panelGold)}>
          <h2 className="text-lg font-bold">1. Configure Deposit Request</h2>
          <p className="mt-0.5 text-xs opacity-70">
            Limits: {config?.minDeposit ?? 10} USDT – {formatUsdt(config?.maxDeposit ?? 100000, 0)}{' '}
            USDT
          </p>

          {error ? (
            <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300">
              {error}
            </div>
          ) : null}

          <form onSubmit={handleCreateDeposit} className="mt-5 space-y-4">
            <div>
              <label
                htmlFor="usdt-amount"
                className="mb-1.5 block text-xs font-semibold opacity-80"
              >
                Amount (USDT)
              </label>
              <input
                id="usdt-amount"
                type="number"
                step="0.01"
                min={config?.minDeposit ?? 10}
                max={config?.maxDeposit ?? 100000}
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={styles.input}
              />
            </div>

            <div>
              <label
                htmlFor="network-select"
                className="mb-1.5 block text-xs font-semibold opacity-80"
              >
                Blockchain Network
              </label>
              <select
                id="network-select"
                value="BNB_SMART_CHAIN"
                disabled
                className={styles.select}
              >
                <option value="BNB_SMART_CHAIN">BNB Smart Chain (BEP-20) — USDT</option>
              </select>
            </div>

            {config?.plans && config.plans.length > 0 ? (
              <div>
                <label
                  htmlFor="plan-select"
                  className="mb-1.5 block text-xs font-semibold opacity-80"
                >
                  Allocation Vault Plan
                </label>
                <select
                  id="plan-select"
                  value={planCode}
                  onChange={(e) => setPlanCode(e.target.value)}
                  className={styles.select}
                >
                  {config.plans.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.name} — {Number(p.interestRate).toFixed(2)}% ({p.durationDays}d)
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="rounded-xl border border-slate-700/60 p-3.5 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="opacity-70">You are sending:</span>
                <span className="font-mono font-bold text-amber-400">
                  {formatUsdt(amount || 0)} USDT
                </span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-70">Network:</span>
                <span className="font-semibold">BNB Smart Chain (BEP-20)</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-70">Required Confirmations:</span>
                <span>{config?.requiredConfirmations ?? 12} Blocks</span>
              </div>
            </div>

            <Button
              type="submit"
              variant="gold"
              size="lg"
              isLoading={creating}
              disabled={config?.depositsEnabled === false}
              className="w-full text-xs sm:text-base px-3 sm:px-6"
            >
              Generate Unique Deposit ID & Proceed
              <ArrowRight className="h-4 w-4 shrink-0" />
            </Button>
          </form>
        </section>

        <section className={styles.panel}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-amber-400">
                USDT · BEP-20
              </div>
              <h2 className="text-base sm:text-lg font-bold">Platform Receiving Vault</h2>
            </div>
            <span className="rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
              BNB Smart Chain
            </span>
          </div>

          <div className={styles.qrBox}>
            <QRCodeSVG value={receivingAddress} size={196} level="M" includeMargin={false} />
            <span className="mt-2 text-[11px] font-bold tracking-wide text-slate-700">
              USDT (BEP-20) PUBLIC ADDRESS
            </span>
          </div>

          <div className={styles.addressBox}>{receivingAddress}</div>

          <div className="mt-3 flex items-center justify-center gap-3">
            <CopyButton value={receivingAddress} label="Copy Address" />
            <Button type="button" variant="secondary" size="sm" onClick={handleShare}>
              <Share2 className="h-3.5 w-3.5" />
              Share
            </Button>
          </div>

          <div className={styles.warningBanner} role="note">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
              <span>
                <strong>WARNING:</strong> {config?.warning || BLOCKCHAIN_DEFAULTS.networkWarning}
              </span>
            </div>
          </div>
        </section>
      </div>

      <section className={styles.tableWrap}>
        <h2 className="mb-4 text-base font-bold">Your Deposit Requests</h2>
        {deposits.length === 0 ? (
          <EmptyState
            title="No Deposit History"
            description="Generate a deposit request above to receive your dedicated DEP-YYYYMMDD-XXXXXX reference."
          />
        ) : (
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-700/60 text-xs uppercase opacity-65">
                <th className="py-3 pr-4">Deposit ID</th>
                <th className="py-3 pr-4">Amount</th>
                <th className="py-3 pr-4">Network</th>
                <th className="py-3 pr-4">Tx Hash</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {deposits.map((d) => (
                <tr key={d.depositUid} className="border-b border-slate-800/50 last:border-none">
                  <td className="py-3.5 pr-4 font-mono text-xs font-semibold text-amber-400">
                    {d.depositUid}
                  </td>
                  <td className="py-3.5 pr-4 font-mono font-bold">
                    {formatUsdt(d.verifiedAmount || d.requestedAmount)} USDT
                  </td>
                  <td className="py-3.5 pr-4 text-xs">{d.networkLabel}</td>
                  <td className="py-3.5 pr-4 font-mono text-xs opacity-75">
                    {shortenHex(d.transactionHash, 8, 6)}
                  </td>
                  <td className="py-3.5 pr-4">
                    <StatusBadge status={d.status} />
                  </td>
                  <td className="py-3.5 text-right">
                    <Link href={`/deposit/${d.depositUid}`}>
                      <Button variant="outline" size="sm">
                        {d.status === 'PENDING_PAYMENT' ? 'Submit Tx Hash' : 'Details'}
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
