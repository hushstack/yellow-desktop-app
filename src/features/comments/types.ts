/**
 * Comment shapes.
 *
 * The records come from the API (see @shared/ipc-types); what lives here is the
 * composer contract and the reply-tree assembly. The list endpoint returns
 * top-level comments only — replies are addressed by their `parentCommentId` —
 * so the nesting the UI shows is built on this side, one level deep, matching
 * how the server raises notifications for a thread.
 */
import { COMMENT_MAX_LENGTH, type Comment } from '@shared/ipc-types';
import { z } from 'zod';

export const COMMENTS_PAGE_SIZE = 20;

export const composeCommentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'Write something first.')
    .max(COMMENT_MAX_LENGTH, `Keep it under ${String(COMMENT_MAX_LENGTH)} characters.`),
  /** Set to reply to an existing comment rather than to the post itself. */
  parentCommentId: z.string().min(1).max(64).optional(),
});

export type ComposeCommentInput = z.infer<typeof composeCommentSchema>;

/** A top-level comment with the replies that pointed at it. */
export interface CommentNode {
  comment: Comment;
  replies: Comment[];
}

function isReply(comment: Comment): boolean {
  return comment.parentCommentId !== undefined;
}

/**
 * Groups a flat list into one level of nesting. Replies whose parent is not in
 * the same list are kept as roots rather than dropped, so a reply to a comment
 * on a later page still renders (A10 — an incomplete page must not lose rows).
 */
export function toThread(comments: readonly Comment[]): CommentNode[] {
  const roots = new Map<string, CommentNode>();

  for (const comment of comments) {
    if (!isReply(comment)) {
      roots.set(comment.id, { comment, replies: [] });
    }
  }

  const orphans: CommentNode[] = [];

  for (const comment of comments) {
    if (!isReply(comment)) {
      continue;
    }
    const parent = roots.get(comment.parentCommentId ?? '');
    if (parent === undefined) {
      orphans.push({ comment, replies: [] });
    } else {
      parent.replies.push(comment);
    }
  }

  return [...roots.values(), ...orphans];
}

/** Whether the signed-in user may delete this comment. */
export function canDelete(
  comment: Comment,
  viewerId: string | undefined,
  postAuthorId: string,
): boolean {
  if (viewerId === undefined) {
    return false;
  }
  // The server permits the comment's author and the post's author; mirroring
  // that here only decides whether to *show* the control — the check that
  // matters is the server's (A01).
  return comment.author.id === viewerId || postAuthorId === viewerId;
}

export { COMMENT_MAX_LENGTH };
export type { Comment };
