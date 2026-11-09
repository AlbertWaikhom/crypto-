'use client';
import * as React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@navrix/ui';
import { apiRequest, ClientApiError } from '../../../lib/api';
import styles from './security.module.css';
export default function SecurityPage() {
  const queryClient = useQueryClient();
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [notice, setNotice] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const { data: sessions = [] } = useQuery({
    queryKey: ['my-sessions'],
    queryFn: () => apiRequest('/auth/sessions'),
  });
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setSaving(true);
    try {
      await apiRequest('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword('');
      setNewPassword('');
      setNotice('Password changed successfully.');
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : 'Failed to change password.');
    } finally {
      setSaving(false);
    }
  };
  const handleRevoke = async (id) => {
    await apiRequest(`/auth/sessions/${id}`, { method: 'DELETE' });
    await queryClient.invalidateQueries({ queryKey: ['my-sessions'] });
  };
  return (
    <div>
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-extrabold">Security & Active Sessions</h1>
        <p className="mt-0.5 text-xs sm:text-sm opacity-70">
          Rotate your account password and audit active refresh-token sessions.
        </p>
      </div>

      <div className={styles.grid}>
        <section className={styles.card}>
          <h2 className="mb-4 text-base font-bold">Change Password</h2>

          {error ? (
            <div className="mb-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300">
              {error}
            </div>
          ) : null}

          {notice ? (
            <div className="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-300">
              {notice}
            </div>
          ) : null}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={styles.input}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold">New Strong Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 8 chars, Upper + Number"
                className={styles.input}
              />
            </div>
            <Button type="submit" variant="gold" isLoading={saving} className="w-full sm:w-auto">
              Update Password
            </Button>
          </form>
        </section>

        <section className={styles.card}>
          <h2 className="mb-4 text-base font-bold">Active Device Sessions ({sessions.length})</h2>
          <div className="space-y-3">
            {sessions.map((s) => (
              <div
                key={s.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 rounded-xl border border-slate-700/60 p-3.5 text-xs"
              >
                <div className="min-w-0">
                  <div className="truncate font-semibold">{s.userAgent || 'Browser Session'}</div>
                  <div className="mt-1 opacity-65 break-words">
                    IP: {s.ipAddress || 'Local'} · Created {new Date(s.createdAt).toLocaleString()}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => handleRevoke(s.id)}
                  className="w-full sm:w-auto shrink-0"
                >
                  Revoke
                </Button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
