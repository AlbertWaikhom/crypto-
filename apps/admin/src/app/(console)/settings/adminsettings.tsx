'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  ChevronDown,
  Coins,
  Copy,
  Database,
  FileCheck2,
  FileText,
  HelpCircle,
  Network,
  RotateCcw,
  Save,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import { Button, CopyButton, EmptyState } from '@navrix/ui';
import { adminApi, AdminApiError } from '../../../lib/api';
import { useAdminStore } from '../../../store/admin-store';
import { startTutorialTour } from '../../../components/InteractiveTutorialTour';
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

const ADMIN_TABS = [
  {
    id: 'parameters',
    label: 'System Parameters & Limits',
    shortLabel: 'Parameters',
    description: 'Financial thresholds, minimums, maximums & SLA timers',
    icon: SlidersHorizontal,
  },
  {
    id: 'blockchain',
    label: 'Blockchain & Custody',
    shortLabel: 'Blockchain',
    description: 'BEP-20 receiving wallet, contract addresses & confirmations',
    icon: Coins,
  },
  {
    id: 'tutorial',
    label: 'Admin Tutorial System',
    shortLabel: 'Tutorial Mode',
    description: 'Interactive operator tour, auto-launch toggle & reset',
    icon: Sparkles,
  },
  {
    id: 'audit',
    label: 'Governance & Compliance Policies',
    shortLabel: 'Governance',
    description: 'Security SLAs, double-entry integrity & compliance guidelines',
    icon: FileText,
  },
];

