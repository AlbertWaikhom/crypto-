'use client';

import * as React from 'react';

export interface SpiralFunnelProps {
  strandCount?: number;
  speed?: number;
  color?: string;
  highlightColor?: string;
  swellStrength?: number;
  particleCount?: number;
  glow?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

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

/**
 * SpiralFunnel — React Bits Component (@reactbits-starter/spiral-funnel-tw)
 * Fine threads of light spiral up a turning vortex that swells gently at the pointer's height,
 * tracking softly up and down as particle dust drifts outward and settles back into place.
 */
export function SpiralFunnel({
  strandCount = 64,
  speed = 1,
  color = '#ffffff',
  highlightColor = '#f5b82e',
  swellStrength = 28,
  particleCount = 65,
  glow = true,
  className = '',
  style,
}: SpiralFunnelProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;
    let rotation = 0;

    // Pointer tracking for interactive swelling and tilt
    let targetPointerX = 0;
    let targetPointerY = 0;
    let currentPointerX = 0;
    let currentPointerY = 0;
    let isHovering = false;

    const handlePointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      targetPointerX = e.clientX - rect.left;
      targetPointerY = e.clientY - rect.top;
      isHovering = true;
    };

    const handlePointerLeave = () => {
      isHovering = false;
    };

    container.addEventListener('mousemove', handlePointerMove);
    container.addEventListener('mouseleave', handlePointerLeave);

    const resize = () => {
      if (!container || !canvas) return;
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Default pointer center if not hovering
      if (!isHovering) {
        targetPointerX = width * 0.5;
        targetPointerY = height * 0.5;
        currentPointerX = width * 0.5;
        currentPointerY = height * 0.5;
      }
    };

    resize();
    window.addEventListener('resize', resize);

    // Initialize particle dust
    const particles: Particle[] = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: (Math.random() - 0.5) * 160,
        y: Math.random() * (height || 500),
        vx: (Math.random() - 0.5) * 0.45 + (Math.random() > 0.5 ? 0.35 : -0.35),
        vy: -Math.random() * 0.45 - 0.15,
        size: Math.random() * 1.8 + 0.6,
        alpha: Math.random() * 0.7 + 0.1,
        maxAlpha: Math.random() * 0.75 + 0.25,
        color: Math.random() > 0.4 ? color : highlightColor,
      });
    }

    const PERSPECTIVE = 380;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Smooth pointer interpolation (lerp)
      const lerpFactor = 0.06;
      currentPointerX += (targetPointerX - currentPointerX) * lerpFactor;
      currentPointerY += (targetPointerY - currentPointerY) * lerpFactor;

      const baseCenterX = width * 0.5;
      // Softly tilt and shift center tracking with pointer X
      const tiltShiftX = (currentPointerX - baseCenterX) * 0.08;
      const centerX = baseCenterX + tiltShiftX;

      const topY = height * 0.04;
      const bottomY = height * 0.92;
      const funnelHeight = bottomY - topY;

      rotation += 0.007 * speed;

      // Base Concentric Ripple Rings
      const baseCenterY = bottomY - 6;
      const baseRadiusX = Math.min(width * 0.38, 220);
      const baseRadiusY = baseRadiusX * 0.24;

      for (let ring = 1; ring <= 4; ring++) {
        const ringScale = ring / 4;
        const ringAlpha =
          (0.26 - ring * 0.045) * (0.8 + 0.2 * Math.sin(rotation * 2 + ring));
        ctx.beginPath();
        ctx.ellipse(
          centerX,
          baseCenterY + (ring - 1) * 3,
          baseRadiusX * ringScale,
          baseRadiusY * ringScale,
          0,
          0,
          Math.PI * 2
        );
        ctx.strokeStyle =
          ring % 2 === 0
            ? `${highlightColor}${Math.floor(ringAlpha * 255).toString(16).padStart(2, '0')}`
            : `rgba(255, 255, 255, ${ringAlpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Draw Light Vortex Funnel Strands with dynamic pointer swell
      for (let s = 0; s < strandCount; s++) {
        const strandOffset = (s / strandCount) * Math.PI * 2;
        const isGold = s % 5 === 0;

        ctx.beginPath();
        let firstPoint = true;

        const STEPS = 38;
        for (let i = 0; i <= STEPS; i++) {
          const t = i / STEPS; // 0 (top) to 1 (bottom)
          const y = topY + t * funnelHeight;

          // Base hyperbolic profile
          const topRadius = Math.min(width * 0.42, 240);
          const waistRadius = Math.min(width * 0.11, 62);
          const flareRadius = Math.min(width * 0.19, 105);

          let baseRadius: number;
          if (t < 0.72) {
            const k = t / 0.72;
            baseRadius =
              topRadius * (1 - Math.pow(k, 0.75)) + waistRadius * Math.pow(k, 0.75);
          } else {
            const k = (t - 0.72) / 0.28;
            baseRadius = waistRadius * (1 - k) + flareRadius * k;
          }

          // Gentle Swell calculation at pointer height
          let swell = 0;
          if (isHovering || currentPointerY > 0) {
            const dy = (y - currentPointerY) / 72;
            swell = Math.exp(-dy * dy) * swellStrength;
          }

          const currentRadius = baseRadius + swell;

          // Spiral twist angle
          const twist = Math.pow(t, 1.35) * 5.4;
          const angle = strandOffset + rotation + twist;

          // 3D coordinates
          const worldX = Math.cos(angle) * currentRadius;
          const worldZ = Math.sin(angle) * currentRadius;

          // 3D Perspective Projection
          const distance = PERSPECTIVE + worldZ;
          const projScale = PERSPECTIVE / Math.max(distance, 1);

          const projX = centerX + worldX * projScale;
          const projY = y + worldZ * 0.12;

          // Depth shading (front is brighter than back)
          const zDepth = (worldZ + topRadius) / (topRadius * 2);
          const depthAlpha = Math.max(0.08, Math.min(0.95, zDepth * 0.9));

          if (firstPoint) {
            ctx.moveTo(projX, projY);
            firstPoint = false;
          } else {
            ctx.lineTo(projX, projY);
          }

          if (i === STEPS) {
            if (isGold) {
              ctx.strokeStyle = `${highlightColor}${Math.floor(depthAlpha * 0.88 * 255).toString(16).padStart(2, '0')}`;
              ctx.lineWidth = 1.35;
            } else {
              ctx.strokeStyle = `rgba(255, 255, 255, ${depthAlpha * 0.65})`;
              ctx.lineWidth = 0.95;
            }
            ctx.stroke();
          }
        }
      }

      // Draw particle dust drifting outward & settling
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
        if (pt.color === highlightColor) {
          ctx.fillStyle = `rgba(245, 184, 46, ${pt.alpha})`;
          if (glow) {
            ctx.shadowColor = highlightColor;
            ctx.shadowBlur = 6;
          }
        } else {
          ctx.fillStyle = `rgba(255, 255, 255, ${pt.alpha})`;
          if (glow) {
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur = 4;
          }
        }
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
      container.removeEventListener('mousemove', handlePointerMove);
      container.removeEventListener('mouseleave', handlePointerLeave);
    };
  }, [strandCount, speed, color, highlightColor, swellStrength, particleCount, glow]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden pointer-events-auto ${className}`}
      style={style}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />
    </div>
  );
}

export default SpiralFunnel;
