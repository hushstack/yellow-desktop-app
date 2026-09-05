/**
 * Feed and post operations, as seen by the renderer: one allowlisted IPC call
 * each.
 *
 * Reactions are addressed by `{targetType, targetId}` because the API attaches
 * them to comments as well as posts; the helpers here fix the target type so
 * feed callers keep passing a post id and nothing more.
 */
import type {
  Comment,
  CommentPage,
  FeedResponse,
  IpcError,
  Post,
  PostVisibility,
  ReactionSummary,
  ReactionType,
  ShareLinkResponse,
} from '@shared/ipc-types';

import { ipc } from '@/lib/ipc';
import { fail, ok, type Result } from '@/lib/result';

import {
  COMMENT_PAGE_SIZE,
  FEED_PAGE_SIZE,
  PRIMARY_REACTION,
  type ComposePostInput,
} from './types';

export type FeedError = IpcError;

export async function fetchFeed(cursor?: string): Promise<Result<FeedResponse, FeedError>> {
  const result = await ipc.listFeed({
    size: FEED_PAGE_SIZE,
    ...(cursor === undefined ? {} : { cursor }),
  });
  return result.ok ? ok(result.data) : fail(result.error);
}

/**
 * Resolves to `null` when the user opened the image picker and cancelled —
 * nothing was posted, and that is not an error to show them.
 */
export async function publishPost(
  input: ComposePostInput,
  withImages = false,
): Promise<Result<Post | null, FeedError>> {
  const result = await ipc.createPost({
    content: input.content,
    visibility: input.visibility ?? 'PUBLIC',
    ...(withImages ? { withImages: true } : {}),
  });
  return result.ok ? ok(result.data.post) : fail(result.error);
}

export async function fetchPost(postId: string): Promise<Result<Post, FeedError>> {
  const result = await ipc.getPost({ postId });
  return result.ok ? ok(result.data.post) : fail(result.error);
}

export async function editPost(
  postId: string,
  changes: { content?: string; visibility?: PostVisibility },
): Promise<Result<Post, FeedError>> {
  const result = await ipc.updatePost({ postId, ...changes });
  return result.ok ? ok(result.data.post) : fail(result.error);
}

export async function deletePost(postId: string): Promise<Result<true, FeedError>> {
  const result = await ipc.deletePost({ postId });
  return result.ok ? ok(true) : fail(result.error);
}

export async function repost(postId: string, content?: string): Promise<Result<Post, FeedError>> {
  const result = await ipc.repost({ postId, ...(content === undefined ? {} : { content }) });
  return result.ok ? ok(result.data.post) : fail(result.error);
}

/** Only PUBLIC posts can be shared; anything else comes back POST_NOT_VISIBLE. */
export async function fetchShareLink(
  postId: string,
): Promise<Result<ShareLinkResponse, FeedError>> {
  const result = await ipc.postShareLink({ postId });
  return result.ok ? ok(result.data) : fail(result.error);
}

/* -- reactions -- */

export async function addReaction(
  postId: string,
  type: ReactionType = PRIMARY_REACTION,
): Promise<Result<ReactionSummary, FeedError>> {
  const result = await ipc.setReaction({ targetType: 'POST', targetId: postId, type });
  return result.ok ? ok(result.data) : fail(result.error);
}

export async function removeReaction(postId: string): Promise<Result<ReactionSummary, FeedError>> {
  const result = await ipc.clearReaction({ targetType: 'POST', targetId: postId });
  return result.ok ? ok(result.data) : fail(result.error);
}

export async function fetchReactionSummary(
  postId: string,
): Promise<Result<ReactionSummary, FeedError>> {
  const result = await ipc.reactionSummary({ targetType: 'POST', targetId: postId });
  return result.ok ? ok(result.data) : fail(result.error);
}

/* -- comments -- */

export async function fetchComments(
  postId: string,
  page = 0,
  size: number = COMMENT_PAGE_SIZE,
): Promise<Result<CommentPage, FeedError>> {
  const result = await ipc.listComments({ postId, page, size });
  return result.ok ? ok(result.data) : fail(result.error);
}

export async function addComment(
  postId: string,
  content: string,
  parentCommentId?: string,
): Promise<Result<Comment, FeedError>> {
  const result = await ipc.createComment({
    postId,
    content,
    ...(parentCommentId === undefined ? {} : { parentCommentId }),
  });
  return result.ok ? ok(result.data.comment) : fail(result.error);
}

export async function deleteComment(commentId: string): Promise<Result<true, FeedError>> {
  const result = await ipc.deleteComment({ commentId });
  return result.ok ? ok(true) : fail(result.error);
}

export async function reactToComment(
  commentId: string,
  type: ReactionType = PRIMARY_REACTION,
): Promise<Result<ReactionSummary, FeedError>> {
  const result = await ipc.setReaction({ targetType: 'COMMENT', targetId: commentId, type });
  return result.ok ? ok(result.data) : fail(result.error);
}

export async function clearCommentReaction(
  commentId: string,
): Promise<Result<ReactionSummary, FeedError>> {
  const result = await ipc.clearReaction({ targetType: 'COMMENT', targetId: commentId });
  return result.ok ? ok(result.data) : fail(result.error);
}
