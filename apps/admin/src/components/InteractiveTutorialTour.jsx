'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpFromLine,
  Award,
  Check,
  ChevronLeft,
  ChevronRight,
  Coins,
  Cpu,
  Crown,
  FileSpreadsheet,
  HelpCircle,
  LayoutDashboard,
  Layers,
  Network,
  RotateCcw,
  Settings,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { isAdminRole } from '@navrix/types';
import { useAdminStore } from '../store/admin-store';
import { adminApi as apiRequest } from '../lib/api';
import styles from './interactive-tutorial-tour.module.css';

const useUiStore = () => ({});

// ---------------------------------------------------------------------------
// 1. Role-Based Tutorial Step Definitions
// ---------------------------------------------------------------------------

const USER_TUTORIAL_STEPS = [
  {
    id: 'vault-balances',
    title: 'Portfolio Overview & Vault Balances',
    subtitle: 'Track your sovereign BEP-20 USDT equity in real-time',
    description:
      'View your Available Balance (ready for deployment or withdrawal), Invested Balance (actively working in quantitative vaults), and lifetime Yield Accruals with cryptographic precision.',
    targetSelector: '[data-tour="vault-balances"]',
    fallbackRoute: '/dashboard',
    highlightHint: 'Dashboard · Real-Time Equity',
    icon: Wallet,
  },
  {
    id: 'vault-plans',
    title: 'Vault Plans & Capital Staking',
    subtitle: 'Automated quantitative strategy allocations',
    description:
      'Explore our audited quantitative investment plans. Stake USDT into Botxp Semi-Auto, ARB24x5 Hedge, or Novex Pooled Capital with automated daily yield accrual.',
    targetSelector: '[data-tour="nav-investments"]',
    fallbackRoute: '/investments',
    highlightHint: 'Navigation · Vault Plans',
    icon: TrendingUp,
  },
  {
    id: 'yield-credits',
    title: 'Daily Yield Accruals',
    subtitle: 'Mathematical returns credited directly to your balance',
    description:
      'Monitor every periodic yield credit in the Yield Ledger. Earnings are deposited directly into your available balance without manual lockups or hidden deductions.',
    targetSelector: '[data-tour="nav-yield"]',
    fallbackRoute: '/interest-history',
    highlightHint: 'Navigation · Yield Credits',
    icon: Coins,
  },
  {
    id: 'deposit-usdt',
    title: 'Dedicated On-Chain Deposits',
    subtitle: 'BEP-20 USDT transfer with 12-block SLA verification',
    description:
      'Generate dynamic deposit orders mapped to your public USR-xxxx identifier. Send BEP-20 USDT from Binance, Trust Wallet, or MetaMask and submit the 66-character tx hash.',
    targetSelector: '[data-tour="nav-deposit"]',
    fallbackRoute: '/deposit',
    highlightHint: 'Navigation · Deposit USDT',
    icon: ArrowDownToLine,
  },
  {
    id: 'withdraw-usdt',
    title: 'Frictionless Withdrawals',
    subtitle: 'Atomic escrow settlement directly to your BSC wallet',
    description:
      'Request principal or yield payouts at any time. Liquidity is escrow-locked during SLA review to prevent overdrafts, then dispatched directly on-chain to your destination address.',
    targetSelector: '[data-tour="nav-withdraw"]',
    fallbackRoute: '/withdraw',
    highlightHint: 'Navigation · Withdraw USDT',
    icon: ArrowUpFromLine,
  },
  {
    id: 'referral-system',
    title: 'Multi-Level Refer & Earn (10 Levels)',
    subtitle: 'Earn continuous commission from your affiliate network',
    description:
      'Share your unique referral link to earn 8% on Level 1 direct referrals, 4% on Level 2, 2% on Levels 3–5, and 1% on Levels 6–10. Inspect your visual downline organogram and instant ledger payouts.',
    targetSelector: '[data-tour="nav-referrals"]',
    fallbackRoute: '/referrals',
    highlightHint: 'Navigation · Refer & Earn',
    icon: Share2Icon,
  },
  {
    id: 'security-compliance',
    title: 'Security, KYC & Compliance',
    subtitle: 'Institutional protection and double-entry transparency',
    description:
      'Enforce TOTP 2FA authenticator app protection, review active login sessions, verify jurisdiction compliance, and customize your tutorial preferences at any time.',
    targetSelector: '[data-tour="nav-security"]',
    fallbackRoute: '/security',
    highlightHint: 'Navigation · Security & Profile',
    icon: ShieldCheck,
  },
];

