'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { isAdminRole, isMasterAdminRole } from '@navrix/types';
import { useAdminStore } from '../../store/admin-store';
import styles from './admin-login.module.css';

const UNIFIED_LOGIN_URL =
  (process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000') + '/login?portal=admin';

/**
 * Single Unified Login Architecture:
 * All authentication occurs on the unified login portal (:3000/login).
 * Visiting :3001/login either enters the active admin workspace directly
 * or redirects seamlessly to the unified login page.
 */
export default function AdminLoginRedirectPage() {
  const router = useRouter();
  const { hydrated, accessToken, user } = useAdminStore();

  React.useEffect(() => {
    if (!hydrated) return;

    if (accessToken && user && isAdminRole(user.role)) {
      router.replace(isMasterAdminRole(user.role) ? '/master' : '/dashboard');
      return;
    }

    window.location.replace(UNIFIED_LOGIN_URL);
  }, [hydrated, accessToken, user, router]);

  return (
    <div className={styles.wrap}>
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
        <p className="text-xs font-medium opacity-70">
          Redirecting to Unified NAVRIX Sign-In...
        </p>
      </div>
    </div>
  );
}
