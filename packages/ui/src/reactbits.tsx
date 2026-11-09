'use client';

import * as React from 'react';
import { motion } from 'framer-motion';

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

/* -------------------------------------------------------------------------- */
/* 1. ReactBits AuroraBackground                                              */
/* -------------------------------------------------------------------------- */

export interface AuroraBackgroundProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'gold' | 'emerald' | 'sovereign';
  intensity?: 'subtle' | 'vivid';
}

export function AuroraBackground({
  variant = 'gold',
  intensity = 'vivid',
  className,
  children,
  style,
  ...props
}: AuroraBackgroundProps) {
  const palettes: Record<
    NonNullable<AuroraBackgroundProps['variant']>,
    { orbA: string; orbB: string; orbC: string }
  > = {
    gold: {
      orbA: 'rgba(245, 184, 46, 0.24)',
      orbB: 'rgba(16, 185, 129, 0.14)',
      orbC: 'rgba(59, 130, 246, 0.12)',
    },
    emerald: {
      orbA: 'rgba(16, 185, 129, 0.24)',
      orbB: 'rgba(245, 184, 46, 0.16)',
      orbC: 'rgba(14, 165, 233, 0.14)',
    },
    sovereign: {
      orbA: 'rgba(245, 184, 46, 0.28)',
      orbB: 'rgba(168, 85, 247, 0.15)',
      orbC: 'rgba(16, 185, 129, 0.16)',
    },
  };

  const p = palettes[variant];
  const opacityScale = intensity === 'subtle' ? 0.65 : 1;

  return (
    <div
      className={cx('nv-rb-aurora relative overflow-hidden', className)}
      style={{
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
      {...props}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          opacity: opacityScale,
          background: `
            radial-gradient(65% 80% at 12% 15%, ${p.orbA} 0%, transparent 65%),
            radial-gradient(55% 75% at 88% 18%, ${p.orbB} 0%, transparent 65%),
            radial-gradient(60% 70% at 52% 95%, ${p.orbC} 0%, transparent 70%)
          `,
          animation: 'nv-aurora-shift 14s ease-in-out infinite alternate',
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
          maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.65), rgba(0,0,0,0.08))',
          WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.65), rgba(0,0,0,0.08))',
        }}
      />
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          display: 'inherit',
          flexDirection: 'inherit',
          flexWrap: 'inherit',
          alignItems: 'inherit',
          justifyContent: 'inherit',
          gap: 'inherit',
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. ReactBits SpotlightCard                                                 */
/* -------------------------------------------------------------------------- */

export type SpotlightTone = 'gold' | 'emerald' | 'rose' | 'cyan' | 'violet' | 'slate';

export interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: SpotlightTone;
  elevated?: boolean;
}

const TONE_MAP: Record<SpotlightTone, { glow: string; border: string }> = {
  gold: {
    glow: 'rgba(245, 184, 46, 0.20)',
    border: 'rgba(245, 184, 46, 0.34)',
  },
  emerald: {
    glow: 'rgba(16, 185, 129, 0.20)',
    border: 'rgba(16, 185, 129, 0.34)',
  },
  rose: {
    glow: 'rgba(244, 63, 94, 0.22)',
    border: 'rgba(244, 63, 94, 0.38)',
  },
  cyan: {
    glow: 'rgba(14, 165, 233, 0.20)',
    border: 'rgba(14, 165, 233, 0.32)',
  },
  violet: {
    glow: 'rgba(168, 85, 247, 0.20)',
    border: 'rgba(168, 85, 247, 0.32)',
  },
  slate: {
    glow: 'rgba(148, 163, 184, 0.14)',
    border: 'var(--nv-border, rgba(148, 163, 184, 0.16))',
  },
};

export function SpotlightCard({
  tone = 'slate',
  elevated = false,
  className,
  children,
  style,
  onPointerMove,
  onPointerEnter,
  onPointerLeave,
  ...props
}: SpotlightCardProps) {
  const cardRef = React.useRef<HTMLDivElement | null>(null);
  const [hovered, setHovered] = React.useState(false);
  const palette = TONE_MAP[tone];

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return;
    const el = cardRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      el.style.setProperty('--spot-x', `${e.clientX - rect.left}px`);
      el.style.setProperty('--spot-y', `${e.clientY - rect.top}px`);
    }
    onPointerMove?.(e);
  };

  return (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onPointerEnter={(e) => {
        if (e.pointerType !== 'touch') setHovered(true);
        onPointerEnter?.(e);
      }}
      onPointerLeave={(e) => {
        setHovered(false);
        onPointerLeave?.(e);
      }}
      className={cx('nv-rb-spotlight', className)}
      style={
        {
          position: 'relative',
          overflow: 'hidden',
          minWidth: 0,
          maxWidth: '100%',
          borderRadius: '1.25rem',
          backgroundColor: 'var(--nv-surface, rgba(15, 23, 42, 0.86))',
          border: `1px solid ${elevated ? palette.border : 'var(--nv-border, rgba(148, 163, 184, 0.16))'}`,
          boxShadow: elevated
            ? `0 16px 38px -14px ${palette.glow}`
            : '0 8px 24px -14px rgba(0, 0, 0, 0.35)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          transition: 'border-color 0.22s ease, transform 0.22s ease, box-shadow 0.22s ease',
          '--spot-x': '50%',
          '--spot-y': '0%',
          ...style,
        } as React.CSSProperties
      }
      {...props}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          opacity: hovered ? 1 : elevated ? 0.45 : 0,
          transition: 'opacity 0.3s ease',
          background: `radial-gradient(380px circle at var(--spot-x) var(--spot-y), ${palette.glow}, transparent 68%)`,
        }}
      />
      <div style={{ position: 'relative', zIndex: 1, height: '100%' }}>{children}</div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. ReactBits StarBorder                                                    */
