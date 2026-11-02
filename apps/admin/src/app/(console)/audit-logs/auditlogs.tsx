'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ScrollText } from 'lucide-react';
import { Button, EmptyState } from '@navrix/ui';
import { adminApi } from '../../../lib/api';
import styles from './audit-logs.module.css';

interface AuditRow {
  id: string;
  action: string;
  actorRole: string | null;
  targetType: string;
  targetId: string;
  oldValue: unknown;
  newValue: unknown;
  ipAddress: string | null;
  createdAt: string;
  admin?: {
    publicUid: string;
    name: string;
    email: string;
    role: string;
  } | null;
}

const AUDIT_ACTIONS = [
  'DEPOSIT_VERIFIED',
  'DEPOSIT_APPROVED',
  'DEPOSIT_REJECTED',
  'INTEREST_CREATED',
  'INVESTMENT_PLAN_UPDATED',
  'WITHDRAWAL_APPROVED',
  'WITHDRAWAL_REJECTED',
  'WITHDRAWAL_COMPLETED',
  'USER_SUSPENDED',
  'USER_ACTIVATED',
  'USER_ROLE_CHANGED',
  'SYSTEM_SETTING_CHANGED',
  'EMERGENCY_PAUSE_TOGGLED',
];

export default function AdminAuditLogsPage() {
  const [page, setPage] = React.useState(1);
  const [actionFilter, setActionFilter] = React.useState('');

  const { data } = useQuery({
    queryKey: ['admin-audit-logs', page, actionFilter],
    queryFn: () =>
      adminApi<{
        items: AuditRow[];
        total: number;
        page: number;
        limit: number;
      }>(
        `/admin/audit-logs?page=${page}&limit=30${
          actionFilter ? `&action=${encodeURIComponent(actionFilter)}` : ''
        }`,
      ),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / (data?.limit || 30)));

  return (
    <div>
      <div className={styles.toolbar}>
        <div>
          <h1 className="text-2xl font-extrabold flex items-center gap-2">
            <ScrollText className="h-6 w-6 text-amber-400" />
            Immutable Administrative Audit Trail
          </h1>
          <p className="mt-0.5 text-sm opacity-70">
            Read-only tamper-evident log of every privileged financial and governance action
            (AuditService exposes zero update/delete methods)
          </p>
        </div>

        <select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(1);
          }}
          className={styles.select}
          aria-label="Filter audit logs by action"
        >
          <option value="">All Actions</option>
          {AUDIT_ACTIONS.map((act) => (
            <option key={act} value={act}>
              {act}
            </option>
          ))}
        </select>
      </div>

      <section className={styles.panel}>
        {items.length === 0 ? (
          <EmptyState
            title="No Audit Records Found"
            description="Every administrative verification, approval, rejection, and configuration change is logged here."
          />
        ) : (
          <>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-700/60 text-xs uppercase opacity-65">
                  <th className="py-3 pr-4">Timestamp</th>
                  <th className="py-3 pr-4">Actor</th>
                  <th className="py-3 pr-4">Action</th>
                  <th className="py-3 pr-4">Target</th>
                  <th className="py-3 pr-4">State Diff (Old -&gt; New)</th>
                  <th className="py-3">Origin IP</th>
                </tr>
              </thead>
              <tbody>
                {items.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-slate-800/50 last:border-none align-top"
                  >
                    <td className="py-3.5 pr-4 text-xs opacity-75 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3.5 pr-4 text-xs">
                      <div className="font-semibold">{log.admin?.name || 'System'}</div>
                      <div className="font-mono text-[11px] opacity-65">
                        {log.admin?.publicUid || 'SYS'} ·{' '}
                        {log.actorRole || log.admin?.role || 'SYSTEM'}
                      </div>
                    </td>
                    <td className="py-3.5 pr-4">
                      <span className="rounded bg-amber-500/15 px-2 py-0.5 font-mono text-xs font-bold text-amber-300">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4 font-mono text-xs">
                      <div className="text-[11px] opacity-60">{log.targetType}</div>
                      <div className="font-bold">{log.targetId}</div>
                    </td>
                    <td className="py-3.5 pr-4">
                      <div className={styles.diffBox}>
                        {log.oldValue ? (
                          <div className="text-rose-300/90">- {JSON.stringify(log.oldValue)}</div>
                        ) : null}
                        {log.newValue ? (
                          <div className="text-emerald-300">+ {JSON.stringify(log.newValue)}</div>
                        ) : null}
                      </div>
                    </td>
                    <td className="py-3.5 font-mono text-xs opacity-70">{log.ipAddress || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className={styles.pager}>
              <div className="text-xs opacity-70">
                Page {page} of {totalPages} ({total} total logs)
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
