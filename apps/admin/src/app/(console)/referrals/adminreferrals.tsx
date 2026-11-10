'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Award,
  ChevronDown,
  ChevronRight,
  Crown,
  Download,
  Filter,
  Link as LinkIcon,
  Network,
  RefreshCw,
  Search,
  Share2,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { adminApi, AdminApiError } from '../../../lib/api';
import styles from './admin-referrals.module.css';

interface AdminOverviewData {
  totalUsers: number;
  usersWithReferrer: number;
  totalCommissionsDistributedUsdt: string;
  totalCommissionsCount: number;
  totalNetworkInvestedUsdt: string;
  levelDistribution: Array<{
    level: number;
    ratePercent: number;
    commissionsCount: number;
    totalCommissionUsdt: string;
    totalInvestedUsdt: string;
  }>;
}

interface ReferralUserRow {
  userId: string;
  publicUid: string;
  name: string;
  email: string;
  role: string;
  status: string;
  referralCode: string;
  referredByUid: string | null;
  referredByName: string | null;
  directReferralsCount: number;
  totalDownlineCount: number;
  totalInvested: string;
  totalCommissionsEarned: string;
  totalCommissionsGenerated: string;
  createdAt: string;
}

interface CommissionAuditRow {
  id: string;
  commissionUid: string;
  referrerUid: string;
  referrerName: string;
  investorUid: string;
  investorName: string;
  investmentUid: string;
  level: number;
  ratePercent: string;
  investmentAmount: string;
  commissionAmount: string;
  asset: string;
  status: string;
  createdAt: string;
  ledgerUid?: string | null;
}

interface TreeNode {
  userId: string;
  publicUid: string;
  name: string;
  emailMasked: string;
  level: number;
  joinedAt: string;
  status: string;
  totalInvested: string;
  activeInvestmentsCount: number;
  totalCommissionGeneratedForYou: string;
  children?: TreeNode[];
}

