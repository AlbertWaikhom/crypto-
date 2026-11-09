import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Info,
  KeyRound,
  Sparkles,
  X,
} from 'lucide-react';

const ToastContext = React.createContext(null);

let idCounter = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = React.useState([]);

  const dismiss = React.useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = React.useCallback(
    ({
      variant = 'info',
      title,
      description = '',
      code = null,
      duration = 5500,
      action = null,
      otpCode = null,
    }) => {
      const id = `nv-toast-${idCounter++}-${Date.now()}`;
      setToasts((prev) => [
        ...prev.slice(-4),
        { id, variant, title, description, code, action, otpCode },
      ]);

      if (duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, duration);
      }
      return id;
    },
    [],
  );

  const api = React.useMemo(
    () => ({
      dismiss,
      show: pushToast,
      error: (title, description = '', opts = {}) =>
        pushToast({ variant: 'error', title, description, duration: 6500, ...opts }),
      success: (title, description = '', opts = {}) =>
        pushToast({ variant: 'success', title, description, duration: 4500, ...opts }),
      warning: (title, description = '', opts = {}) =>
        pushToast({ variant: 'warning', title, description, duration: 6000, ...opts }),
      info: (title, description = '', opts = {}) =>
        pushToast({ variant: 'info', title, description, duration: 5000, ...opts }),
      otpPreview: (email, otpCode, onAutoFill) => {
        if (!otpCode) return null;
        return pushToast({
          variant: 'otp',
          title: '6-Digit Verification Code Sent',
          description: `Dispatched to ${email} (Dev Mail Preview)`,
          otpCode: String(otpCode),
          duration: 18000,
          action: onAutoFill
            ? {
                label: 'Auto-fill 6 digits',
                onClick: () => onAutoFill(String(otpCode)),
              }
            : null,
        });
      },
    }),
    [dismiss, pushToast],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed right-4 top-4 z-[9999] flex w-[calc(100vw-2rem)] max-w-[410px] flex-col gap-2.5 sm:right-5 sm:top-5"
      >
        <AnimatePresence initial={false}>
          {toasts.map((item) => (
            <ToastCard key={item.id} item={item} onDismiss={() => dismiss(item.id)} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ item, onDismiss }) {
  const [copied, setCopied] = React.useState(false);

  const palette = {
    error: {
      border: 'rgba(244, 63, 94, 0.45)',
      glow: 'rgba(244, 63, 94, 0.14)',
      iconBg: 'rgba(244, 63, 94, 0.16)',
      iconColor: '#fb7185',
      Icon: AlertCircle,
    },
    success: {
      border: 'rgba(16, 185, 129, 0.45)',
      glow: 'rgba(16, 185, 129, 0.14)',
      iconBg: 'rgba(16, 185, 129, 0.16)',
      iconColor: '#34d399',
      Icon: CheckCircle2,
    },
    warning: {
      border: 'rgba(245, 184, 46, 0.48)',
      glow: 'rgba(245, 184, 46, 0.14)',
      iconBg: 'rgba(245, 184, 46, 0.16)',
      iconColor: '#f5b82e',
      Icon: AlertTriangle,
    },
    otp: {
      border: 'rgba(245, 184, 46, 0.55)',
      glow: 'rgba(245, 184, 46, 0.18)',
      iconBg: 'rgba(245, 184, 46, 0.18)',
      iconColor: '#f5b82e',
      Icon: KeyRound,
    },
    info: {
      border: 'rgba(56, 189, 248, 0.42)',
      glow: 'rgba(56, 189, 248, 0.12)',
      iconBg: 'rgba(56, 189, 248, 0.15)',
      iconColor: '#38bdf8',
      Icon: Info,
    },
  }[item.variant] || {
    border: 'rgba(148, 163, 184, 0.3)',
    glow: 'rgba(15, 23, 42, 0.5)',
    iconBg: 'rgba(148, 163, 184, 0.15)',
    iconColor: '#cbd5e1',
    Icon: Info,
  };

  const IconComp = palette.Icon;

  const handleCopyOtp = async () => {
    if (!item.otpCode) return;
    try {
      await navigator.clipboard.writeText(item.otpCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  };

  return (
    <motion.div
      layout
      role="alert"
      initial={{ opacity: 0, y: -14, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 28, scale: 0.96 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background:
          'linear-gradient(145deg, rgba(11, 17, 32, 0.97) 0%, rgba(7, 11, 20, 0.98) 100%)',
        border: `1px solid ${palette.border}`,
        boxShadow: `0 18px 42px -12px rgba(0,0,0,0.72), 0 0 28px -8px ${palette.glow}`,
      }}
      className="pointer-events-auto relative overflow-hidden rounded-2xl p-3.5 text-slate-100 backdrop-blur-xl"
    >
      <div className="flex items-start gap-3">
        <div
          style={{ background: palette.iconBg, color: palette.iconColor }}
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
        >
          <IconComp className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[13px] font-bold leading-snug text-white">{item.title}</p>
            {item.code ? (
              <span className="shrink-0 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-slate-300">
                {item.code}
              </span>
            ) : null}
          </div>

          {item.description ? (
            <p className="mt-1 text-xs leading-relaxed text-slate-300/90">{item.description}</p>
          ) : null}

          {item.otpCode ? (
            <div className="mt-2.5 flex items-center justify-between gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2">
              <span className="font-mono text-base font-extrabold tracking-[0.28em] text-amber-300">
                {item.otpCode.slice(0, 3)}-{item.otpCode.slice(3)}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCopyOtp}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/10 px-2 py-1 text-[11px] font-semibold text-slate-100 transition hover:bg-white/20"
                >
                  <Copy className="h-3 w-3" />
                  {copied ? 'Copied' : 'Copy'}
                </button>
                {item.action ? (
                  <button
                    type="button"
                    onClick={() => {
                      item.action.onClick();
                      onDismiss();
                    }}
                    className="inline-flex items-center gap-1 rounded-lg bg-amber-400 px-2.5 py-1 text-[11px] font-bold text-slate-950 transition hover:bg-amber-300"
                  >
                    <Sparkles className="h-3 w-3" />
                    {item.action.label}
                  </button>
                ) : null}
              </div>
            </div>
          ) : item.action ? (
            <div className="mt-2.5">
              <button
                type="button"
                onClick={() => {
                  item.action.onClick();
                  onDismiss();
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/40 bg-amber-400/15 px-2.5 py-1 text-xs font-semibold text-amber-300 transition hover:bg-amber-400/25"
              >
                {item.action.label}
              </button>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onDismiss}
          aria-label="Close notification"
          className="rounded-lg p-1 text-slate-400 transition hover:bg-white/10 hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}
