'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, ShieldBan, ShieldCheck, UserCheck, Wallet, X } from 'lucide-react';
import { Button, CopyButton, EmptyState, formatUsdt, shortenHex, StatusBadge } from '@navrix/ui';
import { adminApi, AdminApiError } from '../../../lib/api';
import styles from './users.module.css';

interface UserAccountRow {
  publicUid: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';
  emailVerified: boolean;
  payoutWalletAddress: string | null;
  payoutWalletNetwork?: string;
  payoutWalletUpdatedAt?: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  wallets: Array<{
    asset: string;
    availableBalance: string;
    lockedBalance: string;
    investedBalance: string;
  }>;
}

interface UserDetailPayload {
  publicUid: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  emailVerified: boolean;
  hasGoogle: boolean;
  referralCode: string | null;
  payoutWalletAddress: string | null;
  payoutWalletNetwork: string;
  payoutWalletUpdatedAt: string | null;
  payoutWalletLockUntil: string | null;
  referrer: { publicUid: string; name: string; email: string } | null;
  complianceProfile: { kycStatus: string; country: string | null } | null;
  wallets: Array<{
    asset: string;
    availableBalance: string;
    lockedBalance: string;
    investedBalance: string;
    pendingWithdrawal: string;
  }>;
  withdrawals: Array<{
    withdrawalUid: string;
    amount: string;
    netAmount: string;
    destinationAddress: string;
    status: string;
    transactionHash: string | null;
    createdAt: string;
  }>;
  _count: { referrals: number; investments: number; deposits: number; withdrawals: number };
}

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState('');
  const [selectedUserUid, setSelectedUserUid] = React.useState<string | null>(null);
  const [feedback, setFeedback] = React.useState<{
    type: 'ok' | 'err';
    message: string;
  } | null>(null);

  const { data: users = [] } = useQuery({
    queryKey: ['admin-users-all'],
    queryFn: () => adminApi<UserAccountRow[]>('/admin/users'),
  });

  const { data: userDetail, isLoading: isDetailLoading } = useQuery({
    queryKey: ['admin-user-detail', selectedUserUid],
    queryFn: () => adminApi<UserDetailPayload>(`/admin/users/${selectedUserUid}`),
    enabled: Boolean(selectedUserUid),
  });

  const statusMutation = useMutation({
    mutationFn: (payload: { uid: string; status: 'ACTIVE' | 'SUSPENDED' }) =>
      adminApi(`/admin/users/${payload.uid}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: payload.status }),
      }),
    onSuccess: (_, vars) => {
      setFeedback({
        type: 'ok',
        message: `Account ${vars.uid} updated to ${vars.status}.`,
      });
      void queryClient.invalidateQueries({ queryKey: ['admin-users-all'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-staff-users'] });
    },
    onError: (err) => {
      setFeedback({
        type: 'err',
        message: err instanceof AdminApiError ? err.message : 'Status update failed.',
      });
    },
  });

  const filtered = users.filter((u) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      u.publicUid.toLowerCase().includes(q) ||
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div className={styles.toolbar}>
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold">Platform Users &amp; Wallets</h1>
          <p className="mt-0.5 text-xs sm:text-sm opacity-70">
            Inspect public UIDs (no sequential DB IDs exposed), segregated USDT wallet buckets, and
            account status controls
          </p>
        </div>

        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search UID, name, or email..."
          className={styles.searchInput}
        />
      </div>

      {feedback ? (
        <div
          className={`mb-4 rounded-xl border px-4 py-3 text-sm font-medium ${
            feedback.type === 'ok'
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
              : 'border-rose-500/40 bg-rose-500/10 text-rose-300'
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      <section className={styles.panel}>
        {filtered.length === 0 ? (
          <EmptyState
            title="No Users Found"
            description="Registered investor accounts will appear here."
          />
        ) : (
          <table className="w-full min-w-[740px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-700/60 text-xs uppercase opacity-65">
                <th className="py-3 pr-4">Public UID</th>
                <th className="py-3 pr-4">Identity</th>
                <th className="py-3 pr-4">Role</th>
                <th className="py-3 pr-4">Registered Wallet ID</th>
                <th className="py-3 pr-4">Available</th>
                <th className="py-3 pr-4">Locked</th>
                <th className="py-3 pr-4">Invested</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 text-right">Governance</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const usdt = u.wallets.find((w) => w.asset === 'USDT');
                const isSuspended = u.status === 'SUSPENDED';
                return (
                  <tr key={u.publicUid} className="border-b border-slate-800/50 last:border-none">
                    <td className="py-3.5 pr-4 font-mono text-xs font-bold text-amber-400">
                      {u.publicUid}
                      <div className="font-sans text-[11px] font-normal opacity-60">
                        {u.emailVerified ? 'Email Verified' : 'Unverified'}
                      </div>
                    </td>
                    <td className="py-3.5 pr-4 text-xs">
                      <div className="font-semibold">{u.name}</div>
                      <div className="opacity-70">{u.email}</div>
                    </td>
                    <td className="py-3.5 pr-4 font-mono text-xs font-semibold">{u.role}</td>
                    <td className="py-3.5 pr-4 font-mono text-xs">
                      {u.payoutWalletAddress ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-emerald-400">
                            {shortenHex(u.payoutWalletAddress, 6, 4)}
                          </span>
                          <CopyButton value={u.payoutWalletAddress} />
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-500 italic">Not Registered</span>
                      )}
                    </td>
                    <td className="py-3.5 pr-4 font-mono text-xs text-emerald-400">
                      {formatUsdt(usdt?.availableBalance || '0')} USDT
                    </td>
                    <td className="py-3.5 pr-4 font-mono text-xs text-amber-300">
                      {formatUsdt(usdt?.lockedBalance || '0')} USDT
                    </td>
                    <td className="py-3.5 pr-4 font-mono text-xs font-bold">
                      {formatUsdt(usdt?.investedBalance || '0')} USDT
                    </td>
                    <td className="py-3.5 pr-4">
                      <StatusBadge status={u.status} />
                    </td>
                    <td className="py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedUserUid(u.publicUid)}
                          className="gap-1 text-xs"
                        >
                          <Eye className="h-3 w-3" />
                          Details
                        </Button>
                        {u.role !== 'MASTER_ADMIN' ? (
                          <Button
                            variant={isSuspended ? 'gold' : 'danger'}
                            size="sm"
                            isLoading={statusMutation.isPending}
                            onClick={() =>
                              statusMutation.mutate({
                                uid: u.publicUid,
                                status: isSuspended ? 'ACTIVE' : 'SUSPENDED',
                              })
                            }
                          >
                            {isSuspended ? (
                              <>
                                <ShieldCheck className="h-3.5 w-3.5" />
                                Activate
                              </>
                            ) : (
                              <>
                                <ShieldBan className="h-3.5 w-3.5" />
                                Suspend
                              </>
                            )}
                          </Button>
                        ) : (
                          <span className="font-mono text-xs text-amber-400 px-2">Protected</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {/* User Details Modal (Displays full profile, registered Wallet ID, balances & audit history) */}
      {selectedUserUid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-amber-500/30 bg-[#0c1322] p-6 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-400 font-bold">
                  {selectedUserUid.slice(-3)}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>{userDetail?.name || selectedUserUid}</span>
                    {userDetail?.status && <StatusBadge status={userDetail.status} />}
                  </h2>
                  <div className="font-mono text-xs text-amber-400">{selectedUserUid}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUserUid(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {isDetailLoading || !userDetail ? (
              <div className="py-12 text-center text-sm text-slate-400">
                Loading account details...
              </div>
            ) : (
              <div className="space-y-5 text-xs">
                {/* Registered Wallet ID Highlight */}
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-emerald-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Wallet className="h-3.5 w-3.5" />
                      Registered Payout Wallet ID
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      {userDetail.payoutWalletNetwork || 'BNB_SMART_CHAIN'}
                    </span>
                  </div>
                  {userDetail.payoutWalletAddress ? (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-900/90 border border-slate-700/60 p-2.5 font-mono">
                      <span className="text-sm font-bold text-amber-300 break-all">
                        {userDetail.payoutWalletAddress}
                      </span>
                      <CopyButton value={userDetail.payoutWalletAddress} label="Copy Wallet ID" />
                    </div>
                  ) : (
                    <div className="text-rose-300 font-semibold text-xs py-1">
                      No payout wallet registered yet. Withdrawals cannot be submitted.
                    </div>
                  )}
                  {userDetail.payoutWalletUpdatedAt && (
                    <div className="mt-2 text-[11px] text-slate-400">
                      Last Updated: {new Date(userDetail.payoutWalletUpdatedAt).toLocaleString()}
                    </div>
                  )}
                  {userDetail.payoutWalletLockUntil && (
                    <div className="mt-2 text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded p-1.5">
                      Security Hold Active until:{' '}
                      {new Date(userDetail.payoutWalletLockUntil).toLocaleString()}
                    </div>
                  )}
                </div>

                {/* Identity & Account Specs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                  <div>
                    <span className="text-slate-400">Email Address:</span>
                    <div className="font-semibold text-white mt-0.5">{userDetail.email}</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Phone:</span>
                    <div className="font-semibold text-white mt-0.5">{userDetail.phone || '—'}</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Referral Code:</span>
                    <div className="font-mono text-amber-300 font-bold mt-0.5">
                      {userDetail.referralCode || '—'}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">Referred By:</span>
                    <div className="font-semibold text-white mt-0.5">
                      {userDetail.referrer
                        ? `${userDetail.referrer.name} (${userDetail.referrer.publicUid})`
                        : 'Organic (Direct)'}
                    </div>
                  </div>
                </div>

                {/* Wallet Balance Buckets */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(() => {
                    const usdt = userDetail.wallets.find((w) => w.asset === 'USDT');
                    return (
                      <>
                        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
                          <span className="text-[11px] text-slate-400">Available</span>
                          <div className="font-mono text-sm font-bold text-emerald-400 mt-1">
                            {formatUsdt(usdt?.availableBalance || '0')}
                          </div>
                        </div>
                        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
                          <span className="text-[11px] text-slate-400">Locked</span>
                          <div className="font-mono text-sm font-bold text-amber-400 mt-1">
                            {formatUsdt(usdt?.lockedBalance || '0')}
                          </div>
                        </div>
                        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
                          <span className="text-[11px] text-slate-400">Invested</span>
                          <div className="font-mono text-sm font-bold text-sky-400 mt-1">
                            {formatUsdt(usdt?.investedBalance || '0')}
                          </div>
                        </div>
                        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
                          <span className="text-[11px] text-slate-400">Pending Wdr</span>
                          <div className="font-mono text-sm font-bold text-rose-400 mt-1">
                            {formatUsdt(usdt?.pendingWithdrawal || '0')}
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Recent Withdrawals Queue */}
                <div>
                  <h3 className="font-bold text-slate-200 mb-2">Recent Withdrawal Requests</h3>
                  {userDetail.withdrawals.length === 0 ? (
                    <div className="text-slate-500 italic py-2">
                      No withdrawal history for this user.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-800">
                      <table className="w-full text-left text-[11px]">
                        <thead>
                          <tr className="border-b border-slate-800 bg-slate-900 text-slate-400 uppercase">
                            <th className="p-2">ID</th>
                            <th className="p-2">Amount</th>
                            <th className="p-2">Destination</th>
                            <th className="p-2">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {userDetail.withdrawals.map((w) => (
                            <tr key={w.withdrawalUid} className="border-b border-slate-800/40">
                              <td className="p-2 font-mono text-amber-400">{w.withdrawalUid}</td>
                              <td className="p-2 font-mono font-bold">
                                {formatUsdt(w.amount)} USDT
                              </td>
                              <td className="p-2 font-mono text-slate-300">
                                {shortenHex(w.destinationAddress, 6, 4)}
                              </td>
                              <td className="p-2">
                                <StatusBadge status={w.status} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <Button variant="outline" size="sm" onClick={() => setSelectedUserUid(null)}>
                    Close
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
