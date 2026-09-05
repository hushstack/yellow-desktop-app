/**
 * Feed state.
 *
 * Holds the loaded pages, the cursor for the next one, and the in-flight flags
 * the composer and the reaction buttons read.
 *
 * Reactions are applied optimistically and reconciled with the summary the API
 * returns, so the count is authoritative rather than guessed; a failure rolls
 * the post back to what the server last told us.
 */
import type { Post } from '@shared/ipc-types';
import { create } from 'zustand';

import { createLogger } from '@/lib/logger';

import { addReaction, fetchFeed, publishPost, removeReaction } from './api';
import { PRIMARY_REACTION, type ComposePostInput } from './types';

const log = createLogger('feed.store');

export type FeedStatus = 'idle' | 'loading' | 'ready' | 'error';

interface FeedState {
  posts: Post[];
  status: FeedStatus;
  error: string | null;
  nextCursor: string | null;
  hasMore: boolean;
  isLoadingMore: boolean;
  isPublishing: boolean;
  load: () => Promise<void>;
  loadMore: () => Promise<void>;
  publish: (input: ComposePostInput, withImages?: boolean) => Promise<boolean>;
  toggleReaction: (postId: string) => Promise<void>;
}

function replacePost(posts: Post[], updated: Post): Post[] {
  return posts.map((post) => (post.id === updated.id ? updated : post));
}

export const useFeedStore = create<FeedState>((set, get) => ({
  posts: [],
  status: 'idle',
  error: null,
  nextCursor: null,
  hasMore: false,
  isLoadingMore: false,
  isPublishing: false,

  load: async () => {
    set({ status: 'loading', error: null });
    const result = await fetchFeed();

    if (!result.ok) {
      set({ status: 'error', error: result.error.message });
      return;
    }

    set({
      posts: result.data.posts,
      nextCursor: result.data.nextCursor,
      hasMore: result.data.hasMore,
      status: 'ready',
    });
  },

  loadMore: async () => {
    const { nextCursor, hasMore, isLoadingMore, posts } = get();
    if (!hasMore || nextCursor === null || isLoadingMore) {
      return;
    }

    set({ isLoadingMore: true });
    const result = await fetchFeed(nextCursor);
    set({ isLoadingMore: false });

    if (!result.ok) {
      set({ error: result.error.message });
      return;
    }

    set({
      posts: [...posts, ...result.data.posts],
      nextCursor: result.data.nextCursor,
      hasMore: result.data.hasMore,
    });
  },

  publish: async (input, withImages = false) => {
    set({ isPublishing: true });
    const result = await publishPost(input, withImages);
    set({ isPublishing: false });

    if (!result.ok) {
      set({ error: result.error.message });
      return false;
    }

    if (result.data === null) {
      // The image picker was cancelled: nothing was posted, nothing to report.
      return false;
    }

    set({ posts: [result.data, ...get().posts], error: null });
    log.info('post_published', {});
    return true;
  },

  toggleReaction: async (postId) => {
    const existing = get().posts.find((post) => post.id === postId);
    if (existing === undefined) {
      return;
    }

    const hadReacted = existing.viewerReaction !== null && existing.viewerReaction !== undefined;

    // Optimistic: repaint now, reconcile with the server's summary below.
    set({
      posts: replacePost(get().posts, {
        ...existing,
        viewerReaction: hadReacted ? null : PRIMARY_REACTION,
      }),
    });

    const result = hadReacted ? await removeReaction(postId) : await addReaction(postId);

    if (!result.ok) {
      // Roll back to the last state the server confirmed.
      set({ posts: replacePost(get().posts, existing), error: result.error.message });
      return;
    }

    set({
      posts: replacePost(get().posts, {
        ...existing,
        reactionCounts: { ...result.data.counts, total: result.data.total },
        viewerReaction: result.data.viewerReaction ?? null,
      }),
    });
  },
}));
