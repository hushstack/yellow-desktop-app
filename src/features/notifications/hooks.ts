/**
 * Notification hooks.
 *
 * Thin selectors over the store so components stay presentational. The badge
 * polling is a mount/unmount effect keyed to the sidebar's lifetime.
 */
import { useEffect } from 'react';

import { useNotificationsStore } from './store';

/** The unread count for the sidebar badge. */
export function useUnreadCount(): number {
  return useNotificationsStore((state) => state.unreadCount);
}

/**
 * Starts polling the unread count for as long as the calling component is
 * mounted. Mounted from the sidebar, so the badge stays fresh on every screen.
 */
export function useNotificationsPolling(): void {
  const startPolling = useNotificationsStore((state) => state.startPolling);
  const stopPolling = useNotificationsStore((state) => state.stopPolling);

  useEffect(() => {
    startPolling();
    return stopPolling;
  }, [startPolling, stopPolling]);
}
