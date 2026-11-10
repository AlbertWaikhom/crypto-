'use client';
import * as React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Copy,
  HelpCircle,
  KeyRound,
  Lock,
  Mail,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { COMPLIANCE_DISCLOSURES } from '@navrix/config';
import { Button, CopyButton, shortenHex, StatusBadge } from '@navrix/ui';
import { apiRequest, ClientApiError } from '../../../lib/api';
import { useUiStore } from '../../../store/ui-store';
import { startTutorialTour } from '../../../components/InteractiveTutorialTour';
import styles from './profile.module.css';

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const { user, accessToken, setSession } = useUiStore();
  const { data: me } = useQuery({
    queryKey: ['users-me'],
    queryFn: () => apiRequest('/users/me'),
  });
  const [name, setName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [country, setCountry] = React.useState('');
  const [taxResidency, setTaxResidency] = React.useState('');
  const [taxIdNumber, setTaxIdNumber] = React.useState('');
  const [acceptAgreement, setAcceptAgreement] = React.useState(true);
  const [savedNotice, setSavedNotice] = React.useState(null);
  const [tutorialUpdating, setTutorialUpdating] = React.useState(false);

  // Mandatory Payout Wallet ID state
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

  const tutorialEnabled = me?.tutorialEnabled ?? user?.tutorialEnabled ?? true;
  const tutorialCompleted = me?.tutorialCompleted ?? user?.tutorialCompleted ?? false;
  const tutorialCompletedAt = me?.tutorialCompletedAt ?? user?.tutorialCompletedAt;

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
      setSavedNotice(
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
      setSavedNotice('Tutorial progress reset. Starting review tour...');
      startTutorialTour(0);
    } catch {
      startTutorialTour(0);
    } finally {
      setTutorialUpdating(false);
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

  React.useEffect(() => {
    if (me) {
      setName(me.name);
      setPhone(me.phone || '');
      setCountry(me.compliance?.country || '');
      setTaxResidency(me.compliance?.taxResidency || '');
    }
  }, [me]);
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    await apiRequest('/users/me', {
      method: 'PATCH',
      body: JSON.stringify({ name, phone }),
    });
    await queryClient.invalidateQueries({ queryKey: ['users-me'] });
    setSavedNotice('Account profile updated.');
  };
  const handleSaveCompliance = async (e) => {
    e.preventDefault();
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
    setSavedNotice('Compliance & jurisdiction disclosures updated.');
  };
  return (
    <div>
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-extrabold">Profile & Compliance</h1>
        <p className="mt-0.5 text-xs sm:text-sm opacity-70">
          Manage your public account UID, contact preferences, and configurable compliance
          placeholders.
        </p>
      </div>

      {savedNotice ? (
        <div className="mb-5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-300">
          {savedNotice}
        </div>
      ) : null}

      <div className={styles.grid}>
        <section className={styles.card}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-xs opacity-65">Public Investor UID</div>
              <div className="font-mono text-base sm:text-lg font-extrabold text-amber-400">
                {me?.uid || '—'}
              </div>
            </div>
            <StatusBadge status={me?.status || 'ACTIVE'} />
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={styles.input}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold">Email Address</label>
              <input type="email" value={me?.email || ''} disabled className={styles.input} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={styles.input}
              />
            </div>
            <Button type="submit" variant="gold" className="w-full sm:w-auto">
              Save Profile
            </Button>
          </form>
        </section>

        {/* Mandatory Payout Wallet ID Setup & Management */}
        <section className={styles.card} style={{ gridColumn: '1 / -1' }}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-400">
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
                    Security Hold Active: Recent address update places withdrawals on hold until{' '}
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
                  <strong className="font-semibold text-rose-300">Withdrawals Locked: </strong>
                  You must save a valid BEP-20 USDT Wallet ID before requesting withdrawals.
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
                <label className="mb-1 block text-xs font-semibold">
                  {me?.payoutWallet?.address ? 'New BEP-20 Wallet ID' : 'BEP-20 Wallet ID (0x...)'}
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
                <label className="mb-1 block text-xs font-semibold">Confirm Wallet ID</label>
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
                  <div className="flex gap-2">
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
                  <div className="flex gap-2">
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
            >
              {me?.payoutWallet?.address ? 'Update Wallet ID' : 'Save & Register Wallet ID'}
            </Button>
          </form>
        </section>

        <section className={styles.card}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-bold">KYC, Tax & Legal Disclosures</h2>
            <StatusBadge status={me?.compliance?.kycStatus || 'NOT_SUBMITTED'} />
          </div>

          <form onSubmit={handleSaveCompliance} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold">Country of Residence</label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="e.g. United States, India, Singapore"
                className={styles.input}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold">Tax Residency Jurisdiction</label>
              <input
                type="text"
                value={taxResidency}
                onChange={(e) => setTaxResidency(e.target.value)}
                placeholder="Tax residency country"
                className={styles.input}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold">
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

            <label className="flex items-start gap-2 text-xs opacity-85">
              <input
                type="checkbox"
                checked={acceptAgreement}
                onChange={(e) => setAcceptAgreement(e.target.checked)}
                className="mt-0.5 accent-amber-500"
              />
              <span>
                Acknowledge Terms, Privacy Policy, Risk Disclosure, and Investment Allocation
                Agreement (subject to jurisdictional legal/compliance review).
              </span>
            </label>

            <Button type="submit" variant="secondary" className="w-full sm:w-auto">
              Update Compliance Declarations
            </Button>
          </form>

          <p className="mt-4 text-[11px] leading-relaxed opacity-60">
            {COMPLIANCE_DISCLOSURES.regulatoryDisclaimer}
          </p>
        </section>

        {/* Interactive Tutorial Mode & Guided Tour Settings */}
        <section className={styles.card} style={{ gridColumn: '1 / -1' }}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-400">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Interactive Tutorial Mode</span>
                  {tutorialCompleted ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                      <CheckCircle2 className="h-3 w-3" />
                      Completed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                      <HelpCircle className="h-3 w-3" />
                      Ready / Incomplete
                    </span>
                  )}
                </h2>
                <p className="text-xs text-slate-400">
                  On-screen spotlight walkthrough covering Vault Balances, Staking, Yield Accruals,
                  BEP-20 Deposits, and 10-Level Referrals.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="gold"
                size="sm"
                onClick={() => startTutorialTour(0)}
                className="gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Review Tutorial
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetTutorial}
                disabled={tutorialUpdating}
                className="gap-1.5 text-xs opacity-80 hover:opacity-100"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset &amp; Restart
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 max-w-xl">
              <div className="text-xs font-semibold text-slate-200">
                Auto-Launch Tutorial on First-Time Logins
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                When enabled, accounts that have not completed the walkthrough will automatically be
                guided step-by-step upon logging into their dashboard.
              </div>
            </div>

            <label className="relative inline-flex cursor-pointer items-center">
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
        </section>
      </div>
    </div>
  );
}
