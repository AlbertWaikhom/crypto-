'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, ChevronRight, Layers, Lock, ShieldCheck, Sparkles, TrendingUp } from 'lucide-react';
import { BRAND_CONFIG } from '@navrix/config';
import { Button } from '@navrix/ui';
import styles from './hero-29.module.css';

interface FunnelStage {
  id: string;
  stageName: string;
  metric: string;
  description: string;
  subDetail: string;
  toneColor: string;
}

const FUNNEL_STAGES: FunnelStage[] = [
  {
    id: 'gateway',
    stageName: 'Global Participant Gateway',
    metric: '25,000+',
    description: 'Active Ecosystem Accounts',
    subDetail: 'Multi-model access across global regions',
    toneColor: '#f5b82e', // NAVRIX Gold
  },
  {
    id: 'engines',
    stageName: 'Specialized Execution Engines',
    metric: '8 Entities',
    description: 'Independent Model Allocation',
    subDetail: 'Systematic, hedge, hybrid & prop accounts',
    toneColor: '#ffffff', // Luminous White
  },
  {
    id: 'ledger',
    stageName: 'Double-Entry Solvency Verification',
    metric: '100% Proof',
    description: 'Zero Commingling or Overdraft',
    subDetail: 'MySQL append-only cryptographic ledger',
    toneColor: '#f5b82e', // NAVRIX Gold
  },
  {
    id: 'settlement',
    stageName: 'BEP-20 Capital Settlement',
    metric: 'BSC Finality',
    description: 'Instant Outbound Escrow',
    subDetail: 'Direct on-chain USDT routing & custody safety',
    toneColor: '#10b981', // Emerald Success
  },
];

