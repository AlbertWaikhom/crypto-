'use client';
import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ShieldCheck } from 'lucide-react';
import { BRAND_CONFIG } from '@navrix/config';
import { isAdminRole, isMasterAdminRole } from '@navrix/types';
import { AuroraBackground, Button, ShinyText, StarBorder } from '@navrix/ui';
import { loginSchema } from '@navrix/validation';
import { SiteHeader } from '../../../components/SiteHeader';
import { apiRequest, ClientApiError } from '../../../lib/api';
import { useUiStore } from '../../../store/ui-store';
import styles from './login.module.css';
const ADMIN_BASE_URL = process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3001';
export default function UnifiedLoginPage() {
  const router = useRouter();
  const { setSession, clearSession } = useUiStore();
  const [serverError, setServerError] = React.useState(null);
  const [googleLoading, setGoogleLoading] = React.useState(false);
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });
  const routeAuthenticatedUser = React.useCallback(
    (accessToken, user) => {
      if (isAdminRole(user.role)) {
        // Clear customer-local storage and seamlessly hand off to Admin/Master Console
        clearSession();
        const target = isMasterAdminRole(user.role) ? '/master' : '/dashboard';
        const fragment = `token=${encodeURIComponent(accessToken)}&user=${encodeURIComponent(JSON.stringify(user))}&target=${encodeURIComponent(target)}`;
        window.location.assign(`${ADMIN_BASE_URL}/sso#${fragment}`);
        return;
      }
      setSession(accessToken, user);
      router.push('/dashboard');
    },
    [clearSession, router, setSession],
  );
  const onSubmit = async (values) => {
    setServerError(null);
    try {
      const res = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify(values),
      });
      routeAuthenticatedUser(res.accessToken, res.user);
    } catch (err) {
      setServerError(
        err instanceof ClientApiError
          ? err.message
          : 'Unable to sign in. Please verify your email and password.',
      );
    }
  };
  const handleGoogleSignIn = async () => {
    setServerError(null);
    setGoogleLoading(true);
    try {
      const typedEmail = getValues('email')?.trim();
      const res = await apiRequest('/auth/google', {
        method: 'POST',
        body: JSON.stringify({
          idToken: 'google_oauth_unified_client_token',
          email: typedEmail || 'google.investor@navrix.local',
          name: 'Google Verified Investor',
        }),
      });
      routeAuthenticatedUser(res.accessToken, res.user);
    } catch (err) {
      setServerError(
        err instanceof ClientApiError ? err.message : 'Google sign-in could not be completed.',
      );
    } finally {
      setGoogleLoading(false);
    }
  };
  return (
    <div className={styles.pageShell}>
      {/* Separate Static Header Component */}
      <SiteHeader mode="static" compactAuth />

      <div className={styles.authViewport}>
        <StarBorder color="#F5B82E" speed="8s" className={styles.cardShell}>
          <AuroraBackground variant="gold" intensity="subtle" className={styles.authCard}>
            <div className={styles.headerBlock}>
              <Link href="/" className={styles.logoBadge}>
                <Image
                  src="/brand/logo-mark.png"
                  alt={BRAND_CONFIG.name}
                  width={40}
                  height={40}
                  priority
                />
              </Link>

              <span className={styles.unifiedPill}>
                <ShieldCheck className="h-3 w-3 text-emerald-400" />
                <ShinyText text="UNIFIED PORTAL ACCESS" />
              </span>

              <h1 className={styles.title}>Sign in to {BRAND_CONFIG.name}</h1>
              <p className={styles.subtitle}>
                One login for Investors, Operations Admins, and Master Admins â€” automatically
                routed by verified RBAC role.
              </p>
            </div>

            {serverError ? (
              <div role="alert" className={styles.errorAlert}>
                {serverError}
              </div>
            ) : null}

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading || isSubmitting}
              className={styles.googleBtn}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#EA4335"
                  d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.1 14.6 2 12 2 6.5 2 2 6.5 2 12s4.5 10 10 10c5.8 0 9.6-4.1 9.6-9.8 0-.7-.1-1.2-.2-1.8H12z"
                />
              </svg>
              {googleLoading ? 'Connecting Google...' : 'Continue with Google'}
            </button>

            <div className={styles.divider}>or sign in with email</div>

            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className={styles.fieldGroup}>
                <label htmlFor="email" className={styles.label}>
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@domain.com"
                  className={styles.input}
                  {...register('email')}
                />
                {errors.email ? (
                  <span className="text-[11px] text-rose-400">{errors.email.message}</span>
                ) : null}
              </div>

              <div className={styles.fieldGroup}>
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className={styles.label}>
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-[11px] font-semibold text-amber-400 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                  className={styles.input}
                  {...register('password')}
                />
                {errors.password ? (
                  <span className="text-[11px] text-rose-400">{errors.password.message}</span>
                ) : null}
              </div>

              <Button
                type="submit"
                variant="gold"
                size="md"
                isLoading={isSubmitting}
                className="mt-1 w-full"
              >
                Sign In
              </Button>
            </form>

            <p className={styles.footerPrompt}>
              New investor?{' '}
              <Link href="/register" className="font-bold text-amber-400 hover:underline">
                Create an Account
              </Link>
            </p>
          </AuroraBackground>
        </StarBorder>
      </div>
    </div>
  );
}
