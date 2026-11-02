'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save, Settings, ShieldAlert } from 'lucide-react';
import { Button, EmptyState } from '@navrix/ui';
import { adminApi, AdminApiError } from '../../../lib/api';
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
  const [keyInput, setKeyInput] = React.useState('MIN_DEPOSIT');
  const [valueInput, setValueInput] = React.useState('25');
  const [descInput, setDescInput] = React.useState('');
  const [feedback, setFeedback] = React.useState<{
    type: 'ok' | 'err';
    message: string;
  } | null>(null);

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
      <div className="mb-5">
        <h1 className="text-2xl font-extrabold flex items-center gap-2">
          <Settings className="h-6 w-6 text-amber-400" />
          Runtime &amp; Compliance Configuration
        </h1>
        <p className="mt-0.5 text-sm opacity-70">
          Configure public receiving wallet, BEP-20 contract parameters, limits, and
          compliance-sensitive settings (never store private keys or seed phrases)
        </p>
      </div>

      <div className="mb-5 rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-xs text-amber-200 flex items-start gap-2.5">
        <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
        <div>
          <strong>Compliance &amp; Custody Notice:</strong> Only public receiving wallet addresses
          (e.g. <span className="font-mono">0x98386622d3937c0A3582E07aEc06041C3fb7b521</span>)
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
            <table className="w-full text-left text-sm">
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
