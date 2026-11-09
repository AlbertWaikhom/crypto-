'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, ArrowLeft, CheckCircle2, KeyRound, Loader2, Mail } from 'lucide-react';
import { apiRequest, ClientApiError } from '../../../lib/api';
import { useToast } from '../../../components/ToastProvider';
import { AuthSplitLayout } from '../components/AuthSplitLayout';
import { OtpVerifyCard } from '../components/OtpVerifyCard';
import { SetNewPasswordCard } from '../components/SetNewPasswordCard';
import { completeAuthSession } from '../components/auth-helpers';
import styles from '../components/auth-suite.module.css';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  // 3-Step Flow: 'REQUEST' -> 'VERIFY_OTP' (Image 2) -> 'NEW_PASSWORD' (Image 3)
  const [step, setStep] = React.useState('REQUEST');
  const [email, setEmail] = React.useState(searchParams.get('email') || '');
  const [verifiedOtp, setVerifiedOtp] = React.useState('');
  const [devices, setDevices] = React.useState([]);

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState(null);
  const [autoFillOtp, setAutoFillOtp] = React.useState('');

  // Live DB email existence check against `users` table
  const [emailLookup, setEmailLookup] = React.useState({
    state: 'idle', // 'idle' | 'checking' | 'found' | 'not_found'
    data: null,
  });

  React.useEffect(() => {
    const clean = email.trim().toLowerCase();
    if (!clean || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      setEmailLookup({ state: 'idle', data: null });
      return undefined;
    }

    let active = true;
    setEmailLookup({ state: 'checking', data: null });
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
        setEmailLookup({
          state: res?.exists ? 'found' : 'not_found',
          data: res?.exists ? { ...res, email: clean } : null,
        });
      } catch {
        if (active) setEmailLookup({ state: 'idle', data: null });
      }
    }, 380);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [email]);

  const handleSendRecoveryOtp = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      const msg = 'Please enter a valid registered email address.';
      setErrorMessage(msg);
      toast.error('Invalid Email', msg);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiRequest(
        '/auth/forgot-password',
        {
          method: 'POST',
          body: JSON.stringify({ email: cleanEmail }),
        },
        false,
      );

      setAutoFillOtp('');
      setErrorMessage(null);
      setStep('VERIFY_OTP');
      toast.success(
        '6-Digit Recovery Code Sent',
        `We dispatched a password reset OTP to ${cleanEmail}.`,
      );
      if (res?.otpPreview) {
        toast.otpPreview(cleanEmail, res.otpPreview, (code) => setAutoFillOtp(code));
      }
    } catch (err) {
      const msg =
        err instanceof ClientApiError ? err.message : 'Unable to send recovery code right now.';
      setErrorMessage(msg);
      toast.error(
        err instanceof ClientApiError && err.code === 'EMAIL_NOT_REGISTERED'
          ? 'Email Not Registered'
          : 'Recovery Request Failed',
        msg,
        {
          code: err instanceof ClientApiError ? err.code : null,
          action:
            err instanceof ClientApiError && err.code === 'EMAIL_NOT_REGISTERED'
              ? {
                  label: 'Create an account →',
                  onClick: () => router.push(`/register?email=${encodeURIComponent(cleanEmail)}`),
                }
              : null,
        },
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyResetOtp = async (otpCode) => {
    setErrorMessage(null);
    setIsSubmitting(true);
    const cleanEmail = email.trim().toLowerCase();

    try {
      const res = await apiRequest(
        '/auth/verify-reset-otp',
        {
          method: 'POST',
          body: JSON.stringify({ email: cleanEmail, otp: otpCode }),
        },
        false,
      );
      setVerifiedOtp(otpCode);
      setDevices(res?.devices || []);
      setStep('NEW_PASSWORD');
      toast.success('Recovery Code Verified', 'Choose your new account password below.');
    } catch (err) {
      const msg =
        err instanceof ClientApiError ? err.message : 'Invalid or expired 6-digit recovery code.';
      setErrorMessage(msg);
      toast.error('Invalid Recovery Code', msg, {
        code: err instanceof ClientApiError ? err.code : null,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendResetOtp = async () => {
    const cleanEmail = email.trim().toLowerCase();
    try {
      const res = await apiRequest(
        '/auth/resend-otp',
        {
          method: 'POST',
          body: JSON.stringify({ email: cleanEmail, purpose: 'RESET_PASSWORD' }),
        },
        false,
      );
      setErrorMessage(null);
      toast.success('New Recovery Code Sent', `Sent a fresh 6-digit code to ${cleanEmail}.`);
      if (res?.otpPreview) {
        toast.otpPreview(cleanEmail, res.otpPreview, (code) => setAutoFillOtp(code));
      }
    } catch (err) {
      toast.error(
        'Resend Failed',
        err instanceof ClientApiError ? err.message : 'Unable to resend code.',
      );
    }
  };

  const handleSetNewPassword = async ({ newPassword, signOutOtherDevices }) => {
    setErrorMessage(null);
    setIsSubmitting(true);
    const cleanEmail = email.trim().toLowerCase();

    try {
      const res = await apiRequest(
        '/auth/reset-password',
        {
          method: 'POST',
          body: JSON.stringify({
            email: cleanEmail,
            otp: verifiedOtp,
            newPassword,
            signOutOtherDevices,
          }),
        },
        false,
      );

      completeAuthSession({
        accessToken: res.accessToken,
        user: res.user,
        router,
        toast,
        welcomeTitle: 'Password Updated Successfully',
        welcomeMessage: signOutOtherDevices
          ? 'Your password was updated and all other sessions were signed out.'
          : 'Your password was updated and your session is active.',
      });
    } catch (err) {
      const msg =
        err instanceof ClientApiError ? err.message : 'Could not update password. Please retry.';
      setErrorMessage(msg);
      toast.error('Password Update Failed', msg, {
        code: err instanceof ClientApiError ? err.code : null,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === 'VERIFY_OTP') {
    return (
      <AuthSplitLayout mode="solo">
        <OtpVerifyCard
          title="Verify it is you"
          email={email.trim().toLowerCase()}
          submitLabel="Verify and continue"
          secondaryLabel="Use another email"
          onSecondaryAction={() => {
            setStep('REQUEST');
            setErrorMessage(null);
          }}
          backLabel="Back to sign in"
          onBack={() => router.push('/login')}
          onVerify={handleVerifyResetOtp}
          onResend={handleResendResetOtp}
          isSubmitting={isSubmitting}
          externalCode={autoFillOtp}
          errorMessage={errorMessage}
        />
      </AuthSplitLayout>
    );
  }

  if (step === 'NEW_PASSWORD') {
    return (
      <AuthSplitLayout mode="solo">
        <SetNewPasswordCard
          email={email.trim().toLowerCase()}
          devices={devices}
          onSubmitNewPassword={handleSetNewPassword}
          onBack={() => router.push('/login')}
          isSubmitting={isSubmitting}
          errorMessage={errorMessage}
        />
      </AuthSplitLayout>
    );
  }

  return (
    <AuthSplitLayout mode="solo">
      <div>
        <form onSubmit={handleSendRecoveryOtp} className={styles.soloCard} noValidate>
          <div className={styles.soloIconBadge}>
            <KeyRound className="h-5 w-5" />
          </div>

          <h1 className={styles.headingTitle}>Reset your password</h1>
          <p className={styles.headingSub}>
            Enter the email registered with your account and we will send a six-digit verification
            code.
          </p>

          <div className={`${styles.fieldGroup} mt-5`}>
            <div className={styles.fieldLabelRow}>
              <label htmlFor="nv-forgot-email" className={styles.fieldLabel}>
                Registered email
              </label>
              {emailLookup.state === 'found' ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" />
                  Account found
                </span>
              ) : emailLookup.state === 'checking' ? (
                <span className="text-[11px] text-slate-400">Checking DB...</span>
              ) : null}
            </div>

            <input
              id="nv-forgot-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrorMessage(null);
              }}
              placeholder="name@company.com"
              autoComplete="email"
              autoFocus
              className={`${styles.textInput} ${
                emailLookup.state === 'not_found'
                  ? styles.textInputError
                  : emailLookup.state === 'found'
                    ? styles.textInputSuccess
                    : ''
              }`}
            />

            {emailLookup.state === 'not_found' ? (
              <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-amber-400/35 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
                <span className="flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-300" />
                  No account registered with this email.
                </span>
                <Link
                  href={`/register?email=${encodeURIComponent(email.trim())}`}
                  className="shrink-0 font-bold text-white underline"
                >
                  Sign up →
                </Link>
              </div>
            ) : null}
          </div>

          {errorMessage ? (
            <div className="mb-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2.5 text-xs font-medium text-rose-200">
              {errorMessage}
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
                <span>Sending 6-digit OTP...</span>
              </>
            ) : (
              <>
                <Mail className="h-4 w-4" />
                <span>Send 6-digit recovery code</span>
              </>
            )}
          </button>
        </form>

        <div className={styles.backBelowCard}>
          <Link href="/login" className={styles.backLinkBtn}>
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to sign in</span>
          </Link>
        </div>
      </div>
    </AuthSplitLayout>
  );
}