const ADMIN_TUTORIAL_STEPS = [
  {
    id: 'admin-command-deck',
    title: 'Operations Command Deck',
    subtitle: 'Platform-wide telemetry, liquidity & SLA metrics',
    description:
      'Monitor aggregate USDT vault liquidity, pending deposit/withdrawal queues, active user sessions, and double-entry ledger equity across the platform in real-time.',
    targetSelector: '[data-tour="admin-command-deck"]',
    fallbackRoute: '/admin/dashboard',
    highlightHint: 'Command · Ops Deck',
    icon: LayoutDashboard,
  },
  {
    id: 'admin-deposits',
    title: 'Deposits Queue & BSC Verification',
    subtitle: 'Cryptographic transaction validation & SLA reviews',
    description:
      'Review inbound BEP-20 USDT submissions. Query BSC on-chain blocks, inspect transaction hashes, and approve deposits to atomically credit investments and distribute multi-level referral commissions.',
    targetSelector: '[data-tour="admin-deposits"]',
    fallbackRoute: '/admin/deposits',
    highlightHint: 'Treasury Ops · Deposits Queue',
    icon: ArrowDownToLine,
  },
  {
    id: 'admin-withdrawals',
    title: 'Withdrawals Escrow & Processing',
    subtitle: 'Authorize outbound payouts with liquidity protection',
    description:
      'Verify withdrawal requests, review destination addresses, and confirm on-chain payouts. Balance transitions are atomically locked to prevent double-spending or overdrafts.',
    targetSelector: '[data-tour="admin-withdrawals"]',
    fallbackRoute: '/admin/withdrawals',
    highlightHint: 'Treasury Ops · Withdrawals',
    icon: ArrowUpFromLine,
  },
  {
    id: 'admin-referrals',
    title: 'Multi-Level Referral Chain Management',
    subtitle: '10-Level affiliate tree, downlines & payout audit',
    description:
      'Inspect the complete multi-tier affiliate organogram down to 10 levels. Track network investment volume, audit every commission credited, and manually assign or update referrers with cycle validation.',
    targetSelector: '[data-tour="admin-referrals"]',
    fallbackRoute: '/admin/referrals',
    highlightHint: 'Ledger & Audit · Referral Chain',
    icon: Network,
  },
  {
    id: 'admin-investments',
    title: 'Investment Vaults & Yield Engine',
    subtitle: 'Portfolio monitoring and automated interest distribution',
    description:
      'Inspect all active customer vault plans. Run the daily yield calculation engine, review interest credits, and update quantitative plan APR parameters.',
    targetSelector: '[data-tour="admin-investments"]',
    fallbackRoute: '/admin/investments',
    highlightHint: 'Treasury Ops · Investments & Interest',
    icon: TrendingUp,
  },
  {
    id: 'admin-ledger',
    title: 'Double-Entry Ledger & On-Chain Audit',
    subtitle: 'Zero-discrepancy mathematical accounting records',
    description:
      'Every financial mutation creates an immutable double-entry ledger entry. Cross-reference internal balances against Binance Smart Chain on-chain contracts with mathematical certainty.',
    targetSelector: '[data-tour="admin-ledger"]',
    fallbackRoute: '/admin/ledger',
    highlightHint: 'Ledger & Audit · Immutable Ledger',
    icon: FileSpreadsheet,
  },
  {
    id: 'admin-settings',
    title: 'Governance, System Params & Tutorial Settings',
    subtitle: 'Global parameters, circuit breakers and tutorial controls',
    description:
      'Configure minimum/maximum deposit thresholds, review SLAs, toggle emergency circuit breakers, and review or customize admin and user tutorial settings.',
    targetSelector: '[data-tour="admin-settings"]',
    fallbackRoute: '/admin/settings',
    highlightHint: 'Governance · System Params',
    icon: Settings,
  },
];

