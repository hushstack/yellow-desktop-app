/**
 * Notification operations, as seen by the renderer: one allowlisted IPC call
 * each. Every route is scoped server-side to the signed-in user, so none of
 * these take a recipient.
 */
import type { IpcError, Notification, NotificationPage, UnreadCount } from '@shared/ipc-types';

import { ipc } from '@/lib/ipc';
import { fail, ok, type Result } from '@/lib/result';

import { NOTIFICATIONS_PAGE_SIZE } from './types';

export type NotificationsError = IpcError;

export async function fetchNotifications(
  options: { unreadOnly?: boolean; page?: number; size?: number } = {},
): Promise<Result<NotificationPage, NotificationsError>> {
  const result = await ipc.listNotifications({
    unreadOnly: options.unreadOnly ?? false,
    page: options.page ?? 0,
    size: options.size ?? NOTIFICATIONS_PAGE_SIZE,
  });
  return result.ok ? ok(result.data) : fail(result.error);
}

/** Cheap enough to poll for the sidebar badge. */
export async function fetchUnreadCount(): Promise<Result<UnreadCount, NotificationsError>> {
  const result = await ipc.unreadNotificationCount();
  return result.ok ? ok(result.data) : fail(result.error);
}

export async function markNotificationRead(
  notificationId: string,
): Promise<Result<Notification, NotificationsError>> {
  const result = await ipc.markNotificationRead({ notificationId });
  return result.ok ? ok(result.data.notification) : fail(result.error);
}

/** Answers with the resulting count, which is always zero. */
export async function markAllNotificationsRead(): Promise<Result<UnreadCount, NotificationsError>> {
  const result = await ipc.markAllNotificationsRead();
  return result.ok ? ok(result.data) : fail(result.error);
}
