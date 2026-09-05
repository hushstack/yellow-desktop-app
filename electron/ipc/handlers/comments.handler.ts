/**
 * Comments on posts, and replies to comments.
 *
 * The list endpoint returns top-level comments only — replies are addressed by
 * their `parentCommentId` — so this layer does not attempt to build a tree; it
 * hands back the page the server sent and lets the UI decide.
 */
import { z } from 'zod';

import { createLogger } from '../../../shared/logger';
import { ENDPOINTS } from '../../api/endpoints';
import { apiRequest } from '../../api/http-client';
import { IPC_CHANNELS } from '../channels';
import { registerIpcHandler } from '../register';

import {
  commentPageSchema,
  commentResponseSchema,
  commentSchema,
  createCommentRequestSchema,
  deleteCommentRequestSchema,
  deletedResponseSchema,
  ipcOk,
  listCommentsRequestSchema,
  type CommentPage,
  type CommentResponse,
  type DeletedResponse,
  type IpcResult,
} from '../../../shared/ipc-types';

const log = createLogger('ipc.comments');

const noContentSchema = z.undefined();

export function registerCommentHandlers(): void {
  registerIpcHandler(
    IPC_CHANNELS.COMMENTS_CREATE,
    createCommentRequestSchema,
    async ({ postId, content, parentCommentId }): Promise<IpcResult<CommentResponse>> => {
      const result = await apiRequest({
        method: 'post',
        url: ENDPOINTS.posts.comments(postId),
        body: {
          content,
          ...(parentCommentId === undefined ? {} : { parentCommentId }),
        },
        schema: commentSchema,
      });

      if (!result.ok) {
        return result;
      }

      log.info('comment_created', { reply: parentCommentId !== undefined });
      return ipcOk(commentResponseSchema.parse({ comment: result.data }));
    },
  );

  registerIpcHandler(
    IPC_CHANNELS.COMMENTS_LIST,
    listCommentsRequestSchema,
    async ({ postId, page, size }): Promise<IpcResult<CommentPage>> =>
      apiRequest({
        method: 'get',
        url: ENDPOINTS.posts.comments(postId),
        schema: commentPageSchema,
        // Oldest first is the reading order for a thread.
        params: { page, size, sort: 'createdAt,asc' },
      }),
  );

  registerIpcHandler(
    IPC_CHANNELS.COMMENTS_DELETE,
    deleteCommentRequestSchema,
    async ({ commentId }): Promise<IpcResult<DeletedResponse>> => {
      // The server allows both the comment's author and the post's author here;
      // deciding which the caller is belongs there, not in the client (A01).
      const result = await apiRequest({
        method: 'delete',
        url: ENDPOINTS.comments.byId(commentId),
        schema: noContentSchema,
      });

      if (!result.ok) {
        return result;
      }

      log.info('comment_deleted', {});
      return ipcOk(deletedResponseSchema.parse({ deleted: true }));
    },
  );
}