/* -------------------------------------------------------------------------- */

export interface StarBorderProps extends React.HTMLAttributes<HTMLDivElement> {
  color?: string;
  speed?: string;
}

export function StarBorder({
  color = '#F5B82E',
  speed = '7s',
  className,
  children,
  style,
  ...props
}: StarBorderProps) {
  return (
    <div
      className={cx('nv-rb-starborder', className)}
      style={{
        position: 'relative',
        overflow: 'hidden',
        minWidth: 0,
        maxWidth: '100%',
        borderRadius: '1.5rem',
        padding: '1px',
        background:
          'linear-gradient(135deg, rgba(245, 184, 46, 0.42), rgba(148, 163, 184, 0.14) 48%, rgba(16, 185, 129, 0.34))',
        ...style,
      }}
      {...props}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          width: '280%',
          height: '55%',
          bottom: '-14px',
          right: '-220%',
          borderRadius: '9999px',
          background: `radial-gradient(circle, ${color}, transparent 14%)`,
          opacity: 0.75,
          pointerEvents: 'none',
          animation: `nv-star-bottom ${speed} linear infinite alternate`,
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          width: '280%',
          height: '55%',
          top: '-14px',
          left: '-220%',
          borderRadius: '9999px',
          background: `radial-gradient(circle, ${color}, transparent 14%)`,
          opacity: 0.75,
          pointerEvents: 'none',
          animation: `nv-star-top ${speed} linear infinite alternate`,
        }}
      />
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          borderRadius: 'calc(1.5rem - 1px)',
          backgroundColor: 'var(--nv-bg-elevated, #0b1120)',
          overflow: 'hidden',
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. ReactBits CountUp (Authentic Numeric Spring/Ease Counter)               */
/* -------------------------------------------------------------------------- */

