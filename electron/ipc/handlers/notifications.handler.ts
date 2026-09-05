/**
 * Notifications.
 *
 * Every route is scoped server-side to the authenticated caller — there is no
 * recipient parameter anywhere — so the renderer cannot ask for someone else's
 * notifications, and an id belonging to another user comes back as 404 rather
 * than 403 (OWASP A01: a 403 would confirm the id exists).
 */
import { createLogger } from '../../../shared/logger';
import { ENDPOINTS } from '../../api/endpoints';
import { apiRequest } from '../../api/http-client';
import { IPC_CHANNELS } from '../channels';
import { registerIpcHandler } from '../register';

import {
  emptyRequestSchema,
  ipcOk,
  listNotificationsRequestSchema,
  notificationIdRequestSchema,
  notificationPageSchema,
  notificationResponseSchema,
  notificationSchema,
  unreadCountSchema,
  type IpcResult,
  type NotificationPage,
  type NotificationResponse,
  type UnreadCount,
} from '../../../shared/ipc-types';

const log = createLogger('ipc.notifications');

export function registerNotificationHandlers(): void {
  registerIpcHandler(
    IPC_CHANNELS.NOTIFICATIONS_LIST,
    listNotificationsRequestSchema,
    async ({ unreadOnly, page, size }): Promise<IpcResult<NotificationPage>> =>
      apiRequest({
        method: 'get',
        url: ENDPOINTS.notifications.list,
        schema: notificationPageSchema,
        params: { unreadOnly, page, size, sort: 'createdAt,desc' },
      }),
  );

  registerIpcHandler(
    IPC_CHANNELS.NOTIFICATIONS_UNREAD_COUNT,
    emptyRequestSchema,
    async (): Promise<IpcResult<UnreadCount>> =>
      apiRequest({
        method: 'get',
        url: ENDPOINTS.notifications.unreadCount,
        schema: unreadCountSchema,
      }),
  );

  registerIpcHandler(
    IPC_CHANNELS.NOTIFICATIONS_MARK_READ,
    notificationIdRequestSchema,
    async ({ notificationId }): Promise<IpcResult<NotificationResponse>> => {
      const result = await apiRequest({
        method: 'put',
        url: ENDPOINTS.notifications.markRead(notificationId),
        schema: notificationSchema,
      });

      return result.ok
        ? ipcOk(notificationResponseSchema.parse({ notification: result.data }))
        : result;
    },
  );

  registerIpcHandler(
    IPC_CHANNELS.NOTIFICATIONS_MARK_ALL_READ,
    emptyRequestSchema,
    async (): Promise<IpcResult<UnreadCount>> => {
      const result = await apiRequest({
        method: 'put',
        url: ENDPOINTS.notifications.markAllRead,
        schema: unreadCountSchema,
      });

      log.info(result.ok ? 'notifications_all_read' : 'notifications_read_all_failed', {});
      return result;
    },
  );
}
