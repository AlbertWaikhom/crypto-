import React from 'react';
import { motion } from 'framer-motion';
import { Check, Star } from 'lucide-react';
import { AnimatedContent, usePrefersReducedMotion } from './reactbits-primitives';
import './security-section.css';

const SECURITY_POINTS = [
  'Two-factor authentication (2FA)',
  'Encrypted data & secure cold-vault storage',
  'Regular institutional security audits',
  'Fraud monitoring & risk protection',
];

export function SecuritySection() {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <section id="security" className="lp-security-section" aria-label="Security and Trust">
      <AnimatedContent durationMs={600}>
        <div className="lp-security-card">
          {/* 3D Gold & Emerald Sovereign Shield Graphic */}
          <div className="lp-security-shield-wrap">
            <motion.svg
              animate={reducedMotion ? undefined : { y: [0, -6, 0] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
              viewBox="0 0 160 176"
              className="lp-security-shield-svg"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="shieldRimGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#FEF08A" />
                  <stop offset="48%" stopColor="#F5B82E" />
                  <stop offset="100%" stopColor="#92400E" />
                </linearGradient>
                <linearGradient id="shieldCoreGrad" x1="0" y1="0" x2="0.8" y2="1">
                  <stop offset="0%" stopColor="#1E293B" />
                  <stop offset="55%" stopColor="#0C1322" />
                  <stop offset="100%" stopColor="#064E3B" />
                </linearGradient>
                <linearGradient id="padlockGoldGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#FEF9C3" />
                  <stop offset="50%" stopColor="#F5B82E" />
                  <stop offset="100%" stopColor="#D97706" />
                </linearGradient>
              </defs>

              {/* Outer Metallic Shield Bezel */}
              <path
                d="M80 10L18 34V84C18 125.5 44.5 156.5 80 168C115.5 156.5 142 125.5 142 84V34L80 10Z"
                fill="url(#shieldRimGrad)"
              />

              {/* Inner Sovereign Navy & Emerald Core */}
              <path
                d="M80 19L27 40V83.5C27 119.5 49.8 147.2 80 158C110.2 147.2 133 119.5 133 83.5V40L80 19Z"
                fill="url(#shieldCoreGrad)"
              />

              {/* Subtle Vertical Specular Split */}
              <path
                d="M80 19V158C110.2 147.2 133 119.5 133 83.5V40L80 19Z"
                fill="rgba(245, 184, 46, 0.08)"
              />

              {/* Padlock Shackle */}
              <path
                d="M64 78V66C64 57.2 71.2 50 80 50C88.8 50 96 57.2 96 66V78"
                fill="none"
                stroke="#FDE68A"
                strokeWidth="7"
                strokeLinecap="round"
              />

              {/* Padlock Body */}
              <rect x="55" y="76" width="50" height="40" rx="10" fill="url(#padlockGoldGrad)" />

              {/* Keyhole */}
              <circle cx="80" cy="93" r="5" fill="#070b14" />
              <path d="M80 96V105" stroke="#070b14" strokeWidth="4.2" strokeLinecap="round" />
            </motion.svg>
          </div>

          {/* Center Copy */}
          <div className="lp-security-center">
            <div className="lp-security-eyebrow">
              <Star size={12} fill="#F5B82E" color="#F5B82E" />
              <span>Security &amp; Trust</span>
            </div>
            <h2 className="lp-security-title">Your assets, our priority.</h2>
            <p className="lp-security-desc">
              Built with industry-best security practices to keep your account, Stock Market
              allocations, and BND Coin investments safe around the clock.
            </p>
          </div>

          {/* Right Checklist */}
          <ul className="lp-security-checklist">
            {SECURITY_POINTS.map((point) => (
              <li key={point} className="lp-security-check-item">
                <span className="lp-security-check-icon">
                  <Check size={13} strokeWidth={3} />
                </span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </AnimatedContent>
    </section>
  );
}
