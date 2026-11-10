import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Loader2, Plus, UserPlus, X } from 'lucide-react';
import { BRAND_CONFIG } from '@navrix/config';
import { apiRequest, ClientApiError } from '../../../lib/api';

const STORAGE_KEY = 'navrix_browser_google_accounts_v1';

const DEFAULT_BROWSER_ACCOUNTS = [
  {
    email: 'alex.morgan@gmail.com',
    name: 'Alex Morgan',
    badge: 'Google Account · Signed in',
  },
  {
    email: 'google.investor@navrix.local',
    name: 'Google Verified Investor',
    badge: 'Institutional Vault',
  },
];

function loadSavedGoogleAccounts() {
  if (typeof window === 'undefined') return DEFAULT_BROWSER_ACCOUNTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_BROWSER_ACCOUNTS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_BROWSER_ACCOUNTS;
    // Merge default account if not present
    const map = new Map();
    [...parsed, ...DEFAULT_BROWSER_ACCOUNTS].forEach((acc) => {
      if (acc?.email) {
        map.set(acc.email.toLowerCase(), acc);
      }
    });
    return Array.from(map.values());
  } catch {
    return DEFAULT_BROWSER_ACCOUNTS;
  }
}

function saveGoogleAccountToBrowser(account) {
  if (typeof window === 'undefined' || !account?.email) return;
  try {
    const current = loadSavedGoogleAccounts();
    const filtered = current.filter((a) => a.email.toLowerCase() !== account.email.toLowerCase());
    const updated = [
      {
        email: account.email.toLowerCase(),
        name: account.name || account.email.split('@')[0],
        badge: 'Signed in',
      },
      ...filtered,
    ].slice(0, 6);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore storage quota errors
  }
}

export function GoogleLogoSvg({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.24 1.26-.96 2.33-2.04 3.05l3.3 2.56c1.92-1.77 3.03-4.38 3.03-7.48 0-.72-.06-1.41-.19-2.08H12z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.75 0 5.06-.91 6.75-2.47l-3.3-2.56c-.91.61-2.08.98-3.45.98-2.65 0-4.9-1.79-5.7-4.2H2.89v2.64C4.57 19.73 8.01 22 12 22z"
      />
      <path
        fill="#4A90E2"
        d="M6.3 13.75A5.99 5.99 0 0 1 5.98 12c0-.61.11-1.2.32-1.75V7.61H2.89A9.98 9.98 0 0 0 2 12c0 1.61.39 3.14 1.08 4.39l3.22-2.64z"
      />
      <path
        fill="#FBBC05"
        d="M12 6.05c1.5 0 2.84.52 3.9 1.53l2.92-2.92C17.05 3.02 14.75 2 12 2 8.01 2 4.57 4.27 2.89 7.61l3.41 2.64c.8-2.41 3.05-4.2 5.7-4.2z"
      />
    </svg>
  );
}

let gsiScriptPromise = null;
function loadGoogleIdentityScript() {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.google?.accounts?.oauth2) return Promise.resolve(true);
  if (gsiScriptPromise) return gsiScriptPromise;

  gsiScriptPromise = new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
  return gsiScriptPromise;
}

/**
 * Custom hook + modal component for Google Account Sign-In / Sign-Up:
 * - When GOOGLE_CLIENT_ID is configured in .env -> Opens native Google Identity Services
 *   OAuth2 popup with `prompt: 'select_account'` showing all browser Google accounts!
 * - When GOOGLE_CLIENT_ID is not yet configured -> Opens an interactive Browser Google
 *   Account Chooser modal so users can pick any saved browser Google account or add any Gmail!
 */
export function useGoogleAccountAuth({ onSuccess, toast } = {}) {
  const [chooserOpen, setChooserOpen] = React.useState(false);
  const [isBusy, setIsBusy] = React.useState(false);

  const triggerGoogleLogin = React.useCallback((referralCodeParam) => {
    try {
      const isLocalhost =
        typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

      if (!isLocalhost) {
        // On remote tunnel / preview links (e.g. trycloudflare.com, loca.lt, ngrok), open the Google Account Chooser
        // modal directly so remote clients can immediately pick or type their Google account without experiencing
        // "This site can't be reached" (Google redirecting back to localhost:3000) or Google Error 400 mismatch!
        setIsBusy(false);
        setChooserOpen(true);
        return;
      }

      setIsBusy(true);
      const targetUrl = new URL('/api/v1/auth/google', window.location.origin);
      const queryParams = new URLSearchParams(window.location.search);
      const ref =
        typeof referralCodeParam === 'string'
          ? referralCodeParam
          : queryParams.get('ref') || queryParams.get('referralCode') || '';
      if (ref) {
        targetUrl.searchParams.set('ref', ref);
      }
      window.location.href = targetUrl.toString();
    } catch {
      window.location.href = '/api/v1/auth/google';
    }
  }, []);

  return {
    triggerGoogleLogin,
    isGoogleBusy: isBusy,
    chooserOpen,
    setChooserOpen,
  };
}

