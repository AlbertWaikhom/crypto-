'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Award,
  Calculator,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Crown,
  DollarSign,
  ExternalLink,
  Layers,
  Network,
  QrCode,
  Search,
  Share2,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';
import { apiRequest } from '../../../lib/api';
import { useToast } from '../../../components/ToastProvider';
import styles from './referrals.module.css';

const TIER_META = [
  { level: 1, label: 'Level 1', desc: 'Direct Referral', rate: 8, badgeClass: styles.tierL1 },
  {
    level: 2,
    label: 'Level 2',
    desc: 'Referral of your referral',
    rate: 4,
    badgeClass: styles.tierL2,
  },
  { level: 3, label: 'Level 3', desc: '3rd Level Referral', rate: 2, badgeClass: styles.tierL35 },
  { level: 4, label: 'Level 4', desc: '4th Level Referral', rate: 2, badgeClass: styles.tierL35 },
  { level: 5, label: 'Level 5', desc: '5th Level Referral', rate: 2, badgeClass: styles.tierL35 },
  { level: 6, label: 'Level 6', desc: '6th Level Referral', rate: 1, badgeClass: styles.tierL610 },
  { level: 7, label: 'Level 7', desc: '7th Level Referral', rate: 1, badgeClass: styles.tierL610 },
  { level: 8, label: 'Level 8', desc: '8th Level Referral', rate: 1, badgeClass: styles.tierL610 },
  { level: 9, label: 'Level 9', desc: '9th Level Referral', rate: 1, badgeClass: styles.tierL610 },
  {
    level: 10,
    label: 'Level 10',
    desc: '10th Level Referral',
    rate: 1,
    badgeClass: styles.tierL610,
  },
];

