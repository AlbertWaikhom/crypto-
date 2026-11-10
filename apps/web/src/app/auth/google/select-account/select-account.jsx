'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Loader2,
  Plus,
  Shield,
  User,
  UserPlus,
} from 'lucide-react';
import { GoogleLogoSvg } from '../../components/GoogleAccountChooserModal';

const DEFAULT_GOOGLE_ACCOUNTS = [
  {
    email: 'albert@gmail.com',
    name: 'Albert',
    subtext: 'Chrome Profile · Signed in',
    avatar:
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
  },
  {
    email: 'albert.work@gmail.com',
    name: 'Albert (Work)',
    subtext: 'Chrome Profile · Signed in',
    avatar:
      'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80',
  },
  {
    email: 'eramnaaz@orbifert.com',
    name: 'Eramnaaz (orbifert)',
    subtext: 'Chrome Profile · Signed in',
    avatar:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
  },
  {
    email: 'prakash@gmail.com',
    name: 'Prakash',
    subtext: 'Chrome Profile · Signed in',
    avatar:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
  },
  {
    email: 'contact@urbango.co.in',
    name: 'Urbango (urbango.co.in)',
    subtext: 'Chrome Profile · Signed in',
    avatar: null,
  },
  {
    email: 'waikhomalbert@gmail.com',
    name: 'WaikhomAlbert',
    subtext: 'Chrome Profile · Signed in',
    avatar: null,
  },
  {
    email: 'jrr@gmail.com',
    name: 'JRR',
    subtext: 'Chrome Profile · Signed in',
    avatar: null,
  },
  {
    email: 'naotu@gmail.com',
    name: 'naotu',
    subtext: 'Chrome Profile · Signed in',
    avatar: null,
  },
];

