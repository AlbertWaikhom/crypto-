'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { BRAND_CONFIG } from '@navrix/config';
import { PublicUserDto } from '@navrix/types';
import { Button } from '@navrix/ui';
import { LoginInput, loginSchema } from '@navrix/validation';
import { apiRequest, ClientApiError } from '../../lib/api';
import { useUiStore } from '../../store/ui-store';
import styles from './login.module.css';

export default function LoginPage() {
  const router = useRouter();
  const setSession = useUiStore((s) => s.setSession);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginInput) => {
    setServerError(null);
    try {
      const res = await apiRequest<{
        accessToken: string;
        user: PublicUserDto;
      }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(values),
      });
      setSession(res.accessToken, res.user);
      router.push('/dashboard');
    } catch (err) {
      setServerError(
        err instanceof ClientApiError
          ? err.message
          : 'Unable to sign in. Please verify your credentials.',
      );
    }
  };

  const handleGoogleSignIn = async () => {
    setServerError(null);
    setGoogleLoading(true);
    try {
      const res = await apiRequest<{
        accessToken: string;
        user: PublicUserDto;
      }>('/auth/google', {
        method: 'POST',
        body: JSON.stringify({
          idToken: 'google_oauth_web_client_token',
          email: 'google.investor@navrix.local',
          name: 'Google Verified Investor',
        }),
      });
      setSession(res.accessToken, res.user);
      router.push('/dashboard');
    } catch (err) {
      setServerError(
        err instanceof ClientApiError
          ? err.message
          : 'Google sign-in could not be completed.',
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className={styles.authWrap}>
      <div className={styles.authCard}>
        <div className="mb-6 flex flex-col items-center text-center">
          <Link href="/">
            <Image
              src="/brand/logo-mark.png"
              alt={BRAND_CONFIG.name}
              width={56}
              height={56}
              priority
            />
          </Link>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight">
            Sign in to {BRAND_CONFIG.name}
          </h1>
          <p className="mt-1 text-xs opacity-70">{BRAND_CONFIG.tagline}</p>
        </div>

        {serverError ? (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-300"
          >
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

        <div className={styles.divider}>or continue with email</div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className={styles.fieldGroup}>
            <label htmlFor="email" className={styles.label}>
              Email Address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="investor@example.com"
              className={styles.input}
              {...register('email')}
            />
            {errors.email ? (
              <span className="text-xs text-rose-400">
                {errors.email.message}
              </span>
            ) : null}
          </div>

          <div className={styles.fieldGroup}>
            <div className="flex items-center justify-between">
              <label htmlFor="password" className={styles.label}>
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-amber-400 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••••••"
              className={styles.input}
              {...register('password')}
            />
            {errors.password ? (
              <span className="text-xs text-rose-400">
                {errors.password.message}
              </span>
            ) : null}
          </div>

          <Button
            type="submit"
            variant="gold"
            size="lg"
            isLoading={isSubmitting}
            className="mt-2 w-full"
          >
            Sign In
          </Button>
        </form>

        <p className="mt-6 text-center text-xs opacity-75">
          Don&apos;t have an account?{' '}
          <Link
            href="/register"
            className="font-semibold text-amber-400 hover:underline"
          >
            Create an Investor Account
          </Link>
        </p>
      </div>
    </div>
  );
}

