'use client';
import * as React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowUpRight,
  ChevronRight,
  Coins,
  FileSpreadsheet,
  Lock,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import {
  AnimatedTabs,
  AuroraBackground,
  Button,
  CountUp,
  DecryptedText,
  EmptyState,
  GradientText,
  ShinyText,
  SpotlightCard,
  StarBorder,
  StatusBadge,
  formatUsdt,
} from '@navrix/ui';
import { apiRequest } from '../../../lib/api';
import { useUiStore } from '../../../store/ui-store';
import styles from './dashboard.module.css';
export default function CustomerDashboardPage() {
  const { user } = useUiStore();
  const [activeTab, setActiveTab] = React.useState('deposits');
  const { data: wallet, isLoading: walletLoading } = useQuery({
    queryKey: ['wallet-overview'],
    queryFn: () => apiRequest('/wallet'),
  });
  const { data: deposits = [] } = useQuery({
    queryKey: ['my-deposits'],
    queryFn: () => apiRequest('/deposits'),
  });
  const { data: investments = [] } = useQuery({
    queryKey: ['my-investments'],
    queryFn: () => apiRequest('/investments'),
  });
  const { data: withdrawals = [] } = useQuery({
    queryKey: ['my-withdrawals'],
    queryFn: () => apiRequest('/withdrawals'),
  });
  const { data: interestHistory = [] } = useQuery({
    queryKey: ['my-interest-history'],
    queryFn: () => apiRequest('/investments/interest-history'),
  });
  const totalNum = Number(wallet?.totalBalance ?? 0);
  const availableNum = Number(wallet?.availableBalance ?? 0);
  const investedNum = Number(wallet?.investedBalance ?? 0);
  const lockedNum = Number(wallet?.lockedBalance ?? 0);
  const pendingDepNum = Number(wallet?.pendingDeposits ?? 0);
  const pendingWdrNum = Number(wallet?.pendingWithdrawals ?? 0);
  const interestNum = Number(wallet?.totalInterestEarned ?? 0);
  const shareOfTotal = (part) => {
    if (totalNum <= 0 || part <= 0) return 0;
    return Math.min(100, Math.round((part / totalNum) * 100));
  };
  const donutData = React.useMemo(() => {
    const active = [
      { name: 'Available', value: Math.max(0, availableNum), color: '#10b981' },
      { name: 'Invested', value: Math.max(0, investedNum), color: '#f5b82e' },
      { name: 'Locked', value: Math.max(0, lockedNum), color: '#38bdf8' },
    ].filter((s) => s.value > 0);
    if (active.length === 0) {
      return [{ name: 'Unallocated', value: 1, color: 'rgba(148, 163, 184, 0.18)' }];
    }
    return active;
  }, [availableNum, investedNum, lockedNum]);
  const kpiRibbon = [
    {
      label: 'Available',
      numValue: availableNum,
      tone: 'emerald',
      elevated: true,
      pct: shareOfTotal(availableNum),
      icon: <Wallet className="h-3.5 w-3.5 text-emerald-400" />,
    },
    {
      label: 'Invested',
      numValue: investedNum,
      tone: 'gold',
      elevated: true,
      pct: shareOfTotal(investedNum),
      icon: <TrendingUp className="h-3.5 w-3.5 text-amber-400" />,
    },
    {
      label: 'Total Yield',
      numValue: interestNum,
      tone: 'emerald',
      icon: <Sparkles className="h-3.5 w-3.5 text-emerald-300" />,
    },
    {
      label: 'Pending In',
      numValue: pendingDepNum,
      tone: 'gold',
      icon: <ArrowDownToLine className="h-3.5 w-3.5 text-amber-300" />,
    },
    {
      label: 'Pending Out',
      numValue: pendingWdrNum,
      tone: 'cyan',
      icon: <ArrowUpFromLine className="h-3.5 w-3.5 text-sky-400" />,
    },
    {
      label: 'Locked',
      numValue: lockedNum,
      tone: 'violet',
      pct: shareOfTotal(lockedNum),
      icon: <Lock className="h-3.5 w-3.5 text-purple-400" />,
    },
  ];
  const tabItems = [
    { id: 'deposits', label: 'Deposits', count: deposits.length },
    { id: 'investments', label: 'Vaults', count: investments.length },
    { id: 'yield', label: 'Yield', count: interestHistory.length },
    { id: 'withdrawals', label: 'Payouts', count: withdrawals.length },
  ];
  const activeTabRoute = {
    deposits: { href: '/deposit', label: 'All Deposits' },
    investments: { href: '/investments', label: 'All Vaults' },
    yield: { href: '/interest-history', label: 'Yield Ledger' },
    withdrawals: { href: '/withdraw', label: 'All Payouts' },
  };
  return (
    <div className={styles.dashboardGrid}>
      {/* Row 1: Compact Single-Line Executive Vault Bar */}
      <div data-tour="vault-balances">
        <StarBorder color="#F5B82E" speed="8s">
          <AuroraBackground variant="gold" intensity="vivid" className={styles.heroStrip}>
            <div className={styles.heroLeft}>
              <div className={styles.heroMetaRow}>
                <span className={styles.vaultTag}>
                  <ShinyText text="BEP-20 VAULT" />
                </span>
                <span className={styles.uidChip}>
                  <DecryptedText text={user?.uid || 'USR-000000'} />
                </span>
                <span className={styles.verifiedTag}>
                  <ShieldCheck className="h-3 w-3 text-emerald-400" />
                  Total Balance
                </span>
              </div>

              <div className={styles.heroBalanceLine}>
                <span className={styles.totalAmount}>
                  {walletLoading ? (
                    <span className="opacity-50">0.00</span>
                  ) : (
                    <GradientText variant="gold">
                      <CountUp value={totalNum} decimals={2} />
                    </GradientText>
                  )}
                  <span className={styles.totalUnit}>USDT</span>
                </span>

                <span className={styles.yieldPill}>
                  <Coins className="h-3 w-3" />
                  +<CountUp value={interestNum} decimals={2} /> USDT Yield
                </span>
              </div>
            </div>

            <div className={styles.actionPills}>
              <Link href="/deposit" className={styles.pillPrimary}>
                <ArrowDownToLine className="h-3.5 w-3.5" />
                <span>Deposit QR</span>
              </Link>
              <Link href="/withdraw" className={styles.pillSecondary}>
                <ArrowUpFromLine className="h-3.5 w-3.5 text-sky-400" />
                <span>Withdraw</span>
              </Link>
              <Link href="/investments" className={styles.pillSecondary}>
                <TrendingUp className="h-3.5 w-3.5 text-amber-400" />
                <span>Vaults ({investments.length})</span>
              </Link>
              <Link href="/transactions" className={styles.pillSecondary}>
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
                <span>Ledger</span>
              </Link>
            </div>
          </AuroraBackground>
        </StarBorder>
      </div>

      {/* Row 2: Compact 6-Column Metric Ribbon */}
      <section className={styles.kpiRibbon} aria-label="Financial Summary">
        {kpiRibbon.map((card) => (
          <SpotlightCard
            key={card.label}
            tone={card.tone}
            elevated={card.elevated}
            className={styles.kpiTile}
          >
            <div className={styles.kpiHead}>
              <span className={styles.kpiName}>{card.label}</span>
              {card.icon}
            </div>
            <div className={styles.kpiNum}>
              {walletLoading ? (
                '...'
              ) : (
                <>
                  <CountUp value={card.numValue} decimals={2} />
                  <span className={styles.kpiAsset}>USDT</span>
                </>
              )}
            </div>
            <div className={styles.microTrack}>
              <div
                className={styles.microFill}
                style={{ width: `${card.pct ?? (card.numValue > 0 ? 100 : 0)}%` }}
              />
            </div>
          </SpotlightCard>
        ))}
      </section>

      {/* Row 3: 3-Column Bento Workspace (Fits Cleanly in Single Screen!) */}
      <div className={styles.mainBento}>
        {/* Col 1: Ledger Equity Progression */}
        <SpotlightCard tone="gold" className={styles.bentoCard}>
          <div className={styles.cardTop}>
            <div>
              <h2 className={styles.cardTitle}>Ledger Balance Curve</h2>
              <p className={styles.cardSub}>Verified append-only MySQL balance history</p>
            </div>
            <Link href="/transactions" className={styles.textLink}>
              Full Ledger
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          {!wallet?.chartSeries || wallet.chartSeries.length === 0 ? (
            <div className={styles.compactEmptyWrap}>
              <EmptyState
                compact
                title="No Ledger Activity Yet"
                description="Verify your first BEP-20 USDT deposit to render your live equity trajectory."
                action={
                  <Link href="/deposit">
                    <Button variant="gold" size="sm">
                      Deposit USDT
                    </Button>
                  </Link>
                }
              />
            </div>
          ) : (
            <div className={styles.chartBox}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={wallet.chartSeries}
                  margin={{ top: 6, right: 6, left: -18, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="nvCompactGold" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F5B82E" stopOpacity={0.38} />
                      <stop offset="95%" stopColor="#F5B82E" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="rgba(148, 163, 184, 0.1)"
                  />
                  <XAxis
                    dataKey="label"
                    stroke="#64748b"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(11, 17, 32, 0.96)',
                      borderColor: 'rgba(245, 184, 46, 0.35)',
                      borderRadius: '10px',
                      fontSize: '11px',
                    }}
                    formatter={(val) => [`${formatUsdt(val)} USDT`, 'Balance']}
                  />
                  <Area
                    type="monotone"
                    dataKey="balance"
                    stroke="#F5B82E"
                    strokeWidth={2.2}
                    fill="url(#nvCompactGold)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </SpotlightCard>

        {/* Col 2: Capital Allocation Ring */}
        <SpotlightCard tone="emerald" className={styles.bentoCard}>
          <div className={styles.cardTop}>
            <div>
              <h2 className={styles.cardTitle}>Allocation</h2>
              <p className={styles.cardSub}>Wallet tier split</p>
            </div>
          </div>

          <div className={styles.donutStack}>
            <div className={styles.donutCanvas}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="66%"
                    outerRadius="90%"
                    paddingAngle={totalNum > 0 ? 3 : 0}
                    stroke="none"
                  >
                    {donutData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className={styles.donutOverlay}>
                <span className={styles.donutTiny}>EQUITY</span>
                <span className={styles.donutTotal}>{formatUsdt(totalNum)}</span>
              </div>
            </div>

            <div className={styles.tierRows}>
              {[
                { label: 'Available', val: availableNum, color: '#10b981' },
                { label: 'Invested', val: investedNum, color: '#f5b82e' },
                { label: 'Locked', val: lockedNum, color: '#38bdf8' },
              ].map((t) => (
                <div key={t.label} className={styles.tierRow}>
                  <span className="flex items-center gap-1.5 text-[11px] opacity-80">
                    <span className={styles.dot} style={{ backgroundColor: t.color }} />
                    {t.label}
                  </span>
                  <span className="text-[11px] font-bold" data-tabular="true">
                    {formatUsdt(t.val)} <span className="opacity-55">({shareOfTotal(t.val)}%)</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </SpotlightCard>

        {/* Col 3: Compact Tabbed Live Activity Feed */}
        <SpotlightCard tone="cyan" className={styles.bentoCard}>
          <div className={styles.activityTop}>
            <AnimatedTabs
              compact
              items={tabItems}
              activeId={activeTab}
              onChange={setActiveTab}
              layoutGroupId="nv-compact-user-tabs"
            />
            <Link
              href={activeTabRoute[activeTab]?.href || '/transactions'}
              className={styles.textLink}
            >
              {activeTabRoute[activeTab]?.label}
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          <div className={styles.feedScroll}>
            {activeTab === 'deposits' ? (
              deposits.length === 0 ? (
                <p className={styles.feedEmpty}>No deposit requests yet.</p>
              ) : (
                deposits.slice(0, 6).map((d) => (
                  <Link
                    key={d.depositUid}
                    href={`/deposit/${d.depositUid}`}
                    className={styles.feedRow}
                  >
                    <div className="min-w-0">
                      <div className={styles.feedUid}>{d.depositUid}</div>
                      <div className={styles.feedDate}>
                        {new Date(d.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className={styles.feedRight}>
                      <span className={styles.feedAmt}>{formatUsdt(d.requestedAmount)} USDT</span>
                      <StatusBadge status={d.status} />
                    </div>
                  </Link>
                ))
              )
            ) : null}

            {activeTab === 'investments' ? (
              investments.length === 0 ? (
                <p className={styles.feedEmpty}>No active vault plans yet.</p>
              ) : (
                investments.slice(0, 6).map((inv) => (
                  <Link
                    key={inv.investmentUid}
                    href={`/investments/${inv.investmentUid}`}
                    className={styles.feedRow}
                  >
                    <div className="min-w-0">
                      <div className={styles.feedUid}>{inv.investmentUid}</div>
                      <div className={styles.feedDate}>Yield: {formatUsdt(inv.interestRate)}%</div>
                    </div>
                    <div className={styles.feedRight}>
                      <span className={styles.feedAmt}>{formatUsdt(inv.principalAmount)} USDT</span>
                      <StatusBadge status={inv.status} />
                    </div>
                  </Link>
                ))
              )
            ) : null}

            {activeTab === 'yield' ? (
              interestHistory.length === 0 ? (
                <p className={styles.feedEmpty}>No yield credits recorded yet.</p>
              ) : (
                interestHistory.slice(0, 6).map((ir) => (
                  <div key={ir.interestUid} className={styles.feedRowStatic}>
                    <div className="min-w-0">
                      <div className={styles.feedUid}>{ir.interestUid}</div>
                      <div className={styles.feedDate}>Period {ir.periodKey}</div>
                    </div>
                    <span className={styles.feedYieldAmt}>+{formatUsdt(ir.amount)} USDT</span>
                  </div>
                ))
              )
            ) : null}

            {activeTab === 'withdrawals' ? (
              withdrawals.length === 0 ? (
                <p className={styles.feedEmpty}>No withdrawal requests yet.</p>
              ) : (
                withdrawals.slice(0, 6).map((w) => (
                  <Link key={w.withdrawalUid} href="/withdraw" className={styles.feedRow}>
                    <div className="min-w-0">
                      <div className={styles.feedUid}>{w.withdrawalUid}</div>
                      <div className={styles.feedDate}>
                        {new Date(w.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className={styles.feedRight}>
                      <span className={styles.feedAmt}>{formatUsdt(w.amount)} USDT</span>
                      <StatusBadge status={w.status} />
                    </div>
                  </Link>
                ))
              )
            ) : null}
          </div>
        </SpotlightCard>
      </div>
    </div>
  );
}
