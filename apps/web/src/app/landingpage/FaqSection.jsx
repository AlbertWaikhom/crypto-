import React from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Minus, Plus } from 'lucide-react';
import { AnimatedContent, usePrefersReducedMotion } from './reactbits-primitives';
import './faq-section.css';

const FAQ_ITEMS = [
  {
    id: 'safe',
    question: 'Is my investment safe on NAVRIX?',
    answer:
      'Yes. NAVRIX uses institutional-grade encryption, strict two-factor authentication (2FA), non-custodial BEP-20 settlement verification, and row-locked double-entry ledger accounting to keep your funds, Stock Market positions, and BND Coin holdings protected.',
  },
  {
    id: 'stock-and-bnd',
    question: 'Can I track and invest across both the Stock Market and BND Coin?',
    answer:
      'Yes. NAVRIX unifies major Stock Market benchmarks (S&P 500, NASDAQ 100, NIFTY 50, and leading equities) alongside BND Coin and institutional digital assets (BTC, ETH, BNB, USDT) inside a single real-time command portfolio.',
  },
  {
    id: 'assets',
    question: 'What cryptocurrencies and market engines can I allocate into?',
    answer:
      'You can monitor and allocate across BND Coin, Bitcoin (BTC), Ethereum (ETH), BNB, Solana (SOL), BEP-20 USDT vaults, and 8 decoupled quantitative, arbitrage, and equity intelligence engines.',
  },
  {
    id: 'fees',
    question: 'Are there any hidden account or deposit fees?',
    answer:
      'No. Account creation, maintenance, and platform deposits carry 0% platform fees, with a transparent 0.10% execution fee clearly displayed prior to confirmation.',
  },
  {
    id: 'withdrawals',
    question: 'How do I withdraw my funds or portfolio returns?',
    answer:
      'Navigate to Withdraw inside your Command Portal, enter your verified destination wallet address, confirm with 2FA, and track real-time on-chain finality directly from your transaction ledger.',
  },
];

export function FaqSection() {
  const [openId, setOpenId] = React.useState('safe');
  const reducedMotion = usePrefersReducedMotion();

  const handleToggle = (id) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <section id="faq" className="lp-faq-section" aria-label="Frequently Asked Questions">
      <AnimatedContent durationMs={600}>
        <div className="lp-faq-header">
          <div>
            <h2 className="lp-faq-title">Frequently Asked Questions</h2>
            <p className="lp-faq-subtitle">
              Quick answers to common questions about Stock Market &amp; BND Coin investing,
              security, and your account.
            </p>
          </div>

          <Link to="/contact" className="lp-faq-view-all">
            <span>Contact Support Desk</span>
            <ArrowRight size={15} />
          </Link>
        </div>

        <div className="lp-faq-accordion" role="region" aria-label="FAQ Accordion">
          {FAQ_ITEMS.map((item) => {
            const isOpen = openId === item.id;
            const panelId = `faq-panel-${item.id}`;
            const triggerId = `faq-trigger-${item.id}`;

            return (
              <div key={item.id} className={`lp-faq-item ${isOpen ? 'is-open' : ''}`}>
                <button
                  id={triggerId}
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => handleToggle(item.id)}
                  className="lp-faq-trigger"
                >
                  <span>{item.question}</span>
                  <span className="lp-faq-trigger-icon" aria-hidden="true">
                    {isOpen ? (
                      <Minus size={16} strokeWidth={2.6} />
                    ) : (
                      <Plus size={16} strokeWidth={2.6} />
                    )}
                  </span>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={panelId}
                      role="region"
                      aria-labelledby={triggerId}
                      initial={reducedMotion ? false : { height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={reducedMotion ? undefined : { height: 0, opacity: 0 }}
                      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div className="lp-faq-panel">{item.answer}</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </AnimatedContent>
    </section>
  );
}
