import React from 'react';
import { motion, useInView } from 'framer-motion';
import './reactbits-primitives.css';

/**
 * Respects OS/browser prefers-reduced-motion accessibility setting.
 */
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mediaQuery.matches);

    const handleChange = (event) => setReduced(event.matches);
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  return reduced;
}

/**
 * 1. React Bits: Aurora + Particles Background
 * Renders animated NAVRIX Sovereign Gold & Emerald light beams and particles
 * behind the Hero section and PortfolioCard.
 */
const DEFAULT_PARTICLES = [
  { id: 1, top: '14%', left: '54%', size: 4, dur: '4.4s', delay: '0.2s', emerald: false },
  { id: 2, top: '22%', left: '86%', size: 5, dur: '5.2s', delay: '1.1s', emerald: true },
  { id: 3, top: '38%', left: '48%', size: 3, dur: '4.8s', delay: '0.7s', emerald: false },
  { id: 4, top: '64%', left: '58%', size: 4, dur: '5.6s', delay: '1.5s', emerald: true },
  { id: 5, top: '72%', left: '88%', size: 4, dur: '4.2s', delay: '0.4s', emerald: false },
  { id: 6, top: '18%', left: '72%', size: 3, dur: '5.0s', delay: '2.0s', emerald: false },
  { id: 7, top: '52%', left: '92%', size: 5, dur: '4.6s', delay: '0.9s', emerald: true },
  { id: 8, top: '82%', left: '68%', size: 3, dur: '5.4s', delay: '1.3s', emerald: false },
];

