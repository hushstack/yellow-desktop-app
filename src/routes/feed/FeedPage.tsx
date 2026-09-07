import { TriangleAlert } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';

import type { AppShellContext } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { useCurrentUser } from '@/features/auth/hooks';
import {
  useFeed,
  useFeedCommentCount,
  useFeedPostActions,
  useVisiblePosts,
} from '@/features/feed/hooks';

import { PostComposer } from './components/PostComposer';
import { PostList } from './components/PostList';

/** The home timeline: composer on top, posts below. */
export default function FeedPage() {
  const { searchQuery } = useOutletContext<AppShellContext>();
  const { status, error, loadMore, hasMore, isLoadingMore } = useFeed();
  const posts = useVisiblePosts(searchQuery);
  const actions = useFeedPostActions();
  const adjustCommentCount = useFeedCommentCount();
  const viewer = useCurrentUser();

  return (
    <div className="max-w-content-max gap-lg px-lg py-lg mx-auto flex w-full flex-col">
      <PostComposer />

      {(status === 'loading' || status === 'idle') && (
        <div className="py-xl flex justify-center">
          <Spinner label="Loading your feed…" />
        </div>
      )}

      {status === 'error' && (
        <p
          role="alert"
          className="text-on-error-container bg-error-container/40 font-body-sm text-body-sm gap-sm px-md py-sm flex items-center rounded-lg"
        >
          <TriangleAlert aria-hidden className="size-4 shrink-0" />
          {error ?? 'The feed could not be loaded.'}
        </p>
      )}

      {status === 'ready' && (
        <>
          <PostList
            posts={posts}
            isFiltered={searchQuery.trim() !== ''}
            actions={actions}
            viewerId={viewer?.id}
            onCommentCountChange={adjustCommentCount}
          />

          {hasMore && searchQuery.trim() === '' && (
            <div className="flex justify-center">
              <Button
                variant="secondary"
                isLoading={isLoadingMore}
                onClick={() => {
                  void loadMore();
                }}
              >
                {isLoadingMore ? 'Loading…' : 'Load more'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
