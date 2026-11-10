'use client';

import * as React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Copy,
  FileCheck2,
  HelpCircle,
  KeyRound,
  Laptop,
  Lock,
  Mail,
  RotateCcw,
  Scale,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
  Wallet,
} from 'lucide-react';
import { COMPLIANCE_DISCLOSURES } from '@navrix/config';
import { Button, CopyButton, shortenHex, StatusBadge } from '@navrix/ui';
import { apiRequest, ClientApiError } from '../../../lib/api';
import { useUiStore } from '../../../store/ui-store';
import { startTutorialTour } from '../../../components/InteractiveTutorialTour';
import styles from './settings.module.css';

const TABS = [
  {
    id: 'wallet',
    label: 'Mandatory Payout Wallet',
    shortLabel: 'Payout Wallet',
    description: 'BEP-20 withdrawal destination & security holds',
    icon: Wallet,
  },
  {
    id: 'profile',
    label: 'Profile & Identity',
    shortLabel: 'Profile',
    description: 'Public UID, contact info, personal details',
    icon: User,
  },
  {
    id: 'security',
    label: 'Security & Sessions',
    shortLabel: 'Security',
    description: 'Password rotation & active device sessions',
    icon: Lock,
  },
  {
    id: 'compliance',
    label: 'KYC & Compliance',
    shortLabel: 'Compliance',
    description: 'Jurisdiction, tax residency & legal disclosures',
    icon: Scale,
  },
  {
    id: 'tutorial',
    label: 'Interactive Tutorial',
    shortLabel: 'Tutorial Mode',
    description: 'Guided tour walkthrough & auto-launch controls',
    icon: Sparkles,
  },
];

