'use client';
import * as React from 'react';
import Link from 'next/link';
import { Button } from '@navrix/ui';
import { SiteHeader } from '../../../components/SiteHeader';
import { apiRequest, ClientApiError } from '../../../lib/api';
import styles from './forgot-password.module.css';
export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState('');
  const [token, setToken] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [step, setStep] = React.useState('REQUEST');
  const [message, setMessage] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const handleRequest = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiRequest('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setMessage(res.message);
      if (res.resetTokenPreview) {
        setToken(res.resetTokenPreview);
      }
      setStep('RESET');
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : 'Could not request password reset.');
    } finally {
      setLoading(false);
    }
  };
  const handleReset = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiRequest('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword }),
      });
      setStep('DONE');
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : 'Could not reset password.');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className={styles.pageShell}>
      <SiteHeader mode="static" compactAuth />
      <div className={styles.wrap}>
        <div className={styles.card}>
          <h1 className="text-xl font-extrabold">Account Password Recovery</h1>
          <p className="mt-1 text-xs opacity-70">
            Resetting your password automatically revokes active sessions.
          </p>

          {error ? (
            <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300">
              {error}
            </div>
          ) : null}

          {message ? (
            <div className="mt-4 rounded-xl border border-emerald-500/35 bg-emerald-500/10 p-3 text-xs text-emerald-300">
              {message}
            </div>
          ) : null}

          {step === 'REQUEST' ? (
            <form onSubmit={handleRequest} className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold opacity-75">
                  Registered Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="investor@example.com"
                  className={styles.input}
                />
              </div>
              <Button type="submit" variant="gold" isLoading={loading} className="w-full">
                Send Recovery Token
              </Button>
            </form>
          ) : null}

          {step === 'RESET' ? (
            <form onSubmit={handleReset} className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold opacity-75">
                  One-Time Reset Token
                </label>
                <input
                  type="text"
                  required
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Paste reset token"
                  className={styles.input}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold opacity-75">
                  New Strong Password
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 chars, Upper + Number"
                  className={styles.input}
                />
              </div>
              <Button type="submit" variant="gold" isLoading={loading} className="w-full">
                Confirm New Password
              </Button>
            </form>
          ) : null}

          {step === 'DONE' ? (
            <div className="mt-6 text-center">
              <p className="text-sm font-medium text-emerald-400">Password updated successfully!</p>
              <Link href="/login" className="mt-4 inline-block">
                <Button variant="gold">Return to Sign In</Button>
              </Link>
            </div>
          ) : null}

          <div className="mt-5 text-center text-xs">
            <Link href="/login" className="font-semibold text-amber-400 hover:underline">
              Back to Unified Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
