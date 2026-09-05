/**
 * Single-post reads and writes: fetch, edit, delete, repost, share link.
 *
 * Authorisation is not re-implemented here and must not be: the server decides
 * whether the caller may see or edit a post, and answers `POST_NOT_VISIBLE` or
 * `ACCESS_DENIED` when not. A client-side check would be advisory only (OWASP
 * A01), so these handlers pass the failure straight through instead of
 * pretending to enforce anything.
 *
 * Post ids arrive validated by `registerIpcHandler` and are percent-encoded by
 * `ENDPOINTS`, so a crafted id cannot address a different route (A05).
 */
import { z } from 'zod';

import { createLogger } from '../../../shared/logger';
import { ENDPOINTS } from '../../api/endpoints';
import { apiRequest } from '../../api/http-client';
import { IPC_CHANNELS } from '../channels';
import { registerIpcHandler } from '../register';

import {
  deletedResponseSchema,
  ipcOk,
  postIdRequestSchema,
  postResponseSchema,
  postSchema,
  repostRequestSchema,
  shareLinkResponseSchema,
  updatePostRequestSchema,
  type DeletedResponse,
  type IpcResult,
  type PostResponse,
  type ShareLinkResponse,
} from '../../../shared/ipc-types';

const log = createLogger('ipc.posts');

/** A 204 hands the parser `undefined`; nothing else is acceptable. */
const noContentSchema = z.undefined();

export function registerPostHandlers(): void {
  registerIpcHandler(
    IPC_CHANNELS.POSTS_GET,
    postIdRequestSchema,
    async ({ postId }): Promise<IpcResult<PostResponse>> => {
      const result = await apiRequest({
        method: 'get',
        url: ENDPOINTS.posts.byId(postId),
        schema: postSchema,
      });

      return result.ok ? ipcOk(postResponseSchema.parse({ post: result.data })) : result;
    },
  );

  registerIpcHandler(
    IPC_CHANNELS.POSTS_UPDATE,
    updatePostRequestSchema,
    async ({ postId, content, visibility }): Promise<IpcResult<PostResponse>> => {
      // Both fields are optional upstream: send only what is actually changing.
      const body = {
        ...(content === undefined ? {} : { content }),
        ...(visibility === undefined ? {} : { visibility }),
      };

      const result = await apiRequest({
        method: 'put',
        url: ENDPOINTS.posts.byId(postId),
        body,
        schema: postSchema,
      });

      if (!result.ok) {
        return result;
      }

      log.info('post_updated', {});
      return ipcOk(postResponseSchema.parse({ post: result.data }));
    },
  );

  registerIpcHandler(
    IPC_CHANNELS.POSTS_DELETE,
    postIdRequestSchema,
    async ({ postId }): Promise<IpcResult<DeletedResponse>> => {
      const result = await apiRequest({
        method: 'delete',
        url: ENDPOINTS.posts.byId(postId),
        schema: noContentSchema,
      });

      if (!result.ok) {
        return result;
      }

      log.info('post_deleted', {});
      return ipcOk(deletedResponseSchema.parse({ deleted: true }));
    },
  );

  registerIpcHandler(
    IPC_CHANNELS.POSTS_REPOST,
    repostRequestSchema,
    async ({ postId, content }): Promise<IpcResult<PostResponse>> => {
      const result = await apiRequest({
        method: 'post',
        url: ENDPOINTS.posts.repost(postId),
        body: content === undefined ? {} : { content },
        schema: postSchema,
      });

      if (!result.ok) {
        return result;
      }

      log.info('post_reposted', {});
      return ipcOk(postResponseSchema.parse({ post: result.data }));
    },
  );

  registerIpcHandler(
    IPC_CHANNELS.POSTS_SHARE_LINK,
    postIdRequestSchema,
    async ({ postId }): Promise<IpcResult<ShareLinkResponse>> =>
      apiRequest({
        method: 'get',
        url: ENDPOINTS.posts.shareLink(postId),
        schema: shareLinkResponseSchema,
      }),
  );
}
