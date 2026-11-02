'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldBan, ShieldCheck } from 'lucide-react';
import { Button, EmptyState, formatUsdt, StatusBadge } from '@navrix/ui';
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
  lastLoginAt: string | null;
  createdAt: string;
  wallets: Array<{
    asset: string;
    availableBalance: string;
    lockedBalance: string;
    investedBalance: string;
  }>;
}

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState('');
  const [feedback, setFeedback] = React.useState<{
    type: 'ok' | 'err';
    message: string;
  } | null>(null);

  const { data: users = [] } = useQuery({
    queryKey: ['admin-users-all'],
    queryFn: () => adminApi<UserAccountRow[]>('/admin/users'),
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
          <h1 className="text-2xl font-extrabold">Platform Users &amp; Wallets</h1>
          <p className="mt-0.5 text-sm opacity-70">
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
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-700/60 text-xs uppercase opacity-65">
                <th className="py-3 pr-4">Public UID</th>
                <th className="py-3 pr-4">Identity</th>
                <th className="py-3 pr-4">Role</th>
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
                        <span className="font-mono text-xs text-amber-400">Protected</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
