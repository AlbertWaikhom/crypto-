'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  HelpCircle,
  RotateCcw,
  Save,
  Settings,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { Button, EmptyState } from '@navrix/ui';
import { adminApi, AdminApiError } from '../../../lib/api';
import { useAdminStore } from '../../../store/admin-store';
import { startTutorialTour } from '../../../../components/InteractiveTutorialTour';
import styles from './settings.module.css';

interface SystemSettingRow {
  key: string;
  value: string;
  category: string;
  description: string | null;
  isPublic: boolean;
  updatedAt: string;
}

const PRESET_KEYS = [
  'BLOCKCHAIN_MODE',
  'RECEIVING_WALLET_ADDRESS',
  'USDT_CONTRACT_ADDRESS',
  'REQUIRED_CONFIRMATIONS',
  'MIN_DEPOSIT',
  'MAX_DEPOSIT',
  'MIN_WITHDRAWAL',
  'MAX_WITHDRAWAL',
  'DEPOSIT_EXPIRY_MINUTES',
  'REVIEW_SLA_HOURS',
];

export default function AdminSystemSettingsPage() {
  const queryClient = useQueryClient();
  const { user, accessToken, setAdminSession } = useAdminStore();
  const [keyInput, setKeyInput] = React.useState('MIN_DEPOSIT');
  const [valueInput, setValueInput] = React.useState('25');
  const [descInput, setDescInput] = React.useState('');
  const [feedback, setFeedback] = React.useState<{
    type: 'ok' | 'err';
    message: string;
  } | null>(null);
  const [tutorialUpdating, setTutorialUpdating] = React.useState(false);
  const [tutorialNotice, setTutorialNotice] = React.useState<string | null>(null);

  const tutorialEnabled = user?.tutorialEnabled ?? true;
  const tutorialCompleted = user?.tutorialCompleted ?? false;

  const handleToggleAdminTutorial = async (enabled: boolean) => {
    setTutorialUpdating(true);
    setTutorialNotice(null);
    try {
      await adminApi('/users/me/tutorial', {
        method: 'PATCH',
        body: JSON.stringify({ tutorialEnabled: enabled }),
      });
      if (user) {
        setAdminSession(accessToken, { ...user, tutorialEnabled: enabled });
      }
      setTutorialNotice(
        enabled
          ? 'Admin Console Tutorial Mode enabled. New operators will be guided automatically.'
          : 'Admin Console Tutorial Mode disabled.',
      );
    } catch {
      // ignore
    } finally {
      setTutorialUpdating(false);
    }
  };

  const handleResetAdminTutorial = async () => {
    setTutorialUpdating(true);
    setTutorialNotice(null);
    try {
      if (user?.uid) {
        sessionStorage.removeItem(`navrix_tour_skipped_${user.uid}`);
      }
      await adminApi('/users/me/tutorial', {
        method: 'PATCH',
        body: JSON.stringify({ reset: true }),
      });
      if (user) {
        setAdminSession(accessToken, {
          ...user,
          tutorialCompleted: false,
          tutorialCompletedAt: null,
        });
      }
      setTutorialNotice('Admin tutorial progress reset. Launching interactive tour...');
      startTutorialTour(0);
    } catch {
      startTutorialTour(0);
    } finally {
      setTutorialUpdating(false);
    }
  };

  const { data: settings = [] } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => adminApi<SystemSettingRow[]>('/admin/settings'),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      adminApi('/admin/settings', {
        method: 'PUT',
        body: JSON.stringify({
          key: keyInput.trim(),
          value: valueInput.trim(),
          description: descInput.trim() || undefined,
        }),
      }),
    onSuccess: () => {
      setFeedback({
        type: 'ok',
        message: `System setting ${keyInput.toUpperCase()} updated and audited.`,
      });
      void queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-master'] });
    },
    onError: (err) => {
      setFeedback({
        type: 'err',
        message: err instanceof AdminApiError ? err.message : 'Update failed.',
      });
    },
  });

  return (
    <div>
      <div className="mb-4 sm:mb-5">
        <h1 className="text-xl sm:text-2xl font-extrabold flex items-center gap-2">
          <Settings className="h-5 w-5 sm:h-6 sm:w-6 shrink-0 text-amber-400" />
          <span>Runtime &amp; Compliance Configuration</span>
        </h1>
        <p className="mt-0.5 text-xs sm:text-sm opacity-70">
          Configure public receiving wallet, BEP-20 contract parameters, limits, and
          compliance-sensitive settings (never store private keys or seed phrases)
        </p>
      </div>

      <div className="mb-4 sm:mb-5 rounded-xl border border-amber-500/35 bg-amber-500/10 px-3.5 sm:px-4 py-3 text-xs text-amber-200 flex items-start gap-2.5">
        <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
        <div className="min-w-0">
          <strong>Compliance &amp; Custody Notice:</strong> Only public receiving wallet addresses
          (e.g.{' '}
          <span className="font-mono break-all">0x98386622d3937c0A3582E07aEc06041C3fb7b521</span>)
          belong in configuration. Never enter private keys or seed phrases. Keep
          jurisdiction-specific limits and KYC/AML thresholds reviewed by qualified legal/compliance
          counsel.
        </div>
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

      {/* Admin Tutorial Mode & Interactive Guidance Section */}
      <section className="mb-6 rounded-2xl border border-amber-500/30 bg-slate-900/80 p-5 sm:p-6 backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400/15 border border-amber-400/30 text-amber-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  Admin Console Interactive Tutorial
                </h2>
                {tutorialCompleted ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-bold text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Completed
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-xs font-bold text-amber-300">
                    <HelpCircle className="h-3.5 w-3.5" />
                    Ready / Not Completed
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-slate-400 max-w-2xl">
                Comprehensive interactive walkthrough covering the Ops Command Deck, Deposits
                Verification Queue, Outbound Withdrawals Escrow, 10-Tier Referral Chain Management,
                Yield Engine, and Immutable Double-Entry Ledger.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              type="button"
              variant="gold"
              onClick={() => startTutorialTour(0)}
              className="gap-1.5"
            >
              <Sparkles className="h-4 w-4" />
              Review Tutorial
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={tutorialUpdating}
              onClick={handleResetAdminTutorial}
              className="gap-1.5 text-xs opacity-80 hover:opacity-100"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset &amp; Restart
            </Button>
          </div>
        </div>

        {tutorialNotice ? (
          <div className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-300">
            {tutorialNotice}
          </div>
        ) : null}

        <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-slate-200">
              Auto-Launch Tutorial on Admin First-Time Logins
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Automatically launch the guided onboarding tour for new operators who haven&apos;t
              completed it.
            </div>
          </div>

          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={tutorialEnabled}
              disabled={tutorialUpdating}
              onChange={(e) => handleToggleAdminTutorial(e.target.checked)}
              className="peer sr-only"
            />
            <div className="h-6 w-11 rounded-full bg-slate-800 peer-checked:bg-amber-500 peer-focus:ring-2 peer-focus:ring-amber-400/20 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white" />
          </label>
        </div>
      </section>

      <div className={styles.grid}>
        <section className={styles.panel}>
          <h2 className="text-lg font-bold mb-4">Upsert System Parameter</h2>
          <form
            className="space-y-3.5"
            onSubmit={(e) => {
              e.preventDefault();
              updateMutation.mutate();
            }}
          >
            <div>
              <label className={styles.label}>Quick Select Parameter</label>
              <select
                value={PRESET_KEYS.includes(keyInput) ? keyInput : ''}
                onChange={(e) => {
                  const k = e.target.value;
                  if (!k) return;
                  setKeyInput(k);
                  const existing = settings.find((s) => s.key === k);
                  if (existing) {
                    setValueInput(existing.value);
                    setDescInput(existing.description || '');
                  }
                }}
                className={styles.input}
              >
                <option value="">Custom Key...</option>
                {PRESET_KEYS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={styles.label}>Setting Key</label>
              <input
                type="text"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value.toUpperCase())}
                className={`${styles.input} font-mono`}
                required
              />
            </div>

            <div>
              <label className={styles.label}>Setting Value</label>
              <input
                type="text"
                value={valueInput}
                onChange={(e) => setValueInput(e.target.value)}
                className={`${styles.input} font-mono`}
                required
              />
            </div>

            <div>
              <label className={styles.label}>Compliance / Operational Note</label>
              <input
                type="text"
                value={descInput}
                onChange={(e) => setDescInput(e.target.value)}
                placeholder="Optional note recorded with setting"
                className={styles.input}
              />
            </div>

            <Button
              type="submit"
              variant="gold"
              isLoading={updateMutation.isPending}
              className="w-full"
            >
              <Save className="h-4 w-4" />
              Save &amp; Record Audit Entry
            </Button>
          </form>
        </section>

        <section className={styles.panel}>
          <h2 className="text-lg font-bold mb-4">Active MySQL Settings</h2>
          {settings.length === 0 ? (
            <EmptyState
              title="Using Environment Defaults"
              description="Overrides saved here are persisted in MySQL system_settings and audited."
            />
          ) : (
            <table className="w-full min-w-[540px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-700/60 text-xs uppercase opacity-65">
                  <th className="py-3 pr-4">Key</th>
                  <th className="py-3 pr-4">Value</th>
                  <th className="py-3 pr-4">Category</th>
                  <th className="py-3 text-right">Load</th>
                </tr>
              </thead>
              <tbody>
                {settings.map((s) => (
                  <tr key={s.key} className="border-b border-slate-800/50 last:border-none">
                    <td className="py-3 pr-4 font-mono text-xs font-bold text-amber-400">
                      {s.key}
                      {s.description ? (
                        <div className="font-sans text-[11px] font-normal opacity-65">
                          {s.description}
                        </div>
                      ) : null}
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs break-all">{s.value}</td>
                    <td className="py-3 pr-4 font-mono text-xs opacity-70">{s.category}</td>
                    <td className="py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setKeyInput(s.key);
                          setValueInput(s.value);
                          setDescInput(s.description || '');
                        }}
                      >
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