export default function AdminReferralsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = React.useState<'TREE' | 'USERS' | 'AUDIT'>('TREE');

  // Search and Filters
  const [userSearch, setUserSearch] = React.useState('');
  const [auditSearch, setAuditSearch] = React.useState('');
  const [selectedLevelFilter, setSelectedLevelFilter] = React.useState<number | ''>('');
  const [treeSearch, setTreeSearch] = React.useState('');
  const [expandedNodes, setExpandedNodes] = React.useState<Set<string>>(new Set());

  // Assign Referrer Modal State
  const [assignModal, setAssignModal] = React.useState<{
    isOpen: boolean;
    targetUser?: ReferralUserRow;
    referrerInput: string;
  }>({
    isOpen: false,
    referrerInput: '',
  });

  const [feedback, setFeedback] = React.useState<{
    type: 'ok' | 'err';
    message: string;
  } | null>(null);

  // Queries
  const { data: overview, refetch: refetchOverview } = useQuery<AdminOverviewData>({
    queryKey: ['admin-referrals-overview'],
    queryFn: () => adminApi<AdminOverviewData>('/admin/referrals/overview'),
  });

  const { data: usersData, refetch: refetchUsers } = useQuery<{
    users: ReferralUserRow[];
    total: number;
  }>({
    queryKey: ['admin-referrals-users', userSearch],
    queryFn: () =>
      adminApi<{ users: ReferralUserRow[]; total: number }>(
        `/admin/referrals/users?search=${encodeURIComponent(userSearch)}`,
      ),
  });

  const { data: treeData, refetch: refetchTree } = useQuery<{ rootUsers: TreeNode[] }>({
    queryKey: ['admin-referrals-tree'],
    queryFn: () => adminApi<{ rootUsers: TreeNode[] }>('/admin/referrals/tree'),
  });

  const { data: auditData, refetch: refetchAudit } = useQuery<{
    commissions: CommissionAuditRow[];
    total: number;
  }>({
    queryKey: ['admin-referrals-commissions', auditSearch, selectedLevelFilter],
    queryFn: () =>
      adminApi<{ commissions: CommissionAuditRow[]; total: number }>(
        `/admin/referrals/commissions?search=${encodeURIComponent(auditSearch)}${
          selectedLevelFilter ? `&level=${selectedLevelFilter}` : ''
        }`,
      ),
  });

  // Assign Referrer Mutation
  const assignMutation = useMutation({
    mutationFn: (payload: { targetUserId: string; referrerCodeOrUid: string }) =>
      adminApi('/admin/referrals/assign-referrer', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: (res: any) => {
      setFeedback({ type: 'ok', message: res.message || 'Referrer assigned successfully.' });
      setAssignModal({ isOpen: false, referrerInput: '' });
      void queryClient.invalidateQueries({ queryKey: ['admin-referrals-overview'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-referrals-users'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-referrals-tree'] });
    },
    onError: (err) => {
      setFeedback({
        type: 'err',
        message: err instanceof AdminApiError ? err.message : 'Failed to assign referrer.',
      });
    },
  });

  // Automatically expand root nodes when tree loads
  React.useEffect(() => {
    if (treeData?.rootUsers && treeData.rootUsers.length > 0) {
      const ids = new Set<string>();
      function addIds(nodes: TreeNode[]) {
        for (const n of nodes) {
          ids.add(n.userId);
          if (n.children) addIds(n.children);
        }
      }
      addIds(treeData.rootUsers);
      setExpandedNodes(ids);
    }
  }, [treeData]);

  const toggleNode = (id: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getBadgeClass = (lvl: number) => {
    if (lvl === 1) return styles.badgeL1;
    if (lvl === 2) return styles.badgeL2;
    if (lvl <= 5) return styles.badgeL35;
    return styles.badgeL610;
  };

  // CSV Export for Audit Ledger
  const handleExportCsv = () => {
    if (!auditData?.commissions || auditData.commissions.length === 0) return;
    const headers = [
      'Commission UID,Referrer UID,Referrer Name,Investor UID,Investor Name,Level,Rate,Principal USDT,Commission USDT,Status,Ledger UID,Date\n',
    ];
    const rows = auditData.commissions.map((c) =>
      [
        c.commissionUid,
        c.referrerUid,
        `"${c.referrerName}"`,
        c.investorUid,
        `"${c.investorName}"`,
        c.level,
        c.ratePercent,
        c.investmentAmount,
        c.commissionAmount,
        c.status,
        c.ledgerUid || '',
        c.createdAt,
      ].join(','),
    );
    const blob = new Blob([headers.concat(rows.map((r) => r + '\n')).join('')], {
      type: 'text/csv',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `referral_commissions_audit_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Recursive Tree Node Renderer
  const renderTree = (node: TreeNode, depth = 0) => {
    const isExpanded = expandedNodes.has(node.userId);
    const hasChildren = node.children && node.children.length > 0;
    const isRoot = depth === 0;

    return (
      <div key={node.userId} className="flex flex-col items-center">
        <div
          className={`${styles.treeNodeCard} ${
            isRoot ? 'border-amber-400 bg-amber-950/20 shadow-amber-500/10' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`${styles.levelBadge} ${getBadgeClass(node.level)}`}>
              {isRoot ? 'ROOT REFERRER' : `Level ${node.level}`}
            </span>
            {hasChildren && (
              <button
                type="button"
                onClick={() => toggleNode(node.userId)}
                className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1"
              >
                {node.children!.length} {node.children!.length === 1 ? 'branch' : 'branches'}
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>
          <div className="font-bold text-slate-100 text-sm truncate">{node.name}</div>
          <div className="text-xs text-slate-400 font-mono">
            {node.publicUid} · {node.emailMasked}
          </div>
          <div className="flex items-center justify-between text-xs pt-2 mt-1 border-t border-slate-800">
            <span className="text-slate-400">Invested:</span>
            <span className="font-mono text-emerald-400 font-semibold">
              ${Number(node.totalInvested).toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Comm Earned:</span>
            <span className="font-mono text-amber-400 font-bold">
              +${Number(node.totalCommissionGeneratedForYou).toLocaleString()}
            </span>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="flex flex-col items-center w-full">
            <div className="w-0.5 h-6 bg-amber-400/40 my-1" />
            <div className="flex justify-center gap-4 flex-wrap pt-1">
              {node.children!.map((child) => renderTree(child, depth + 1))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={styles.pageShell}>
      {/* 1. Header Section */}
      <div className={styles.headerSection}>
        <div className={styles.titleGroup}>
          <div className="flex items-center gap-2">
            <h1 className={styles.pageTitle}>Referral Chain Management</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/10 border border-amber-500/30 text-amber-400">
              10 Levels Active
            </span>
          </div>
          <p className={styles.pageSub}>
            Inspect complete multi-tier affiliate relationships, track automatic commission
            distribution, and audit downline payouts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              void refetchOverview();
              void refetchUsers();
              void refetchTree();
              void refetchAudit();
            }}
            className={styles.actionBtn}
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className={`${styles.actionBtn} ${styles.primaryGoldBtn}`}
          >
            <Download className="w-4 h-4" />
            Export Audit CSV
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-lg text-xs font-semibold flex items-center justify-between ${
            feedback.type === 'ok'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
          }`}
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. System-wide Metrics Banner */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span>Total Network Volume</span>
            <div className={styles.metricIcon}>
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className={`${styles.metricValue} ${styles.metricValueGold}`}>
            $
            {overview
              ? Number(overview.totalNetworkInvestedUsdt).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })
              : '0.00'}
          </div>
          <span className={styles.metricSub}>Invested by referred participants</span>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span>Total Commissions Paid</span>
            <div className={styles.metricIcon}>
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className={styles.metricValue}>
            $
            {overview
              ? Number(overview.totalCommissionsDistributedUsdt).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })
              : '0.00'}
          </div>
          <span className={styles.metricSub}>
            {overview?.totalCommissionsCount || 0} Ledger payouts processed
          </span>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span>Affiliate Adoption</span>
            <div className={styles.metricIcon}>
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className={styles.metricValue}>
            {overview?.usersWithReferrer || 0} / {overview?.totalUsers || 0}
          </div>
          <span className={styles.metricSub}>
            {overview?.totalUsers
              ? ((overview.usersWithReferrer / overview.totalUsers) * 100).toFixed(0)
              : 0}
            % of accounts linked in chains
          </span>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span>Active Depth</span>
            <div className={styles.metricIcon}>
              <Network className="w-4 h-4" />
            </div>
          </div>
          <div className={styles.metricValue}>10 Levels</div>
          <span className={styles.metricSub}>L1 (8%), L2 (4%), L3-5 (2%), L6-10 (1%)</span>
        </div>
      </div>

      {/* 3. Tab Navigation */}
      <div className={styles.tabsBar}>
        <button
          type="button"
          onClick={() => setActiveTab('TREE')}
          className={`${styles.tabBtn} ${activeTab === 'TREE' ? styles.tabBtnActive : ''}`}
        >
          <Network className="w-4 h-4" />
          Visual Referral Tree (Level 1–10)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('USERS')}
          className={`${styles.tabBtn} ${activeTab === 'USERS' ? styles.tabBtnActive : ''}`}
        >
          <Users className="w-4 h-4" />
          Network Directory ({usersData?.total || 0} Users)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('AUDIT')}
          className={`${styles.tabBtn} ${activeTab === 'AUDIT' ? styles.tabBtnActive : ''}`}
        >
          <Award className="w-4 h-4" />
          Commission Audit Ledger ({auditData?.total || 0})
        </button>
      </div>

      {/* 4. Tab 1: Visual Tree Canvas */}
      {activeTab === 'TREE' && (
        <div className={styles.contentCard}>
          <div className={styles.toolbarRow}>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-100 text-sm">
                Interactive Referral Organogram
              </span>
              <span className="text-xs text-slate-400">Expand/collapse downline nodes</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (treeData?.rootUsers) {
                    const ids = new Set<string>();
                    function addIds(nodes: TreeNode[]) {
                      for (const n of nodes) {
                        ids.add(n.userId);
                        if (n.children) addIds(n.children);
                      }
                    }
                    addIds(treeData.rootUsers);
                    setExpandedNodes(ids);
                  }
                }}
                className="text-xs text-amber-400 hover:text-amber-300 font-semibold"
              >
                Expand All
              </button>
              <span className="text-slate-600">·</span>
              <button
                type="button"
                onClick={() => setExpandedNodes(new Set())}
                className="text-xs text-slate-400 hover:text-slate-300 font-semibold"
              >
                Collapse All
              </button>
            </div>
          </div>

          <div className={styles.treeCanvas}>
            {treeData?.rootUsers && treeData.rootUsers.length > 0 ? (
              <div className="flex justify-center gap-10 flex-wrap">
                {treeData.rootUsers.map((root) => renderTree(root))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-slate-500 gap-2">
                <Network className="w-12 h-12 text-slate-600" />
                <span className="text-sm font-semibold">No referral chains found yet</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. Tab 2: Users & Relationship Directory */}
      {activeTab === 'USERS' && (
        <div className={styles.contentCard}>
          <div className={styles.toolbarRow}>
            <div className={styles.searchWrap}>
              <Search className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search by UID, name, email, or code..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className={styles.searchInput}
              />
            </div>
            <span className="text-xs text-slate-400">
              Showing {usersData?.users?.length || 0} of {usersData?.total || 0} accounts
            </span>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.adminTable}>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Referral Code</th>
                  <th>Referred By (Upline)</th>
                  <th>Direct Referrals (L1)</th>
                  <th>Total Invested</th>
                  <th>Commissions Earned</th>
                  <th>Commissions Generated</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {usersData?.users?.map((u) => (
                  <tr key={u.userId}>
                    <td>
                      <div className="font-bold text-slate-100">{u.name}</div>
                      <div className="text-xs text-slate-400 font-mono">
                        {u.publicUid} · {u.email}
                      </div>
                    </td>
                    <td>
                      <span className="font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded">
                        {u.referralCode}
                      </span>
                    </td>
                    <td>
                      {u.referredByUid ? (
                        <div>
                          <div className="text-slate-200 font-semibold">{u.referredByName}</div>
                          <div className="text-xs text-slate-500 font-mono">{u.referredByUid}</div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500 italic">
                          Direct Root (No Upline)
                        </span>
                      )}
                    </td>
                    <td className="font-mono font-bold text-slate-200">{u.directReferralsCount}</td>
                    <td className="font-mono">${Number(u.totalInvested).toLocaleString()}</td>
                    <td className="font-mono font-bold text-emerald-400">
                      +${Number(u.totalCommissionsEarned).toLocaleString()}
                    </td>
                    <td className="font-mono text-slate-400">
                      ${Number(u.totalCommissionsGenerated).toLocaleString()}
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() =>
                          setAssignModal({
                            isOpen: true,
                            targetUser: u,
                            referrerInput: u.referredByUid || '',
                          })
                        }
                        className={styles.actionBtn}
                        title="Assign or Change Referrer"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        Set Referrer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. Tab 3: Commission Audit Ledger */}
      {activeTab === 'AUDIT' && (
        <div className={styles.contentCard}>
          <div className={styles.toolbarRow}>
            <div className={styles.searchWrap}>
              <Search className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search commission UID, referrer, investor, investment..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                className={styles.searchInput}
              />
            </div>
            <div className="flex items-center gap-3">
              <select
                value={selectedLevelFilter}
                onChange={(e) =>
                  setSelectedLevelFilter(e.target.value ? Number(e.target.value) : '')
                }
                className={styles.filterSelect}
              >
                <option value="">All Levels (1–10)</option>
                <option value="1">Level 1 (8%)</option>
                <option value="2">Level 2 (4%)</option>
                <option value="3">Level 3 (2%)</option>
                <option value="4">Level 4 (2%)</option>
                <option value="5">Level 5 (2%)</option>
                <option value="6">Level 6 (1%)</option>
                <option value="7">Level 7 (1%)</option>
                <option value="8">Level 8 (1%)</option>
                <option value="9">Level 9 (1%)</option>
                <option value="10">Level 10 (1%)</option>
              </select>
              <button type="button" onClick={handleExportCsv} className={styles.actionBtn}>
                <Download className="w-4 h-4" />
                CSV
              </button>
            </div>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.adminTable}>
              <thead>
                <tr>
                  <th>Commission UID</th>
                  <th>Referrer (Receiver)</th>
                  <th>Investor (Source)</th>
                  <th>Level</th>
                  <th>Rate</th>
                  <th>Investment Amount</th>
                  <th>Commission Amount</th>
                  <th>Ledger Entry</th>
                  <th>Status</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {auditData?.commissions?.map((comm) => (
                  <tr key={comm.id}>
                    <td className="font-mono text-amber-400 font-bold">{comm.commissionUid}</td>
                    <td>
                      <div className="font-bold text-slate-100">{comm.referrerName}</div>
                      <div className="text-xs text-slate-400 font-mono">{comm.referrerUid}</div>
                    </td>
                    <td>
                      <div className="font-bold text-slate-100">{comm.investorName}</div>
                      <div className="text-xs text-slate-400 font-mono">
                        {comm.investorUid} · {comm.investmentUid}
                      </div>
                    </td>
                    <td>
                      <span className={`${styles.levelBadge} ${getBadgeClass(comm.level)}`}>
                        Level {comm.level}
                      </span>
                    </td>
                    <td className="font-mono font-bold text-emerald-400">{comm.ratePercent}</td>
                    <td className="font-mono">
                      ${Number(comm.investmentAmount).toLocaleString()} USDT
                    </td>
                    <td className="font-mono font-bold text-emerald-400">
                      +${Number(comm.commissionAmount).toLocaleString()} USDT
                    </td>
                    <td className="font-mono text-xs text-slate-400">{comm.ledgerUid || '—'}</td>
                    <td>
                      <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded">
                        {comm.status}
                      </span>
                    </td>
                    <td className="text-xs text-slate-400 font-mono">
                      {new Date(comm.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. Assign Referrer Modal */}
      {assignModal.isOpen && assignModal.targetUser && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalBox}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-slate-100 text-lg flex items-center gap-2">
                <LinkIcon className="w-5 h-5 text-amber-400" />
                Assign Referrer
              </h3>
              <button
                type="button"
                onClick={() => setAssignModal({ isOpen: false, referrerInput: '' })}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-400 space-y-1">
              <div>
                Target User:{' '}
                <strong className="text-slate-100">{assignModal.targetUser.name}</strong> (
                {assignModal.targetUser.publicUid})
              </div>
              <div>
                Current Referrer:{' '}
                <strong className="text-slate-200">
                  {assignModal.targetUser.referredByName
                    ? `${assignModal.targetUser.referredByName} (${assignModal.targetUser.referredByUid})`
                    : 'None (Direct Root)'}
                </strong>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                New Referrer Code or Public UID:
              </label>
              <input
                type="text"
                placeholder="e.g. NVX000003 or USR-000003"
                value={assignModal.referrerInput}
                onChange={(e) =>
                  setAssignModal((prev) => ({ ...prev, referrerInput: e.target.value }))
                }
                className={styles.searchInput}
              />
              <p className="text-xs text-slate-500">
                Automatic cycle detection will ensure this user cannot refer an ancestor or
                downline.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setAssignModal({ isOpen: false, referrerInput: '' })}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={assignMutation.isPending || !assignModal.referrerInput.trim()}
                onClick={() => {
                  assignMutation.mutate({
                    targetUserId: assignModal.targetUser!.userId,
                    referrerCodeOrUid: assignModal.referrerInput.trim(),
                  });
                }}
                className={styles.primaryGoldBtn}
              >
                {assignMutation.isPending ? 'Saving...' : 'Confirm Link'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
