import React from 'react';
import { AnimatedContent, SpotlightCard } from './reactbits-primitives';
import './feature-section.css';

const FEATURES = [
  {
    id: 'diversified',
    title: 'Diversified Investment',
    description:
      'Access a wide range of Stock Market indices, BND Coin, and top crypto assets in one unified sovereign portfolio.',
    svg: (
      <svg width="30" height="30" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="featLayersGold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FDE68A" />
            <stop offset="55%" stopColor="#F5B82E" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
        </defs>
        <path d="M16 4L4 10.5L16 17L28 10.5L16 4Z" fill="url(#featLayersGold)" />
        <path
          d="M4 16L16 22.5L28 16"
          stroke="#F5B82E"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M4 21.5L16 28L28 21.5"
          stroke="#10B981"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: 'insights',
    title: 'Real-time Insights',
    description:
      'Live Stock Market & BND Coin prices, institutional market trends, and real-time portfolio performance analytics.',
    svg: (
      <svg width="30" height="30" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="featBoltGold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="55%" stopColor="#F5B82E" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
        </defs>
        <path
          d="M18.5 3L6.5 17.5H15.5L13.5 29L25.5 14.5H16.5L18.5 3Z"
          fill="url(#featBoltGold)"
          stroke="#FDE68A"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: 'security',
    title: 'Security First',
    description:
      'Your data, Stock Market allocations, and BND Coin assets are protected with multi-layer institutional security.',
    svg: (
      <svg width="30" height="30" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="featShieldGold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FDE68A" />
            <stop offset="50%" stopColor="#F5B82E" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
        </defs>
        <path
          d="M16 3.5L5.5 8V15.5C5.5 22.4 10 28.2 16 30C22 28.2 26.5 22.4 26.5 15.5V8L16 3.5Z"
          fill="url(#featShieldGold)"
          fillOpacity="0.9"
        />
        <path
          d="M12 16.5L14.8 19.3L20.5 13.5"
          stroke="#070b14"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
];

export function FeatureSection() {
  return (
    <section id="features" className="lp-features-section" aria-label="Platform Core Features">
      <div className="lp-features-grid">
        {FEATURES.map((feature, index) => (
          <AnimatedContent key={feature.id} delay={index * 0.1} durationMs={600} className="h-full">
            <SpotlightCard className="h-full">
              <div className="lp-feature-card-inner">
                <div className="lp-feature-icon-tile">{feature.svg}</div>
                <h2 className="lp-feature-title">{feature.title}</h2>
                <p className="lp-feature-desc">{feature.description}</p>
              </div>
            </SpotlightCard>
          </AnimatedContent>
        ))}
      </div>
    </section>
  );
}
