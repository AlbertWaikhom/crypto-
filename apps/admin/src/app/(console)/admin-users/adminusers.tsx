'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Crown, ShieldAlert } from 'lucide-react';
import { UserRole } from '@navrix/types';
import { Button, EmptyState, StatusBadge } from '@navrix/ui';
import { useAdminStore } from '../../../store/admin-store';
import { adminApi, AdminApiError } from '../../../lib/api';
import styles from './admin-users.module.css';

interface AdminStaffRow {
  publicUid: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN' | 'MASTER_ADMIN';
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
}

export default function AdminStaffGovernancePage() {
  const queryClient = useQueryClient();
  const currentUser = useAdminStore((s) => s.user);
  const isStrictMaster = currentUser?.role === UserRole.MASTER_ADMIN;

  const [promoteUid, setPromoteUid] = React.useState('');
  const [promoteRole, setPromoteRole] = React.useState<
    'USER' | 'ADMIN' | 'SUPER_ADMIN' | 'MASTER_ADMIN'
  >('ADMIN');

  const [feedback, setFeedback] = React.useState<{
    type: 'ok' | 'err';
    message: string;
  } | null>(null);

  const { data: admins = [] } = useQuery({
    queryKey: ['admin-staff-users'],
    queryFn: () => adminApi<AdminStaffRow[]>('/admin/admin-users'),
  });

  const roleMutation = useMutation({
    mutationFn: (payload: {
      uid: string;
      role: 'USER' | 'ADMIN' | 'SUPER_ADMIN' | 'MASTER_ADMIN';
    }) =>
      adminApi(`/admin/users/${payload.uid}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: payload.role }),
      }),
    onSuccess: (_, vars) => {
      setFeedback({
        type: 'ok',
        message: `Role for ${vars.uid} updated to ${vars.role} and recorded in immutable audit trail.`,
      });
      setPromoteUid('');
      void queryClient.invalidateQueries({ queryKey: ['admin-staff-users'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-users-all'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-master'] });
    },
    onError: (err) => {
      setFeedback({
        type: 'err',
        message: err instanceof AdminApiError ? err.message : 'Role update failed.',
      });
    },
  });

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1 className="text-2xl font-extrabold flex items-center gap-2">
            <Crown className="h-6 w-6 text-amber-400" />
            Administrative Staff &amp; Role Governance
          </h1>
          <p className="mt-0.5 text-sm opacity-70">
            RBAC hierarchy: USER &lt; ADMIN &lt; SUPER_ADMIN &lt; MASTER_ADMIN. Role mutations
            require MASTER_ADMIN authority.
          </p>
        </div>
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

      {isStrictMaster ? (
        <section className={styles.panel}>
          <h2 className="text-base font-bold mb-3 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-400" />
            Assign Role by Public UID
          </h2>
          <form
            className="flex flex-wrap items-center gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!promoteUid.trim()) return;
              roleMutation.mutate({
                uid: promoteUid.trim().toUpperCase(),
                role: promoteRole,
              });
            }}
          >
            <input
              type="text"
              value={promoteUid}
              onChange={(e) => setPromoteUid(e.target.value)}
              placeholder="USR-000001"
              className={`${styles.roleSelect} min-w-[190px]`}
              required
            />
            <select
              value={promoteRole}
              onChange={(e) =>
                setPromoteRole(e.target.value as 'USER' | 'ADMIN' | 'SUPER_ADMIN' | 'MASTER_ADMIN')
              }
              className={styles.roleSelect}
            >
              <option value="ADMIN">ADMIN</option>
              <option value="SUPER_ADMIN">SUPER_ADMIN</option>
              <option value="MASTER_ADMIN">MASTER_ADMIN</option>
              <option value="USER">USER (Revoke Staff Access)</option>
            </select>
            <Button type="submit" variant="gold" size="sm" isLoading={roleMutation.isPending}>
              Update Role Assignment
            </Button>
          </form>
        </section>
      ) : null}

      <section className={styles.panel}>
        {admins.length === 0 ? (
          <EmptyState
            title="No Staff Accounts Found"
            description="Administrative accounts will appear here."
          />
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-700/60 text-xs uppercase opacity-65">
                <th className="py-3 pr-4">Staff UID</th>
                <th className="py-3 pr-4">Name &amp; Email</th>
                <th className="py-3 pr-4">Current Role</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Last Login</th>
                <th className="py-3 text-right">Change Role</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((a) => (
                <tr key={a.publicUid} className="border-b border-slate-800/50 last:border-none">
                  <td className="py-3.5 pr-4 font-mono text-xs font-bold text-amber-400">
                    {a.publicUid}
                  </td>
                  <td className="py-3.5 pr-4 text-xs">
                    <div className="font-semibold">{a.name}</div>
                    <div className="opacity-70">{a.email}</div>
                  </td>
                  <td className="py-3.5 pr-4">
                    <span className="rounded bg-amber-500/15 px-2 py-0.5 font-mono text-xs font-bold text-amber-300">
                      {a.role}
                    </span>
                  </td>
                  <td className="py-3.5 pr-4">
                    <StatusBadge status={a.status} />
                  </td>
                  <td className="py-3.5 pr-4 text-xs opacity-70">
                    {a.lastLoginAt ? new Date(a.lastLoginAt).toLocaleString() : 'Never'}
                  </td>
                  <td className="py-3.5 text-right">
                    {isStrictMaster && a.publicUid !== currentUser?.uid ? (
                      <select
                        value={a.role}
                        onChange={(e) =>
                          roleMutation.mutate({
                            uid: a.publicUid,
                            role: e.target.value as
                              'USER' | 'ADMIN' | 'SUPER_ADMIN' | 'MASTER_ADMIN',
                          })
                        }
                        className={styles.roleSelect}
                      >
                        <option value="ADMIN">ADMIN</option>
                        <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                        <option value="MASTER_ADMIN">MASTER_ADMIN</option>
                        <option value="USER">Demote to USER</option>
                      </select>
                    ) : (
                      <span className="text-xs opacity-50">
                        {a.publicUid === currentUser?.uid ? 'Current Session' : 'Master Only'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