export default function GoogleSelectAccountPage() {
  const searchParams = useSearchParams();
  const state = searchParams.get('state') || '';
  const redirectUri = searchParams.get('redirect_uri') || '/api/v1/auth/google/callback';

  const [accounts, setAccounts] = React.useState(DEFAULT_GOOGLE_ACCOUNTS);
  const [selectedEmail, setSelectedEmail] = React.useState(null);
  const [addingCustom, setAddingCustom] = React.useState(false);
  const [customEmail, setCustomEmail] = React.useState('');
  const [customName, setCustomName] = React.useState('');
  const [customError, setCustomError] = React.useState(null);

  // Load any previously remembered browser accounts
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem('navrix_browser_google_accounts_v1');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const merged = [...parsed];
          for (const def of DEFAULT_GOOGLE_ACCOUNTS) {
            if (!merged.some((a) => a.email.toLowerCase() === def.email.toLowerCase())) {
              merged.push(def);
            }
          }
          setAccounts(merged);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const handleSelectAccount = (account) => {
    setSelectedEmail(account.email);

    // Save to browser accounts
    try {
      const current = accounts.filter((a) => a.email.toLowerCase() !== account.email.toLowerCase());
      const updated = [account, ...current].slice(0, 5);
      localStorage.setItem('navrix_browser_google_accounts_v1', JSON.stringify(updated));
    } catch {
      // ignore
    }

    const targetUrl = new URL(redirectUri, window.location.origin);
    targetUrl.searchParams.set('mock_email', account.email);
    targetUrl.searchParams.set('mock_name', account.name || account.email.split('@')[0]);
    if (account.avatar) targetUrl.searchParams.set('mock_avatar', account.avatar);
    if (state) targetUrl.searchParams.set('state', state);

    setTimeout(() => {
      window.location.href = targetUrl.toString();
    }, 400);
  };

  const handleAddCustom = (e) => {
    e.preventDefault();
    setCustomError(null);
    const cleanEmail = customEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setCustomError('Please enter a valid Google email address.');
      return;
    }

    const cleanName =
      customName.trim() ||
      cleanEmail
        .split('@')[0]
        .replace(/[._-]+/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());

    const newAcc = {
      email: cleanEmail,
      name: cleanName,
      subtext: 'Signed in',
    };

    handleSelectAccount(newAcc);
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-[#202124] text-[#e8eaed] p-4 font-sans antialiased">
      <div className="w-full max-w-[448px] rounded-2xl bg-[#303134] border border-[#5f6368]/30 shadow-2xl p-8 sm:p-10">
        {/* Google Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="mb-4">
            <GoogleLogoSvg className="h-8 w-8" />
          </div>
          <h1 className="text-xl sm:text-2xl font-normal text-white mb-2">Sign in with Google</h1>
          <p className="text-sm text-[#9aa0a6]">
            Choose an account to continue to{' '}
            <span className="font-semibold text-white">NAVRIX</span>
          </p>
        </div>

        {addingCustom ? (
          <form onSubmit={handleAddCustom} className="space-y-4">
            <div>
              <label className="block text-xs text-[#9aa0a6] mb-1.5">Google / Gmail address</label>
              <input
                type="email"
                required
                autoFocus
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                placeholder="username@gmail.com"
                className="w-full rounded-lg bg-[#202124] border border-[#5f6368] px-3.5 py-2.5 text-sm text-white placeholder-[#80868b] focus:border-[#8ab4f8] focus:outline-none focus:ring-1 focus:ring-[#8ab4f8]"
              />
            </div>

            <div>
              <label className="block text-xs text-[#9aa0a6] mb-1.5">Full name (optional)</label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Your Name"
                className="w-full rounded-lg bg-[#202124] border border-[#5f6368] px-3.5 py-2.5 text-sm text-white placeholder-[#80868b] focus:border-[#8ab4f8] focus:outline-none focus:ring-1 focus:ring-[#8ab4f8]"
              />
            </div>

            {customError && <p className="text-xs text-[#f28b82] font-medium">{customError}</p>}

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setAddingCustom(false)}
                className="text-xs font-semibold text-[#8ab4f8] hover:text-[#aecbfa] transition-colors"
              >
                Back to accounts
              </button>
              <button
                type="submit"
                disabled={Boolean(selectedEmail)}
                className="inline-flex items-center gap-2 rounded-lg bg-[#8ab4f8] hover:bg-[#aecbfa] text-[#202124] px-5 py-2 text-xs font-bold transition-all shadow"
              >
                {selectedEmail ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>Continue</span>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-1 divide-y divide-[#5f6368]/40">
            {accounts.map((acc) => {
              const isChosen = selectedEmail === acc.email;
              return (
                <button
                  key={acc.email}
                  type="button"
                  disabled={Boolean(selectedEmail)}
                  onClick={() => handleSelectAccount(acc)}
                  className="w-full flex items-center gap-3.5 py-3 px-2 rounded-xl text-left hover:bg-[#3c4043] transition-colors group cursor-pointer disabled:opacity-60"
                >
                  {acc.avatar ? (
                    <img
                      src={acc.avatar}
                      alt={acc.name}
                      className="h-10 w-10 rounded-full object-cover shrink-0 ring-1 ring-[#5f6368]"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-[#1a73e8] text-white font-bold flex items-center justify-center shrink-0 text-sm">
                      {acc.name ? acc.name[0].toUpperCase() : 'G'}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{acc.name}</div>
                    <div className="text-xs text-[#9aa0a6] truncate">{acc.email}</div>
                  </div>

                  {isChosen ? (
                    <Loader2 className="h-4 w-4 animate-spin text-[#8ab4f8]" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-[#5f6368] group-hover:text-[#9aa0a6] transition-colors" />
                  )}
                </button>
              );
            })}

            <button
              type="button"
              disabled={Boolean(selectedEmail)}
              onClick={() => setAddingCustom(true)}
              className="w-full flex items-center gap-3.5 pt-3.5 pb-2 px-2 rounded-xl text-left hover:bg-[#3c4043] transition-colors group cursor-pointer"
            >
              <div className="h-10 w-10 rounded-full bg-[#3c4043] text-[#8ab4f8] flex items-center justify-center shrink-0">
                <UserPlus className="h-5 w-5" />
              </div>
              <div className="flex-1 text-sm font-medium text-white">Use another account</div>
            </button>
          </div>
        )}

        {/* Footer Disclaimer */}
        <div className="mt-8 pt-6 border-t border-[#5f6368]/30 text-xs text-[#9aa0a6] leading-relaxed">
          <p>
            To continue, Google will share your name, email address, and profile picture with{' '}
            <span className="text-white font-medium">NAVRIX</span>. Before using this app, review
            its{' '}
            <a
              href="/terms-conditions"
              className="text-[#8ab4f8] hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              Terms of Service
            </a>{' '}
            and{' '}
            <a
              href="/risk-disclosure"
              className="text-[#8ab4f8] hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>

      {/* Google page footer */}
      <div className="w-full max-w-[448px] mt-4 flex items-center justify-between text-[11px] text-[#9aa0a6] px-2">
        <span>English (United States)</span>
        <div className="flex items-center gap-4">
          <a href="/contact" className="hover:text-white transition-colors">
            Help
          </a>
          <a href="/risk-disclosure" className="hover:text-white transition-colors">
            Privacy
          </a>
          <a href="/terms-conditions" className="hover:text-white transition-colors">
            Terms
          </a>
        </div>
      </div>
    </div>
  );
}
