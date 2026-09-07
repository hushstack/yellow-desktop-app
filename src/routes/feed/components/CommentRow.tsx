import { Heart, Reply, Trash2 } from 'lucide-react';
import { memo } from 'react';
import { Link } from 'react-router-dom';

import { Avatar } from '@/components/ui/Avatar';
import type { Comment } from '@/features/comments/types';
import { cn } from '@/lib/cn';
import { relativeTime } from '@/lib/relative-time';
import { displayName, handleOf, initialsOf } from '@/lib/user-display';

interface CommentRowProps {
  comment: Comment;
  /** Replies are indented one level; the API nests no deeper than that. */
  isReply?: boolean;
  canDelete: boolean;
  isPending: boolean;
  onReply: (commentId: string) => void;
  onToggleReaction: (commentId: string) => void;
  onDelete: (commentId: string) => void;
}

const ACTION_CLASS =
  'font-small text-small gap-xs inline-flex items-center rounded-md px-1.5 py-0.5 transition-colors disabled:opacity-40';

export const CommentRow = memo(function CommentRow({
  comment,
  isReply = false,
  canDelete,
  isPending,
  onReply,
  onToggleReaction,
  onDelete,
}: CommentRowProps) {
  const author = displayName(comment.author);
  const hasReacted = comment.viewerReaction !== null && comment.viewerReaction !== undefined;

  return (
    <article className={cn('gap-sm flex', isReply && 'pl-lg')}>
      <Link to={`/users/${comment.author.id}`} className="shrink-0">
        <Avatar
          initials={initialsOf(comment.author)}
          name={author}
          imageUrl={comment.author.avatarUrl}
          size="sm"
        />
      </Link>

      <div className="min-w-0 flex-1">
        <div className="bg-surface-container-low px-md py-sm rounded-xl">
          <div className="gap-xs flex flex-wrap items-baseline">
            <Link
              to={`/users/${comment.author.id}`}
              className="font-label text-label text-on-surface hover:text-primary transition-colors"
            >
              {author}
            </Link>
            <span className="font-small text-small text-on-surface-variant">
              {handleOf(comment.author)}
            </span>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface whitespace-pre-wrap">
            {comment.content}
          </p>
        </div>

        <div className="gap-sm mt-1 flex items-center">
          <button
            type="button"
            aria-pressed={hasReacted}
            disabled={isPending}
            onClick={() => {
              onToggleReaction(comment.id);
            }}
            className={cn(
              ACTION_CLASS,
              hasReacted
                ? 'text-secondary'
                : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface',
            )}
          >
            <Heart aria-hidden className={cn('size-3.5', hasReacted && 'fill-current')} />
            {comment.reactionCount > 0 ? comment.reactionCount : 'Like'}
          </button>

          {!isReply && (
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                onReply(comment.id);
              }}
              className={cn(
                ACTION_CLASS,
                'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface',
              )}
            >
              <Reply aria-hidden className="size-3.5" />
              Reply
            </button>
          )}

          {canDelete && (
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                onDelete(comment.id);
              }}
              className={cn(ACTION_CLASS, 'text-on-surface-variant hover:text-error')}
            >
              <Trash2 aria-hidden className="size-3.5" />
              Delete
            </button>
          )}

          <span className="font-small text-small text-on-surface-variant ml-auto">
            {relativeTime(comment.createdAt)}
          </span>
        </div>
      </div>
    </article>
  );
});
