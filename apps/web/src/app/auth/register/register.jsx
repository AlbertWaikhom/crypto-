'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, Check, CheckCircle2, Eye, EyeOff, Loader2, Minus } from 'lucide-react';
import { BRAND_CONFIG } from '@navrix/config';
import { apiRequest, ClientApiError } from '../../../lib/api';
import { useToast } from '../../../components/ToastProvider';
import { AuthSplitLayout } from '../components/AuthSplitLayout';
import { OtpVerifyCard } from '../components/OtpVerifyCard';
import {
  GoogleAccountChooserModal,
  GoogleLogoSvg,
  useGoogleAccountAuth,
} from '../components/GoogleAccountChooserModal';
import { completeAuthSession, evaluatePasswordStrength } from '../components/auth-helpers';
import styles from '../components/auth-suite.module.css';

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  // Steps: 'FORM' -> 'VERIFY_OTP'
  const [step, setStep] = React.useState('FORM');

  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState(searchParams.get('email') || '');
  const [password, setPassword] = React.useState('');
  const [country, setCountry] = React.useState('');
  const [acceptTerms, setAcceptTerms] = React.useState(true);
  const [showPassword, setShowPassword] = React.useState(false);

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState(null);
  const [otpError, setOtpError] = React.useState(null);
  const [autoFillOtp, setAutoFillOtp] = React.useState('');

  // Real-time DB check if email already exists in `users` table
  const [emailStatus, setEmailStatus] = React.useState({
    state: 'idle', // 'idle' | 'checking' | 'exists' | 'available'
    data: null,
  });
  const notifiedExistingEmailRef = React.useRef('');

  const { triggerGoogleLogin, isGoogleBusy, chooserOpen, setChooserOpen } = useGoogleAccountAuth({
    toast,
    onSuccess: (authData) => {
      completeAuthSession({
        accessToken: authData.accessToken,
        user: authData.user,
        router,
        toast,
        welcomeTitle: authData.isNewUser
          ? 'Account Created via Google'
          : 'Signed in with Existing Google Account',
      });
    },
  });

  const routerRef = React.useRef(router);
  const toastRef = React.useRef(toast);
  routerRef.current = router;
  toastRef.current = toast;

  React.useEffect(() => {
    const clean = email.trim().toLowerCase();
    if (!clean || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      setEmailStatus({ state: 'idle', data: null });
      return undefined;
    }

    let active = true;
    setEmailStatus((prev) => ({ ...prev, state: 'checking' }));
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
          setEmailStatus({ state: 'exists', data: { ...res, email: clean } });
          if (notifiedExistingEmailRef.current !== clean) {
            notifiedExistingEmailRef.current = clean;
            toastRef.current.warning(
              'Email Already Exists in Database',
              `"${clean}" is already registered. Sign in or reset your password.`,
              {
                code: 'EMAIL_EXISTS',
                action: {
                  label: 'Sign in instead →',
                  onClick: () =>
                    routerRef.current.push(`/login?email=${encodeURIComponent(clean)}`),
                },
              },
            );
          }
        } else {
          setEmailStatus({ state: 'available', data: null });
        }
      } catch {
        if (active) setEmailStatus({ state: 'idle', data: null });
      }
    }, 380);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [email]);

  const { rules, score, color } = evaluatePasswordStrength(password);
  const meetsPasswordPolicy =
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password);

  const handleManualRegister = async (e) => {
    e.preventDefault();
    setFormError(null);

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (cleanName.length < 2) {
      const msg = 'Please enter your full name (at least 2 characters).';
      setFormError(msg);
      toast.error('Name Required', msg);
      return;
    }
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      const msg = 'Please enter a valid email address.';
      setFormError(msg);
      toast.error('Invalid Email', msg);
      return;
    }
    if (emailStatus.state === 'exists') {
      const msg = `An account with "${cleanEmail}" already exists in our database. Please sign in instead.`;
      setFormError(msg);
      toast.warning('Account Already Exists', msg, {
        code: 'EMAIL_ALREADY_REGISTERED',
        action: {
          label: 'Go to Sign in →',
          onClick: () => router.push(`/login?email=${encodeURIComponent(cleanEmail)}`),
        },
      });
      return;
    }
    if (!meetsPasswordPolicy) {
      const msg =
        'Password must be at least 8 characters and include uppercase, lowercase, and a number.';
      setFormError(msg);
      toast.error('Weak Password', msg);
      return;
    }
    if (!acceptTerms) {
      const msg = 'Please accept the Terms of Service & Risk Disclosure.';
      setFormError(msg);
      toast.error('Terms Required', msg);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiRequest(
        '/auth/register',
        {
          method: 'POST',
          body: JSON.stringify({
            name: cleanName,
            email: cleanEmail,
            password,
            country: country.trim() || undefined,
            acceptTerms: true,
          }),
        },
        false,
      );

      setOtpError(null);
      setAutoFillOtp('');
      setStep('VERIFY_OTP');
      toast.success(
        'Account Created — Verify 6-Digit OTP',
        `We sent a 6-digit verification code to ${cleanEmail}.`,
      );
      if (res?.otpPreview) {
        toast.otpPreview(cleanEmail, res.otpPreview, (code) => setAutoFillOtp(code));
      }
    } catch (err) {
      if (err instanceof ClientApiError) {
        setFormError(err.message);
        toast.error(
          err.code === 'EMAIL_ALREADY_REGISTERED'
            ? 'Email Already Registered'
            : 'Registration Failed',
          err.message,
          {
            code: err.code,
            action:
              err.code === 'EMAIL_ALREADY_REGISTERED'
                ? {
                    label: 'Sign in instead →',
                    onClick: () => router.push(`/login?email=${encodeURIComponent(cleanEmail)}`),
                  }
                : null,
          },
        );
      } else {
        const fallback = 'Unable to create account right now. Please try again.';
        setFormError(fallback);
        toast.error('Registration Error', fallback);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyRegistrationOtp = async (otpCode) => {
    setOtpError(null);
    setIsSubmitting(true);
    const cleanEmail = email.trim().toLowerCase();
    try {
      const res = await apiRequest(
        '/auth/verify-otp',
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
        welcomeTitle: 'Account Verified & USDT Vault Active',
      });
    } catch (err) {
      const msg = err instanceof ClientApiError ? err.message : 'Invalid or expired 6-digit code.';
      setOtpError(msg);
      toast.error('Verification Failed', msg, {
        code: err instanceof ClientApiError ? err.code : null,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendRegistrationOtp = async () => {
    const cleanEmail = email.trim().toLowerCase();
    try {
      const res = await apiRequest(
        '/auth/resend-otp',
        {
          method: 'POST',
          body: JSON.stringify({ email: cleanEmail, purpose: 'VERIFY_EMAIL' }),
        },
        false,
      );
      setOtpError(null);
      toast.success('Verification Code Resent', `Sent a fresh 6-digit code to ${cleanEmail}.`);
      if (res?.otpPreview) {
        toast.otpPreview(cleanEmail, res.otpPreview, (code) => setAutoFillOtp(code));
      }
    } catch (err) {
      toast.error(
        'Resend Failed',
        err instanceof ClientApiError ? err.message : 'Could not resend code.',
      );
    }
  };

  if (step === 'VERIFY_OTP') {
    return (
      <AuthSplitLayout mode="solo">
        <OtpVerifyCard
          title="Verify it is you"
          email={email.trim().toLowerCase()}
          submitLabel="Verify account & continue"
          secondaryLabel="Edit email address"
          onSecondaryAction={() => {
            setStep('FORM');
            setOtpError(null);
          }}
          backLabel="Back to sign in"
          onBack={() => router.push('/login')}
          onVerify={handleVerifyRegistrationOtp}
          onResend={handleResendRegistrationOtp}
          isSubmitting={isSubmitting}
          externalCode={autoFillOtp}
          errorMessage={otpError}
        />
      </AuthSplitLayout>
    );
  }

  return (
    <>
      <AuthSplitLayout
        mode="split"
        matchedAccount={emailStatus.state === 'exists' ? emailStatus.data : null}
        footer={
          <span>
            Already have a {BRAND_CONFIG.name} account?{' '}
            <Link
              href={email.trim() ? `/login?email=${encodeURIComponent(email.trim())}` : '/login'}
              className={styles.footerLink}
            >
              Sign in
            </Link>
          </span>
        }
      >
        <form onSubmit={handleManualRegister} noValidate>
          <h1 className={styles.headingTitle}>Create an account</h1>
          <p className={styles.headingSub}>
            Open your verified BEP-20 USDT vault in under a minute.
          </p>

          <div className={`${styles.fieldGroup} mt-5`}>
            <div className={styles.fieldLabelRow}>
              <label htmlFor="nv-reg-name" className={styles.fieldLabel}>
                Full name
              </label>
            </div>
            <input
              id="nv-reg-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setFormError(null);
              }}
              placeholder="Dana Whitfield"
              autoComplete="name"
              className={styles.textInput}
            />
          </div>

          <div className={styles.fieldGroup}>
            <div className={styles.fieldLabelRow}>
              <label htmlFor="nv-reg-email" className={styles.fieldLabel}>
                Email address
              </label>
              {emailStatus.state === 'available' ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" />
                  Available
                </span>
              ) : emailStatus.state === 'checking' ? (
                <span className="text-[11px] text-slate-400">Checking DB...</span>
              ) : null}
            </div>
            <input
              id="nv-reg-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setFormError(null);
              }}
              placeholder="you@domain.com"
              autoComplete="email"
              className={`${styles.textInput} ${
                emailStatus.state === 'exists'
                  ? styles.textInputError
                  : emailStatus.state === 'available'
                    ? styles.textInputSuccess
                    : ''
              }`}
            />

            {emailStatus.state === 'exists' ? (
              <div className="mt-2 rounded-xl border border-amber-400/45 bg-amber-400/10 p-2.5 text-xs text-amber-100">
                <div className="flex items-center gap-1.5 font-bold text-amber-300">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>Email already exists in our database</span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px]">
                  <Link
                    href={`/login?email=${encodeURIComponent(email.trim())}`}
                    className="font-bold text-white underline"
                  >
                    Sign in to this account →
                  </Link>
                  <Link
                    href={`/forgot-password?email=${encodeURIComponent(email.trim())}`}
                    className="text-amber-200 underline"
                  >
                    Reset password
                  </Link>
                </div>
              </div>
            ) : null}
          </div>

          <div className={styles.fieldGroup}>
            <div className={styles.fieldLabelRow}>
              <label htmlFor="nv-reg-password" className={styles.fieldLabel}>
                Password
              </label>
              <span className="text-[11px] text-slate-400">Country (optional)</span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1.45fr_0.85fr]">
              <div className={styles.inputWrap}>
                <input
                  id="nv-reg-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setFormError(null);
                  }}
                  placeholder="Create password"
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

              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Country"
                autoComplete="country-name"
                className={styles.textInput}
              />
            </div>

            {/* 4-segment strength bar + compact rules */}
            <div className={styles.strengthSegments} aria-hidden="true">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={styles.strengthSeg}
                  style={{
                    backgroundColor:
                      password.length > 0 && idx < score ? color : 'rgba(148, 163, 184, 0.2)',
                  }}
                />
              ))}
            </div>
            <div className={styles.rulesGrid}>
              {rules.map((r) => (
                <div key={r.id} className={`${styles.ruleItem} ${r.met ? styles.ruleItemMet : ''}`}>
                  {r.met ? (
                    <Check className="h-3 w-3 shrink-0 text-emerald-400" />
                  ) : (
                    <Minus className="h-3 w-3 shrink-0 text-slate-600" />
                  )}
                  <span>{r.label}</span>
                </div>
              ))}
            </div>
          </div>

          <label className="mb-3.5 flex cursor-pointer items-start gap-2.5 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-900 accent-white"
            />
            <span>
              I agree to the{' '}
              <Link href="/terms-conditions" className="font-semibold text-white underline">
                Terms
              </Link>{' '}
              &amp;{' '}
              <Link href="/risk-disclosure" className="font-semibold text-white underline">
                Risk Disclosure
              </Link>
              .
            </span>
          </label>

          {formError ? (
            <div className="mb-3.5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-200">
              {formError}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting || emailStatus.state === 'exists'}
            className={styles.primaryWhiteBtn}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Sending 6-digit verification OTP...</span>
              </>
            ) : (
              <span>Create account &amp; send OTP</span>
            )}
          </button>

          <div className={styles.dividerRow}>Or continue with</div>

          <button
            type="button"
            disabled={isGoogleBusy}
            onClick={triggerGoogleLogin}
            className={`${styles.socialBtn} w-full`}
          >
            {isGoogleBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <GoogleLogoSvg className="h-4 w-4" />
            )}
            <span>Continue with Google Account</span>
          </button>
        </form>
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
