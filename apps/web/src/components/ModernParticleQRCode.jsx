'use client';

import * as React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { RefreshCw, Sparkles, ShieldCheck } from 'lucide-react';
import styles from './ModernParticleQRCode.module.css';

// Center Token Badges (Crisp vector graphics for the center logo)
function TokenCenterLogo({ token }) {
  const t = (token || '').toUpperCase();

  if (t === 'BTC') {
    return (
      <svg viewBox="0 0 32 32" className={styles.centerLogoIcon}>
        <circle cx="16" cy="16" r="14" fill="#F7931A" />
        <path
          d="M21.2 13.5c.3-2-1.2-3.1-3.3-3.8l.7-2.7-1.7-.4-.7 2.6c-.4-.1-.9-.2-1.4-.3l.7-2.6-1.7-.4-.7 2.7c-.4-.1-.7-.2-1.1-.3l-2.3-.6-.5 1.8s1.2.3 1.2.3c.7.2.8.7.8 1.1l-.8 3.3c.1 0 .2 0 .3.1l-.3-.1-1.1 4.5c-.1.2-.3.6-.8.5 0 0-1.2-.3-1.2-.3l-.8 1.9 2.2.5c.4.1.8.2 1.2.3l-.7 2.8 1.7.4.7-2.7c.5.1.9.2 1.4.3l-.7 2.7 1.7.4.7-2.8c2.9.5 5.1.3 6-2.3.8-2.1 0-3.3-1.5-4.1 1.1-.3 1.9-1 2.1-2.4zm-3.8 5.2c-.5 2.1-4 1-5.1.7l.9-3.7c1.1.3 4.8.8 4.2 3zm.5-5.3c-.5 1.9-3.4.9-4.3.7l.8-3.4c.9.2 3.9.7 3.5 2.7z"
          fill="#FFFFFF"
        />
      </svg>
    );
  }

  if (t === 'ETH') {
    return (
      <svg viewBox="0 0 32 32" className={styles.centerLogoIcon}>
        <circle cx="16" cy="16" r="14" fill="#627EEA" />
        <path d="M16 6l-6.5 10.8L16 20.6l6.5-3.8L16 6z" fill="#C0CBF7" />
        <path d="M16 6v14.6l6.5-3.8L16 6z" fill="#FFFFFF" />
        <path d="M16 21.6l-6.5-3.8L16 26.5l6.5-8.7-6.5 3.8z" fill="#C0CBF7" />
        <path d="M16 21.6v4.9l6.5-8.7-6.5 3.8z" fill="#FFFFFF" />
      </svg>
    );
  }

  if (t === 'BNB') {
    return (
      <svg viewBox="0 0 32 32" className={styles.centerLogoIcon}>
        <circle cx="16" cy="16" r="14" fill="#F3BA2F" />
        <path
          d="M16 8.5l2.7 2.7-5.4 5.4L16 19.3l-2.7-2.7 5.4-5.4L16 8.5zm5.4 5.4l2.7 2.7-2.7 2.7-2.7-2.7 2.7-2.7zM10.6 13.9l2.7 2.7-2.7 2.7-2.7-2.7 2.7-2.7zm5.4 5.4l2.7 2.7-2.7 2.7-2.7-2.7 2.7-2.7z"
          fill="#000000"
        />
      </svg>
    );
  }

  // Default: Sovereign Tether (USDT) / NAVRIX Gold Emblem
  return (
    <svg viewBox="0 0 32 32" className={styles.centerLogoIcon}>
      <defs>
        <linearGradient id="navrixGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F5B82E" />
          <stop offset="50%" stopColor="#FCD34D" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="14" fill="url(#navrixGoldGrad)" />
      {/* Tether Bar + T */}
      <path
        d="M18.8 12.8v-1.6h-5.6v1.6h2v1.1c-3 .1-5.2.8-5.2 1.6s2.2 1.5 5.2 1.6v4.7h1.6v-4.7c3-.1 5.2-.8 5.2-1.6s-2.2-1.5-5.2-1.6v-1.1h2zm-2.8 3.5c-2.4 0-4.3-.5-4.3-1.1s1.9-1.1 4.3-1.1 4.3.5 4.3 1.1-1.9 1.1-4.3 1.1z"
        fill="#070B14"
      />
    </svg>
  );
}