export default function AdminSystemSettingsPage() {
  const queryClient = useQueryClient();
  const { user, accessToken, setAdminSession } = useAdminStore();
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Tab State
  const [activeTabId, setActiveTabId] = React.useState('parameters');
  const [dropdownOpen, setDropdownOpen] = React.useState(false);

  // Close dropdown on outside click
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Form Inputs
  const [keyInput, setKeyInput] = React.useState('MIN_DEPOSIT');
  const [valueInput, setValueInput] = React.useState('25');
  const [descInput, setDescInput] = React.useState('');
  const [searchFilter, setSearchFilter] = React.useState('');

  const [feedback, setFeedback] = React.useState<{
    type: 'ok' | 'err';
    message: string;
  } | null>(null);

  // Tutorial State
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
        message: `System parameter ${keyInput.toUpperCase()} updated and recorded in audit log.`,
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

  const handleSelectTab = (id: string) => {
    setActiveTabId(id);
    setDropdownOpen(false);
  };

  const loadParameterIntoForm = (key: string, value: string, desc?: string | null) => {
    setKeyInput(key);
    setValueInput(value);
    setDescInput(desc || '');
    setActiveTabId('parameters');
  };

  const filteredSettings = settings.filter(
    (s) =>
      s.key.toLowerCase().includes(searchFilter.toLowerCase()) ||
      s.value.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(searchFilter.toLowerCase())) ||
      s.category.toLowerCase().includes(searchFilter.toLowerCase()),
  );

  const activeTab = ADMIN_TABS.find((t) => t.id === activeTabId) || ADMIN_TABS[0];
  const ActiveIcon = activeTab.icon;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.headerTitle}>
          <Settings className="h-6 w-6 text-amber-400 shrink-0" />
          <span>Platform Runtime &amp; Governance</span>
        </h1>
        <p className={styles.headerDesc}>
          Configure public receiving wallet, BEP-20 contract parameters, financial thresholds, and
          operator tutorial preferences (never store private keys or seed phrases).
        </p>
      </div>

      {/* Compliance Notice Banner */}
      <div className="mb-4 rounded-xl border border-amber-500/35 bg-amber-500/10 px-3.5 sm:px-4 py-3 text-xs text-amber-200 flex items-start gap-2.5">
        <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
        <div className="min-w-0">
          <strong>Compliance &amp; Custody Notice:</strong> Only public receiving wallet addresses
          belong in configuration. Never enter private keys or seed phrases. Double-entry
          transactions are append-only.
        </div>
      </div>

      {/* Category Dropdown Under Header (Mobile & Touch Optimized) */}
      <div className={styles.dropdownWrapper} ref={dropdownRef}>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-400/80 mb-1.5 flex items-center justify-between">
          <span>Admin Settings Section</span>
          <span className="text-slate-400 font-normal">Tap to switch category</span>
        </div>

        <button
          type="button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className={styles.dropdownTrigger}
          aria-expanded={dropdownOpen}
          aria-haspopup="listbox"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 border border-amber-400/30 text-amber-400">
              <ActiveIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white truncate">{activeTab.label}</span>
                {activeTab.id === 'tutorial' && tutorialCompleted && (
                  <span className="inline-flex items-center rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/40">
                    Done
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 truncate">{activeTab.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-3 text-amber-400">
            <span className="text-xs font-semibold hidden sm:inline">Change</span>
            <motion.div animate={{ rotate: dropdownOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="h-5 w-5" />
            </motion.div>
          </div>
        </button>

        {/* Animated Dropdown Menu */}
        <AnimatePresence>
          {dropdownOpen && (
            <motion.div
              key="admin-settings-dropdown"
              initial={{ opacity: 0, y: -8, scaleY: 0.95 }}
              animate={{ opacity: 1, y: 0, scaleY: 1 }}
              exit={{ opacity: 0, y: -8, scaleY: 0.95 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              style={{ transformOrigin: 'top center' }}
              className={styles.dropdownMenu}
              role="listbox"
            >
              {ADMIN_TABS.map((tab) => {
                const TabIcon = tab.icon;
                const isCurrent = tab.id === activeTabId;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleSelectTab(tab.id)}
                    className={`${styles.dropdownItem} ${isCurrent ? styles.dropdownItemActive : ''}`}
                    role="option"
                    aria-selected={isCurrent}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          isCurrent
                            ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                            : 'bg-slate-800/80 text-slate-400'
                        }`}
                      >
                        <TabIcon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 text-left">
                        <div className="text-xs font-bold text-white truncate">{tab.label}</div>
                        <div className="text-[11px] text-slate-400 truncate">{tab.description}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {tab.id === 'tutorial' && tutorialCompleted && (
                        <span className="inline-flex rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                          Done
                        </span>
                      )}
                      {isCurrent && <CheckCircle2 className="h-4 w-4 text-amber-400" />}
                    </div>
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Desktop Horizontal Tabs */}
      <div className={styles.desktopTabs}>
        {ADMIN_TABS.map((tab) => {
          const TabIcon = tab.icon;
          const isCurrent = tab.id === activeTabId;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleSelectTab(tab.id)}
              className={`${styles.tabBtn} ${isCurrent ? styles.tabBtnActive : ''}`}
            >
              <TabIcon className="h-4 w-4 shrink-0" />
              <span>{tab.shortLabel}</span>
              {tab.id === 'tutorial' && tutorialCompleted && (
                <span className="h-2 w-2 rounded-full bg-emerald-400 ml-0.5" />
              )}
            </button>
          );
        })}
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`mb-5 rounded-xl border px-4 py-3 text-sm font-medium flex items-center justify-between gap-3 ${
            feedback.type === 'ok'
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
              : 'border-rose-500/40 bg-rose-500/10 text-rose-300'
          }`}
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs underline hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Animated Tab Switcher Container */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTabId}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -14 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="w-full"
        >
          {/* TAB 1: SYSTEM PARAMETERS & LIMITS */}
          {activeTabId === 'parameters' && (
            <div className={styles.gridTwoCols}>
              {/* Parameter Editor Form */}
              <section className={styles.panel}>
                <h2 className="text-base sm:text-lg font-bold mb-4 flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-amber-400" />
                  <span>Upsert System Parameter</span>
                </h2>

                <form
                  className="space-y-3.5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    updateMutation.mutate();
                  }}
                >
                  <div>
                    <label className={styles.label}>Quick Select Parameter Preset</label>
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

              {/* MySQL Settings List (Adaptive: Cards on mobile, Table on desktop) */}
              <section className={styles.panel}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                    <Database className="h-4 w-4 text-amber-400" />
                    <span>Active MySQL Settings ({settings.length})</span>
                  </h2>

                  <div className="relative w-full sm:w-48">
                    <input
                      type="text"
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      placeholder="Filter keys..."
                      className={`${styles.input} text-xs py-1.5 pl-8`}
                    />
                    <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                {filteredSettings.length === 0 ? (
                  <EmptyState
                    title="No Settings Found"
                    description="No system parameters match your filter query."
                  />
                ) : (
                  <>
                    {/* Mobile Card Stack (<768px) */}
                    <div className={styles.mobileCardsView}>
                      {filteredSettings.map((s) => (
                        <div
                          key={s.key}
                          className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 text-xs mb-3 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono font-bold text-amber-400 break-all">
                              {s.key}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400 px-2 py-0.5 rounded bg-slate-800 border border-slate-700 shrink-0">
                              {s.category}
                            </span>
                          </div>

                          <div className="p-2 rounded-lg bg-slate-950 font-mono text-white break-all border border-slate-800">
                            {s.value}
                          </div>

                          {s.description && (
                            <div className="text-[11px] text-slate-400 italic">{s.description}</div>
                          )}

                          <div className="pt-1 flex justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => loadParameterIntoForm(s.key, s.value, s.description)}
                              className="text-xs"
                            >
                              Edit Parameter
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop Table (>=768px) */}
                    <div className={styles.desktopTableView}>
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
                          {filteredSettings.map((s) => (
                            <tr
                              key={s.key}
                              className="border-b border-slate-800/50 last:border-none"
                            >
                              <td className="py-3 pr-4 font-mono text-xs font-bold text-amber-400">
                                {s.key}
                                {s.description ? (
                                  <div className="font-sans text-[11px] font-normal opacity-65">
                                    {s.description}
                                  </div>
                                ) : null}
                              </td>
                              <td className="py-3 pr-4 font-mono text-xs break-all">{s.value}</td>
                              <td className="py-3 pr-4 font-mono text-xs opacity-70">
                                {s.category}
                              </td>
                              <td className="py-3 text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    loadParameterIntoForm(s.key, s.value, s.description)
                                  }
                                >
                                  Edit
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </section>
            </div>
          )}

          {/* TAB 2: BLOCKCHAIN & CUSTODY */}
          {activeTabId === 'blockchain' && (
            <div className="space-y-4">
              <section className={styles.panel}>
                <h2 className="text-base sm:text-lg font-bold mb-4 flex items-center gap-2">
                  <Coins className="h-5 w-5 text-amber-400" />
                  <span>BEP-20 Network &amp; Treasury Wallets</span>
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Receiving Treasury Address */}
                  <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-950/15">
                    <div className="text-xs font-semibold text-amber-300 uppercase tracking-wider mb-1">
                      Platform Receiving Treasury Address
                    </div>
                    <div className="text-[11px] text-slate-400 mb-2">
                      Inbound investor deposits are matched and routed to this address.
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-700 font-mono text-xs text-amber-300 break-all flex items-center justify-between gap-2">
                      <span>
                        {settings.find((s) => s.key === 'RECEIVING_WALLET_ADDRESS')?.value ||
                          '0x98386622d3937c0A3582E07aEc06041C3fb7b521'}
                      </span>
                      <CopyButton
                        value={
                          settings.find((s) => s.key === 'RECEIVING_WALLET_ADDRESS')?.value ||
                          '0x98386622d3937c0A3582E07aEc06041C3fb7b521'
                        }
                        label="Copy"
                      />
                    </div>
                    <div className="mt-3 flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          loadParameterIntoForm(
                            'RECEIVING_WALLET_ADDRESS',
                            settings.find((s) => s.key === 'RECEIVING_WALLET_ADDRESS')?.value ||
                              '0x98386622d3937c0A3582E07aEc06041C3fb7b521',
                            'Platform receiving wallet on BNB Smart Chain',
                          )
                        }
                        className="text-xs"
                      >
                        Edit In Form
                      </Button>
                    </div>
                  </div>

                  {/* USDT Contract Address */}
                  <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/15">
                    <div className="text-xs font-semibold text-emerald-300 uppercase tracking-wider mb-1">
                      BEP-20 USDT Token Contract
                    </div>
                    <div className="text-[11px] text-slate-400 mb-2">
                      Official Binance-Peg BSC USD smart contract used for token validation.
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-700 font-mono text-xs text-emerald-300 break-all flex items-center justify-between gap-2">
                      <span>
                        {settings.find((s) => s.key === 'USDT_CONTRACT_ADDRESS')?.value ||
                          '0x55d398326f99059fF775485246999027B3197955'}
                      </span>
                      <CopyButton
                        value={
                          settings.find((s) => s.key === 'USDT_CONTRACT_ADDRESS')?.value ||
                          '0x55d398326f99059fF775485246999027B3197955'
                        }
                        label="Copy"
                      />
                    </div>
                    <div className="mt-3 flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          loadParameterIntoForm(
                            'USDT_CONTRACT_ADDRESS',
                            settings.find((s) => s.key === 'USDT_CONTRACT_ADDRESS')?.value ||
                              '0x55d398326f99059fF775485246999027B3197955',
                            'BEP-20 USDT Token Contract Address',
                          )
                        }
                        className="text-xs"
                      >
                        Edit In Form
                      </Button>
                    </div>
                  </div>

                  {/* Blockchain Mode */}
                  <div className="p-4 rounded-xl border border-slate-700 bg-slate-900/60">
                    <div className="text-xs font-semibold text-white uppercase tracking-wider mb-1">
                      Execution Mode
                    </div>
                    <div className="text-[11px] text-slate-400 mb-2">
                      RPC provider network mode (TESTNET vs MAINNET)
                    </div>
                    <div className="font-mono text-sm font-bold text-amber-400">
                      {settings.find((s) => s.key === 'BLOCKCHAIN_MODE')?.value || 'TESTNET'}
                    </div>
                  </div>

                  {/* Required Confirmations */}
                  <div className="p-4 rounded-xl border border-slate-700 bg-slate-900/60">
                    <div className="text-xs font-semibold text-white uppercase tracking-wider mb-1">
                      Required BSC Confirmations
                    </div>
                    <div className="text-[11px] text-slate-400 mb-2">
                      Number of mined blocks required before automated verification
                    </div>
                    <div className="font-mono text-sm font-bold text-amber-400">
                      {settings.find((s) => s.key === 'REQUIRED_CONFIRMATIONS')?.value || '12'}{' '}
                      Blocks
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* TAB 3: ADMIN TUTORIAL SYSTEM */}
          {activeTabId === 'tutorial' && (
            <section className={styles.panel}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400/15 border border-amber-400/30 text-amber-400 shrink-0">
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
                          Ready / Incomplete
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400 max-w-2xl">
                      Comprehensive interactive walkthrough covering the Ops Command Deck, Deposits
                      Verification Queue, Outbound Withdrawals Escrow, 10-Tier Referral Chain
                      Management, Yield Engine, and Immutable Double-Entry Ledger.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                  <Button
                    type="button"
                    variant="gold"
                    onClick={() => startTutorialTour(0)}
                    className="gap-1.5 flex-1 sm:flex-initial"
                  >
                    <Sparkles className="h-4 w-4" />
                    Review Tutorial
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={tutorialUpdating}
                    onClick={handleResetAdminTutorial}
                    className="gap-1.5 text-xs opacity-80 hover:opacity-100 flex-1 sm:flex-initial"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset &amp; Restart
                  </Button>
                </div>
              </div>

              {tutorialNotice && (
                <div className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-300">
                  {tutorialNotice}
                </div>
              )}

              <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0 max-w-xl">
                  <div className="text-xs font-semibold text-slate-200">
                    Auto-Launch Tutorial on Admin First-Time Logins
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Automatically launch the guided onboarding tour for new operators who have not
                    yet completed it.
                  </div>
                </div>

                <label className="relative inline-flex cursor-pointer items-center shrink-0">
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

              {/* Admin Tour Breakdown Cards */}
              <div className="mt-6 pt-5 border-t border-slate-800/80">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                  Admin Tour Modules
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/40 text-xs">
                    <div className="font-bold text-amber-300">1. Command Deck</div>
                    <div className="text-slate-400 mt-1">
                      Real-time treasury, aggregate equity, 24h SLA alerts.
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/40 text-xs">
                    <div className="font-bold text-amber-300">2. Deposits Verification</div>
                    <div className="text-slate-400 mt-1">
                      BSC cryptographic validation, confirmations, manual overrides.
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/40 text-xs">
                    <div className="font-bold text-amber-300">3. Outbound Escrow</div>
                    <div className="text-slate-400 mt-1">
                      Mandatory user wallet verification, approvals &amp; security holds.
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/40 text-xs">
                    <div className="font-bold text-amber-300">4. Referral Chain</div>
                    <div className="text-slate-400 mt-1">
                      10-tier tree hierarchy, commission percentages, qualification.
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/40 text-xs">
                    <div className="font-bold text-amber-300">5. Yield Engine</div>
                    <div className="text-slate-400 mt-1">
                      Automated cron accruals, audit logs, and distribution safety.
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/40 text-xs">
                    <div className="font-bold text-amber-300">6. Double-Entry Ledger</div>
                    <div className="text-slate-400 mt-1">
                      Append-only journal where Debits strictly equal Credits.
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* TAB 4: GOVERNANCE & COMPLIANCE POLICIES */}
          {activeTabId === 'audit' && (
            <section className={styles.panel}>
              <h2 className="text-base sm:text-lg font-bold mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-amber-400" />
                <span>Governance, Security SLAs &amp; Invariant Rules</span>
              </h2>

              <div className="space-y-4 text-xs text-slate-300">
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 space-y-2">
                  <div className="font-bold text-amber-300 text-sm">
                    1. Double-Entry Accounting Invariant
                  </div>
                  <p className="leading-relaxed text-slate-400">
                    The platform enforces a mathematical zero-sum invariant: for every ledger
                    journal entry, the sum of debits must strictly equal the sum of credits. Direct
                    balance mutations are prohibited.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 space-y-2">
                  <div className="font-bold text-amber-300 text-sm">
                    2. Mandatory Destination Wallet Validation
                  </div>
                  <p className="leading-relaxed text-slate-400">
                    Withdrawals are strictly routed to the investor&apos;s registered BEP-20 wallet
                    ID. Modifying a destination wallet automatically applies a security hold before
                    outbound settlement is permissible.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 space-y-2">
                  <div className="font-bold text-amber-300 text-sm">
                    3. Administrative Audit Trail
                  </div>
                  <p className="leading-relaxed text-slate-400">
                    All administrative updates (system parameter modifications, manual transaction
                    approvals, operator logins) are permanently written to MySQL{' '}
                    <code className="text-amber-400 font-mono">admin_audit_logs</code>.
                  </p>
                </div>
              </div>
            </section>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
