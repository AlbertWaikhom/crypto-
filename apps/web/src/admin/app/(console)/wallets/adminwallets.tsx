'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle2,
  Coins,
  Copy,
  Edit2,
  ExternalLink,
  Layers,
  Plus,
  Power,
  Search,
  ShieldCheck,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import { Button, CopyButton, EmptyState } from '@navrix/ui';
import { adminApi, AdminApiError } from '../../../lib/api';
import styles from './wallets.module.css';

interface PlatformWalletItem {
  id: string;
  name: string;
  symbol: string;
  network: string;
  walletAddress: string;
  paymentInstructions: string;
  minDeposit: number;
  maxDeposit: number;
  isActive: boolean;
  isDefault?: boolean;
  depositCount?: number;
  totalVolume?: string;
  createdAt: string;
  updatedAt: string;
}

const NETWORK_PRESETS = [
  { label: 'BNB Smart Chain (BEP-20)', symbol: 'USDT', network: 'BEP20' },
  { label: 'TRON (TRC-20)', symbol: 'USDT', network: 'TRC20' },
  { label: 'Ethereum (ERC-20)', symbol: 'USDT', network: 'ERC20' },
  { label: 'Bitcoin (BTC Native)', symbol: 'BTC', network: 'BTC' },
  { label: 'Ethereum (ETH Native)', symbol: 'ETH', network: 'ETH' },
];

