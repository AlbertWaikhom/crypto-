import * as React from 'react';
import {
  Check,
  Fingerprint,
  KeyRound,
  Laptop,
  Loader2,
  Mail,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import styles from './auth-suite.module.css';

/**
 * Matches Image 4 ("Sign in with a passkey"):
 * Device selector, primary "Continue with <device>" WebAuthn trigger,
 * and "Other ways in" (Password, Email OTP).
 */
export function PasskeyView({ onSwitchToPassword, onSwitchToEmailOtp, toast }) {
  const detectedOs = React.useMemo(() => {
    if (typeof navigator === 'undefined') return 'This Workstation';
    const ua = navigator.userAgent || '';
    if (/Windows/i.test(ua)) return 'Windows Hello · This PC';
    if (/Mac/i.test(ua)) return 'MacBook · Touch ID';
    if (/iPhone|iPad/i.test(ua)) return 'iPhone · Face ID';
    if (/Android/i.test(ua)) return 'Android · Biometric Key';
    return 'Platform Authenticator';
  }, []);

  const devices = [
    {
      id: 'platform',
      name: detectedOs,
      meta: 'Hardware TPM · Available now',
      icon: Laptop,
    },
    {
      id: 'mobile',
      name: 'Mobile Passkey via QR',
      meta: 'iOS Face ID / Android Biometrics',
      icon: Smartphone,
    },
    {
      id: 'security-key',
      name: 'Hardware Security Key',
      meta: 'YubiKey / FIDO2 USB-C or NFC',
      icon: KeyRound,
    },
  ];

  const [selectedId, setSelectedId] = React.useState('platform');
  const [busy, setBusy] = React.useState(false);

  const selectedDevice = devices.find((d) => d.id === selectedId) || devices[0];

  const handleContinuePasskey = async () => {
    setBusy(true);
    try {
      if (
        typeof window !== 'undefined' &&
        window.PublicKeyCredential &&
        navigator.credentials?.get
      ) {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);
        await navigator.credentials.get({
          publicKey: {
            challenge,
            timeout: 15000,
            userVerification: 'preferred',
          },
        });
      }
      toast?.info(
        'No Passkey Enrolled Yet',
        'Sign in once with Password, Google, or Email OTP to bind a hardware passkey in Security settings.',
      );
      onSwitchToPassword();
    } catch {
      toast?.info(
        'Passkey Prompt Closed or Not Enrolled',
        'Use Password, Google Account, or 6-Digit Email OTP to sign in, then register your device passkey.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className={styles.soloCard}>
        <div className={styles.soloIconBadge}>
          <Fingerprint className="h-5 w-5" />
        </div>

        <h1 className={styles.headingTitle}>Sign in with a passkey</h1>
        <p className={styles.headingSub}>
          Your device confirms it is you. There is nothing to type and nothing to remember.
        </p>

        <div className="mt-5 space-y-2">
          {devices.map((d) => {
            const Icon = d.icon;
            const active = d.id === selectedId;
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => setSelectedId(d.id)}
                className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-left transition ${
                  active
                    ? 'border-amber-400/50 bg-slate-800/75 text-white'
                    : 'border-transparent bg-slate-900/45 text-slate-300 hover:bg-slate-800/45'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 shrink-0 text-slate-400" />
                  <div>
                    <div className="text-sm font-semibold">{d.name}</div>
                    <div className="text-xs text-slate-400">{d.meta}</div>
                  </div>
                </div>
                {active ? <Check className="h-4 w-4 shrink-0 text-amber-400" /> : null}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={handleContinuePasskey}
          className={`${styles.primaryWhiteBtn} mt-5`}
        >
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Waiting for device...</span>
            </>
          ) : (
            <>
              <Fingerprint className="h-4 w-4" />
              <span>Continue with {selectedDevice.name.split('·')[0].trim()}</span>
            </>
          )}
        </button>

        <div className={styles.dividerRow}>Other ways in</div>

        <div className="grid grid-cols-2 gap-2.5">
          <button type="button" onClick={onSwitchToPassword} className={styles.socialBtn}>
            <ShieldCheck className="h-4 w-4 text-slate-300" />
            <span>Password</span>
          </button>
          <button type="button" onClick={onSwitchToEmailOtp} className={styles.socialBtn}>
            <Mail className="h-4 w-4 text-slate-300" />
            <span>Email code</span>
          </button>
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-slate-400">
        Passkeys stay on your device and are never sent to NAVRIX.
      </p>
    </div>
  );
}
