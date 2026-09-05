/**
 * Reactions, for either target type.
 *
 * One reaction per user per target is enforced by the server's database, so
 * `set` is idempotent in effect: sending a different type replaces the previous
 * one rather than adding a second. All three calls answer with the same summary
 * so the UI can repaint counts without a follow-up read.
 *
 * `targetType` is a closed enum in the request schema rather than free text —
 * it becomes a URL path segment, and an unbounded string there would be a route
 * the renderer gets to choose (OWASP A01/A05).
 */
import { ENDPOINTS } from '../../api/endpoints';
import { apiRequest } from '../../api/http-client';
import { IPC_CHANNELS } from '../channels';
import { registerIpcHandler } from '../register';

import {
  clearReactionRequestSchema,
  reactionSummarySchema,
  reactionTargetRequestSchema,
  setReactionRequestSchema,
  type IpcResult,
  type ReactionSummary,
} from '../../../shared/ipc-types';

export function registerReactionHandlers(): void {
  registerIpcHandler(
    IPC_CHANNELS.REACTIONS_SET,
    setReactionRequestSchema,
    async ({ targetType, targetId, type }): Promise<IpcResult<ReactionSummary>> =>
      apiRequest({
        method: 'put',
        url: ENDPOINTS.reactions.forTarget(targetType, targetId),
        body: { type },
        schema: reactionSummarySchema,
      }),
  );

  registerIpcHandler(
    IPC_CHANNELS.REACTIONS_CLEAR,
    clearReactionRequestSchema,
    async ({ targetType, targetId }): Promise<IpcResult<ReactionSummary>> =>
      apiRequest({
        method: 'delete',
        url: ENDPOINTS.reactions.forTarget(targetType, targetId),
        schema: reactionSummarySchema,
      }),
  );

  registerIpcHandler(
    IPC_CHANNELS.REACTIONS_SUMMARY,
    reactionTargetRequestSchema,
    async ({ targetType, targetId }): Promise<IpcResult<ReactionSummary>> =>
      apiRequest({
        method: 'get',
        url: ENDPOINTS.reactions.summary(targetType, targetId),
        schema: reactionSummarySchema,
      }),
  );
}
