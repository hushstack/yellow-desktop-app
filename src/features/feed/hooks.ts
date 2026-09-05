/**
 * Feed hooks. Loading and filtering live here so the components stay
 * presentational.
 */
import type { Post } from '@shared/ipc-types';
import { useEffect, useMemo } from 'react';

import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { SEARCH_DEBOUNCE_MS } from '@/lib/constants';
import { displayName } from '@/lib/user-display';

import { useFeedStore } from './store';

export function useFeed() {
  const status = useFeedStore((state) => state.status);
  const error = useFeedStore((state) => state.error);
  const load = useFeedStore((state) => state.load);
  const loadMore = useFeedStore((state) => state.loadMore);
  const hasMore = useFeedStore((state) => state.hasMore);
  const isLoadingMore = useFeedStore((state) => state.isLoadingMore);

  useEffect(() => {
    if (status === 'idle') {
      void load();
    }
  }, [status, load]);

  return { status, error, reload: load, loadMore, hasMore, isLoadingMore };
}

/** Client-side filtering of what is already loaded; the API has no search yet. */
export function useVisiblePosts(query: string): Post[] {
  const posts = useFeedStore((state) => state.posts);
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);

  return useMemo(() => {
    const needle = debouncedQuery.trim().toLowerCase();
    if (needle === '') {
      return posts;
    }

    return posts.filter(
      (post) =>
        post.content.toLowerCase().includes(needle) ||
        displayName(post.author).toLowerCase().includes(needle),
    );
  }, [posts, debouncedQuery]);
}

export function usePostComposer() {
  const publish = useFeedStore((state) => state.publish);
  const isPublishing = useFeedStore((state) => state.isPublishing);
  return { publish, isPublishing };
}

export function useToggleReaction() {
  return useFeedStore((state) => state.toggleReaction);
}

export function useLoadedPosts(): Post[] {
  return useFeedStore((state) => state.posts);
}
