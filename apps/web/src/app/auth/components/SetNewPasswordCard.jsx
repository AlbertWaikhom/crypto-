import * as React from 'react';
import {
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Laptop,
  Loader2,
  Minus,
  Smartphone,
} from 'lucide-react';
import { evaluatePasswordStrength } from './auth-helpers';
import styles from './auth-suite.module.css';

/**
 * Matches Image 3 ("Set a new password"):
 * Key icon, 4-segment live strength meter, 2x2 requirement checklist,
 * confirm password, [✓] Sign out of my other devices + live active sessions list.
 */
export function SetNewPasswordCard({
  email,
  devices = [],
  onSubmitNewPassword,
  onBack,
  isSubmitting = false,
  errorMessage = null,
}) {
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [signOutOthers, setSignOutOthers] = React.useState(true);
  const [localError, setLocalError] = React.useState(null);

  const { rules, score, color } = evaluatePasswordStrength(newPassword);

  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;
  const meetsMinimumPolicy =
    newPassword.length >= 8 &&
    /[A-Z]/.test(newPassword) &&
    /[a-z]/.test(newPassword) &&
    /[0-9]/.test(newPassword);

  const displayDevices =
    devices && devices.length > 0
      ? devices
      : [
          {
            id: 'current',
            device: 'Current Browser Session',
            isMobile: false,
            location: 'Local Gateway',
            lastActive: 'Active now',
            isCurrent: true,
          },
        ];

  const handleSubmit = (e) => {
    e.preventDefault();
    setLocalError(null);
    if (!meetsMinimumPolicy) {
      setLocalError(
        'Password must be at least 8 characters and include uppercase, lowercase, and a number.',
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      setLocalError('Passwords do not match. Please double-check both fields.');
      return;
    }
    onSubmitNewPassword({
      newPassword,
      signOutOtherDevices: signOutOthers,
    });
  };

  const activeError = localError || errorMessage;

  return (
    <div>
      <form onSubmit={handleSubmit} className={styles.soloCard} noValidate>
        <div className={styles.soloIconBadge}>
          <KeyRound className="h-5 w-5" />
        </div>

        <h1 className={styles.headingTitle}>Set a new password</h1>
        <p className={styles.headingSub}>
          For <span className="font-semibold text-slate-200">{email}</span>. The reset code stays
          valid for 30 minutes.
        </p>

        <div className="mt-5">
          <div className={styles.fieldGroup}>
            <div className={styles.fieldLabelRow}>
              <label htmlFor="nv-new-password" className={styles.fieldLabel}>
                New password
              </label>
            </div>
            <div className={styles.inputWrap}>
              <input
                id="nv-new-password"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setLocalError(null);
                }}
                placeholder="Choose a strong password"
                autoComplete="new-password"
                className={`${styles.textInput} ${styles.inputWithRightIcon}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className={styles.eyeToggleBtn}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* 4-Segment Strength Bar */}
            <div className={styles.strengthSegments} aria-hidden="true">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={styles.strengthSeg}
                  style={{
                    backgroundColor:
                      newPassword.length > 0 && idx < score ? color : 'rgba(148, 163, 184, 0.2)',
                  }}
                />
              ))}
            </div>

            {/* 2x2 Live Checklist */}
            <div className={styles.rulesGrid}>
              {rules.map((r) => (
                <div key={r.id} className={`${styles.ruleItem} ${r.met ? styles.ruleItemMet : ''}`}>
                  {r.met ? (
                    <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  ) : (
                    <Minus className="h-3.5 w-3.5 shrink-0 text-slate-600" />
                  )}
                  <span>{r.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <div className={styles.fieldLabelRow}>
              <label htmlFor="nv-confirm-password" className={styles.fieldLabel}>
                Confirm password
              </label>
            </div>
            <input
              id="nv-confirm-password"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setLocalError(null);
              }}
              placeholder="Repeat the password"
              autoComplete="new-password"
              className={`${styles.textInput} ${
                confirmPassword.length > 0 && !passwordsMatch
                  ? styles.textInputError
                  : passwordsMatch
                    ? styles.textInputSuccess
                    : ''
              }`}
            />
            <p className="mt-1.5 text-[11px] text-slate-400">
              Type it a second time so a typo cannot lock you out.
            </p>
          </div>

          {/* Sign out of other devices checkbox + live session list */}
          <div className="mt-4">
            <label className="flex cursor-pointer items-center gap-2.5 text-xs font-medium text-slate-200">
              <input
                type="checkbox"
                checked={signOutOthers}
                onChange={(e) => setSignOutOthers(e.target.checked)}
                className="h-4 w-4 rounded border-slate-600 bg-slate-900 accent-white"
              />
              <span>Sign out of my other devices</span>
            </label>

            <div className={styles.devicesBox}>
              {displayDevices.map((d) => (
                <div key={d.id} className={styles.deviceRow}>
                  <div className="flex min-w-0 items-center gap-2.5">
                    {d.isMobile ? (
                      <Smartphone className="h-4 w-4 shrink-0 text-slate-400" />
                    ) : (
                      <Laptop className="h-4 w-4 shrink-0 text-slate-400" />
                    )}
                    <div className="min-w-0">
                      <div className="truncate text-xs font-semibold text-slate-100">
                        {d.device}
                      </div>
                      <div className="truncate text-[11px] text-slate-400">
                        {d.location} &middot; {d.lastActive}
                      </div>
                    </div>
                  </div>
                  <span className="shrink-0 text-[11px] font-medium text-slate-400">
                    {d.isCurrent ? 'This device' : signOutOthers ? 'Ends' : 'Kept'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {activeError ? (
            <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2.5 text-xs font-medium text-rose-200">
              {activeError}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={!meetsMinimumPolicy || !passwordsMatch || isSubmitting}
            className={`${styles.primaryWhiteBtn} mt-5`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Updating password...</span>
              </>
            ) : (
              <span>Update password</span>
            )}
          </button>
        </div>
      </form>

      {onBack ? (
        <div className={styles.backBelowCard}>
          <button type="button" onClick={onBack} className={styles.backLinkBtn}>
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to sign in</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
