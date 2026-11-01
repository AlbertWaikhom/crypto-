'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAdminStore } from '../store/admin-store';
import styles from './index-redirect.module.css';

export default function AdminIndexPage() {
  const router = useRouter();
  const { hydrated, accessToken } = useAdminStore();

  React.useEffect(() => {
    if (!hydrated) return;
    router.replace(accessToken ? '/dashboard' : '/login');
  }, [hydrated, accessToken, router]);

  return (
    <div className={styles.loaderWrap}>
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
    </div>
  );
}

