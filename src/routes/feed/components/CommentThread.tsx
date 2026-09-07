import { SendHorizonal, TriangleAlert, X } from 'lucide-react';
import { useCallback, useState } from 'react';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { useCurrentUser } from '@/features/auth/hooks';
import { useCommentActions, useCommentThread } from '@/features/comments/hooks';
import { canDelete, composeCommentSchema, COMMENT_MAX_LENGTH } from '@/features/comments/types';
import type { Post } from '@/features/feed/types';
import { displayName, initialsOf } from '@/lib/user-display';

import { CommentRow } from './CommentRow';

interface CommentThreadProps {
  post: Post;
  /** Carries the +1/-1 back to whichever list holds this post. */
  onCommentCountChange: (postId: string, delta: number) => void;
}

/**
 * The thread under one post: the comments, the replies grouped under them, and
 * the box that adds either.
 *
 * `parentCommentId` is what makes a reply a reply — the composer sends it when
 * a row's Reply button has set a target, and omits it otherwise.
 */
export function CommentThread({ post, onCommentCountChange }: CommentThreadProps) {
  const viewer = useCurrentUser();
  const thread = useCommentThread(post.id, true);
  const [draft, setDraft] = useState('');
  const [draftError, setDraftError] = useState<string | null>(null);

  const handleCountChange = useCallback(
    (delta: number) => {
      onCommentCountChange(post.id, delta);
    },
    [onCommentCountChange, post.id],
  );

  const actions = useCommentActions(post.id, handleCountChange);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    const parsed = composeCommentSchema.safeParse({ content: draft });
    if (!parsed.success) {
      setDraftError(parsed.error.issues[0]?.message ?? 'That comment is not valid.');
      return;
    }

    setDraftError(null);
    void actions.submit(parsed.data.content).then((added) => {
      if (added) {
        setDraft('');
      }
    });
  };

  return (
    <section
      aria-label={`Comments on ${displayName(post.author)}'s post`}
      className="border-outline-variant/50 gap-md pt-md flex flex-col border-t"
    >
      {thread.status === 'loading' && (
        <div className="py-md flex justify-center">
          <Spinner label="Loading comments…" />
        </div>
      )}

      {thread.status === 'error' && (
        <p
          role="alert"
          className="text-on-error-container bg-error-container/40 font-body-sm text-body-sm gap-sm px-md py-sm flex items-center rounded-lg"
        >
          <TriangleAlert aria-hidden className="size-4 shrink-0" />
          {thread.error ?? 'The comments could not be loaded.'}
        </p>
      )}

      {thread.status === 'ready' && thread.nodes.length === 0 && (
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          No comments yet. Write the first one.
        </p>
      )}

      {thread.nodes.length > 0 && (
        <ul className="gap-md flex flex-col">
          {thread.nodes.map((node) => (
            <li key={node.comment.id} className="gap-sm flex flex-col">
              <CommentRow
                comment={node.comment}
                canDelete={canDelete(node.comment, viewer?.id, post.author.id)}
                isPending={thread.pendingIds.has(node.comment.id)}
                onReply={actions.setReplyTo}
                onToggleReaction={actions.toggleReaction}
                onDelete={(commentId) => {
                  void actions.remove(commentId);
                }}
              />
              {node.replies.map((reply) => (
                <CommentRow
                  key={reply.id}
                  comment={reply}
                  isReply
                  canDelete={canDelete(reply, viewer?.id, post.author.id)}
                  isPending={thread.pendingIds.has(reply.id)}
                  onReply={actions.setReplyTo}
                  onToggleReaction={actions.toggleReaction}
                  onDelete={(commentId) => {
                    void actions.remove(commentId);
                  }}
                />
              ))}
            </li>
          ))}
        </ul>
      )}

      {thread.hasMore && (
        <Button
          variant="ghost"
          isLoading={thread.isLoadingMore}
          onClick={actions.loadMore}
          className="self-start"
        >
          {thread.isLoadingMore ? 'Loading…' : 'Load more comments'}
        </Button>
      )}

      {thread.replyTo !== null && (
        <p className="bg-surface-container-low font-small text-small text-on-surface-variant gap-sm px-md py-xs flex items-center rounded-lg">
          Replying to {displayName(thread.replyTo.author)}
          <button
            type="button"
            aria-label="Cancel reply"
            className="hover:text-on-surface ml-auto"
            onClick={() => {
              actions.setReplyTo(null);
            }}
          >
            <X aria-hidden className="size-4" />
          </button>
        </p>
      )}

      <form className="gap-sm flex items-start" onSubmit={handleSubmit}>
        {viewer !== null && (
          <Avatar
            initials={initialsOf(viewer)}
            name={displayName(viewer)}
            imageUrl={viewer.avatarUrl}
            size="sm"
          />
        )}
        <div className="gap-xs flex min-w-0 flex-1 flex-col">
          <label className="sr-only" htmlFor={`comment-${post.id}`}>
            {thread.replyTo === null ? 'Write a comment' : 'Write a reply'}
          </label>
          <textarea
            id={`comment-${post.id}`}
            rows={1}
            value={draft}
            maxLength={COMMENT_MAX_LENGTH}
            placeholder={thread.replyTo === null ? 'Write a comment…' : 'Write a reply…'}
            onChange={(event) => {
              setDraft(event.target.value);
              setDraftError(null);
            }}
            className="font-body-sm text-body-sm text-on-surface placeholder:text-outline-variant bg-surface-container-low border-outline-variant focus:border-primary-container focus:ring-primary-container/20 px-md w-full resize-none rounded-xl border py-2 focus:ring-2 focus:outline-none"
          />
          {(draftError ?? thread.error) !== null && thread.status !== 'error' && (
            <p role="alert" className="font-small text-small text-error">
              {draftError ?? thread.error}
            </p>
          )}
        </div>
        <Button
          type="submit"
          aria-label={thread.replyTo === null ? 'Post comment' : 'Post reply'}
          isLoading={thread.isSubmitting}
          disabled={draft.trim() === ''}
          className="shrink-0"
        >
          <SendHorizonal aria-hidden className="size-4" />
        </Button>
      </form>
    </section>
  );
}