export function Aurora({ showParticles = true, className = '' }) {
  return (
    <div className={`rb-aurora-container ${className}`} aria-hidden="true">
      <div className="rb-aurora-grid" />
      <div className="rb-aurora-beam rb-aurora-beam-gold" />
      <div className="rb-aurora-beam rb-aurora-beam-emerald" />
      <div className="rb-aurora-beam rb-aurora-beam-streak" />
      <div className="rb-aurora-beam rb-aurora-beam-ambient" />

      {showParticles && (
        <div className="rb-particles-layer">
          {DEFAULT_PARTICLES.map((p) => (
            <span
              key={p.id}
              className={`rb-particle-dot ${p.emerald ? 'is-emerald' : ''}`}
              style={{
                top: p.top,
                left: p.left,
                width: `${p.size}px`,
                height: `${p.size}px`,
                '--rb-dur': p.dur,
                '--rb-delay': p.delay,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * 2. React Bits: SplitText
 * Animates hero typography word-by-word (800ms total page-load reveal).
 */
export function SplitText({ text = '', highlightWords = [], durationMs = 800, className = '' }) {
  const reducedMotion = usePrefersReducedMotion();
  const words = React.useMemo(() => text.trim().split(/\s+/), [text]);
  const highlightSet = React.useMemo(
    () => new Set(highlightWords.map((w) => w.toLowerCase())),
    [highlightWords],
  );

  if (reducedMotion) {
    return (
      <span className={`rb-split-text ${className}`}>
        {words.map((word, index) => {
          const clean = word.toLowerCase();
          const isHighlighted =
            highlightSet.has(clean) || highlightSet.has(clean.replace(/[.,!?]/g, ''));
          return (
            <span
              key={`${word}-${index}`}
              className={`rb-split-word ${isHighlighted ? 'rb-split-word-accent' : ''}`}
            >
              {word}
            </span>
          );
        })}
      </span>
    );
  }

  const totalSec = durationMs / 1000;
  const wordDuration = Math.min(0.48, totalSec * 0.6);
  const stagger = words.length > 1 ? (totalSec - wordDuration) / (words.length - 1) : 0.06;

  return (
    <span className={`rb-split-text ${className}`}>
      {words.map((word, index) => {
        const clean = word.toLowerCase();
        const isHighlighted =
          highlightSet.has(clean) || highlightSet.has(clean.replace(/[.,!?]/g, ''));

        return (
          <motion.span
            key={`${word}-${index}`}
            initial={{ opacity: 0, y: 20, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{
              duration: wordDuration,
              delay: index * stagger,
              ease: [0.22, 1, 0.36, 1],
            }}
            className={`rb-split-word ${isHighlighted ? 'rb-split-word-accent' : ''}`}
          >
            {word}
          </motion.span>
        );
      })}
    </span>
  );
}

/**
 * 3. React Bits: AnimatedContent
 * Reveals cards, steps, and sections as the visitor scrolls (600ms default).
 */
export function AnimatedContent({
  children,
  delay = 0,
  durationMs = 600,
  direction = 'up',
  distance = 24,
  className = '',
}) {
  const reducedMotion = usePrefersReducedMotion();

  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  const axisOffset = {
    up: { x: 0, y: distance },
    down: { x: 0, y: -distance },
    left: { x: distance, y: 0 },
    right: { x: -distance, y: 0 },
  }[direction] || { x: 0, y: distance };

  return (
    <motion.div
      initial={{ opacity: 0, x: axisOffset.x, y: axisOffset.y }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, amount: 0.18 }}
      transition={{
        duration: durationMs / 1000,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * 4. React Bits: CountUp
 * Animates financial statistics, fees, and portfolio numbers over 1,500ms when visible.
 */
export function CountUp({
  end = 0,
  start = 0,
  durationMs = 1500,
  decimals = 0,
  prefix = '',
  suffix = '',
  separator = ',',
  className = '',
}) {
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-30px' });
  const reducedMotion = usePrefersReducedMotion();
  const [current, setCurrent] = React.useState(reducedMotion ? end : start);

  React.useEffect(() => {
    if (reducedMotion) {
      setCurrent(end);
      return undefined;
    }
    if (!isInView) return undefined;

    let rafId = null;
    let startTimestamp = null;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;
      const progress = Math.min(elapsed / durationMs, 1);
      // Cubic ease-out
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(start + (end - start) * eased);

      if (progress < 1) {
        rafId = window.requestAnimationFrame(step);
      } else {
        setCurrent(end);
      }
    };

    rafId = window.requestAnimationFrame(step);
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [isInView, end, start, durationMs, reducedMotion]);

  const formatted = React.useMemo(() => {
    const fixed = Number(current).toFixed(decimals);
    const [intPart, decPart] = fixed.split('.');
    const withSep = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
    return decPart !== undefined ? `${withSep}.${decPart}` : withSep;
  }, [current, decimals, separator]);

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

/**
 * 5. React Bits: LogoLoop
 * Continuous horizontal scrolling marquee (20–30 sec loop) for Stock Market, BND Coin & Crypto assets.
 */
export function LogoLoop({
  items = [],
  renderItem,
  durationSec = 26,
  pauseOnHover = true,
  className = '',
}) {
  const duplicated = React.useMemo(() => [...items, ...items], [items]);

  return (
    <div
      className={`rb-logoloop-viewport ${pauseOnHover ? 'pause-on-hover' : ''} ${className}`}
      style={{ '--rb-loop-duration': `${durationSec}s` }}
    >
      <div className="rb-logoloop-track">
        {duplicated.map((item, idx) => (
          <React.Fragment key={`${item.id || item.symbol || idx}-${idx}`}>
            {renderItem(item, idx)}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

/**
 * 6. React Bits: SpotlightCard
 * Feature card with cursor-tracked radial NAVRIX Gold & Emerald spotlight.
 */
export function SpotlightCard({
  children,
  spotlightColor = 'rgba(245, 184, 46, 0.16)',
  className = '',
}) {
  const cardRef = React.useRef(null);
  const [coords, setCoords] = React.useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = React.useState(0);

  const handleMouseMove = (event) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setCoords({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      className={`rb-spotlight-card ${className}`}
    >
      <div
        className="rb-spotlight-overlay"
        style={{
          opacity,
          background: `radial-gradient(420px circle at ${coords.x}px ${coords.y}px, ${spotlightColor}, transparent 68%)`,
        }}
      />
      <div className="rb-spotlight-content">{children}</div>
    </div>
  );
}
