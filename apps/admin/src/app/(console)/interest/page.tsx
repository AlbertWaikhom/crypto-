'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Coins, Layers } from 'lucide-react';
import { isMasterAdminRole } from '@navrix/types';
import { Button, EmptyState, formatUsdt } from '@navrix/ui';
import { useAdminStore } from '../../../store/admin-store';
import { adminApi, AdminApiError } from '../../../lib/api';
import styles from './interest.module.css';

const CALC_MODELS = [
  'PERCENTAGE',
  'FIXED_AMOUNT',
  'DAILY',
  'WEEKLY',
  'MONTHLY',
  'MATURITY',
] as const;

function AdminInterestEngineContent() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const user = useAdminStore((s) => s.user);
  const canManagePlans = user ? isMasterAdminRole(user.role) : false;

  const preselectedUid = searchParams.get('investment') || '';
  const [selectedInv, setSelectedInv] = React.useState(preselectedUid);
  const [calcModel, setCalcModel] = React.useState<string>('PERCENTAGE');
  const [rateOrAmount, setRateOrAmount] = React.useState('5');
  const [periodKey, setPeriodKey] = React.useState('2026-11-CYCLE-1');
  const [description, setDescription] = React.useState('');

  const [planCode, setPlanCode] = React.useState('NAVRIX-CORE-30D');
  const [planName, setPlanName] = React.useState('Core Yield Vault (30 Days)');
  const [planDesc, setPlanDesc] = React.useState(
    'Institutional BEP-20 USDT allocation with configurable yield distribution.',
  );
  const [planModel, setPlanModel] = React.useState<string>('PERCENTAGE');
  const [planRate, setPlanRate] = React.useState('5');
  const [planFrequency, setPlanFrequency] = React.useState('MONTHLY');
  const [planDuration, setPlanDuration] = React.useState('30');
  const [planMin, setPlanMin] = React.useState('50');
  const [planMax, setPlanMax] = React.useState('100000');

  const [feedback, setFeedback] = React.useState<{
    type: 'ok' | 'err';
    message: string;
  } | null>(null);

  const { data: investments = [] } = useQuery({
    queryKey: ['admin-investments'],
    queryFn: () =>
      adminApi<
        Array<{
          investmentUid: string;
          principalAmount: string;
          interestModel: string;
          interestRate: string;
          status: string;
          user: { publicUid: string; name: string };
        }>
      >('/admin/investments'),
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['investment-plans'],
    queryFn: () =>
      adminApi<
        Array<{
          code: string;
          name: string;
          description: string | null;
          interestModel: string;
          interestRate: string;
          calculationFrequency: string;
          durationDays: number;
          minAmount: string;
          maxAmount: string;
          isActive: boolean;
        }>
      >('/investments/plans'),
  });

  const activeInvestments = investments.filter((i) => i.status === 'ACTIVE');

  React.useEffect(() => {
    if (!selectedInv && activeInvestments.length > 0) {
      setSelectedInv(activeInvestments[0].investmentUid);
    }
  }, [activeInvestments, selectedInv]);

  const creditMutation = useMutation({
    mutationFn: () =>
      adminApi<{
        interestRecord: { interestUid: string; amount: string; periodKey: string };
        ledgerEntry: { ledgerUid: string };
      }>(`/admin/investments/${selectedInv}/interest`, {
        method: 'POST',
        body: JSON.stringify({
          calculationModel: calcModel,
          rateOrAmount: Number(rateOrAmount),
          periodKey: periodKey.trim(),
          description: description.trim() || undefined,
        }),
      }),
    onSuccess: (res) => {
      setFeedback({
        type: 'ok',
        message: `Credited +${formatUsdt(
          res.interestRecord.amount,
        )} USDT (${res.interestRecord.interestUid}) for period ${
          res.interestRecord.periodKey
        } -> Ledger ${res.ledgerEntry.ledgerUid}.`,
      });
      void queryClient.invalidateQueries({ queryKey: ['admin-investments'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-master'] });
    },
    onError: (err) => {
      setFeedback({
        type: 'err',
        message:
          err instanceof AdminApiError
            ? `${err.code}: ${err.message}`
            : 'Interest credit failed.',
      });
    },
  });

  const upsertPlanMutation = useMutation({
    mutationFn: () =>
      adminApi('/admin/investment-plans', {
        method: 'POST',
        body: JSON.stringify({
          code: planCode.trim(),
          name: planName.trim(),
          description: planDesc.trim() || undefined,
          interestModel: planModel,
          interestRate: Number(planRate),
          calculationFrequency: planFrequency.trim(),
          durationDays: Number(planDuration),
          minAmount: Number(planMin),
          maxAmount: Number(planMax),
          isActive: true,
        }),
      }),
    onSuccess: () => {
      setFeedback({
        type: 'ok',
        message: `Investment plan ${planCode.toUpperCase()} saved and audited.`,
      });
      void queryClient.invalidateQueries({ queryKey: ['investment-plans'] });
    },
    onError: (err) => {
      setFeedback({
        type: 'err',
        message:
          err instanceof AdminApiError ? err.message : 'Plan update failed.',
      });
    },
  });

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-extrabold">
          Configurable Interest &amp; Yield Engine
        </h1>
        <p className="mt-0.5 text-sm opacity-70">
          Credit yield as separate immutable INTEREST ledger entries with unique
          (investmentId, periodKey) duplicate protection
        </p>
      </div>

      {feedback ? (
        <div
          className={`mb-5 rounded-xl border px-4 py-3 text-sm font-medium ${
            feedback.type === 'ok'
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
              : 'border-rose-500/40 bg-rose-500/10 text-rose-300'
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      <div className={styles.grid}>
        <section className={styles.panel}>
          <div className="flex items-center gap-2 mb-4">
            <Coins className="h-5 w-5 text-amber-400" />
            <h2 className="text-lg font-bold">Credit Investment Period Yield</h2>
          </div>

          {activeInvestments.length === 0 ? (
            <EmptyState
              title="No Active Investments"
              description="Approve a customer deposit first to generate an active INV- record."
            />
          ) : (
            <form
              className={styles.fieldGrid}
              onSubmit={(e) => {
                e.preventDefault();
                creditMutation.mutate();
              }}
            >
              <div>
                <label className={styles.label}>Active Investment Record</label>
                <select
                  value={selectedInv}
                  onChange={(e) => setSelectedInv(e.target.value)}
                  className={styles.input}
                >
                  {activeInvestments.map((inv) => (
                    <option key={inv.investmentUid} value={inv.investmentUid}>
                      {inv.investmentUid} · {inv.user.name} (
                      {formatUsdt(inv.principalAmount)} USDT)
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.fieldGridTwo}>
                <div>
                  <label className={styles.label}>Calculation Model</label>
                  <select
                    value={calcModel}
                    onChange={(e) => setCalcModel(e.target.value)}
                    className={styles.input}
                  >
                    {CALC_MODELS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={styles.label}>
                    {calcModel === 'FIXED_AMOUNT'
                      ? 'Fixed USDT Amount'
                      : 'Interest Rate (%)'}
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0.0001"
                    value={rateOrAmount}
                    onChange={(e) => setRateOrAmount(e.target.value)}
                    className={`${styles.input} font-mono`}
                    required
                  />
                </div>
              </div>

              <div>
                <label className={styles.label}>
                  Idempotent Period Key (Prevents Double-Credit)
                </label>
                <input
                  type="text"
                  value={periodKey}
                  onChange={(e) => setPeriodKey(e.target.value)}
                  placeholder="e.g. 2026-11-CYCLE-1 or 2026-W45"
                  className={`${styles.input} font-mono`}
                  required
                />
              </div>

              <div>
                <label className={styles.label}>Ledger Memo (Optional)</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Monthly yield settlement"
                  className={styles.input}
                />
              </div>

              <Button
                type="submit"
                variant="gold"
                isLoading={creditMutation.isPending}
                disabled={!selectedInv || !periodKey.trim()}
              >
                <Coins className="h-4 w-4" />
                Execute Interest Credit
              </Button>
            </form>
          )}
        </section>

        <section className={styles.panel}>
          <div className="flex items-center gap-2 mb-4">
            <Layers className="h-5 w-5 text-amber-400" />
            <h2 className="text-lg font-bold">Configurable Vault Plans</h2>
          </div>

          {canManagePlans ? (
            <form
              className={styles.fieldGrid}
              onSubmit={(e) => {
                e.preventDefault();
                upsertPlanMutation.mutate();
              }}
            >
              <div className={styles.fieldGridTwo}>
                <div>
                  <label className={styles.label}>Plan Code (Upsert Key)</label>
                  <input
                    type="text"
                    value={planCode}
                    onChange={(e) => setPlanCode(e.target.value)}
                    className={`${styles.input} font-mono`}
                    required
                  />
                </div>
                <div>
                  <label className={styles.label}>Display Name</label>
                  <input
                    type="text"
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    className={styles.input}
                    required
                  />
                </div>
              </div>

              <div className={styles.fieldGridTwo}>
                <div>
                  <label className={styles.label}>Interest Model</label>
                  <select
                    value={planModel}
                    onChange={(e) => setPlanModel(e.target.value)}
                    className={styles.input}
                  >
                    {CALC_MODELS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={styles.label}>Configured Rate / Value</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={planRate}
                    onChange={(e) => setPlanRate(e.target.value)}
                    className={`${styles.input} font-mono`}
                    required
                  />
                </div>
              </div>

              <div className={styles.fieldGridTwo}>
                <div>
                  <label className={styles.label}>Frequency Label</label>
                  <input
                    type="text"
                    value={planFrequency}
                    onChange={(e) => setPlanFrequency(e.target.value)}
                    className={styles.input}
                    required
                  />
                </div>
                <div>
                  <label className={styles.label}>Duration (Days)</label>
                  <input
                    type="number"
                    min="1"
                    value={planDuration}
                    onChange={(e) => setPlanDuration(e.target.value)}
                    className={`${styles.input} font-mono`}
                    required
                  />
                </div>
              </div>

              <div className={styles.fieldGridTwo}>
                <div>
                  <label className={styles.label}>Min Principal (USDT)</label>
                  <input
                    type="number"
                    min="1"
                    value={planMin}
                    onChange={(e) => setPlanMin(e.target.value)}
                    className={`${styles.input} font-mono`}
                    required
                  />
                </div>
                <div>
                  <label className={styles.label}>Max Principal (USDT)</label>
                  <input
                    type="number"
                    min="1"
                    value={planMax}
                    onChange={(e) => setPlanMax(e.target.value)}
                    className={`${styles.input} font-mono`}
                    required
                  />
                </div>
              </div>

              <div>
                <label className={styles.label}>Description</label>
                <input
                  type="text"
                  value={planDesc}
                  onChange={(e) => setPlanDesc(e.target.value)}
                  className={styles.input}
                />
              </div>

              <Button
                type="submit"
                variant="secondary"
                isLoading={upsertPlanMutation.isPending}
              >
                Save / Update Vault Plan
              </Button>
            </form>
          ) : (
            <p className="text-xs opacity-70">
              Vault plan configuration requires SUPER_ADMIN or MASTER_ADMIN
              privileges.
            </p>
          )}

          <div className={styles.planList}>
            {plans.map((p) => (
              <div key={p.code} className={styles.planCard}>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-amber-400">
                    {p.code}
                  </span>
                  <span className="rounded bg-emerald-500/15 px-2 py-0.5 font-mono text-xs font-bold text-emerald-400">
                    {Number(p.interestRate).toFixed(2)}% ({p.interestModel})
                  </span>
                </div>
                <div className="mt-1 text-sm font-bold">{p.name}</div>
                <div className="mt-1 text-xs opacity-70">
                  {p.durationDays} days · {p.calculationFrequency} · Limits:{' '}
                  {formatUsdt(p.minAmount)} – {formatUsdt(p.maxAmount)} USDT
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default function AdminInterestEnginePage() {
  return (
    <React.Suspense
      fallback={
        <div className="py-12 text-center text-sm opacity-70">
          Loading interest engine...
        </div>
      }
    >
      <AdminInterestEngineContent />
    </React.Suspense>
  );
}
