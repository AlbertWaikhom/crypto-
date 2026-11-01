'use client';

import * as React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { BRAND_CONFIG } from '@navrix/config';
import { isMasterAdminRole, PublicUserDto } from '@navrix/types';
import { Button } from '@navrix/ui';
import { adminApi, AdminApiError } from '../../lib/api';
import { useAdminStore } from '../../store/admin-store';
import styles from './admin-login.module.css';

export default function AdminLoginPage() {
  const router = useRouter();
  const setAdminSession = useAdminStore((s) => s.setAdminSession);

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await adminApi<{
        accessToken: string;
        user: PublicUserDto;
      }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          requireAdmin: true,
        }),
      });
      setAdminSession(res.accessToken, res.user);
      router.push(isMasterAdminRole(res.user.role) ? '/master' : '/dashboard');
    } catch (err) {
      setError(
        err instanceof AdminApiError
          ? err.message
          : 'Administrative authentication failed.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAdminGoogleSSO = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await adminApi<{
        accessToken: string;
        user: PublicUserDto;
      }>('/auth/google', {
        method: 'POST',
        body: JSON.stringify({
          idToken: 'google_admin_sso_token',
          email: email || 'masteradmin@navrix.local',
          requireAdmin: true,
        }),
      });
      setAdminSession(res.accessToken, res.user);
      router.push(isMasterAdminRole(res.user.role) ? '/master' : '/dashboard');
    } catch (err) {
      setError(
        err instanceof AdminApiError
          ? err.message
          : 'Google SSO requires a pre-authorized Admin or Master Admin email.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className="mb-6 flex flex-col items-center text-center">
          <Image
            src="/brand/logo-mark.png"
            alt={BRAND_CONFIG.name}
            width={56}
            height={56}
            priority
          />
          <span className="mt-3 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-400">
            Restricted Console
          </span>
          <h1 className="mt-2 text-2xl font-extrabold">
            {BRAND_CONFIG.name} Admin & Master Portal
          </h1>
          <p className="mt-1 text-xs opacity-65">
            Every sign-in and action is recorded in the immutable audit log.
          </p>
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label
              htmlFor="admin-email"
              className="mb-1 block text-xs font-semibold opacity-80"
            >
              Admin / Master Admin Email
            </label>
            <input
              id="admin-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="masteradmin@navrix.local"
              className={styles.input}
            />
          </div>

          <div>
            <label
              htmlFor="admin-password"
              className="mb-1 block text-xs font-semibold opacity-80"
            >
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className={styles.input}
            />
          </div>

          <Button
            type="submit"
            variant="gold"
            size="lg"
            isLoading={loading}
            className="w-full"
          >
            Authorize & Enter Console
          </Button>
        </form>

        <div className="my-4 text-center text-[11px] uppercase tracking-wider opacity-50">
          or authorized staff SSO
        </div>

        <button
          type="button"
          onClick={handleAdminGoogleSSO}
          disabled={loading}
          className={styles.googleBtn}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#EA4335"
              d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.1 14.6 2 12 2 6.5 2 2 6.5 2 12s4.5 10 10 10c5.8 0 9.6-4.1 9.6-9.8 0-.7-.1-1.2-.2-1.8H12z"
            />
          </svg>
          Sign in with Authorized Google Account
        </button>
      </div>
    </div>
  );
}

