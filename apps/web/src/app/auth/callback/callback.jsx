'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { apiRequest } from '../../../lib/api';
import { useToast } from '../../../components/ToastProvider';
import { completeAuthSession } from '../components/auth-helpers';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [errorMsg, setErrorMsg] = React.useState(null);

  React.useEffect(() => {
    const error = searchParams.get('error');
    if (error) {
      const reason = searchParams.get('reason') || 'Authentication cancelled or failed.';
      setErrorMsg(`${error}: ${reason}`);
      if (toast) {
        toast.error('Google Sign-In Failed', error);
      }
      const t = setTimeout(() => {
        router.replace('/login');
      }, 2500);
      return () => clearTimeout(t);
    }

    const token = searchParams.get('token');
    const isNew = searchParams.get('isNew') === '1';

    if (!token) {
      setErrorMsg('No authentication token received.');
      const t = setTimeout(() => router.replace('/login'), 2000);
      return () => clearTimeout(t);
    }

    // Retrieve user payload from /users/me using the newly issued token
    apiRequest(
      '/users/me',
      {
        headers: { Authorization: `Bearer ${token}` },
      },
      false,
    )
      .then((me) => {
        if (!me) throw new Error('Could not retrieve user profile.');
        completeAuthSession({
          accessToken: token,
          user: me,
          router,
          toast,
          welcomeTitle: isNew
            ? 'Google Account Registered & Vault Created'
            : 'Signed in with Google',
          welcomeMessage: `Welcome, ${me.name || me.email}. Your sovereign session is active.`,
        });
      })
      .catch((err) => {
        console.error('Callback error:', err);
        setErrorMsg('Failed to complete session setup.');
        setTimeout(() => router.replace('/login'), 2000);
      });
  }, [searchParams, router, toast]);

  return (
    <div className="min-h-dvh flex items-center justify-center bg-[#070B14] p-4 text-center">
      <div className="max-w-md w-full rounded-2xl border border-amber-500/30 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-xl">
        {errorMsg ? (
          <div>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 mb-4">
              ✕
            </div>
            <h2 className="text-lg font-bold text-white mb-2">Authentication Failed</h2>
            <p className="text-xs text-rose-300">{errorMsg}</p>
            <p className="text-[11px] text-slate-500 mt-4">Redirecting to login...</p>
          </div>
        ) : (
          <div>
            <Loader2 className="h-10 w-10 animate-spin text-amber-400 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-white mb-1">Authenticating with Google</h2>
            <p className="text-xs text-slate-400">
              Verifying credentials and preparing your dashboard...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
