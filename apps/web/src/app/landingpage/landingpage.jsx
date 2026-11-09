import React from 'react';
import { useLocation } from 'react-router-dom';
import { SiteHeader } from '../../components/SiteHeader';
import { SiteFooter } from '../../components/SiteFooter';
import { HeroSection } from './HeroSection';
import { MarketTicker } from './MarketTicker';
import { FeatureSection } from './FeatureSection';
import { MarketChartSection } from './MarketChartSection';
import { HowItWorksSection } from './HowItWorksSection';
import { SecuritySection } from './SecuritySection';
import { StatsFeeSection } from './StatsFeeSection';
import { FaqSection } from './FaqSection';
import { CtaSection } from './CtaSection';
import './landingpage.css';

export default function LandingPage() {
  const { hash } = useLocation();

  React.useEffect(() => {
    if (!hash) return;
    const targetId = hash.replace('#', '');
    const targetEl = document.getElementById(targetId);
    if (targetEl) {
      window.requestAnimationFrame(() => {
        targetEl.scrollIntoView({ behavior: 'smooth' });
      });
    }
  }, [hash]);

  return (
    <div className="navrix-landing-root">
      {/* Navbar — 400ms fade-in on page load */}
      <SiteHeader />

      <main className="navrix-landing-main">
        {/* 01 Hero Headline (SplitText) + 02 Aurora/Particles + 03 PortfolioCard */}
        <HeroSection />

        {/* 05 Live Stock Market, BND Coin & Crypto Ticker (LogoLoop) */}
        <MarketTicker />

        {/* 06 Feature Cards (SpotlightCard + AnimatedContent) */}
        <FeatureSection />

        {/* 04 Interactive Stock Market & BND Coin Chart (TradingView Lightweight Charts) */}
        <MarketChartSection />

        {/* 07 Investment Steps (HowItWorks + AnimatedContent) */}
        <HowItWorksSection />

        {/* 08 Security Section (3D Gold/Emerald Shield + Framer Motion) */}
        <SecuritySection />

        {/* 09 Transparent Fees & Financial Statistics (CountUp 1,500ms) */}
        <StatsFeeSection />

        {/* 10 Frequently Asked Questions (Accordion with NAVRIX Gold active bar) */}
        <FaqSection />

        {/* 11 Final Call-To-Action Banner + 3D Mobile Device Preview */}
        <CtaSection />
      </main>

      {/* 12 Institutional Footer */}
      <SiteFooter hideTopCta />
    </div>
  );
}
