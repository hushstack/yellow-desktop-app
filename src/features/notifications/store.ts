/**
 * Notification state.
 *
 * One store backs two views of the same truth: the paginated list on the
 * /notifications page and the unread-count badge in the always-mounted sidebar.
 * Marking something read on the page must decrement the badge, so both read
 * from here rather than each polling independently and drifting.
 *
 * The badge is polled (cheap count endpoint); the list is offset-paginated and
 * reloaded when the unread-only filter flips. Mark-read is optimistic and rolls
 * back to the server's last-confirmed state on failure.
 */
import type { Notification } from '@shared/ipc-types';
import { create } from 'zustand';

import { createLogger } from '@/lib/logger';

import {
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from './api';
import { NOTIFICATION_POLL_MS } from './types';

const log = createLogger('notifications.store');

export type NotificationsStatus = 'idle' | 'loading' | 'ready' | 'error';

interface NotificationsState {
  items: Notification[];
  status: NotificationsStatus;
  error: string | null;
  page: number;
  hasMore: boolean;
  isLoadingMore: boolean;
  unreadOnly: boolean;
  unreadCount: number;
  /** Ids with an in-flight mark-read, so a row can show its own pending state. */
  pendingIds: ReadonlySet<string>;
  isMarkingAll: boolean;
  load: () => Promise<void>;
  loadMore: () => Promise<void>;
  setUnreadOnly: (unreadOnly: boolean) => Promise<void>;
  markRead: (notificationId: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  refreshUnreadCount: () => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
}

/** Module-scoped so a second mount does not open a second interval. */
let pollTimer: ReturnType<typeof setInterval> | null = null;
let pollSubscribers = 0;

function withPending(pending: ReadonlySet<string>, id: string, present: boolean): Set<string> {
  const next = new Set(pending);
  if (present) {
    next.add(id);
  } else {
    next.delete(id);
  }
  return next;
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  items: [],
  status: 'idle',
  error: null,
  page: 0,
  hasMore: false,
  isLoadingMore: false,
  unreadOnly: false,
  unreadCount: 0,
  pendingIds: new Set(),
  isMarkingAll: false,

  load: async () => {
    set({ status: 'loading', error: null, page: 0 });
    const result = await fetchNotifications({ unreadOnly: get().unreadOnly, page: 0 });

    if (!result.ok) {
      set({ status: 'error', error: result.error.message });
      return;
    }

    set({
      items: result.data.content,
      page: result.data.page,
      hasMore: !result.data.last,
      status: 'ready',
    });
  },

  loadMore: async () => {
    const { page, hasMore, isLoadingMore, items, unreadOnly } = get();
    if (!hasMore || isLoadingMore) {
      return;
    }

    set({ isLoadingMore: true });
    const result = await fetchNotifications({ unreadOnly, page: page + 1 });
    set({ isLoadingMore: false });

    if (!result.ok) {
      set({ error: result.error.message });
      return;
    }

    set({
      items: [...items, ...result.data.content],
      page: result.data.page,
      hasMore: !result.data.last,
    });
  },

  setUnreadOnly: async (unreadOnly) => {
    if (get().unreadOnly === unreadOnly) {
      return;
    }
    set({ unreadOnly });
    await get().load();
  },

  markRead: async (notificationId) => {
    const existing = get().items.find((item) => item.id === notificationId);
    if (existing === undefined || existing.read || get().pendingIds.has(notificationId)) {
      return;
    }

    // Optimistic: flip the row and drop the badge by one now.
    set((state) => ({
      items: state.items.map((item) =>
        item.id === notificationId ? { ...item, read: true } : item,
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
      pendingIds: withPending(state.pendingIds, notificationId, true),
    }));

    const result = await markNotificationRead(notificationId);

    if (!result.ok) {
      // Roll back to the unread state the server last confirmed.
      set((state) => ({
        items: state.items.map((item) => (item.id === notificationId ? existing : item)),
        unreadCount: state.unreadCount + 1,
        error: result.error.message,
        pendingIds: withPending(state.pendingIds, notificationId, false),
      }));
      return;
    }

    set((state) => ({
      items: state.items.map((item) => (item.id === notificationId ? result.data : item)),
      pendingIds: withPending(state.pendingIds, notificationId, false),
    }));
  },

  markAllRead: async () => {
    if (get().isMarkingAll || get().unreadCount === 0) {
      return;
    }

    const snapshot = get().items;
    set((state) => ({
      isMarkingAll: true,
      items: state.items.map((item) => (item.read ? item : { ...item, read: true })),
      unreadCount: 0,
    }));

    const result = await markAllNotificationsRead();
    set({ isMarkingAll: false });

    if (!result.ok) {
      // Restore both the rows and the count the server still believes.
      set({ items: snapshot, error: result.error.message });
      await get().refreshUnreadCount();
      return;
    }

    set({ unreadCount: result.data.unread });
    log.info('notifications_all_read', {});
  },

  refreshUnreadCount: async () => {
    const result = await fetchUnreadCount();
    if (result.ok) {
      set({ unreadCount: result.data.unread });
    }
  },

  startPolling: () => {
    pollSubscribers += 1;
    if (pollTimer !== null) {
      return;
    }
    void get().refreshUnreadCount();
    pollTimer = setInterval(() => {
      void get().refreshUnreadCount();
    }, NOTIFICATION_POLL_MS);
  },

  stopPolling: () => {
    pollSubscribers = Math.max(0, pollSubscribers - 1);
    if (pollSubscribers === 0 && pollTimer !== null) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  },
}));