export default function UserSettings({ initialTab = 'wallet' }) {
  const queryClient = useQueryClient();
  const { user, accessToken, setSession } = useUiStore();
  const dropdownRef = React.useRef(null);

  // Tab State
  const [activeTabId, setActiveTabId] = React.useState(() => {
    if (typeof window !== 'undefined') {
      const paramTab = new URLSearchParams(window.location.search).get('tab');
      if (paramTab && TABS.some((t) => t.id === paramTab)) return paramTab;
    }
    return initialTab;
  });
  const [dropdownOpen, setDropdownOpen] = React.useState(false);

  // Close dropdown on outside click
  React.useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch /users/me
  const { data: me } = useQuery({
    queryKey: ['users-me'],
    queryFn: () => apiRequest('/users/me'),
  });

  // Active Sessions
  const { data: sessions = [] } = useQuery({
    queryKey: ['my-sessions'],
    queryFn: () => apiRequest('/auth/sessions'),
  });

  // Global notice / alerts
  const [notice, setNotice] = React.useState(null);

  // Profile Form State
  const [name, setName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [profileSaving, setProfileSaving] = React.useState(false);

  // Compliance Form State
  const [country, setCountry] = React.useState('');
  const [taxResidency, setTaxResidency] = React.useState('');
  const [taxIdNumber, setTaxIdNumber] = React.useState('');
  const [acceptAgreement, setAcceptAgreement] = React.useState(true);
  const [complianceSaving, setComplianceSaving] = React.useState(false);

  // Password Form State
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [passwordSaving, setPasswordSaving] = React.useState(false);
  const [passwordError, setPasswordError] = React.useState(null);
  const [passwordSuccess, setPasswordSuccess] = React.useState(null);

  // Mandatory Wallet ID State
  const [walletAddress, setWalletAddress] = React.useState('');
  const [confirmWalletAddress, setConfirmWalletAddress] = React.useState('');
  const [walletPassword, setWalletPassword] = React.useState('');
  const [walletOtp, setWalletOtp] = React.useState('');
  const [walletOtpSent, setWalletOtpSent] = React.useState(false);
  const [walletOtpBusy, setWalletOtpBusy] = React.useState(false);
  const [walletSubmitting, setWalletSubmitting] = React.useState(false);
  const [walletError, setWalletError] = React.useState(null);
  const [walletSuccess, setWalletSuccess] = React.useState(null);
  const [useOtpVerification, setUseOtpVerification] = React.useState(false);

  // Tutorial State
  const [tutorialUpdating, setTutorialUpdating] = React.useState(false);
  const tutorialEnabled = me?.tutorialEnabled ?? user?.tutorialEnabled ?? true;
  const tutorialCompleted = me?.tutorialCompleted ?? user?.tutorialCompleted ?? false;

  // Sync profile data
  React.useEffect(() => {
    if (me) {
      setName(me.name || '');
      setPhone(me.phone || '');
      setCountry(me.compliance?.country || '');
      setTaxResidency(me.compliance?.taxResidency || '');
    }
  }, [me]);

  // Handlers
  const handleSelectTab = (id) => {
    setActiveTabId(id);
    setDropdownOpen(false);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', id);
      window.history.replaceState({}, '', url.toString());
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setNotice(null);
    try {
      await apiRequest('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({ name, phone }),
      });
      await queryClient.invalidateQueries({ queryKey: ['users-me'] });
      setNotice('Account profile updated successfully.');
    } catch (err) {
      setNotice(err instanceof ClientApiError ? err.message : 'Failed to update profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleSaveCompliance = async (e) => {
    e.preventDefault();
    setComplianceSaving(true);
    setNotice(null);
    try {
      await apiRequest('/users/me/compliance', {
        method: 'PUT',
        body: JSON.stringify({
          country,
          taxResidency,
          taxIdNumber: taxIdNumber || undefined,
          acceptTerms: true,
          acceptPrivacyPolicy: true,
          acceptRiskDisclosure: true,
          acceptInvestmentAgreement: acceptAgreement,
        }),
      });
      setTaxIdNumber('');
      await queryClient.invalidateQueries({ queryKey: ['users-me'] });
      setNotice('Compliance & jurisdiction declarations updated successfully.');
    } catch (err) {
      setNotice(err instanceof ClientApiError ? err.message : 'Failed to save compliance details.');
    } finally {
      setComplianceSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);
    setPasswordSaving(true);
    try {
      await apiRequest('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword('');
      setNewPassword('');
      setPasswordSuccess('Password changed successfully.');
    } catch (err) {
      setPasswordError(err instanceof ClientApiError ? err.message : 'Failed to change password.');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleRevokeSession = async (id) => {
    try {
      await apiRequest(`/auth/sessions/${id}`, { method: 'DELETE' });
      await queryClient.invalidateQueries({ queryKey: ['my-sessions'] });
      setNotice('Device session revoked successfully.');
    } catch {
      // ignore
    }
  };

  const handleSendWalletOtp = async () => {
    setWalletOtpBusy(true);
    setWalletError(null);
    setWalletSuccess(null);
    try {
      const res = await apiRequest('/users/me/payout-wallet/otp', { method: 'POST' });
      setWalletOtpSent(true);
      setUseOtpVerification(true);
      setWalletSuccess(`Verification code dispatched to ${res?.maskedEmail || 'your email'}.`);
    } catch (err) {
      setWalletError(
        err instanceof ClientApiError ? err.message : 'Could not send verification code.',
      );
    } finally {
      setWalletOtpBusy(false);
    }
  };

  const handleSaveWallet = async (e) => {
    e.preventDefault();
    setWalletError(null);
    setWalletSuccess(null);

    const clean = walletAddress.trim();
    const cleanConfirm = confirmWalletAddress.trim();

    if (!clean.startsWith('0x') || clean.length !== 42) {
      setWalletError('Please enter a valid 42-character BEP-20 wallet address (starts with 0x).');
      return;
    }
    if (clean.toLowerCase() !== cleanConfirm.toLowerCase()) {
      setWalletError('Wallet ID and confirmation address do not match.');
      return;
    }

    setWalletSubmitting(true);
    try {
      await apiRequest('/users/me/payout-wallet', {
        method: 'PUT',
        body: JSON.stringify({
          address: clean,
          confirmAddress: cleanConfirm,
          password: !useOtpVerification && me?.hasPassword ? walletPassword : undefined,
          otp: useOtpVerification || !me?.hasPassword ? walletOtp.trim() : undefined,
        }),
      });
      await queryClient.invalidateQueries({ queryKey: ['users-me'] });
      setWalletAddress('');
      setConfirmWalletAddress('');
      setWalletPassword('');
      setWalletOtp('');
      setWalletOtpSent(false);
      setWalletSuccess('Mandatory withdrawal Wallet ID registered successfully.');
    } catch (err) {
      setWalletError(err instanceof ClientApiError ? err.message : 'Failed to save Wallet ID.');
    } finally {
      setWalletSubmitting(false);
    }
  };

  const handleToggleTutorial = async (enabled) => {
    setTutorialUpdating(true);
    try {
      const res = await apiRequest('/users/me/tutorial', {
        method: 'PATCH',
        body: JSON.stringify({ tutorialEnabled: enabled }),
      });
      if (res?.data && user) {
        setSession(accessToken, { ...user, ...res.data });
      }
      await queryClient.invalidateQueries({ queryKey: ['users-me'] });
      setNotice(
        enabled
          ? 'Interactive Tutorial Mode enabled for subsequent logins.'
          : 'Interactive Tutorial Mode disabled.',
      );
    } catch {
      // ignore
    } finally {
      setTutorialUpdating(false);
    }
  };

  const handleResetTutorial = async () => {
    setTutorialUpdating(true);
    try {
      if (user?.uid) {
        sessionStorage.removeItem(`navrix_tour_skipped_${user.uid}`);
      }
      const res = await apiRequest('/users/me/tutorial', {
        method: 'PATCH',
        body: JSON.stringify({ reset: true }),
      });
      if (res?.data && user) {
        setSession(accessToken, { ...user, ...res.data });
      }
      await queryClient.invalidateQueries({ queryKey: ['users-me'] });
      setNotice('Tutorial progress reset. Starting review tour...');
      startTutorialTour(0);
    } catch {
      startTutorialTour(0);
    } finally {
      setTutorialUpdating(false);
    }
  };

  const activeTab = TABS.find((t) => t.id === activeTabId) || TABS[0];
  const ActiveIcon = activeTab.icon;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.headerTitle}>
          <Settings className="h-6 w-6 text-amber-400 shrink-0" />
          <span>Settings &amp; Preferences</span>
        </h1>
        <p className={styles.headerDesc}>
          Manage your mandatory payout wallet, account profile, security credentials, compliance
          records, and interactive tutorial preferences.
        </p>
      </div>

      {/* Category Dropdown Under Header (Optimized for Mobile & Quick Switch) */}
      <div className={styles.dropdownWrapper} ref={dropdownRef}>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-400/80 mb-1.5 flex items-center justify-between">
          <span>Settings Section</span>
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
                {activeTab.id === 'wallet' && me?.payoutWallet?.address && (
                  <span className="inline-flex items-center rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/40">
                    Active
                  </span>
                )}
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
              key="settings-dropdown"
              initial={{ opacity: 0, y: -8, scaleY: 0.95 }}
              animate={{ opacity: 1, y: 0, scaleY: 1 }}
              exit={{ opacity: 0, y: -8, scaleY: 0.95 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              style={{ transformOrigin: 'top center' }}
              className={styles.dropdownMenu}
              role="listbox"
            >
              {TABS.map((tab) => {
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
                      {tab.id === 'wallet' && me?.payoutWallet?.address && (
                        <span className="inline-flex rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                          Active
                        </span>
                      )}
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
        {TABS.map((tab) => {
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
              {tab.id === 'wallet' && me?.payoutWallet?.address && (
                <span className="h-2 w-2 rounded-full bg-emerald-400 ml-0.5" />
              )}
              {tab.id === 'tutorial' && tutorialCompleted && (
                <span className="h-2 w-2 rounded-full bg-emerald-400 ml-0.5" />
              )}
            </button>
          );
        })}
      </div>

      {/* Global Notice */}
      {notice ? (
        <div className="mb-5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3.5 text-xs text-emerald-300 flex items-center justify-between gap-3">
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-emerald-400 hover:text-white text-xs font-bold shrink-0"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {/* Tab Content with Switching Animation */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTabId}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -14 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="w-full"
        >
          {/* TAB 1: MANDATORY PAYOUT WALLET */}
          {activeTabId === 'wallet' && (
            <div className="space-y-5">
              <section className={styles.card}>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-400 shrink-0">
                      <Wallet className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white flex items-center gap-2">
                        <span>Mandatory Withdrawal Wallet ID</span>
                        {me?.payoutWallet?.address ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
                            <ShieldCheck className="h-3 w-3" />
                            Active (BEP-20)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 border border-rose-500/30 px-2.5 py-0.5 text-[11px] font-bold text-rose-300">
                            <AlertCircle className="h-3 w-3" />
                            Not Registered
                          </span>
                        )}
                      </h2>
                      <p className="text-xs text-slate-400">
                        Required before requesting outbound USDT withdrawals. All withdrawals are
                        automatically settled to this address.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Current Saved Wallet Display */}
                {me?.payoutWallet?.address ? (
                  <div className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">
                        Registered Destination Wallet
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Network: BNB Smart Chain (BEP-20)
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 rounded-lg p-3 border border-slate-700/60 font-mono">
                      <span className="text-sm font-bold text-amber-300 break-all">
                        {me.payoutWallet.address}
                      </span>
                      <CopyButton value={me.payoutWallet.address} label="Copy Wallet ID" />
                    </div>
                    {me.payoutWallet.lockUntil && (
                      <div className="mt-3 flex items-center gap-2 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span>
                          Security Hold Active: Recent address update places withdrawals on hold
                          until{' '}
                          <strong className="font-mono text-white">
                            {new Date(me.payoutWallet.lockUntil).toLocaleString()}
                          </strong>
                          .
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mb-5 rounded-xl border border-rose-500/30 bg-rose-950/20 p-4">
                    <div className="flex items-start gap-2.5 text-xs text-rose-200">
                      <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                      <div>
                        <strong className="font-semibold text-rose-300">
                          Withdrawals Locked:{' '}
                        </strong>
                        You must register a valid BEP-20 USDT Wallet ID before requesting outbound
                        withdrawals.
                      </div>
                    </div>
                  </div>
                )}

                {walletError && (
                  <div className="mb-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300">
                    {walletError}
                  </div>
                )}

                {walletSuccess && (
                  <div className="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                    {walletSuccess}
                  </div>
                )}

                {/* Form to update or set Wallet ID */}
                <form onSubmit={handleSaveWallet} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={styles.label}>
                        {me?.payoutWallet?.address
                          ? 'New BEP-20 Wallet ID'
                          : 'BEP-20 Wallet ID (0x...)'}
                      </label>
                      <input
                        type="text"
                        required
                        value={walletAddress}
                        onChange={(e) => setWalletAddress(e.target.value)}
                        placeholder="0x..."
                        className={`${styles.input} font-mono`}
                      />
                    </div>

                    <div>
                      <label className={styles.label}>Confirm Wallet ID</label>
                      <input
                        type="text"
                        required
                        value={confirmWalletAddress}
                        onChange={(e) => setConfirmWalletAddress(e.target.value)}
                        placeholder="Re-enter 0x address"
                        className={`${styles.input} font-mono`}
                      />
                    </div>
                  </div>

                  {/* Security confirmation */}
                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
                    <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5 text-amber-400" />
                      <span>Security Re-Verification</span>
                    </div>

                    {me?.hasPassword && !useOtpVerification ? (
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-400">
                          Account Password
                        </label>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="password"
                            value={walletPassword}
                            onChange={(e) => setWalletPassword(e.target.value)}
                            placeholder="Enter account password"
                            className={styles.input}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleSendWalletOtp}
                            disabled={walletOtpBusy}
                            className="shrink-0 text-xs gap-1"
                          >
                            <Mail className="h-3.5 w-3.5" />
                            Use Email OTP
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-400">
                          6-Digit Email Verification Code
                        </label>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="text"
                            maxLength={6}
                            value={walletOtp}
                            onChange={(e) => setWalletOtp(e.target.value)}
                            placeholder="6-digit code"
                            className={`${styles.input} font-mono text-center tracking-widest`}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleSendWalletOtp}
                            disabled={walletOtpBusy}
                            className="shrink-0 text-xs gap-1"
                          >
                            <Mail className="h-3.5 w-3.5" />
                            {walletOtpSent ? 'Resend Code' : 'Send Code'}
                          </Button>
                        </div>
                        {me?.hasPassword && (
                          <button
                            type="button"
                            onClick={() => setUseOtpVerification(false)}
                            className="mt-1.5 text-[11px] text-amber-400 hover:underline"
                          >
                            Use password instead
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <Button
                    type="submit"
                    variant="gold"
                    disabled={walletSubmitting}
                    isLoading={walletSubmitting}
                    className="w-full sm:w-auto"
                  >
                    {me?.payoutWallet?.address ? 'Update Wallet ID' : 'Save & Register Wallet ID'}
                  </Button>
                </form>
              </section>
            </div>
          )}

          {/* TAB 2: PROFILE & IDENTITY */}
          {activeTabId === 'profile' && (
            <div className={styles.grid}>
              <section className={styles.card}>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs opacity-65">Public Investor UID</div>
                    <div className="font-mono text-base sm:text-lg font-extrabold text-amber-400 flex items-center gap-2">
                      <span>{me?.uid || '—'}</span>
                      {me?.uid && <CopyButton value={me.uid} label="Copy UID" />}
                    </div>
                  </div>
                  <StatusBadge status={me?.status || 'ACTIVE'} />
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div>
                    <label className={styles.label}>Full Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={styles.input}
                      required
                    />
                  </div>
                  <div>
                    <label className={styles.label}>Email Address</label>
                    <input type="email" value={me?.email || ''} disabled className={styles.input} />
                  </div>
                  <div>
                    <label className={styles.label}>Phone Number</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className={styles.input}
                    />
                  </div>
                  <Button
                    type="submit"
                    variant="gold"
                    isLoading={profileSaving}
                    className="w-full sm:w-auto"
                  >
                    Save Profile
                  </Button>
                </form>
              </section>
            </div>
          )}

          {/* TAB 3: SECURITY & ACCESS */}
          {activeTabId === 'security' && (
            <div className={styles.gridTwoCols}>
              <section className={styles.card}>
                <h2 className="mb-4 text-base font-bold flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-amber-400" />
                  <span>Change Password</span>
                </h2>

                {passwordError && (
                  <div className="mb-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300">
                    {passwordError}
                  </div>
                )}

                {passwordSuccess && (
                  <div className="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                    {passwordSuccess}
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label className={styles.label}>Current Password</label>
                    <input
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className={styles.input}
                    />
                  </div>
                  <div>
                    <label className={styles.label}>New Strong Password</label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 8 chars, Upper + Number"
                      className={styles.input}
                    />
                  </div>
                  <Button
                    type="submit"
                    variant="gold"
                    isLoading={passwordSaving}
                    className="w-full sm:w-auto"
                  >
                    Update Password
                  </Button>
                </form>
              </section>

              <section className={styles.card}>
                <h2 className="mb-4 text-base font-bold flex items-center gap-2">
                  <Laptop className="h-4 w-4 text-amber-400" />
                  <span>Active Device Sessions ({sessions.length})</span>
                </h2>

                <div className="space-y-3">
                  {sessions.length === 0 ? (
                    <div className="text-xs text-slate-400 py-4 text-center">
                      No additional active sessions.
                    </div>
                  ) : (
                    sessions.map((s) => (
                      <div
                        key={s.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl border border-slate-700/60 p-3 text-xs bg-slate-900/40"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-white truncate">
                            {s.userAgent || 'Web Browser'}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            IP: {s.ipAddress || '127.0.0.1'} · Last Active:{' '}
                            {new Date(s.lastActiveAt || s.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleRevokeSession(s.id)}
                          className="shrink-0 text-rose-300 hover:text-rose-200 border-rose-500/30 hover:border-rose-500/60"
                        >
                          Revoke
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          )}

          {/* TAB 4: KYC & COMPLIANCE */}
          {activeTabId === 'compliance' && (
            <div className={styles.grid}>
              <section className={styles.card}>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-base font-bold flex items-center gap-2">
                    <Scale className="h-4 w-4 text-amber-400" />
                    <span>KYC, Tax &amp; Legal Disclosures</span>
                  </h2>
                  <StatusBadge status={me?.compliance?.kycStatus || 'NOT_SUBMITTED'} />
                </div>

                <form onSubmit={handleSaveCompliance} className="space-y-4">
                  <div>
                    <label className={styles.label}>Country of Residence</label>
                    <input
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder="e.g. United States, Singapore, United Kingdom"
                      className={styles.input}
                    />
                  </div>
                  <div>
                    <label className={styles.label}>Tax Residency Jurisdiction</label>
                    <input
                      type="text"
                      value={taxResidency}
                      onChange={(e) => setTaxResidency(e.target.value)}
                      placeholder="Tax residency country"
                      className={styles.input}
                    />
                  </div>
                  <div>
                    <label className={styles.label}>
                      Tax Identification (Stored Masked: {me?.compliance?.taxIdMasked || 'None'})
                    </label>
                    <input
                      type="text"
                      value={taxIdNumber}
                      onChange={(e) => setTaxIdNumber(e.target.value)}
                      placeholder="Optional Tax ID (stored masked)"
                      className={styles.input}
                    />
                  </div>

                  <label className="flex items-start gap-2.5 text-xs text-slate-300 cursor-pointer pt-2">
                    <input
                      type="checkbox"
                      checked={acceptAgreement}
                      onChange={(e) => setAcceptAgreement(e.target.checked)}
                      className="mt-0.5 accent-amber-500 h-4 w-4 rounded"
                    />
                    <span className="leading-relaxed">
                      Acknowledge Terms of Service, Privacy Policy, Risk Disclosures, and Investment
                      Allocation Agreement.
                    </span>
                  </label>

                  <Button
                    type="submit"
                    variant="secondary"
                    isLoading={complianceSaving}
                    className="w-full sm:w-auto"
                  >
                    Update Compliance Declarations
                  </Button>
                </form>

                <p className="mt-5 text-[11px] leading-relaxed text-slate-400 border-t border-slate-800 pt-4">
                  {COMPLIANCE_DISCLOSURES.regulatoryDisclaimer}
                </p>
              </section>
            </div>
          )}

          {/* TAB 5: TUTORIAL MODE */}
          {activeTabId === 'tutorial' && (
            <div className={styles.grid}>
              <section className={styles.card}>
                <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400/15 border border-amber-400/30 text-amber-400 shrink-0">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h2 className="text-base sm:text-lg font-bold text-white">
                          Interactive Tutorial Mode
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
                      <p className="text-xs text-slate-400 mt-0.5 max-w-xl">
                        On-screen spotlight walkthrough covering Vault Balances, Staking, Yield
                        Accruals, BEP-20 Deposits, and 10-Level Referrals.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                    <Button
                      type="button"
                      variant="gold"
                      size="sm"
                      onClick={() => startTutorialTour(0)}
                      className="gap-1.5 flex-1 sm:flex-initial"
                    >
                      <Sparkles className="h-4 w-4" />
                      Review Tutorial
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleResetTutorial}
                      disabled={tutorialUpdating}
                      className="gap-1.5 text-xs opacity-80 hover:opacity-100 flex-1 sm:flex-initial"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Reset &amp; Restart
                    </Button>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 flex flex-wrap items-center justify-between gap-4">
                  <div className="min-w-0 max-w-xl">
                    <div className="text-xs font-semibold text-slate-200">
                      Auto-Launch Tutorial on First-Time Logins
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      When enabled, accounts that have not completed the walkthrough will
                      automatically be guided step-by-step upon logging into their dashboard.
                    </div>
                  </div>

                  <label className="relative inline-flex cursor-pointer items-center shrink-0">
                    <input
                      type="checkbox"
                      checked={tutorialEnabled}
                      disabled={tutorialUpdating}
                      onChange={(e) => handleToggleTutorial(e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="h-6 w-11 rounded-full bg-slate-800 peer-checked:bg-amber-500 peer-focus:ring-2 peer-focus:ring-amber-400/20 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white" />
                  </label>
                </div>

                {/* Tour Highlights Preview */}
                <div className="mt-6 pt-5 border-t border-slate-800/80">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                    Tutorial Modules Included in Tour
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/40 text-xs">
                      <div className="font-bold text-amber-300">1. Portfolio Command</div>
                      <div className="text-slate-400 mt-1">
                        Real-time USDT balances, Available vs. Invested equity.
                      </div>
                    </div>
                    <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/40 text-xs">
                      <div className="font-bold text-amber-300">2. Active Staking</div>
                      <div className="text-slate-400 mt-1">
                        Vault locks, compounding cycles, and expected maturities.
                      </div>
                    </div>
                    <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/40 text-xs">
                      <div className="font-bold text-amber-300">3. Yield Accruals</div>
                      <div className="text-slate-400 mt-1">
                        Daily mathematical distributions directly to available balance.
                      </div>
                    </div>
                    <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/40 text-xs">
                      <div className="font-bold text-amber-300">4. BEP-20 Deposits</div>
                      <div className="text-slate-400 mt-1">
                        Dynamic QR, verified address, and fast BSC confirmations.
                      </div>
                    </div>
                    <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/40 text-xs">
                      <div className="font-bold text-amber-300">5. Outbound Withdrawals</div>
                      <div className="text-slate-400 mt-1">
                        Zero fees, mandatory wallet routing, and security holds.
                      </div>
                    </div>
                    <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/40 text-xs">
                      <div className="font-bold text-amber-300">6. 10-Tier Referrals</div>
                      <div className="text-slate-400 mt-1">
                        Deep tree tracking, commission claims, and partner links.
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