export interface CountUpProps {
  value: number | string | null | undefined;
  decimals?: number;
  maxDecimals?: number;
  durationMs?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export function CountUp({
  value,
  decimals = 2,
  maxDecimals,
  durationMs = 750,
  prefix = '',
  suffix = '',
  className,
}: CountUpProps) {
  const target = React.useMemo(() => {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [value]);

  const [display, setDisplay] = React.useState<number>(target);
  const prevRef = React.useRef<number>(target);

  React.useEffect(() => {
    const from = prevRef.current;
    const to = target;
    if (from === to) {
      setDisplay(to);
      return;
    }

    let frameId = 0;
    const start = performance.now();

    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = from + (to - from) * eased;
      setDisplay(current);

      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      } else {
        prevRef.current = to;
        setDisplay(to);
      }
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [target, durationMs]);

  const formatted = React.useMemo(() => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits:
        typeof maxDecimals === 'number' ? Math.max(decimals, maxDecimals) : decimals,
    }).format(display);
  }, [display, decimals, maxDecimals]);

  return (
    <span
      data-tabular="true"
      className={className}
      style={{
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* 5. ReactBits ShinyText & GradientText                                      */
/* -------------------------------------------------------------------------- */

export interface ShinyTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  text: string;
  speedSec?: number;
}

export function ShinyText({ text, speedSec = 3.6, className, style, ...props }: ShinyTextProps) {
  return (
    <span
      className={cx('nv-rb-shiny', className)}
      style={{
        display: 'inline-block',
        backgroundImage:
          'linear-gradient(115deg, #d99b1e 0%, #f5b82e 35%, #fff6d6 50%, #f5b82e 65%, #d99b1e 100%)',
        backgroundSize: '220% auto',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        animation: `nv-shine ${speedSec}s linear infinite`,
        ...style,
      }}
      {...props}
    >
      {text}
    </span>
  );
}

export interface GradientTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'gold' | 'emerald' | 'sovereign';
}

export function GradientText({
  variant = 'gold',
  className,
  children,
  style,
  ...props
}: GradientTextProps) {
  const gradients: Record<NonNullable<GradientTextProps['variant']>, string> = {
    gold: 'linear-gradient(120deg, #fde68a 0%, #f5b82e 48%, #f59e0b 100%)',
    emerald: 'linear-gradient(120deg, #6ee7b7 0%, #10b981 55%, #38bdf8 100%)',
    sovereign: 'linear-gradient(120deg, #fef08a 0%, #f5b82e 45%, #34d399 100%)',
  };

  return (
    <span
      className={className}
      style={{
        backgroundImage: gradients[variant],
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        ...style,
      }}
      {...props}
    >
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* 6. ReactBits DecryptedText                                                 */
/* -------------------------------------------------------------------------- */

const CIPHER_CHARS = 'ABCDEF0123456789#•×';

export interface DecryptedTextProps {
  text: string;
  className?: string;
  speedMs?: number;
}

export function DecryptedText({ text, className, speedMs = 26 }: DecryptedTextProps) {
  const [output, setOutput] = React.useState(text);

  const runScramble = React.useCallback(() => {
    if (!text) return;
    let iteration = 0;
    const total = text.length;
    const timer = window.setInterval(() => {
      setOutput(
        text
          .split('')
          .map((ch, idx) => {
            if (ch === ' ' || ch === '-' || ch === '.') return ch;
            if (idx < iteration) return text[idx];
            return CIPHER_CHARS[Math.floor(Math.random() * CIPHER_CHARS.length)];
          })
          .join(''),
      );
      iteration += 1.25;
      if (iteration >= total) {
        window.clearInterval(timer);
        setOutput(text);
      }
    }, speedMs);

    return () => window.clearInterval(timer);
  }, [text, speedMs]);

  React.useEffect(() => {
    setOutput(text);
    const cleanup = runScramble();
    return cleanup;
  }, [text, runScramble]);

  return (
    <span
      onMouseEnter={() => {
        runScramble();
      }}
      data-tabular="true"
      className={className}
      style={{ fontVariantNumeric: 'tabular-nums' }}
    >
      {output}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* 7. ReactBits TiltedCard (Desktop 3D Micro-Tilt, Native Touch Pass-Through) */
/* -------------------------------------------------------------------------- */

export interface TiltedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  maxTiltDeg?: number;
}

export function TiltedCard({
  maxTiltDeg = 4.5,
  className,
  children,
  style,
  ...props
}: TiltedCardProps) {
  const ref = React.useRef<HTMLDivElement | null>(null);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    const rotX = (-py * maxTiltDeg).toFixed(2);
    const rotY = (px * maxTiltDeg).toFixed(2);
    el.style.transform = `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-2px)`;
  };

  const handlePointerLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) translateY(0px)';
  };

  return (
    <div
      ref={ref}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={className}
      style={{
        transition: 'transform 0.22s cubic-bezier(0.22, 1, 0.36, 1)',
        willChange: 'transform',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 8. ReactBits AnimatedTabs (Spring Layout Pill Segmented Control)           */
/* -------------------------------------------------------------------------- */

export interface AnimatedTabItem {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

export interface AnimatedTabsProps {
  items: AnimatedTabItem[];
  activeId: string;
  onChange: (id: string) => void;
  layoutGroupId?: string;
  compact?: boolean;
  className?: string;
}

export function AnimatedTabs({
  items,
  activeId,
  onChange,
  layoutGroupId = 'nv-tabs',
  compact = false,
  className,
}: AnimatedTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Content Sections"
      className={cx('nv-no-scrollbar', className)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: compact ? '0.18rem' : '0.35rem',
        padding: compact ? '0.2rem' : '0.32rem',
        borderRadius: compact ? '0.78rem' : '1rem',
        backgroundColor: 'var(--nv-bg-elevated, rgba(11, 17, 32, 0.9))',
        border: '1px solid var(--nv-border, rgba(148, 163, 184, 0.16))',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        minWidth: 0,
        maxWidth: '100%',
      }}
    >
      {items.map((item) => {
        const active = item.id === activeId;
        return (
          <button
            key={item.id}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            style={{
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: compact ? '0.28rem' : '0.45rem',
              padding: compact ? '0.3rem 0.54rem' : '0.52rem 0.92rem',
              minHeight: compact ? '30px' : '38px',
              borderRadius: compact ? '0.58rem' : '0.75rem',
              fontSize: compact ? '0.72rem' : '0.82rem',
              fontWeight: active ? 700 : 500,
              whiteSpace: 'nowrap',
              color: active ? '#070b14' : 'var(--nv-text-muted, #94a3b8)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              transition: 'color 0.18s ease',
              flexShrink: 0,
            }}
          >
            {active ? (
              <motion.span
                layoutId={`${layoutGroupId}-pill`}
                transition={{ type: 'spring', stiffness: 440, damping: 34 }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '0.75rem',
                  background: 'linear-gradient(135deg, #f5b82e 0%, #fbbf24 55%, #d99b1e 100%)',
                  boxShadow: '0 4px 14px rgba(245, 184, 46, 0.28)',
                  zIndex: 0,
                }}
              />
            ) : null}
            {item.icon ? (
              <span style={{ position: 'relative', zIndex: 1, display: 'inline-flex' }}>
                {item.icon}
              </span>
            ) : null}
            <span style={{ position: 'relative', zIndex: 1 }}>{item.label}</span>
            {typeof item.count === 'number' ? (
              <span
                data-tabular="true"
                style={{
                  position: 'relative',
                  zIndex: 1,
                  padding: '0.08rem 0.44rem',
                  borderRadius: '9999px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                  backgroundColor: active ? 'rgba(7, 11, 20, 0.18)' : 'rgba(148, 163, 184, 0.14)',
                  color: active ? '#070b14' : 'var(--nv-text, #f8fafc)',
                }}
              >
                {item.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 9. ReactBits Staggered Motion Containers                                   */
/* -------------------------------------------------------------------------- */

export function FadeInStagger({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: 0.055,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function FadeInItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 12 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.34, ease: [0.22, 1, 0.36, 1] },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/* 10. iOS & Android Native-Grade Floating Glass MobileDock                   */
/* -------------------------------------------------------------------------- */

export interface MobileDockItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  badge?: number;
  accent?: boolean;
  onSelect: () => void;
}

export interface MobileDockProps {
  items: MobileDockItem[];
  dockId?: string;
  className?: string;
}

export function MobileDock({ items, dockId = 'nv-mobile-dock', className }: MobileDockProps) {
  return (
    <nav
      aria-label="Mobile Quick Navigation"
      className={cx('nv-mobile-dock', className)}
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 45,
        paddingLeft: '0.4rem',
        paddingRight: '0.4rem',
        paddingTop: '0.35rem',
        paddingBottom: 'calc(0.45rem + env(safe-area-inset-bottom, 0px))',
        background: 'var(--nv-dock-bg, rgba(9, 14, 26, 0.88))',
        backdropFilter: 'blur(22px) saturate(180%)',
        WebkitBackdropFilter: 'blur(22px) saturate(180%)',
        borderTop: '1px solid var(--nv-border, rgba(148, 163, 184, 0.18))',
        boxShadow: '0 -10px 30px rgba(0, 0, 0, 0.35)',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
          alignItems: 'center',
          gap: '0.18rem',
          maxWidth: '540px',
          margin: '0 auto',
        }}
      >
        {items.map((item) => {
          const isActive = Boolean(item.active);
          return (
            <button
              key={item.id}
              type="button"
              onClick={item.onSelect}
              aria-current={isActive ? 'page' : undefined}
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.18rem',
                minWidth: 0,
                minHeight: '48px',
                padding: '0.28rem 0.15rem',
                borderRadius: '0.9rem',
                border: 'none',
                background: 'transparent',
                color: isActive ? 'var(--nv-gold, #f5b82e)' : 'var(--nv-text-muted, #94a3b8)',
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
                transition: 'color 0.18s ease, transform 0.14s ease',
              }}
            >
              {isActive ? (
                <motion.span
                  layoutId={`${dockId}-active`}
                  transition={{ type: 'spring', stiffness: 450, damping: 34 }}
                  style={{
                    position: 'absolute',
                    inset: '2px 4px',
                    borderRadius: '0.85rem',
                    backgroundColor: 'var(--nv-gold-soft, rgba(245, 184, 46, 0.15))',
                    border: '1px solid var(--nv-border-gold, rgba(245, 184, 46, 0.34))',
                    zIndex: 0,
                  }}
                />
              ) : null}

              <span
                style={{
                  position: 'relative',
                  zIndex: 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {item.icon}
                {typeof item.badge === 'number' && item.badge > 0 ? (
                  <span
                    data-tabular="true"
                    style={{
                      position: 'absolute',
                      top: '-5px',
                      right: '-9px',
                      minWidth: '16px',
                      height: '16px',
                      padding: '0 4px',
                      borderRadius: '9999px',
                      backgroundColor: '#f5b82e',
                      color: '#070b14',
                      fontSize: '10px',
                      fontWeight: 800,
                      lineHeight: '16px',
                      textAlign: 'center',
                    }}
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                ) : null}
              </span>

              <span
                style={{
                  position: 'relative',
                  zIndex: 1,
                  fontSize: '0.67rem',
                  fontWeight: isActive ? 700 : 500,
                  letterSpacing: '-0.01em',
                  lineHeight: 1.1,
                  maxWidth: '100%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
