/**
 * Feed shapes.
 *
 * Posts come from the API (see @shared/ipc-types); what lives here is the
 * composer contract and the reaction the UI treats as "like".
 */
import { postVisibilitySchema, type Post, type ReactionType } from '@shared/ipc-types';
import { z } from 'zod';

export const POST_MAX_LENGTH = 5000;
export const FEED_PAGE_SIZE = 20;
export const COMMENT_PAGE_SIZE = 20;

/** The heart button maps to one reaction type; the API supports six. */
export const PRIMARY_REACTION: ReactionType = 'LIKE';

/** `reactionCounts` also carries a `total` key, which is not a reaction type. */
const TOTAL_KEY = 'total';

export const composePostSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'Write something before posting.')
    .max(POST_MAX_LENGTH, `Keep it under ${POST_MAX_LENGTH} characters.`),
  /** The composer defaults to PUBLIC; the API also accepts FRIENDS and PRIVATE. */
  visibility: postVisibilitySchema.optional(),
});

export type ComposePostInput = z.infer<typeof composePostSchema>;

export function reactionTotal(post: Post): number {
  const explicitTotal = post.reactionCounts[TOTAL_KEY];
  if (typeof explicitTotal === 'number') {
    return explicitTotal;
  }

  return Object.entries(post.reactionCounts)
    .filter(([key]) => key !== TOTAL_KEY)
    .reduce((sum, [, count]) => sum + count, 0);
}

export function viewerHasReacted(post: Post): boolean {
  return post.viewerReaction !== null && post.viewerReaction !== undefined;
}

export type { Post };