// Ease out back cubic for magnetic snap-in
function easeOutBack(x) {
  const c1 = 1.6;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

export function ModernParticleQRCode({ value, token = 'USDT', network = 'BEP-20', size = 220 }) {
  const canvasRef = React.useRef(null);
  const hiddenSvgRef = React.useRef(null);

  const [animKey, setAnimKey] = React.useState(0);
  const [isAssembled, setIsAssembled] = React.useState(false);
  const [showScanBeam, setShowScanBeam] = React.useState(false);

  // Trigger animation replay when wallet address changes
  React.useEffect(() => {
    setAnimKey((k) => k + 1);
    setIsAssembled(false);
    setShowScanBeam(false);
  }, [value, token, network]);

  const handleReplay = (e) => {
    if (e) e.stopPropagation();
    setAnimKey((k) => k + 1);
    setIsAssembled(false);
    setShowScanBeam(false);
  };

  // Particle Assembly Engine
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !hiddenSvgRef.current) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Retina display scaling
    const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 2, 2.5) : 2;
    const canvasSize = size;
    canvas.width = canvasSize * dpr;
    canvas.height = canvasSize * dpr;
    canvas.style.width = `${canvasSize}px`;
    canvas.style.height = `${canvasSize}px`;

    // Extract modules from hidden QRCodeSVG
    const svgEl = hiddenSvgRef.current.querySelector('svg');
    if (!svgEl) return;

    const viewBoxAttr = svgEl.getAttribute('viewBox') || '0 0 29 29';
    const viewBoxParts = viewBoxAttr.split(' ');
    const gridSize = parseInt(viewBoxParts[2] || '29', 10);

    const pathEl = svgEl.querySelector('path:nth-of-type(2)') || svgEl.querySelector('path');
    const pathD = pathEl ? pathEl.getAttribute('d') : '';

    const modules = [];
    const regex = /M(\d+)\s+(\d+)h(\d+)v1/g;
    let match;
    while ((match = regex.exec(pathD)) !== null) {
      const startX = parseInt(match[1], 10);
      const y = parseInt(match[2], 10);
      const len = parseInt(match[3], 10);
      for (let x = startX; x < startX + len; x++) {
        modules.push({ x, y });
      }
    }

    if (modules.length === 0) return;

    // Layout metrics
    const margin = canvasSize * 0.07;
    const contentSize = canvasSize - margin * 2;
    const cellSize = contentSize / gridSize;
    const radius = Math.max(1.8, cellSize * 0.42);

    // Initialize Particles
    const centerX = canvasSize / 2;
    const centerY = canvasSize / 2;

    const particles = modules.map((m, idx) => {
      const targetX = margin + m.x * cellSize + cellSize / 2;
      const targetY = margin + m.y * cellSize + cellSize / 2;

      // Dispersed start position in a cosmic aura around the QR code
      const angle = (idx / modules.length) * Math.PI * 6 + Math.sin(idx) * 0.8;
      const dist = canvasSize * 0.45 + 35 + Math.random() * (canvasSize * 0.55);
      const startX = centerX + Math.cos(angle) * dist;
      const startY = centerY + Math.sin(angle) * dist;

      const delay = (idx % 20) * 0.015 + Math.random() * 0.18;
      const duration = 0.8 + Math.random() * 0.22;
      const colorType = idx % 3; // 0: Sovereign Gold, 1: Cyber Cyan, 2: Emerald

      return {
        startX,
        startY,
        targetX,
        targetY,
        delay,
        duration,
        colorType,
        gridX: m.x,
        gridY: m.y,
        isFinder:
          (m.x < 7 && m.y < 7) ||
          (m.x >= gridSize - 7 && m.y < 7) ||
          (m.x < 7 && m.y >= gridSize - 7),
      };
    });

    let animationFrameId;
    const startTime = performance.now();

    function render(time) {
      const elapsed = (time - startTime) / 1000;
      let allSettled = true;

      // Reset and scale
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, canvasSize, canvasSize);

      // Clean white canvas background with subtle rounded border
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvasSize, canvasSize);

      // Draw each particle / module
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        if (elapsed < p.delay) {
          allSettled = false;
          // Ambient hovering before takeoff
          const floatOffset = Math.sin(elapsed * 4 + i) * 2;
          ctx.beginPath();
          ctx.arc(p.startX, p.startY + floatOffset, 1.8, 0, Math.PI * 2);
          ctx.fillStyle = p.colorType === 0 ? '#F5B82E' : p.colorType === 1 ? '#38BDF8' : '#10B981';
          ctx.fill();
          continue;
        }

        const t = Math.min(1, (elapsed - p.delay) / p.duration);
        if (t < 1) {
          allSettled = false;
        }

        const eased = easeOutBack(t);
        const curX = p.startX + (p.targetX - p.startX) * Math.min(1.05, Math.max(0, eased));
        const curY = p.startY + (p.targetY - p.startY) * Math.min(1.05, Math.max(0, eased));

        if (t < 1) {
          // In Flight: Glowing animated cosmic spark
          ctx.save();
          ctx.beginPath();
          const sparkSize = radius * (0.6 + t * 0.4);
          ctx.arc(curX, curY, sparkSize, 0, Math.PI * 2);

          const glowColor =
            p.colorType === 0 ? '#F5B82E' : p.colorType === 1 ? '#38BDF8' : '#10B981';
          ctx.fillStyle = glowColor;
          ctx.shadowColor = glowColor;
          ctx.shadowBlur = 6;
          ctx.fill();

          // Subtle velocity trail towards target
          ctx.beginPath();
          ctx.moveTo(curX, curY);
          ctx.lineTo(curX - (p.targetX - p.startX) * 0.03, curY - (p.targetY - p.startY) * 0.03);
          ctx.strokeStyle = glowColor;
          ctx.lineWidth = 1.2;
          ctx.stroke();
          ctx.restore();
        } else {
          // Assembled: High-contrast, rounded modern QR module
          ctx.beginPath();
          ctx.arc(p.targetX, p.targetY, radius, 0, Math.PI * 2);

          // Deep midnight black with subtle finder pattern highlight
          if (p.isFinder) {
            ctx.fillStyle = '#070B14';
          } else {
            ctx.fillStyle = '#0F172A';
          }
          ctx.fill();
        }
      }

      ctx.restore();

      if (!allSettled) {
        animationFrameId = requestAnimationFrame(render);
      } else {
        setIsAssembled(true);
        setShowScanBeam(true);
        // Turn off scan beam after 1.5s
        setTimeout(() => setShowScanBeam(false), 1500);
      }
    }

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [animKey, value, size]);

  return (
    <div className={styles.qrWrapper}>
      {/* Hidden reference QRCodeSVG used purely for mathematical matrix extraction with excavated center */}
      <div ref={hiddenSvgRef} style={{ display: 'none' }} aria-hidden="true">
        <QRCodeSVG
          value={value}
          size={size}
          level="H"
          includeMargin={false}
          imageSettings={{
            src: '',
            width: Math.round(size * 0.26),
            height: Math.round(size * 0.26),
            excavate: true,
          }}
        />
      </div>

      {/* Visible Interactive QR Card */}
      <div
        className={styles.qrContainer}
        onClick={handleReplay}
        title="Click to replay particle assembly"
      >
        {/* Cybernetic Targeting Corner Brackets */}
        <span className={`${styles.cornerBracket} ${styles.topLeft}`} />
        <span className={`${styles.cornerBracket} ${styles.topRight}`} />
        <span className={`${styles.cornerBracket} ${styles.bottomLeft}`} />
        <span className={`${styles.cornerBracket} ${styles.bottomRight}`} />

        {/* Holographic Laser Scan Line (sweeps once upon assembly) */}
        {showScanBeam && <div className={styles.scanBeam} />}

        {/* High-Performance Canvas where particles assemble */}
        <canvas ref={canvasRef} className={styles.canvas} />

        {/* Professional Center Logo Badge (appears as particles assemble) */}
        {isAssembled && (
          <div className={styles.centerLogoBadge} aria-label={`${token} Verification Badge`}>
            <TokenCenterLogo token={token} />
          </div>
        )}
      </div>

      {/* Sub-bar with Network info & Replay button */}
      <div className={styles.qrCaptionBar}>
        <div className={styles.qrNetworkTag}>
          <span className={styles.statusIndicator} />
          <span>
            {token} · {network}
          </span>
        </div>

        <button
          type="button"
          onClick={handleReplay}
          className={styles.replayBtn}
          title="Re-run particle assembly animation"
        >
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>Assemble</span>
        </button>
      </div>
    </div>
  );
}

export default ModernParticleQRCode;
