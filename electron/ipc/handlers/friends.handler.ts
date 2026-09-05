/**
 * Friend requests and friendships.
 *
 * Note which id each route takes, because they differ and getting it wrong is
 * the easy mistake: requests are *sent* to a user id and *answered* by a
 * friendship id, and unfriending is by the other user's id again. The request
 * schemas name the field accordingly (`userId` vs `friendshipId`) so the
 * distinction survives into the renderer.
 */
import { z } from 'zod';

import { createLogger } from '../../../shared/logger';
import { ENDPOINTS } from '../../api/endpoints';
import { apiRequest } from '../../api/http-client';
import { IPC_CHANNELS } from '../channels';
import { registerIpcHandler } from '../register';

import {
  deletedResponseSchema,
  friendUserRequestSchema,
  friendshipIdRequestSchema,
  friendshipPageSchema,
  friendshipResponseSchema,
  friendshipSchema,
  ipcOk,
  pageRequestSchema,
  type DeletedResponse,
  type FriendshipPage,
  type FriendshipResponse,
  type IpcResult,
} from '../../../shared/ipc-types';

const log = createLogger('ipc.friends');

const noContentSchema = z.undefined();

/** Accept and decline differ only in the URL, so they share one implementation. */
async function answerRequest(url: string): Promise<IpcResult<FriendshipResponse>> {
  const result = await apiRequest({ method: 'put', url, schema: friendshipSchema });
  return result.ok ? ipcOk(friendshipResponseSchema.parse({ friendship: result.data })) : result;
}

export function registerFriendHandlers(): void {
  registerIpcHandler(
    IPC_CHANNELS.FRIENDS_LIST,
    pageRequestSchema,
    async ({ page, size }): Promise<IpcResult<FriendshipPage>> =>
      apiRequest({
        method: 'get',
        url: ENDPOINTS.friends.list,
        schema: friendshipPageSchema,
        params: { page, size },
      }),
  );

  registerIpcHandler(
    IPC_CHANNELS.FRIENDS_PENDING_REQUESTS,
    pageRequestSchema,
    async ({ page, size }): Promise<IpcResult<FriendshipPage>> =>
      apiRequest({
        method: 'get',
        url: ENDPOINTS.friends.requests,
        schema: friendshipPageSchema,
        params: { page, size },
      }),
  );

  registerIpcHandler(
    IPC_CHANNELS.FRIENDS_SEND_REQUEST,
    friendUserRequestSchema,
    async ({ userId }): Promise<IpcResult<FriendshipResponse>> => {
      const result = await apiRequest({
        method: 'post',
        url: ENDPOINTS.friends.requestTo(userId),
        schema: friendshipSchema,
      });

      if (!result.ok) {
        return result;
      }

      log.info('friend_request_sent', {});
      return ipcOk(friendshipResponseSchema.parse({ friendship: result.data }));
    },
  );

  registerIpcHandler(
    IPC_CHANNELS.FRIENDS_ACCEPT,
    friendshipIdRequestSchema,
    async ({ friendshipId }): Promise<IpcResult<FriendshipResponse>> => {
      const result = await answerRequest(ENDPOINTS.friends.accept(friendshipId));
      log.info(result.ok ? 'friend_request_accepted' : 'friend_request_accept_failed', {});
      return result;
    },
  );

  registerIpcHandler(
    IPC_CHANNELS.FRIENDS_DECLINE,
    friendshipIdRequestSchema,
    async ({ friendshipId }): Promise<IpcResult<FriendshipResponse>> => {
      const result = await answerRequest(ENDPOINTS.friends.decline(friendshipId));
      log.info(result.ok ? 'friend_request_declined' : 'friend_request_decline_failed', {});
      return result;
    },
  );

  registerIpcHandler(
    IPC_CHANNELS.FRIENDS_REMOVE,
    friendUserRequestSchema,
    async ({ userId }): Promise<IpcResult<DeletedResponse>> => {
      const result = await apiRequest({
        method: 'delete',
        url: ENDPOINTS.friends.remove(userId),
        schema: noContentSchema,
      });

      if (!result.ok) {
        return result;
      }

      log.info('friendship_removed', {});
      return ipcOk(deletedResponseSchema.parse({ deleted: true }));
    },
  );
}