export default function AdminWalletsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState('');
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingWallet, setEditingWallet] = React.useState<PlatformWalletItem | null>(null);

  // Form State
  const [formName, setFormName] = React.useState('');
  const [formSymbol, setFormSymbol] = React.useState('USDT');
  const [formNetwork, setFormNetwork] = React.useState('TRC20');
  const [formAddress, setFormAddress] = React.useState('');
  const [formInstructions, setFormInstructions] = React.useState('');
  const [formMin, setFormMin] = React.useState('10');
  const [formMax, setFormMax] = React.useState('100000');
  const [formActive, setFormActive] = React.useState(true);

  const [feedback, setFeedback] = React.useState<{
    type: 'ok' | 'err';
    message: string;
  } | null>(null);

  const { data: wallets = [], isLoading } = useQuery({
    queryKey: ['admin-wallets'],
    queryFn: () => adminApi<PlatformWalletItem[]>('/admin/wallets'),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: formName.trim(),
        symbol: formSymbol.trim().toUpperCase(),
        network: formNetwork.trim().toUpperCase(),
        walletAddress: formAddress.trim(),
        paymentInstructions: formInstructions.trim(),
        minDeposit: Number(formMin) || 10,
        maxDeposit: Number(formMax) || 100000,
        isActive: formActive,
      };
      if (editingWallet) {
        return adminApi(`/admin/wallets/${editingWallet.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      }
      return adminApi('/admin/wallets', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      setFeedback({
        type: 'ok',
        message: editingWallet
          ? `Wallet "${formName}" updated successfully.`
          : `New receiving wallet "${formName}" added successfully.`,
      });
      setModalOpen(false);
      setEditingWallet(null);
      void queryClient.invalidateQueries({ queryKey: ['admin-wallets'] });
    },
    onError: (err) => {
      setFeedback({
        type: 'err',
        message: err instanceof AdminApiError ? err.message : 'Failed to save wallet.',
      });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return adminApi(`/admin/wallets/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive }),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-wallets'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return adminApi(`/admin/wallets/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      setFeedback({ type: 'ok', message: 'Wallet removed successfully.' });
      void queryClient.invalidateQueries({ queryKey: ['admin-wallets'] });
    },
    onError: (err) => {
      setFeedback({
        type: 'err',
        message: err instanceof AdminApiError ? err.message : 'Failed to remove wallet.',
      });
    },
  });

  const openAddModal = () => {
    setEditingWallet(null);
    setFormName('USDT (TRON Network)');
    setFormSymbol('USDT');
    setFormNetwork('TRC20');
    setFormAddress('');
    setFormInstructions(
      'Send TRC-20 USDT strictly via the TRON network. Low network gas fees with rapid settlement.',
    );
    setFormMin('10');
    setFormMax('100000');
    setFormActive(true);
    setModalOpen(true);
  };

  const openEditModal = (w: PlatformWalletItem) => {
    setEditingWallet(w);
    setFormName(w.name);
    setFormSymbol(w.symbol);
    setFormNetwork(w.network);
    setFormAddress(w.walletAddress);
    setFormInstructions(w.paymentInstructions || '');
    setFormMin(String(w.minDeposit));
    setFormMax(String(w.maxDeposit));
    setFormActive(w.isActive);
    setModalOpen(true);
  };

  const handleApplyPreset = (preset: (typeof NETWORK_PRESETS)[0]) => {
    setFormName(preset.label);
    setFormSymbol(preset.symbol);
    setFormNetwork(preset.network);
    if (preset.network === 'TRC20') {
      setFormInstructions(
        'Send TRC-20 USDT strictly via the TRON network. Low network gas fees with rapid settlement.',
      );
    } else if (preset.network === 'BEP20') {
      setFormInstructions(
        'Transfer BEP-20 USDT over BNB Smart Chain (BSC). Funds are automatically detected and credited.',
      );
    } else if (preset.network === 'ERC20') {
      setFormInstructions(
        'Send USDT via Ethereum ERC-20 standard. Ensure adequate ETH is reserved in your outbound wallet for gas fees.',
      );
    } else if (preset.network === 'BTC') {
      setFormInstructions(
        'Send Native Bitcoin (BTC) to this address. Requires 3 blockchain network confirmations.',
      );
      setFormMin('50');
    } else if (preset.network === 'ETH') {
      setFormInstructions(
        'Send native ETH directly to this receiving treasury address. Requires 12 network block confirmations.',
      );
      setFormMin('50');
    }
  };

  const filteredWallets = wallets.filter(
    (w) =>
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.symbol.toLowerCase().includes(search.toLowerCase()) ||
      w.network.toLowerCase().includes(search.toLowerCase()) ||
      w.walletAddress.toLowerCase().includes(search.toLowerCase()),
  );

  const activeCount = wallets.filter((w) => w.isActive).length;
  const totalVolume = wallets.reduce(
    (acc, w) => acc + (w.totalVolume ? Number(w.totalVolume) : 0),
    0,
  );
  const totalDeposits = wallets.reduce((acc, w) => acc + (w.depositCount || 0), 0);

  const getBadgeClass = (network: string) => {
    const norm = network.toUpperCase();
    if (norm.includes('TRC') || norm === 'TRON') return styles.badgeTRC20;
    if (norm.includes('BEP') || norm.includes('BSC')) return styles.badgeBEP20;
    if (norm.includes('ERC')) return styles.badgeERC20;
    if (norm === 'BTC') return styles.badgeBTC;
    if (norm === 'ETH') return styles.badgeETH;
    return styles.badgeBEP20;
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.headerTitle}>
            <Wallet className="h-6 w-6 text-amber-400 shrink-0" />
            <span>Platform Receiving Wallets</span>
          </h1>
          <p className={styles.headerDesc}>
            Manage multiple receiving wallet addresses across networks (USDT TRC20, BEP20, ERC20,
            BTC, ETH). Only active wallets are presented to investors during investment and deposit
            allocation.
          </p>
        </div>

        <Button type="button" variant="gold" onClick={openAddModal} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Platform Wallet
        </Button>
      </div>

      {/* Stats Ribbon */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Wallets</div>
          <div className={styles.statValue}>{wallets.length}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Active for Users</div>
          <div className="text-emerald-400 text-xl font-mono font-extrabold flex items-center gap-1.5">
            <CheckCircle2 className="h-5 w-5" />
            <span>{activeCount} Active</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Routed Deposits</div>
          <div className={styles.statValue}>{totalDeposits}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Volume Handled</div>
          <div className="text-amber-400 text-xl font-mono font-extrabold">
            ${totalVolume.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {feedback && (
        <div
          className={`mb-5 rounded-xl border p-3.5 text-sm font-medium flex items-center justify-between gap-3 ${
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

      {/* Wallets List Section */}
      <section className={styles.card}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
            <Coins className="h-5 w-5 text-amber-400" />
            <span>Configured Payment Networks</span>
          </h2>

          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by name, network, address..."
              className={`${styles.input} text-xs py-2 pl-8`}
            />
            <Search className="h-4 w-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {filteredWallets.length === 0 ? (
          <EmptyState
            title="No Wallets Found"
            description="Add your first platform receiving wallet or adjust your filter query."
          />
        ) : (
          <div className="space-y-3.5">
            {filteredWallets.map((wallet) => (
              <div
                key={wallet.id}
                className={`rounded-2xl border p-4 sm:p-5 transition-all ${
                  wallet.isActive
                    ? 'border-slate-700/80 bg-slate-900/70 hover:border-amber-500/40'
                    : 'border-slate-800 bg-slate-950/40 opacity-70'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="text-base font-bold text-white">{wallet.name}</span>
                      <span className={`${styles.networkBadge} ${getBadgeClass(wallet.network)}`}>
                        {wallet.network}
                      </span>
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {wallet.symbol}
                      </span>
                      {wallet.isActive ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          <CheckCircle2 className="h-3 w-3" />
                          Active (Visible to Users)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                          Disabled (Hidden)
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-amber-300 mt-2 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                      <span className="break-all font-semibold">{wallet.walletAddress}</span>
                      <CopyButton value={wallet.walletAddress} label="Copy" />
                    </div>

                    {wallet.paymentInstructions && (
                      <div className="text-xs text-slate-400 mt-2.5 leading-relaxed">
                        <strong className="text-slate-300">Instructions: </strong>
                        {wallet.paymentInstructions}
                      </div>
                    )}

                    <div className="mt-2.5 flex flex-wrap items-center gap-4 text-xs text-slate-400">
                      <span>
                        Min Deposit: <strong className="text-white">{wallet.minDeposit}</strong>{' '}
                        {wallet.symbol}
                      </span>
                      <span>
                        Max Deposit: <strong className="text-white">{wallet.maxDeposit}</strong>{' '}
                        {wallet.symbol}
                      </span>
                      <span>
                        Deposits:{' '}
                        <strong className="text-amber-400">{wallet.depositCount || 0}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center pt-2 md:pt-0 border-t md:border-t-0 border-slate-800 w-full md:w-auto justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        toggleStatusMutation.mutate({
                          id: wallet.id,
                          isActive: !wallet.isActive,
                        })
                      }
                      className="text-xs gap-1.5"
                    >
                      <Power
                        className={`h-3.5 w-3.5 ${
                          wallet.isActive ? 'text-emerald-400' : 'text-slate-500'
                        }`}
                      />
                      {wallet.isActive ? 'Deactivate' : 'Activate'}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(wallet)}
                      className="text-xs gap-1.5"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      Edit
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (
                          confirm(
                            `Are you sure you want to remove wallet "${wallet.name}"? Active user sessions will no longer see this address.`,
                          )
                        ) {
                          deleteMutation.mutate(wallet.id);
                        }
                      }}
                      className="text-xs gap-1.5 text-rose-300 hover:text-rose-200 border-rose-500/30 hover:border-rose-500/60"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Add / Edit Wallet Modal */}
      {modalOpen && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalContent}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Wallet className="h-5 w-5 text-amber-400" />
                <span>
                  {editingWallet ? 'Edit Platform Wallet' : 'Add New Platform Receiving Wallet'}
                </span>
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Quick Presets */}
            {!editingWallet && (
              <div className="mb-4">
                <label className={styles.label}>Quick Presets</label>
                <div className="flex flex-wrap gap-1.5">
                  {NETWORK_PRESETS.map((preset) => (
                    <button
                      key={preset.network}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className="text-xs px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-amber-400/10 hover:text-amber-300 border border-slate-700 transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate();
              }}
              className="space-y-3.5"
            >
              <div>
                <label className={styles.label}>Wallet / Method Name</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. USDT (TRON Network)"
                  className={styles.input}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={styles.label}>Asset Symbol</label>
                  <input
                    type="text"
                    required
                    value={formSymbol}
                    onChange={(e) => setFormSymbol(e.target.value.toUpperCase())}
                    placeholder="USDT, BTC, ETH"
                    className={`${styles.input} font-mono`}
                  />
                </div>
                <div>
                  <label className={styles.label}>Network Identifier</label>
                  <input
                    type="text"
                    required
                    value={formNetwork}
                    onChange={(e) => setFormNetwork(e.target.value.toUpperCase())}
                    placeholder="TRC20, BEP20, ERC20"
                    className={`${styles.input} font-mono`}
                  />
                </div>
              </div>

              <div>
                <label className={styles.label}>Receiving Wallet Address</label>
                <input
                  type="text"
                  required
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value.trim())}
                  placeholder="Enter 0x..., T..., bc1... address"
                  className={`${styles.input} font-mono`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={styles.label}>Minimum Deposit</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formMin}
                    onChange={(e) => setFormMin(e.target.value)}
                    className={styles.input}
                  />
                </div>
                <div>
                  <label className={styles.label}>Maximum Deposit</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formMax}
                    onChange={(e) => setFormMax(e.target.value)}
                    className={styles.input}
                  />
                </div>
              </div>

              <div>
                <label className={styles.label}>Payment Instructions for Users</label>
                <textarea
                  rows={2}
                  value={formInstructions}
                  onChange={(e) => setFormInstructions(e.target.value)}
                  placeholder="Guidelines shown to users when sending funds (e.g. required network, minimum gas, confirmations)"
                  className={`${styles.input} resize-none`}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div>
                  <div className="text-xs font-semibold text-white">Active Payment Method</div>
                  <div className="text-[11px] text-slate-400">
                    When active, investors can choose this payment method on deposit.
                  </div>
                </div>

                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={formActive}
                    onChange={(e) => setFormActive(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="h-6 w-11 rounded-full bg-slate-800 peer-checked:bg-amber-500 peer-focus:ring-2 peer-focus:ring-amber-400/20 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white" />
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalOpen(false)}
                  disabled={saveMutation.isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="gold" isLoading={saveMutation.isPending}>
                  {editingWallet ? 'Update Wallet' : 'Save & Publish Wallet'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
