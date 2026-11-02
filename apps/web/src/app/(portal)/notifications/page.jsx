'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, cn, EmptyState } from '@navrix/ui';
import { apiRequest } from '../../../lib/api';
import styles from './notifications.module.css';
export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ['my-notifications'],
    queryFn: () => apiRequest('/notifications?limit=50'),
  });
  const handleMarkAllRead = async () => {
    await apiRequest('/notifications/read-all', { method: 'POST' });
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['my-notifications'] }),
      queryClient.invalidateQueries({ queryKey: ['notifications-badge'] }),
    ]);
  };
  const items = data?.items ?? [];
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Notifications</h1>
          <p className="mt-0.5 text-sm opacity-70">
            Real-time alerts for deposits, blockchain detections, yield credits, and withdrawals.
          </p>
        </div>
        {(data?.unreadCount ?? 0) > 0 ? (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
            Mark All Read
          </Button>
        ) : null}
      </div>

      <section className={styles.panel}>
        {items.length === 0 ? (
          <EmptyState
            title="No Notifications Yet"
            description="System alerts for your deposits, investments, and payouts will appear here."
          />
        ) : (
          items.map((n) => (
            <div key={n.id} className={cn(styles.item, !n.isRead && styles.itemUnread)}>
              <div>
                <div className="text-sm font-bold">{n.title}</div>
                <p className="mt-1 text-xs opacity-85">{n.message}</p>
                <div className="mt-1.5 text-[11px] opacity-60">
                  {new Date(n.createdAt).toLocaleString()} · {n.eventType}
                </div>
              </div>
              {!n.isRead ? (
                <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-slate-950">
                  NEW
                </span>
              ) : null}
            </div>
          ))
        )}
      </section>
    </div>
  );
}
