import * as React from 'react';
import { ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';
import styles from './auth-suite.module.css';

/**
 * Six-digit grouped code entry card matching @reactbits-pro/authentication-6 (Image 2):
 * [ ][ ][ ] — [ ][ ][ ] with full 6-digit clipboard paste auto-fill & resend countdown.
 */
export function OtpVerifyCard({
  title = 'Verify it is you',
  email,
  subtitle = null,
  submitLabel = 'Verify and continue',
  secondaryLabel = null,
  onSecondaryAction = null,
  backLabel = 'Back to sign in',
  onBack,
  onVerify,
  onResend,
  isSubmitting = false,
  externalCode = '',
  errorMessage = null,
}) {
  const [digits, setDigits] = React.useState(['', '', '', '', '', '']);
  const [cooldown, setCooldown] = React.useState(30);
  const [isResending, setIsResending] = React.useState(false);
  const inputRefs = React.useRef([]);

  // Focus first digit box on mount
  React.useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Support external auto-fill from Dev OTP Toast Preview
  React.useEffect(() => {
    const clean = String(externalCode || '')
      .replace(/\D/g, '')
      .slice(0, 6);
    if (clean.length === 6) {
      setDigits(clean.split(''));
      inputRefs.current[5]?.focus();
    }
  }, [externalCode]);

  // Countdown timer for Resend button
  React.useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const codeValue = digits.join('');
  const isComplete = codeValue.length === 6 && /^\d{6}$/.test(codeValue);

  const handleDigitChange = (index, rawVal) => {
    const cleaned = rawVal.replace(/\D/g, '');
    if (!cleaned) {
      const next = [...digits];
      next[index] = '';
      setDigits(next);
      return;
    }

    // Handle multi-char mobile autocomplete or fast paste into single box
    if (cleaned.length > 1) {
      const chars = cleaned.slice(0, 6).split('');
      const next = [...digits];
      chars.forEach((ch, offset) => {
        if (index + offset < 6) {
          next[index + offset] = ch;
        }
      });
      setDigits(next);
      const focusIdx = Math.min(5, index + chars.length);
      inputRefs.current[focusIdx]?.focus();
      return;
    }

    const next = [...digits];
    next[index] = cleaned[0];
    setDigits(next);
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        const next = [...digits];
        next[index] = '';
        setDigits(next);
      } else if (index > 0) {
        const next = [...digits];
        next[index - 1] = '';
        setDigits(next);
        inputRefs.current[index - 1]?.focus();
      }
      e.preventDefault();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
      e.preventDefault();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
      e.preventDefault();
    } else if (e.key === 'Enter' && isComplete && !isSubmitting) {
      e.preventDefault();
      onVerify(codeValue);
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = (e.clipboardData?.getData('text') || '').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const next = ['', '', '', '', '', ''];
    pasted.split('').forEach((ch, idx) => {
      next[idx] = ch;
    });
    setDigits(next);
    const focusIdx = Math.min(5, pasted.length - 1);
    inputRefs.current[Math.max(0, focusIdx)]?.focus();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isComplete || isSubmitting) return;
    onVerify(codeValue);
  };

  const handleResendClick = async () => {
    if (cooldown > 0 || isResending || !onResend) return;
    setIsResending(true);
    try {
      await onResend();
      setDigits(['', '', '', '', '', '']);
      setCooldown(30);
      inputRefs.current[0]?.focus();
    } finally {
      setIsResending(false);
    }
  };

  const formattedCooldown = `0:${String(cooldown).padStart(2, '0')}`;

  return (
    <div>
      <form onSubmit={handleSubmit} className={styles.soloCard} noValidate>
        <div className={styles.soloIconBadge}>
          <ShieldCheck className="h-5 w-5" />
        </div>

        <h1 className={styles.headingTitle}>{title}</h1>
        <p className={styles.headingSub}>
          {subtitle || (
            <>
              We sent a six-digit code to{' '}
              <span className="font-semibold text-slate-200">{email}</span>.
            </>
          )}
        </p>

        {/* [ ][ ][ ] — [ ][ ][ ] Grouped 6-Digit Inputs */}
        <div className={styles.otpContainer} onPaste={handlePaste}>
          <div className={styles.otpGroup}>
            {[0, 1, 2].map((idx) => (
              <input
                key={idx}
                ref={(el) => {
                  inputRefs.current[idx] = el;
                }}
                type="text"
                inputMode="numeric"
                autoComplete={idx === 0 ? 'one-time-code' : 'off'}
                maxLength={6}
                aria-label={`Digit ${idx + 1}`}
                value={digits[idx]}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className={`${styles.otpDigitBox} ${
                  digits[idx] ? styles.otpDigitFilled : ''
                } ${errorMessage ? styles.textInputError : ''}`}
              />
            ))}
          </div>

          <span className={styles.otpDash} aria-hidden="true">
            &ndash;
          </span>

          <div className={styles.otpGroup}>
            {[3, 4, 5].map((idx) => (
              <input
                key={idx}
                ref={(el) => {
                  inputRefs.current[idx] = el;
                }}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                maxLength={6}
                aria-label={`Digit ${idx + 1}`}
                value={digits[idx]}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className={`${styles.otpDigitBox} ${
                  digits[idx] ? styles.otpDigitFilled : ''
                } ${errorMessage ? styles.textInputError : ''}`}
              />
            ))}
          </div>
        </div>

        <p className="mb-4 text-xs text-slate-400">Paste the whole code and it fills every box.</p>

        {errorMessage ? (
          <div className="mb-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2.5 text-xs font-medium text-rose-200">
            {errorMessage}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={!isComplete || isSubmitting}
          className={styles.primaryWhiteBtn}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Verifying code...</span>
            </>
          ) : (
            <span>{submitLabel}</span>
          )}
        </button>

        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={cooldown > 0 || isResending}
            onClick={handleResendClick}
            className="rounded-lg border border-slate-700/70 bg-slate-900/70 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-amber-400/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isResending
              ? 'Sending...'
              : cooldown > 0
                ? `Resend in ${formattedCooldown}`
                : 'Resend 6-digit code'}
          </button>

          {secondaryLabel && onSecondaryAction ? (
            <button
              type="button"
              onClick={onSecondaryAction}
              className="border-none bg-transparent text-xs font-semibold text-slate-200 underline underline-offset-4 transition hover:text-amber-400"
            >
              {secondaryLabel}
            </button>
          ) : null}
        </div>
      </form>

      {onBack ? (
        <div className={styles.backBelowCard}>
          <button type="button" onClick={onBack} className={styles.backLinkBtn}>
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{backLabel}</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