export function Hero29() {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  // Animated 3D Light Vortex Funnel Canvas
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;
    let rotation = 0;

    // Embers / Particles spilling from the funnel
    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      alpha: number;
      maxAlpha: number;
      color: string;
    }

    const particles: Particle[] = [];
    const MAX_PARTICLES = 65;

    const resize = () => {
      if (!containerRef.current || !canvas) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    // Initialize particles
    for (let i = 0; i < MAX_PARTICLES; i++) {
      particles.push({
        x: (Math.random() - 0.5) * 160,
        y: Math.random() * 500,
        vx: (Math.random() - 0.5) * 0.45 + (Math.random() > 0.5 ? 0.35 : -0.35),
        vy: -Math.random() * 0.45 - 0.15,
        size: Math.random() * 1.8 + 0.6,
        alpha: Math.random() * 0.7 + 0.1,
        maxAlpha: Math.random() * 0.75 + 0.25,
        color: Math.random() > 0.4 ? '#ffffff' : '#f5b82e',
      });
    }

    // Number of spiral strands
    const STRAND_COUNT = 64;
    const PERSPECTIVE = 380;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const centerX = width * 0.5;
      const topY = height * 0.04;
      const bottomY = height * 0.92;
      const funnelHeight = bottomY - topY;

      rotation += 0.007;

      // Draw Base Concentric Ripple Rings
      const baseCenterY = bottomY - 6;
      const baseRadiusX = Math.min(width * 0.38, 220);
      const baseRadiusY = baseRadiusX * 0.24;

      for (let ring = 1; ring <= 4; ring++) {
        const ringScale = ring / 4;
        const ringAlpha = (0.28 - ring * 0.05) * (0.8 + 0.2 * Math.sin(rotation * 2 + ring));
        ctx.beginPath();
        ctx.ellipse(
          centerX,
          baseCenterY + (ring - 1) * 3,
          baseRadiusX * ringScale,
          baseRadiusY * ringScale,
          0,
          0,
          Math.PI * 2,
        );
        ctx.strokeStyle = ring % 2 === 0 ? `rgba(245, 184, 46, ${ringAlpha})` : `rgba(255, 255, 255, ${ringAlpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Draw Light Vortex Funnel Strands
      for (let s = 0; s < STRAND_COUNT; s++) {
        const strandOffset = (s / STRAND_COUNT) * Math.PI * 2;
        const isGold = s % 5 === 0;

        ctx.beginPath();
        let firstPoint = true;

        // Trace points from top of funnel to base
        const STEPS = 36;
        for (let i = 0; i <= STEPS; i++) {
          const t = i / STEPS; // 0 (top) to 1 (bottom)
          const y = topY + t * funnelHeight;

          // Hyperbolic Funnel Radius profile: wide top -> narrow waist -> slight base flare
          // Profile formula: parabolic hyperbolic curve
          const topRadius = Math.min(width * 0.42, 240);
          const waistRadius = Math.min(width * 0.11, 62);
          const flareRadius = Math.min(width * 0.19, 105);

          let currentRadius: number;
          if (t < 0.72) {
            // Upper funnel tapering smoothly to waist
            const k = t / 0.72;
            currentRadius = topRadius * (1 - Math.pow(k, 0.75)) + waistRadius * Math.pow(k, 0.75);
          } else {
            // Lower waist flaring slightly into base
            const k = (t - 0.72) / 0.28;
            currentRadius = waistRadius * (1 - k) + flareRadius * k;
          }

          // Spiral angle twists as it descends
          const twist = Math.pow(t, 1.35) * 5.4;
          const angle = strandOffset + rotation + twist;

          // 3D coordinates
          const worldX = Math.cos(angle) * currentRadius;
          const worldZ = Math.sin(angle) * currentRadius;

          // 3D Perspective Projection
          const distance = PERSPECTIVE + worldZ;
          const projScale = PERSPECTIVE / Math.max(distance, 1);

          const projX = centerX + worldX * projScale;
          const projY = y + (worldZ * 0.12); // subtle tilt forward

          // Compute strand brightness based on Z-depth (front = bright, back = faint)
          const zDepth = (worldZ + topRadius) / (topRadius * 2); // 0 to 1
          const depthAlpha = Math.max(0.08, Math.min(0.95, zDepth * 0.9));

          if (firstPoint) {
            ctx.moveTo(projX, projY);
            firstPoint = false;
          } else {
            ctx.lineTo(projX, projY);
          }

          // Set stroke style at the end of the strand segment
          if (i === STEPS) {
            if (isGold) {
              ctx.strokeStyle = `rgba(245, 184, 46, ${depthAlpha * 0.85})`;
              ctx.lineWidth = 1.3;
            } else {
              ctx.strokeStyle = `rgba(255, 255, 255, ${depthAlpha * 0.65})`;
              ctx.lineWidth = 0.9;
            }
            ctx.stroke();
          }
        }
      }

      // Draw Spill Particles & Glowing Embers
      for (let p = 0; p < particles.length; p++) {
        const pt = particles[p];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.alpha -= 0.0035;

        // Reset if expired or out of bounds
        if (pt.alpha <= 0 || pt.y < topY - 20 || Math.abs(pt.x) > width * 0.45) {
          pt.x = (Math.random() - 0.5) * 120;
          pt.y = topY + Math.random() * (funnelHeight * 0.85);
          pt.vx = (Math.random() - 0.5) * 0.5 + (pt.x > 0 ? 0.35 : -0.35);
          pt.vy = -Math.random() * 0.4 - 0.15;
          pt.alpha = pt.maxAlpha;
        }

        ctx.beginPath();
        ctx.arc(centerX + pt.x, pt.y, pt.size, 0, Math.PI * 2);
        if (pt.color === '#f5b82e') {
          ctx.fillStyle = `rgba(245, 184, 46, ${pt.alpha})`;
          ctx.shadowColor = '#f5b82e';
          ctx.shadowBlur = 6;
        } else {
          ctx.fillStyle = `rgba(255, 255, 255, ${pt.alpha})`;
          ctx.shadowColor = '#ffffff';
          ctx.shadowBlur = 4;
        }
        ctx.fill();
        ctx.shadowBlur = 0; // reset
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <section className={styles.heroViewport}>
      {/* Background Radial Light Mist with White & Gold Luminance */}
      <div className={styles.ambientLuminance} aria-hidden="true" />

      <div className={styles.heroContainer}>
        {/* LEFT COLUMN: Commanding Value Proposition */}
        <div className={styles.leftCol}>
          <div className={styles.badgeRow}>
            <span className={styles.eyebrowBadge}>
              <Sparkles className={styles.badgeSparkle} />
              <span>FINANCIAL INNOVATION ECOSYSTEM</span>
            </span>
            <span className={styles.verifiedTag}>
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              <span>25,000+ Global Accounts</span>
            </span>
          </div>

          <h1 className={styles.headline}>
            One Ecosystem.{' '}
            <span className={styles.headlineGold}>
              Multiple Financial Engines.
            </span>
          </h1>

          <p className={styles.description}>
            {BRAND_CONFIG.name} Platform is a structured financial innovation
            ecosystem connecting traders, allocators, and capital participants
            with specialized companies across systematic execution, hedge systems,
            hybrid funds, and institutional education.
          </p>

          <div className={styles.ctaGroup}>
            <Link href="/ecosystem" className={styles.primaryWhiteBtn}>
              <span>Explore Ecosystem</span>
              <ChevronRight className="h-4 w-4" />
            </Link>

            <Link href="/login" className={styles.secondaryTextBtn}>
              <Lock className="h-3.5 w-3.5 opacity-70" />
              <span>Unified Sign In</span>
              <ArrowRight className={styles.arrowIcon} />
            </Link>
          </div>

          <div className={styles.subPillarsRow}>
            <div className={styles.pillarItem}>
              <span className={styles.pillarDotGold} />
              <span>Multi-Model Architecture</span>
            </div>
            <div className={styles.pillarItem}>
              <span className={styles.pillarDotWhite} />
              <span>Independent Entity Oversight</span>
            </div>
            <div className={styles.pillarItem}>
              <span className={styles.pillarDotEmerald} />
              <span>Non-Custodial Settlement</span>
            </div>
          </div>
        </div>

        {/* CENTER COLUMN: Interactive Light Vortex Funnel */}
        <div ref={containerRef} className={styles.centerFunnelCol}>
          <canvas ref={canvasRef} className={styles.vortexCanvas} />
        </div>

        {/* RIGHT COLUMN: Funnel Stages & Spill Metrics */}
        <div className={styles.rightCol}>
          <div className={styles.funnelStageList}>
            {FUNNEL_STAGES.map((stage, idx) => (
              <div key={stage.id} className={styles.stageCard}>
                <div className={styles.stageIndicatorLine}>
                  <span
                    className={styles.stagePip}
                    style={{ backgroundColor: stage.toneColor }}
                  />
                  {idx < FUNNEL_STAGES.length - 1 && (
                    <span className={styles.stageVerticalConnector} />
                  )}
                </div>

                <div className={styles.stageContent}>
                  <div className={styles.stageTopRow}>
                    <span className={styles.stageTitle}>{stage.stageName}</span>
                    <span
                      className={styles.stageMetric}
                      style={{
                        color:
                          stage.toneColor === '#f5b82e'
                            ? 'var(--nv-gold)'
                            : stage.toneColor === '#10b981'
                              ? '#34d399'
                              : '#ffffff',
                      }}
                    >
                      {stage.metric}
                    </span>
                  </div>
                  <div className={styles.stageDesc}>{stage.description}</div>
                  <div className={styles.stageSubDetail}>{stage.subDetail}</div>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.rightBottomNote}>
            <ShieldCheck className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <span>
              Real-time multi-engine architecture with verifiable on-chain settlement.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero29;
