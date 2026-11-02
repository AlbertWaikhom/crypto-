'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { isAdminRole, isMasterAdminRole, type PublicUserDto } from '@navrix/types';
import { useAdminStore } from '../../store/admin-store';
import styles from './sso.module.css';

const UNIFIED_LOGIN_URL =
  (process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000') + '/login?portal=admin';

export default function AdminSsoHandoffPage() {
  const router = useRouter();
  const setAdminSession = useAdminStore((s) => s.setAdminSession);

  React.useEffect(() => {
    const rawHash = window.location.hash.replace(/^#/, '');
    if (!rawHash) {
      window.location.replace(UNIFIED_LOGIN_URL);
      return;
    }

    const params = new URLSearchParams(rawHash);
    const token = params.get('token');
    const rawUser = params.get('user');
    const requestedTarget = params.get('target');

    // Immediately scrub token fragment from browser URL bar
    window.history.replaceState(null, '', '/sso');

    if (!token || !rawUser) {
      window.location.replace(UNIFIED_LOGIN_URL);
      return;
    }

    try {
      const parsedUser = JSON.parse(rawUser) as PublicUserDto;
      if (!isAdminRole(parsedUser.role)) {
        window.location.replace(UNIFIED_LOGIN_URL);
        return;
      }

      setAdminSession(token, parsedUser);
      const fallbackTarget = isMasterAdminRole(parsedUser.role) ? '/master' : '/dashboard';
      const safeTarget =
        requestedTarget && requestedTarget.startsWith('/') ? requestedTarget : fallbackTarget;

      router.replace(safeTarget);
    } catch {
      window.location.replace(UNIFIED_LOGIN_URL);
    }
  }, [router, setAdminSession]);

  return (
    <div className={styles.wrap}>
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
      <p className={styles.caption}>Establishing authorized Admin Console session...</p>
    </div>
  );
}