export default function ReferralsPage() {
  const toast = useToast();
  const [copiedLink, setCopiedLink] = React.useState(false);
  const [copiedCode, setCopiedCode] = React.useState(false);
  const [simInvestment, setSimInvestment] = React.useState(10000);
  const [treeSearch, setTreeSearch] = React.useState('');
  const [expandedNodes, setExpandedNodes] = React.useState(new Set());
  const [showQrModal, setShowQrModal] = React.useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['referrals-overview'],
    queryFn: () => apiRequest('/referrals/overview'),
  });

  const referralData = data?.data || data;

  // Initialize all nodes as expanded by default on first load
  React.useEffect(() => {
    if (referralData?.hierarchy?.length > 0) {
      const allIds = new Set();
      function collectIds(nodes) {
        for (const n of nodes) {
          allIds.add(n.userId);
          if (n.children?.length > 0) collectIds(n.children);
        }
      }
      collectIds(referralData.hierarchy);
      setExpandedNodes(allIds);
    }
  }, [referralData]);

  const toggleNode = (nodeId) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  const handleCopyLink = () => {
    if (!referralData?.referralLink) return;
    navigator.clipboard.writeText(referralData.referralLink);
    setCopiedLink(true);
    toast.showSuccess({ title: 'Copied!', message: 'Referral link copied to clipboard.' });
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    if (!referralData?.referralCode) return;
    navigator.clipboard.writeText(referralData.referralCode);
    setCopiedCode(true);
    toast.showSuccess({ title: 'Copied!', message: 'Referral code copied to clipboard.' });
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Filter hierarchy by search term
  const filterTree = (nodes, query) => {
    if (!query) return nodes;
    const lower = query.toLowerCase();
    const result = [];
    for (const node of nodes) {
      const match =
        node.name.toLowerCase().includes(lower) ||
        node.publicUid.toLowerCase().includes(lower) ||
        node.emailMasked.toLowerCase().includes(lower);
      const filteredChildren = node.children ? filterTree(node.children, query) : [];
      if (match || filteredChildren.length > 0) {
        result.push({ ...node, children: filteredChildren });
      }
    }
    return result;
  };

  const filteredHierarchy = React.useMemo(() => {
    if (!referralData?.hierarchy) return [];
    return filterTree(referralData.hierarchy, treeSearch);
  }, [referralData, treeSearch]);

  // Compute breakdown totals
  const breakdownTotals = React.useMemo(() => {
    if (!referralData?.breakdown) return { referrals: 0, volume: 0, commission: 0 };
    return referralData.breakdown.reduce(
      (acc, item) => ({
        referrals: acc.referrals + Number(item.referralsCount || 0),
        volume: acc.volume + Number(item.totalInvestment || 0),
        commission: acc.commission + Number(item.commissionEarned || 0),
      }),
      { referrals: 0, volume: 0, commission: 0 },
    );
  }, [referralData]);

  // Render recursive tree node
  const renderTreeNode = (node) => {
    const isExpanded = expandedNodes.has(node.userId);
    const hasChildren = node.children && node.children.length > 0;
    const tierMeta = TIER_META.find((t) => t.level === node.level) || TIER_META[0];

    return (
      <div key={node.userId} className="flex flex-col items-center">
        <div className={styles.treeChildNode}>
          <div className="flex items-center justify-between">
            <span className={`${styles.nodeLevelTag} ${tierMeta.badgeClass}`}>
              Level {node.level} ({tierMeta.rate}%)
            </span>
            {hasChildren && (
              <button
                type="button"
                onClick={() => toggleNode(node.userId)}
                className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold"
              >
                {node.children.length} {node.children.length === 1 ? 'downline' : 'downlines'}
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>
          <div className={styles.nodeName} title={node.name}>
            {node.name}
          </div>
          <div className={styles.nodeUid}>
            {node.publicUid} · {node.emailMasked}
          </div>
          <div className={styles.nodeMetricRow}>
            <span className={styles.nodeMetricLabel}>Invested</span>
            <span className={styles.nodeMetricVal}>
              ${Number(node.totalInvested).toLocaleString()} USDT
            </span>
          </div>
          <div className={styles.nodeMetricRow}>
            <span className={styles.nodeMetricLabel}>Your Commission</span>
            <span className="text-emerald-400 font-mono font-bold text-xs">
              +${Number(node.totalCommissionGeneratedForYou).toLocaleString()} USDT
            </span>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="flex flex-col items-center w-full">
            <div className={styles.treeStem} />
            <div className={styles.treeRowGroup}>
              {node.children.map((child) => renderTreeNode(child))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={styles.pageContainer}>
      {/* 1. Header Banner */}
      <div className={styles.headerBanner}>
        <div className={styles.headerTextGroup}>
          <div className={styles.headerBadgeRow}>
            <span className={styles.headerBadge}>
              <span className={styles.pulseDot} />
              10-Level Affiliate Program
            </span>
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">
              Instant Settlement via BEP-20 USDT
            </span>
          </div>
          <h1 className={styles.headerTitle}>
            Multi-Level <span className={styles.headerTitleGold}>Referral & Earn System</span>
          </h1>
          <p className={styles.headerSubtitle}>
            Earn continuous multi-tier rewards from your network up to{' '}
            <strong className="text-amber-400">10 Levels</strong> whenever they invest in NAVRIX
            quantitative vaults.
          </p>
        </div>

        {/* Quick Share Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <button type="button" onClick={handleCopyLink} className={styles.copyBtn}>
            {copiedLink ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
            {copiedLink ? 'Link Copied!' : 'Share Referral Link'}
          </button>
          <button
            type="button"
            onClick={() => setShowQrModal(true)}
            className={`${styles.copyBtn} ${styles.copyBtnSecondary}`}
          >
            <QrCode className="w-4 h-4" />
            QR Code
          </button>
        </div>
      </div>

      {/* 2. Top 3-Card KPI Summary Grid */}
      <div className={styles.kpiGrid}>
        {/* Card 1: Your Link & Code */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiTopRow}>
            <span className={styles.kpiLabel}>Your Referral Link</span>
            <div className={styles.kpiIconWrap}>
              <Share2 className="w-5 h-5" />
            </div>
          </div>
          <div className={styles.linkCopyBox}>
            <input
              type="text"
              readOnly
              value={referralData?.referralLink || 'Loading...'}
              className={styles.linkInput}
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className={styles.copyBtn}
              title="Copy Referral Link"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedLink ? 'Copied' : 'Copy'}
            </button>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800">
            <span>
              Referral Code:{' '}
              <strong className="text-amber-400 font-mono">
                {referralData?.referralCode || '...'}
              </strong>
            </span>
            <button
              type="button"
              onClick={handleCopyCode}
              className="text-amber-400 hover:text-amber-300 font-semibold"
            >
              {copiedCode ? 'Copied!' : 'Copy Code'}
            </button>
          </div>
        </div>

        {/* Card 2: Network Growth */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiTopRow}>
            <span className={styles.kpiLabel}>Total Referrals</span>
            <div className={styles.kpiIconWrap}>
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className={styles.kpiValueRow}>
            <span className={styles.kpiValue}>
              {referralData ? referralData.totalReferrals.toLocaleString() : '0'}
            </span>
            <span className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              {referralData?.activeLevelsCount || 0} Levels Active
            </span>
          </div>
          <div className={styles.kpiSubtext}>
            <span>
              Direct (L1):{' '}
              <strong className="text-slate-200">{referralData?.directReferrals || 0}</strong>
            </span>
            <span className="text-slate-600">·</span>
            <span>
              Network (L2–10):{' '}
              <strong className="text-slate-200">{referralData?.networkReferrals || 0}</strong>
            </span>
          </div>
        </div>

        {/* Card 3: Total Rewards Earned */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiTopRow}>
            <span className={styles.kpiLabel}>Total Referral Rewards</span>
            <div className={styles.kpiIconWrap}>
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className={styles.kpiValueRow}>
            <span className={`${styles.kpiValue} ${styles.kpiValueGold}`}>
              $
              {referralData
                ? Number(referralData.totalEarnedUsdt).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })
                : '0.00'}
            </span>
            <span className="text-xs text-slate-400 font-mono">USDT</span>
          </div>
          <div className={styles.kpiSubtext}>
            <span>
              Network Investment:{' '}
              <strong className="text-slate-200">
                $
                {referralData
                  ? Number(referralData.totalNetworkVolumeUsdt).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })
                  : '0.00'}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* 3. Commission Structure & Live Example Calculator */}
      <div className={styles.structureSection}>
        {/* Commission Tiers Breakdown */}
        <div className={styles.structureCard}>
          <div className={styles.cardHeaderTitle}>
            <Layers className="w-5 h-5 text-amber-400" />
            Commission Structure (Up to 10 Levels)
          </div>
          <div className={styles.tiersList}>
            <div className={styles.tierRow}>
              <div className="flex items-center gap-2">
                <span className={`${styles.tierBadgeLevel} ${styles.tierL1}`}>Level 1</span>
                <span className={styles.tierRelation}>Direct Referral</span>
              </div>
              <span className={styles.tierRatePill}>8%</span>
            </div>
            <div className={styles.tierRow}>
              <div className="flex items-center gap-2">
                <span className={`${styles.tierBadgeLevel} ${styles.tierL2}`}>Level 2</span>
                <span className={styles.tierRelation}>Referral of your referral</span>
              </div>
              <span className={styles.tierRatePill}>4%</span>
            </div>
            <div className={styles.tierRow}>
              <div className="flex items-center gap-2">
                <span className={`${styles.tierBadgeLevel} ${styles.tierL35}`}>Level 3 – 5</span>
                <span className={styles.tierRelation}>3rd to 5th level referrals</span>
              </div>
              <span className={styles.tierRatePill}>2% each</span>
            </div>
            <div className={styles.tierRow}>
              <div className="flex items-center gap-2">
                <span className={`${styles.tierBadgeLevel} ${styles.tierL610}`}>Level 6 – 10</span>
                <span className={styles.tierRelation}>6th to 10th level referrals</span>
              </div>
              <span className={styles.tierRatePill}>1% each</span>
            </div>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Commissions are calculated automatically upon deposit approval and credited immediately
            to your available USDT balance with full double-entry audit records.
          </p>
        </div>

        {/* Live Example Calculator */}
        <div className={styles.structureCard}>
          <div className={styles.cardHeaderTitle}>
            <Calculator className="w-5 h-5 text-amber-400" />
            Live Example Calculator
          </div>
          <div className={styles.calcInputWrap}>
            <div className={styles.calcLabelRow}>
              <span>If users at each level invest:</span>
              <span className="font-mono text-amber-400 font-bold">
                ${simInvestment.toLocaleString()} USDT
              </span>
            </div>
            <input
              type="range"
              min="1000"
              max="50000"
              step="1000"
              value={simInvestment}
              onChange={(e) => setSimInvestment(Number(e.target.value))}
              className="w-full accent-amber-400 cursor-pointer"
            />
          </div>
          <div className={styles.calcResultList}>
            <div className={styles.calcResultRow}>
              <div className={styles.calcResultLabel}>
                <span className={`${styles.tierBadgeLevel} ${styles.tierL1}`}>Level 1 (8%)</span>
                <span className="text-xs text-slate-400">
                  8% of ${simInvestment.toLocaleString()}
                </span>
              </div>
              <span className={styles.calcResultAmt}>
                +${(simInvestment * 0.08).toLocaleString()} USDT
              </span>
            </div>
            <div className={styles.calcResultRow}>
              <div className={styles.calcResultLabel}>
                <span className={`${styles.tierBadgeLevel} ${styles.tierL2}`}>Level 2 (4%)</span>
                <span className="text-xs text-slate-400">
                  4% of ${simInvestment.toLocaleString()}
                </span>
              </div>
              <span className={styles.calcResultAmt}>
                +${(simInvestment * 0.04).toLocaleString()} USDT
              </span>
            </div>
            <div className={styles.calcResultRow}>
              <div className={styles.calcResultLabel}>
                <span className={`${styles.tierBadgeLevel} ${styles.tierL35}`}>Level 3–5 (2%)</span>
                <span className="text-xs text-slate-400">
                  2% of ${simInvestment.toLocaleString()}
                </span>
              </div>
              <span className={styles.calcResultAmt}>
                +${(simInvestment * 0.02).toLocaleString()} USDT each
              </span>
            </div>
            <div className={styles.calcResultRow}>
              <div className={styles.calcResultLabel}>
                <span className={`${styles.tierBadgeLevel} ${styles.tierL610}`}>
                  Level 6–10 (1%)
                </span>
                <span className="text-xs text-slate-400">
                  1% of ${simInvestment.toLocaleString()}
                </span>
              </div>
              <span className={styles.calcResultAmt}>
                +${(simInvestment * 0.01).toLocaleString()} USDT each
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Referral Earnings Breakdown Table */}
      <div className={styles.tableCard}>
        <div className={styles.tableHeaderRow}>
          <div className={styles.cardHeaderTitle}>
            <TrendingUp className="w-5 h-5 text-amber-400" />
            Referral Earnings Breakdown (Level 1 – 10)
          </div>
          <span className="text-xs text-slate-400">Real-time database sync</span>
        </div>
        <div className={styles.tableWrapper}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Level</th>
                <th>Relationship</th>
                <th>Commission Rate</th>
                <th>Referrals</th>
                <th>Total Network Investment</th>
                <th>Your Commission Earned</th>
              </tr>
            </thead>
            <tbody>
              {referralData?.breakdown?.map((item) => {
                const meta = TIER_META.find((t) => t.level === item.level) || TIER_META[0];
                return (
                  <tr key={item.level}>
                    <td>
                      <span className={`${styles.tierBadgeLevel} ${meta.badgeClass}`}>
                        L{item.level}
                      </span>
                    </td>
                    <td className="text-slate-300 font-medium">{meta.desc}</td>
                    <td className="font-mono font-bold text-amber-400">{item.rateLabel}</td>
                    <td className="font-mono">{item.referralsCount}</td>
                    <td className="font-mono">
                      $
                      {Number(item.totalInvestment).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}{' '}
                      USDT
                    </td>
                    <td className="font-mono font-bold text-emerald-400">
                      +$
                      {Number(item.commissionEarned).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}{' '}
                      USDT
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3}>Total Network Summary</td>
                <td className="font-mono">{breakdownTotals.referrals}</td>
                <td className="font-mono">
                  ${breakdownTotals.volume.toLocaleString(undefined, { minimumFractionDigits: 2 })}{' '}
                  USDT
                </td>
                <td className="font-mono text-emerald-400 font-bold">
                  +$
                  {breakdownTotals.commission.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}{' '}
                  USDT
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 5. Complete Referral Hierarchy (Visual Tree View) */}
      <div className={styles.treeSection}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className={styles.cardHeaderTitle}>
            <Network className="w-5 h-5 text-amber-400" />
            Complete Referral Hierarchy (Level 1–10 Tree)
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search downline users..."
              value={treeSearch}
              onChange={(e) => setTreeSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 outline-none focus:border-amber-400"
            />
          </div>
        </div>

        <div className={styles.treeVisualContainer}>
          {/* Root Referrer (You) */}
          <div className={styles.rootUserNode}>
            <Crown className={`w-6 h-6 ${styles.rootCrown}`} />
            <div className={styles.rootNodeTitle}>You (Main Referrer)</div>
            <div className={styles.rootNodeSub}>
              Code: {referralData?.referralCode} · {referralData?.totalReferrals || 0} Network
              Affiliates
            </div>
          </div>

          <div className={styles.treeStem} />

          {/* Child Subtrees */}
          {filteredHierarchy.length > 0 ? (
            <div className={styles.treeRowGroup}>
              {filteredHierarchy.map((child) => renderTreeNode(child))}
            </div>
          ) : (
            <div className={styles.emptyStateBox}>
              <Users className={styles.emptyStateIcon} />
              <div className="text-sm font-semibold text-slate-300">No referrals found yet</div>
              <p className="text-xs text-slate-500 max-w-sm">
                Share your unique referral link to invite investors and earn up to 8% direct
                commission and 4% on Level 2 downlines!
              </p>
              <button type="button" onClick={handleCopyLink} className={styles.copyBtn}>
                <Share2 className="w-4 h-4" />
                Copy Referral Link
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 6. Referral Rewards Transaction History */}
      <div className={styles.tableCard}>
        <div className={styles.tableHeaderRow}>
          <div className={styles.cardHeaderTitle}>
            <Award className="w-5 h-5 text-amber-400" />
            Referral Rewards Payout & Audit History
          </div>
          <span className="text-xs text-slate-400">
            {referralData?.recentCommissions?.length || 0} Transactions
          </span>
        </div>
        <div className={styles.tableWrapper}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Commission UID</th>
                <th>Affiliate User</th>
                <th>Level</th>
                <th>Rate</th>
                <th>Investment Principal</th>
                <th>Reward Credited</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {referralData?.recentCommissions && referralData.recentCommissions.length > 0 ? (
                referralData.recentCommissions.map((comm) => (
                  <tr key={comm.id}>
                    <td className="font-mono text-amber-400 font-semibold">{comm.commissionUid}</td>
                    <td>
                      <div className="font-medium text-slate-200">{comm.investorName}</div>
                      <div className="text-xs text-slate-500 font-mono">{comm.investorUid}</div>
                    </td>
                    <td>
                      <span
                        className={`${styles.tierBadgeLevel} ${comm.level === 1 ? styles.tierL1 : styles.tierL2}`}
                      >
                        Level {comm.level}
                      </span>
                    </td>
                    <td className="font-mono text-emerald-400 font-semibold">
                      {comm.ratePercent}%
                    </td>
                    <td className="font-mono">
                      $
                      {Number(comm.investmentAmount).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}{' '}
                      USDT
                    </td>
                    <td className="font-mono font-bold text-emerald-400">
                      +$
                      {Number(comm.commissionAmount).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}{' '}
                      USDT
                    </td>
                    <td>
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                        <Check className="w-3 h-3" />
                        {comm.status}
                      </span>
                    </td>
                    <td className="text-xs text-slate-400 font-mono">
                      {new Date(comm.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8}>
                    <div className={styles.emptyStateBox}>
                      <Award className={styles.emptyStateIcon} />
                      <div className="text-sm font-semibold text-slate-300">
                        No referral commission payouts yet
                      </div>
                      <p className="text-xs text-slate-500">
                        Commissions appear here immediately when an investor in your network
                        activates a vault plan.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* QR Code Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-amber-400/40 rounded-2xl p-6 max-w-sm w-full flex flex-col items-center gap-4 text-center shadow-2xl">
            <h3 className="text-lg font-bold text-slate-100">Scan to Register</h3>
            <p className="text-xs text-slate-400">
              Share this QR code with new investors to join under your referral code{' '}
              <strong className="text-amber-400 font-mono">{referralData?.referralCode}</strong>.
            </p>
            <div className="p-4 bg-white rounded-xl shadow-inner">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(referralData?.referralLink || '')}`}
                alt="Referral QR Code"
                className="w-48 h-48"
              />
            </div>
            <div className="flex gap-2 w-full">
              <button type="button" onClick={handleCopyLink} className={`flex-1 ${styles.copyBtn}`}>
                Copy Link
              </button>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-sm font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
