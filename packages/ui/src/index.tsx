import * as React from 'react';

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

export function formatUsdt(value: string | number | null | undefined, decimals = 2): string {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return '0.00';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: Math.max(decimals, 4),
  }).format(num);
}

export function shortenHex(value: string | null | undefined, start = 6, end = 4): string {
  if (!value) return '—';
  if (value.length <= start + end + 3) return value;
  return `${value.slice(0, start)}...${value.slice(-end)}`;
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'gold' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'gold',
      size = 'md',
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const base =
      'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70 disabled:opacity-50 disabled:cursor-not-allowed';
    const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
      gold: 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20 hover:brightness-110',
      secondary:
        'bg-slate-800/90 text-slate-100 border border-slate-700 hover:bg-slate-700/90',
      outline:
        'border border-amber-500/40 bg-transparent text-amber-300 hover:bg-amber-500/10',
      danger:
        'bg-rose-600/90 text-white border border-rose-500/40 hover:bg-rose-500',
      ghost: 'bg-transparent text-slate-300 hover:bg-slate-800/60 hover:text-white',
    };
    const sizes: Record<NonNullable<ButtonProps['size']>, string> = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2.5 text-sm',
      lg: 'px-6 py-3 text-base',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading ? (
          <span
            aria-hidden="true"
            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
        ) : null}
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glow?: boolean;
}

export function Card({ className, glow = false, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border p-6 transition-colors',
        glow
          ? 'border-amber-500/35 shadow-lg shadow-amber-500/10'
          : 'border-slate-800/80',
        className,
      )}
      style={{
        backgroundColor: 'var(--nv-surface, rgba(15, 23, 42, 0.82))',
        borderColor: glow ? undefined : 'var(--nv-border, rgba(51, 65, 85, 0.65))',
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalized = (status || '').toUpperCase();
  let palette = 'bg-slate-500/15 text-slate-300 border-slate-500/30';

  if (
    ['APPROVED', 'COMPLETED', 'ACTIVE', 'VERIFIED', 'CREDITED', 'DEPOSIT', 'INTEREST'].includes(
      normalized,
    )
  ) {
    palette = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35';
  } else if (
    [
      'PENDING_PAYMENT',
      'PAYMENT_SUBMITTED',
      'UNDER_REVIEW',
      'BLOCKCHAIN_DETECTED',
      'PENDING_REVIEW',
      'PROCESSING',
      'PENDING',
    ].includes(normalized)
  ) {
    palette = 'bg-amber-500/15 text-amber-300 border-amber-500/35';
  } else if (
    ['REJECTED', 'FAILED', 'SUSPENDED', 'EXPIRED', 'CANCELLED'].includes(normalized)
  ) {
    palette = 'bg-rose-500/15 text-rose-300 border-rose-500/35';
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-wide',
        palette,
        className,
      )}
    >
      {normalized.replace(/_/g, ' ')}
    </span>
  );
}

export interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700/70 px-6 py-12 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-400 font-bold">
        N
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1 max-w-md text-sm opacity-75">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export interface CopyButtonProps {
  value: string;
  label?: string;
  className?: string;
}

export function CopyButton({ value, label = 'Copy', className }: CopyButtonProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className={className}
    >
      {copied ? 'Copied!' : label}
    </Button>
  );
}