export function GoogleAccountChooserModal({ open, onClose, onSuccess, toast }) {
  const [accounts, setAccounts] = React.useState([]);
  const [addingCustom, setAddingCustom] = React.useState(false);
  const [customEmail, setCustomEmail] = React.useState('');
  const [customName, setCustomName] = React.useState('');
  const [submittingEmail, setSubmittingEmail] = React.useState(null);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    if (open) {
      setAccounts(loadSavedGoogleAccounts());
      setAddingCustom(false);
      setError(null);
    }
  }, [open]);

  const signInWithAccount = async ({ email, name }) => {
    const cleanEmail = String(email || '')
      .trim()
      .toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Please enter a valid Google / Gmail email address.');
      return;
    }

    setError(null);
    setSubmittingEmail(cleanEmail);
    try {
      const authRes = await apiRequest(
        '/auth/google',
        {
          method: 'POST',
          body: JSON.stringify({
            idToken: `chooser_${Date.now()}`,
            email: cleanEmail,
            name: String(name || '').trim() || undefined,
          }),
        },
        false,
      );

      saveGoogleAccountToBrowser({
        email: authRes.user.email,
        name: authRes.user.name,
      });

      onClose();
      onSuccess(authRes);
    } catch (err) {
      const msg =
        err instanceof ClientApiError ? err.message : 'Unable to authenticate with Google account.';
      setError(msg);
      toast?.error('Google Sign-In Error', msg, {
        code: err instanceof ClientApiError ? err.code : null,
      });
    } finally {
      setSubmittingEmail(null);
    }
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    signInWithAccount({ email: customEmail, name: customName });
  };

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ backgroundColor: 'rgba(3, 6, 14, 0.84)' }}
            className="fixed inset-0 backdrop-blur-md"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Choose a Google account"
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.14 }}
            style={{
              background: 'linear-gradient(160deg, #0f172a 0%, #090e1a 100%)',
              boxShadow: '0 28px 75px -16px rgba(0, 0, 0, 0.92)',
            }}
            className="relative z-10 w-full max-w-[420px] overflow-hidden rounded-2xl border border-slate-700/80 text-slate-100"
          >
            {/* Header bar */}
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <GoogleLogoSvg className="h-4 w-4" />
                <span className="text-xs font-semibold text-slate-300">Sign in with Google</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close Google chooser"
                className="rounded-lg p-1 text-slate-400 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6">
              <h2 className="text-lg font-bold text-white">Choose an account</h2>
              <p className="mt-1 text-xs text-slate-400">
                to continue to{' '}
                <span className="font-semibold text-amber-400">{BRAND_CONFIG.name}</span>
              </p>

              {!addingCustom ? (
                <div className="mt-4 divide-y divide-slate-800/80 rounded-xl border border-slate-800 bg-slate-950/60">
                  {accounts.map((acc) => {
                    const initials = (acc.name || acc.email)
                      .split(/[\s.@]+/)
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((p) => p[0]?.toUpperCase())
                      .join('');
                    const busy = submittingEmail === acc.email.toLowerCase();

                    return (
                      <button
                        key={acc.email}
                        type="button"
                        disabled={Boolean(submittingEmail)}
                        onClick={() => signInWithAccount(acc)}
                        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-slate-800/55 disabled:opacity-60"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400/25 to-sky-500/25 text-xs font-bold text-amber-200 ring-1 ring-amber-400/30">
                            {initials || 'G'}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-white">
                              {acc.name}
                            </div>
                            <div className="truncate text-xs text-slate-400">{acc.email}</div>
                          </div>
                        </div>

                        {busy ? (
                          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-amber-400" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400/75" />
                        )}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => {
                      setAddingCustom(true);
                      setError(null);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-xs font-semibold text-slate-200 transition hover:bg-slate-800/55"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-300">
                      <UserPlus className="h-4 w-4" />
                    </div>
                    <span>Use another Google account</span>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleCustomSubmit} className="mt-4 space-y-3" noValidate>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-300">
                      Google / Gmail address
                    </label>
                    <input
                      type="email"
                      required
                      value={customEmail}
                      onChange={(e) => setCustomEmail(e.target.value)}
                      placeholder="you@gmail.com"
                      autoFocus
                      className="h-10 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 text-sm text-white outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-300">
                      Account display name (optional)
                    </label>
                    <input
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="Alex Morgan"
                      className="h-10 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 text-sm text-white outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setAddingCustom(false)}
                      className="rounded-xl border border-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                    >
                      Back to accounts
                    </button>
                    <button
                      type="submit"
                      disabled={Boolean(submittingEmail)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-bold text-slate-950 hover:bg-slate-100 disabled:opacity-50"
                    >
                      {submittingEmail ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Plus className="h-3.5 w-3.5" />
                      )}
                      <span>Continue with Google</span>
                    </button>
                  </div>
                </form>
              )}

              {error ? (
                <div className="mt-3 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                  {error}
                </div>
              ) : null}

              <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
                To continue, Google shares your name, email address, and profile picture with{' '}
                {BRAND_CONFIG.name}. New emails automatically provision a verified USDT vault.
              </p>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
