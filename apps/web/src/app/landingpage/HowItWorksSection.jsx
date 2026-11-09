import React from 'react';
import { ArrowRight, TrendingUp, UserPlus, Wallet } from 'lucide-react';
import { AnimatedContent } from './reactbits-primitives';
import './how-it-works.css';

const STEPS = [
  {
    id: 'step-1',
    title: '1. Create an Account',
    description:
      'Sign up in minutes with your email or Google account and complete quick verification.',
    icon: <UserPlus size={25} strokeWidth={2.2} />,
  },
  {
    id: 'step-2',
    title: '2. Add Funds',
    description: 'Deposit securely using supported institutional & multi-chain settlement methods.',
    icon: <Wallet size={25} strokeWidth={2.2} />,
  },
  {
    id: 'step-3',
    title: '3. Invest & Grow',
    description:
      'Choose Stock Market indices, BND Coin, or top crypto assets and start building your portfolio.',
    icon: <TrendingUp size={25} strokeWidth={2.2} />,
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="lp-steps-section" aria-label="How It Works">
      <AnimatedContent durationMs={600} className="lp-steps-header">
        <h2 className="lp-steps-title">Get started in 3 simple steps</h2>
        <p className="lp-steps-subtitle">
          Create your account, add funds, and start building your stock &amp; crypto portfolio.
        </p>
      </AnimatedContent>

      <div className="lp-steps-grid">
        {STEPS.map((step, index) => (
          <React.Fragment key={step.id}>
            <AnimatedContent delay={index * 0.12} durationMs={600} className="h-full">
              <div className="lp-step-card">
                <div className="lp-step-icon-box">{step.icon}</div>
                <h3 className="lp-step-heading">{step.title}</h3>
                <p className="lp-step-desc">{step.description}</p>
              </div>
            </AnimatedContent>

            {index < STEPS.length - 1 && (
              <div className="lp-step-connector" aria-hidden="true">
                <ArrowRight size={22} />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </section>
  );
}
