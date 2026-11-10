'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Fingerprint, Loader2, Mail } from 'lucide-react';
import { BRAND_CONFIG } from '@navrix/config';
import { apiRequest, ClientApiError } from '../../../lib/api';
import { useToast } from '../../../components/ToastProvider';
import { AuthSplitLayout } from '../components/AuthSplitLayout';
import { OtpVerifyCard } from '../components/OtpVerifyCard';
import { PasskeyView } from '../components/PasskeyView';
import {
  GoogleAccountChooserModal,
  GoogleLogoSvg,
  useGoogleAccountAuth,
} from '../components/GoogleAccountChooserModal';
import { completeAuthSession } from '../components/auth-helpers';
import styles from '../components/auth-suite.module.css';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  // Views: 'PASSWORD' | 'EMAIL_OTP_REQUEST' | 'OTP_VERIFY' | 'PASSKEY'
  const [view, setView] = React.useState('PASSWORD');
  const [otpPurpose, setOtpPurpose] = React.useState('VERIFY_EMAIL'); // 'VERIFY_EMAIL' | 'LOGIN_OTP'

  const [email, setEmail] = React.useState(searchParams.get('email') || '');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState(null);
  const [otpError, setOtpError] = React.useState(null);
  const [autoFillOtp, setAutoFillOtp] = React.useState('');

  // Live DB email existence state
  const [emailCheck, setEmailCheck] = React.useState({
    status: 'idle', // 'idle' | 'checking' | 'found' | 'not_found'
    data: null,
  });

  const { triggerGoogleLogin, isGoogleBusy, chooserOpen, setChooserOpen } = useGoogleAccountAuth({
    toast,
    onSuccess: (authData) => {
      completeAuthSession({
        accessToken: authData.accessToken,
        user: authData.user,
        router,
        toast,
        welcomeTitle: authData.isNewUser
          ? 'Google Account Linked & Vault Created'
          : 'Signed in with Google',
      });
    },
  });

  // Debounced live DB email check against `users` table
  React.useEffect(() => {
    const clean = email.trim().toLowerCase();
    if (!clean || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      setEmailCheck({ status: 'idle', data: null });
      return undefined;
    }

    let active = true;
    setEmailCheck((prev) => ({ ...prev, status: 'checking' }));
    const timer = setTimeout(async () => {
      try {
        const res = await apiRequest(
          '/auth/check-email',
          {
            method: 'POST',
            body: JSON.stringify({ email: clean }),
          },
          false,
        );
        if (!active) return;
        if (res?.exists) {
          setEmailCheck({
            status: 'found',
            data: { ...res, email: clean },
          });
        } else {
          setEmailCheck({ status: 'not_found', data: null });
        }
      } catch {
        if (active) setEmailCheck({ status: 'idle', data: null });
      }
    }, 380);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [email]);

  const handlePasswordSignIn = async (e) => {
    e.preventDefault();
    setFormError(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      const msg = 'Please enter a valid email address.';
      setFormError(msg);
      toast.error('Invalid Email', msg);
      return;
    }
    if (!password) {
      const msg = 'Please enter your account password.';
      setFormError(msg);
      toast.error('Password Required', msg);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiRequest(
        '/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ email: cleanEmail, password }),
        },
        false,
      );

      // Unverified manual account -> transition seamlessly to 6-digit OTP screen
      if (res?.requiresVerification) {
        setOtpPurpose('VERIFY_EMAIL');
        setOtpError(null);
        setAutoFillOtp('');
        setView('OTP_VERIFY');
        toast.info(
          'Email Verification Required',
          `We sent a 6-digit verification code to ${cleanEmail}.`,
        );
        if (res.otpPreview) {
          toast.otpPreview(cleanEmail, res.otpPreview, (code) => setAutoFillOtp(code));
        }
        return;
      }

      completeAuthSession({
        accessToken: res.accessToken,
        user: res.user,
        router,
        toast,
        welcomeTitle: 'Signed in successfully',
      });
    } catch (err) {
      if (err instanceof ClientApiError) {
        setFormError(err.message);
        if (err.code === 'EMAIL_NOT_REGISTERED') {
          toast.error('Email Not Registered', err.message, {
            code: err.code,
            action: {
              label: 'Create an account →',
              onClick: () => router.push(`/register?email=${encodeURIComponent(cleanEmail)}`),
            },
          });
        } else if (err.code === 'PASSWORD_MISMATCH') {
          toast.error('Password Does Not Match', err.message, {
            code: err.code,
            action: {
              label: 'Forgot password?',
              onClick: () =>
                router.push(`/forgot-password?email=${encodeURIComponent(cleanEmail)}`),
            },
          });
        } else if (err.code === 'GOOGLE_ACCOUNT_ONLY') {
          toast.warning('Google Account Detected', err.message, {
            code: err.code,
            action: {
              label: 'Continue with Google',
              onClick: () => triggerGoogleLogin(),
            },
          });
        } else {
          toast.error('Sign-In Failed', err.message, { code: err.code });
        }
      } else {
        const fallback = 'Unable to reach authentication service. Please retry.';
        setFormError(fallback);
        toast.error('Connection Error', fallback);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestEmailOtp = async (e) => {
    if (e) e.preventDefault();
    setFormError(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setView('EMAIL_OTP_REQUEST');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiRequest(
        '/auth/send-login-otp',
        {
          method: 'POST',
          body: JSON.stringify({ email: cleanEmail }),
        },
        false,
      );
      setOtpPurpose('LOGIN_OTP');
      setOtpError(null);
      setAutoFillOtp('');
      setView('OTP_VERIFY');
      toast.success(
        '6-Digit Sign-In Code Sent',
        `Check ${cleanEmail} for your one-time sign-in code.`,
      );
      if (res?.otpPreview) {
        toast.otpPreview(cleanEmail, res.otpPreview, (code) => setAutoFillOtp(code));
      }
    } catch (err) {
      const msg =
        err instanceof ClientApiError ? err.message : 'Could not send 6-digit sign-in code.';
      setFormError(msg);
      toast.error('Could Not Send OTP', msg, {
        code: err instanceof ClientApiError ? err.code : null,
        action:
          err instanceof ClientApiError && err.code === 'EMAIL_NOT_REGISTERED'
            ? {
                label: 'Create an account →',
                onClick: () => router.push(`/register?email=${encodeURIComponent(cleanEmail)}`),
              }
            : null,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (otpCode) => {
    setOtpError(null);
    setIsSubmitting(true);
    const cleanEmail = email.trim().toLowerCase();
    const endpoint = otpPurpose === 'LOGIN_OTP' ? '/auth/verify-login-otp' : '/auth/verify-otp';

    try {
      const res = await apiRequest(
        endpoint,
        {
          method: 'POST',
          body: JSON.stringify({ email: cleanEmail, otp: otpCode }),
        },
        false,
      );
      completeAuthSession({
        accessToken: res.accessToken,
        user: res.user,
        router,
        toast,
        welcomeTitle:
          otpPurpose === 'VERIFY_EMAIL'
            ? 'Email Verified & Signed In'
            : 'Signed in via 6-Digit Code',
      });
    } catch (err) {
      const msg =
        err instanceof ClientApiError ? err.message : 'Invalid or expired verification code.';
      setOtpError(msg);
      toast.error('OTP Verification Failed', msg, {
        code: err instanceof ClientApiError ? err.code : null,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    const cleanEmail = email.trim().toLowerCase();
    try {
      const res = await apiRequest(
        '/auth/resend-otp',
        {
          method: 'POST',
          body: JSON.stringify({
            email: cleanEmail,
            purpose: otpPurpose,
          }),
        },
        false,
      );
      setOtpError(null);
      toast.success('New 6-Digit Code Sent', `Sent a fresh code to ${cleanEmail}.`);
      if (res?.otpPreview) {
        toast.otpPreview(cleanEmail, res.otpPreview, (code) => setAutoFillOtp(code));
      }
    } catch (err) {
      const msg = err instanceof ClientApiError ? err.message : 'Unable to resend code right now.';
      toast.error('Resend Failed', msg);
    }
  };

  // Solo Views (Image 2 OTP Verify & Image 4 Passkey)
  if (view === 'OTP_VERIFY') {
    return (
      <>
        <AuthSplitLayout mode="solo">
          <OtpVerifyCard
            title="Verify it is you"
            email={email.trim().toLowerCase()}
            submitLabel="Verify and continue"
            secondaryLabel="Use password instead"
            onSecondaryAction={() => {
              setView('PASSWORD');
              setOtpError(null);
            }}
            backLabel="Back to sign in"
            onBack={() => {
              setView('PASSWORD');
              setOtpError(null);
            }}
            onVerify={handleVerifyOtp}
            onResend={handleResendOtp}
            isSubmitting={isSubmitting}
            externalCode={autoFillOtp}
            errorMessage={otpError}
          />
        </AuthSplitLayout>
        <GoogleAccountChooserModal
          open={chooserOpen}
          onClose={() => setChooserOpen(false)}
          toast={toast}
          onSuccess={(authData) =>
            completeAuthSession({
              accessToken: authData.accessToken,
              user: authData.user,
              router,
              toast,
              welcomeTitle: 'Signed in with Google',
            })
          }
        />
      </>
    );
  }

  if (view === 'PASSKEY') {
    return (
      <>
        <AuthSplitLayout mode="solo">
          <PasskeyView
            toast={toast}
            onSwitchToPassword={() => setView('PASSWORD')}
            onSwitchToEmailOtp={() => setView('EMAIL_OTP_REQUEST')}
          />
        </AuthSplitLayout>
        <GoogleAccountChooserModal
          open={chooserOpen}
          onClose={() => setChooserOpen(false)}
          toast={toast}
          onSuccess={(authData) =>
            completeAuthSession({
              accessToken: authData.accessToken,
              user: authData.user,
              router,
              toast,
              welcomeTitle: 'Signed in with Google',
            })
          }
        />
      </>
    );
  }

  // Primary @reactbits-pro/authentication-3 Two-Column Split Layout (Image 1 & Image 5)
  return (
    <>
      <AuthSplitLayout
        mode="split"
        matchedAccount={emailCheck.status === 'found' ? emailCheck.data : null}
        footer={
          <span>
            New to {BRAND_CONFIG.name}?{' '}
            <Link
              href={
                email.trim() ? `/register?email=${encodeURIComponent(email.trim())}` : '/register'
              }
              className={styles.footerLink}
            >
              Create an account
            </Link>
          </span>
        }
      >
        {view === 'EMAIL_OTP_REQUEST' ? (
          <form onSubmit={handleRequestEmailOtp} noValidate>
            <h1 className={styles.headingTitle}>Sign in with email code</h1>
            <p className={styles.headingSub}>
              Enter your registered email and we will send a 6-digit verification code.
            </p>

            <div className={`${styles.fieldGroup} mt-2.5 sm:mt-4`}>
              <div className={styles.fieldLabelRow}>
                <label htmlFor="nv-otp-email" className={styles.fieldLabel}>
                  Email address
                </label>
              </div>
              <input
                id="nv-otp-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFormError(null);
                }}
                placeholder="you@domain.com"
                autoComplete="email"
                autoFocus
                className={styles.textInput}
              />
              {emailCheck.status === 'not_found' ? (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-300">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    Email not registered yet.{' '}
                    <Link
                      href={`/register?email=${encodeURIComponent(email.trim())}`}
                      className="font-semibold underline"
                    >
                      Create an account
                    </Link>
                  </span>
                </p>
              ) : null}
            </div>

            {formError ? (
              <div className="mb-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2.5 text-xs font-medium text-rose-200">
                {formError}
              </div>
            ) : null}

            <button type="submit" disabled={isSubmitting} className={styles.primaryWhiteBtn}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Sending 6-digit code...</span>
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  <span>Send 6-digit code</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setView('PASSWORD');
                setFormError(null);
              }}
              className={`${styles.socialBtn} mt-2.5 w-full`}
            >
              Use a password instead
            </button>
          </form>
        ) : (
          <form onSubmit={handlePasswordSignIn} noValidate>
            <h1 className={styles.headingTitle}>Sign in</h1>
            <p className={styles.headingSub}>Use your {BRAND_CONFIG.name} account to continue.</p>

            <div className={`${styles.fieldGroup} mt-2.5 sm:mt-4`}>
              <div className={styles.fieldLabelRow}>
                <label htmlFor="nv-login-email" className={styles.fieldLabel}>
                  Email address
                </label>
                {emailCheck.status === 'found' ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" />
                    Registered
                  </span>
                ) : null}
              </div>
              <input
                id="nv-login-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFormError(null);
                }}
                placeholder="name@company.com"
                autoComplete="email"
                className={`${styles.textInput} ${
                  emailCheck.status === 'not_found'
                    ? styles.textInputError
                    : emailCheck.status === 'found'
                      ? styles.textInputSuccess
                      : ''
                }`}
              />

              {emailCheck.status === 'not_found' ? (
                <div className="mt-1.5 flex items-center justify-between gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-2.5 py-1.5 text-[11px] text-amber-200">
                  <span>Email is not registered in database.</span>
                  <Link
                    href={`/register?email=${encodeURIComponent(email.trim())}`}
                    className="shrink-0 font-bold text-amber-300 underline"
                  >
                    Create account
                  </Link>
                </div>
              ) : emailCheck.status === 'found' &&
                emailCheck.data?.hasGoogle &&
                !emailCheck.data?.hasPassword ? (
                <div className="mt-1.5 flex items-center justify-between gap-2 rounded-lg border border-sky-400/30 bg-sky-400/10 px-2.5 py-1.5 text-[11px] text-sky-200">
                  <span>Linked with Google Sign-In.</span>
                  <button
                    type="button"
                    onClick={triggerGoogleLogin}
                    className="shrink-0 font-bold text-sky-300 underline"
                  >
                    Use Google
                  </button>
                </div>
              ) : null}
            </div>

            <div className={styles.fieldGroup}>
              <div className={styles.fieldLabelRow}>
                <label htmlFor="nv-login-password" className={styles.fieldLabel}>
                  Password
                </label>
                <Link
                  href={
                    email.trim()
                      ? `/forgot-password?email=${encodeURIComponent(email.trim())}`
                      : '/forgot-password'
                  }
                  className={styles.inlineActionLink}
                >
                  Forgot password?
                </Link>
              </div>

              <div className={styles.inputWrap}>
                <input
                  id="nv-login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setFormError(null);
                  }}
                  placeholder="Enter your password"
                  autoComplete="current-password"
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
            </div>

            {formError ? (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2.5 text-xs font-medium text-rose-200">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-400" />
                <span>{formError}</span>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className={`${styles.primaryWhiteBtn} mt-2`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign in</span>
              )}
            </button>

            <div className={styles.dividerRow}>Or continue with</div>

            <div className={styles.socialGrid3}>
              <button
                type="button"
                disabled={isGoogleBusy}
                onClick={triggerGoogleLogin}
                className={styles.socialBtn}
              >
                {isGoogleBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <GoogleLogoSvg className="h-4 w-4" />
                )}
                <span>Google</span>
              </button>

              <button type="button" onClick={() => setView('PASSKEY')} className={styles.socialBtn}>
                <Fingerprint className="h-4 w-4 text-slate-300" />
                <span>Passkey</span>
              </button>

              <button type="button" onClick={handleRequestEmailOtp} className={styles.socialBtn}>
                <Mail className="h-4 w-4 text-slate-300" />
                <span>Email OTP</span>
              </button>
            </div>
          </form>
        )}
      </AuthSplitLayout>

      <GoogleAccountChooserModal
        open={chooserOpen}
        onClose={() => setChooserOpen(false)}
        toast={toast}
        onSuccess={(authData) =>
          completeAuthSession({
            accessToken: authData.accessToken,
            user: authData.user,
            router,
            toast,
            welcomeTitle: authData.isNewUser
              ? 'Google Account Registered'
              : 'Signed in with Google',
          })
        }
      />
    </>
  );
}