function Share2Icon(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// 2. Interactive Tutorial Tour Overlay Component
// ---------------------------------------------------------------------------

export function InteractiveTutorialTour() {
  const router = useRouter();
  const pathname = usePathname();
  const uiUser = useUiStore((s) => s.user);
  const uiToken = useUiStore((s) => s.accessToken);
  const setUiSession = useUiStore((s) => s.setSession);

  const adminUser = useAdminStore((s) => s.user);
  const adminToken = useAdminStore((s) => s.accessToken);
  const setAdminSession = useAdminStore((s) => s.setAdminSession);

  const isAdminPath = Boolean(pathname && pathname.startsWith('/admin'));
  const user = isAdminPath ? adminUser || uiUser : uiUser || adminUser;
  const accessToken = isAdminPath ? adminToken || uiToken : uiToken || adminToken;

  const [isOpen, setIsOpen] = React.useState(false);
  const [currentStepIndex, setCurrentStepIndex] = React.useState(0);
  const [targetRect, setTargetRect] = React.useState(null);
  const [tooltipPos, setTooltipPos] = React.useState({
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
  });

  // Determine role-based steps
  const isAdmin = Boolean(user && isAdminRole(user.role));
  const steps = isAdmin ? ADMIN_TUTORIAL_STEPS : USER_TUTORIAL_STEPS;
  const currentStep = steps[currentStepIndex] || steps[0];
  const totalSteps = steps.length;
  const IconComponent = currentStep.icon;

  // 1. Automatic First-Time Login Trigger
  React.useEffect(() => {
    if (!user || !accessToken) return;

    // Trigger tour on first login if tutorialEnabled is true AND not yet completed
    const shouldAutoLaunch =
      user.tutorialEnabled !== false &&
      user.tutorialCompleted !== true &&
      !sessionStorage.getItem(`navrix_tour_skipped_${user.uid}`);

    if (shouldAutoLaunch) {
      const timer = setTimeout(() => {
        setIsOpen(true);
        setCurrentStepIndex(0);
      }, 750);
      return () => clearTimeout(timer);
    }
  }, [user, accessToken]);

  // 2. Listen for manual "Review Tutorial" dispatch event from Settings or Header
  React.useEffect(() => {
    const handleStartEvent = (e) => {
      const stepIdx = e?.detail?.stepIndex ?? 0;
      setCurrentStepIndex(stepIdx);
      setIsOpen(true);
    };

    window.addEventListener('navrix:start-tutorial', handleStartEvent);
    return () => window.removeEventListener('navrix:start-tutorial', handleStartEvent);
  }, []);

  // 3. Highlight and elevate active target element with crystal clear readability
  React.useEffect(() => {
    if (!isOpen || !currentStep) return undefined;

    const selector = currentStep.targetSelector;
    const targetEl = selector ? document.querySelector(selector) : null;

    if (targetEl) {
      targetEl.classList.add(styles.targetHighlighted);
    }

    return () => {
      if (targetEl) {
        targetEl.classList.remove(styles.targetHighlighted);
      }
      document.querySelectorAll(`.${styles.targetHighlighted}`).forEach((el) => {
        el.classList.remove(styles.targetHighlighted);
      });
    };
  }, [isOpen, currentStepIndex, currentStep]);

  // 4. Spotlight Target Element Locator & Bounding Box Calculation
  const updateTargetPosition = React.useCallback(() => {
    if (!isOpen || !currentStep) return;

    const selector = currentStep.targetSelector;
    let targetEl = null;

    if (selector) {
      targetEl = document.querySelector(selector);
    }

    if (targetEl) {
      // Target found on current screen
      const rect = targetEl.getBoundingClientRect();
      // Scroll into view if out of viewport
      if (rect.top < 0 || rect.bottom > window.innerHeight) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      setTargetRect({
        top: Math.max(8, rect.top - 6),
        left: Math.max(8, rect.left - 6),
        width: rect.width + 12,
        height: rect.height + 12,
      });

      // Calculate Tooltip position relative to target element
      const cardWidth = Math.min(440, window.innerWidth - 32);
      const cardHeight = 310;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      let topPos;
      let leftPos = Math.max(16, Math.min(rect.left, window.innerWidth - cardWidth - 16));

      if (spaceBelow >= cardHeight + 20) {
        // Place below target
        topPos = rect.bottom + 14;
      } else if (spaceAbove >= cardHeight + 20) {
        // Place above target
        topPos = Math.max(16, rect.top - cardHeight - 14);
      } else {
        // Center vertically beside or in window
        topPos = Math.max(16, (window.innerHeight - cardHeight) / 2);
      }

      setTooltipPos({
        top: `${topPos}px`,
        left: `${leftPos}px`,
        transform: 'none',
      });
    } else {
      // Target not on screen: center tooltip card gracefully
      setTargetRect(null);
      setTooltipPos({
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      });
    }
  }, [isOpen, currentStep]);

  React.useEffect(() => {
    if (!isOpen) return undefined;
    updateTargetPosition();

    const handleResize = () => updateTargetPosition();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [isOpen, currentStepIndex, updateTargetPosition]);

  // 4. Step Navigation
  const handleNext = () => {
    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      handleComplete(true);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    handleComplete(false);
  };

  // 5. Completion & Persistence to Database
  const handleComplete = async (markedAsCompleted = true) => {
    setIsOpen(false);
    if (!user) return;

    if (markedAsCompleted) {
      try {
        const res = await apiRequest(
          '/users/me/tutorial',
          {
            method: 'PATCH',
            body: JSON.stringify({ tutorialCompleted: true }),
          },
          false,
        );
        const updated = res?.data ? { ...user, ...res.data } : { ...user, tutorialCompleted: true };
        if (isAdmin) {
          setAdminSession(accessToken, updated);
        } else {
          setUiSession(accessToken, updated);
        }
      } catch {
        const updated = { ...user, tutorialCompleted: true };
        if (isAdmin) {
          setAdminSession(accessToken, updated);
        } else {
          setUiSession(accessToken, updated);
        }
      }
    } else {
      // Remember skip in current session
      sessionStorage.setItem(`navrix_tour_skipped_${user.uid}`, 'true');
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlayBackdrop} role="dialog" aria-modal="true">
      {/* Clickable backdrop area for closing/skipping when clicking outside */}
      <div className={styles.backdropClickArea} onClick={handleSkip} />

      {/* Darkened backdrop only when NO element is targeted (centered modal fallback) */}
      {!targetRect && <div className={styles.backdropShade} onClick={handleSkip} />}

      {/* Spotlight cutout around the active element (giant box-shadow shades outside, inside is 100% clear) */}
      {targetRect && (
        <div
          className={styles.spotlightFrame}
          style={{
            top: `${targetRect.top}px`,
            left: `${targetRect.left}px`,
            width: `${targetRect.width}px`,
            height: `${targetRect.height}px`,
          }}
        />
      )}

      {/* Floating Tutorial Tooltip Card */}
      <div
        className={styles.tooltipCard}
        style={{
          top: tooltipPos.top,
          left: tooltipPos.left,
          transform: tooltipPos.transform,
        }}
      >
        {/* Header */}
        <div className={styles.cardHeader}>
          <div className={styles.stepMetaRow}>
            <span className={styles.roleBadge}>
              <Sparkles className="w-3 h-3 text-amber-400" />
              {isAdmin ? 'Admin Ops Tour' : 'Investor Portal Tour'}
            </span>
            <span className={styles.stepIndicator}>
              Step {currentStepIndex + 1} of {totalSteps}
            </span>
          </div>

          <button
            type="button"
            onClick={handleSkip}
            className={styles.closeBtn}
            title="Skip Tutorial"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className={styles.cardBody}>
          <div className={styles.titleRow}>
            <div className={styles.iconCircle}>
              <IconComponent className="w-5 h-5" />
            </div>
            <div>
              <h3 className={styles.stepTitle}>{currentStep.title}</h3>
              <p className="text-xs text-amber-300 font-medium">{currentStep.subtitle}</p>
            </div>
          </div>

          <p className={styles.stepDescription}>{currentStep.description}</p>

          <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
            {currentStep.highlightHint && (
              <div className={styles.highlightPill}>
                <Sparkles className="w-3.5 h-3.5" />
                <span>{currentStep.highlightHint}</span>
              </div>
            )}
            {currentStep.fallbackRoute && pathname !== currentStep.fallbackRoute && (
              <button
                type="button"
                onClick={() => {
                  router.push(currentStep.fallbackRoute);
                }}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 hover:text-amber-300 transition-colors underline-offset-4 hover:underline"
              >
                <span>Navigate to view</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Footer & Controls */}
        <div className={styles.cardFooter}>
          {/* Progress dots */}
          <div className={styles.progressDots}>
            {steps.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setCurrentStepIndex(idx)}
                className={`${styles.dot} ${idx === currentStepIndex ? styles.dotActive : ''}`}
                title={`Jump to ${s.title}`}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className={styles.btnGroup}>
            <button type="button" onClick={handleSkip} className={styles.skipLink}>
              Skip Tour
            </button>
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentStepIndex === 0}
              className={`${styles.navBtn} ${styles.prevBtn}`}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Back
            </button>
            <button
              type="button"
              onClick={handleNext}
              className={`${styles.navBtn} ${styles.nextBtn}`}
            >
              {currentStepIndex === totalSteps - 1 ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Finish
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Trigger helper to programmatically restart the tutorial from anywhere
 */
export function startTutorialTour(stepIndex = 0) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('navrix:start-tutorial', { detail: { stepIndex } }));
  }
}
