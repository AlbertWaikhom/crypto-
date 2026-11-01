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
import { RegisterInput, registerSchema } from '@navrix/validation';
import { apiRequest, ClientApiError } from '../../lib/api';
import { useUiStore } from '../../store/ui-store';
import styles from './register.module.css';

export default function RegisterPage() {
  const router = useRouter();
  const setSession = useUiStore((s) => s.setSession);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      acceptTerms: true,
    },
  });

  const onSubmit = async (values: RegisterInput) => {
    setServerError(null);
    try {
      const res = await apiRequest<{
        accessToken: string;
        user: PublicUserDto;
      }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(values),
      });
      setSession(res.accessToken, res.user);
      router.push('/dashboard');
    } catch (err) {
      setServerError(
        err instanceof ClientApiError
          ? err.message
          : 'Registration failed. Please check your details.',
      );
    }
  };

  const handleGoogleSignUp = async () => {
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
          : 'Google sign-up failed.',
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className={styles.authWrap}>
      <div className={styles.authCard}>
        <div className="mb-5 flex flex-col items-center text-center">
          <Link href="/">
            <Image
              src="/brand/logo-mark.png"
              alt={BRAND_CONFIG.name}
              width={52}
              height={52}
              priority
            />
          </Link>
          <h1 className="mt-2.5 text-2xl font-extrabold">
            Create Your {BRAND_CONFIG.name} Account
          </h1>
          <p className="mt-1 text-xs opacity-70">
            Receive a dedicated USR-xxxxxx identifier and immutable USDT ledger
          </p>
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
          onClick={handleGoogleSignUp}
          disabled={googleLoading || isSubmitting}
          className={styles.googleBtn}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#EA4335"
              d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.1 14.6 2 12 2 6.5 2 2 6.5 2 12s4.5 10 10 10c5.8 0 9.6-4.1 9.6-9.8 0-.7-.1-1.2-.2-1.8H12z"
            />
          </svg>
          {googleLoading ? 'Connecting Google...' : 'Sign up with Google'}
        </button>

        <div className={styles.divider}>or register with email</div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className={styles.fieldGroup}>
            <label htmlFor="name" className={styles.label}>
              Full Legal Name
            </label>
            <input
              id="name"
              type="text"
              placeholder="Alice Mercer"
              className={styles.input}
              {...register('name')}
            />
            {errors.name ? (
              <span className="text-xs text-rose-400">
                {errors.name.message}
              </span>
            ) : null}
          </div>

          <div className={styles.gridTwo}>
            <div className={styles.fieldGroup}>
              <label htmlFor="email" className={styles.label}>
                Email Address
              </label>
              <input
                id="email"
                type="email"
                placeholder="alice@example.com"
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
              <label htmlFor="phone" className={styles.label}>
                Phone (Optional)
              </label>
              <input
                id="phone"
                type="tel"
                placeholder="+1 555 010 9900"
                className={styles.input}
                {...register('phone')}
              />
              {errors.phone ? (
                <span className="text-xs text-rose-400">
                  {errors.phone.message}
                </span>
              ) : null}
            </div>
          </div>

          <div className={styles.gridTwo}>
            <div className={styles.fieldGroup}>
              <label htmlFor="password" className={styles.label}>
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="Min 8 chars, Upper+Num"
                className={styles.input}
                {...register('password')}
              />
              {errors.password ? (
                <span className="text-xs text-rose-400">
                  {errors.password.message}
                </span>
              ) : null}
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="country" className={styles.label}>
                Country / Jurisdiction
              </label>
              <input
                id="country"
                type="text"
                placeholder="United States"
                className={styles.input}
                {...register('country')}
              />
            </div>
          </div>

          <label className="mt-1 mb-4 flex items-start gap-2.5 text-xs opacity-85 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5 rounded border-slate-600 accent-amber-500"
              {...register('acceptTerms')}
            />
            <span>
              I accept the Terms of Service, Privacy Policy, and Digital Asset
              Risk Disclosure.
            </span>
          </label>
          {errors.acceptTerms ? (
            <p className="mb-3 text-xs text-rose-400">
              {errors.acceptTerms.message}
            </p>
          ) : null}

          <Button
            type="submit"
            variant="gold"
            size="lg"
            isLoading={isSubmitting}
            className="w-full"
          >
            Create Account
          </Button>
        </form>

        <p className="mt-5 text-center text-xs opacity-75">
          Already registered?{' '}
          <Link
            href="/login"
            className="font-semibold text-amber-400 hover:underline"
          >
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}

