import { Heart, MessageCircle, Share2 } from 'lucide-react';
import { memo } from 'react';

import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { reactionTotal, viewerHasReacted, type Post } from '@/features/feed/types';
import { cn } from '@/lib/cn';
import { relativeTime } from '@/lib/relative-time';
import { displayName, handleOf, initialsOf } from '@/lib/user-display';

interface PostCardProps {
  post: Post;
  onToggleReaction: (postId: string) => void;
}

const ACTION_CLASS =
  'flex flex-1 items-center justify-center gap-sm rounded-lg py-2 font-label text-label transition-colors';

/**
 * Memoised: the feed re-renders on every keystroke in the search box, and a
 * post that survives the filter has not changed.
 */
export const PostCard = memo(function PostCard({ post, onToggleReaction }: PostCardProps) {
  const author = displayName(post.author);
  const hasReacted = viewerHasReacted(post);

  return (
    <Card elevation="floating" as="article" className="gap-md p-md md:p-lg flex flex-col">
      <div className="gap-md flex items-center">
        <Avatar initials={initialsOf(post.author)} name={author} imageUrl={post.author.avatarUrl} />
        <div className="min-w-0">
          <h3 className="font-heading text-h3 text-on-surface truncate">{author}</h3>
          <p className="font-small text-small text-on-surface-variant truncate">
            {handleOf(post.author)} · {relativeTime(post.createdAt)}
          </p>
        </div>
      </div>

      {post.content !== '' && (
        <p className="font-body text-body text-on-surface leading-relaxed whitespace-pre-wrap">
          {post.content}
        </p>
      )}

      {post.images.length > 0 && (
        <ul className="gap-sm grid grid-cols-1 sm:grid-cols-2">
          {post.images.map((image) => (
            <li
              key={image.url}
              className="border-outline-variant overflow-hidden rounded-lg border"
            >
              <img src={image.url} alt="" className="h-full w-full object-cover" loading="lazy" />
            </li>
          ))}
        </ul>
      )}

      {post.originalPost !== null && post.originalPost !== undefined && (
        <blockquote className="border-outline-variant gap-xs p-md flex flex-col rounded-lg border">
          <span className="font-small text-small text-on-surface-variant">
            {displayName(post.originalPost.author)} · {relativeTime(post.originalPost.createdAt)}
          </span>
          <span className="font-body-sm text-body-sm text-on-surface">
            {post.originalPost.content}
          </span>
        </blockquote>
      )}

      <div className="text-on-surface-variant font-small text-small flex items-center justify-between">
        <span>{reactionTotal(post)} reactions</span>
        <span className="gap-md flex">
          <span>{post.commentCount} comments</span>
          <span>{post.repostCount} reposts</span>
        </span>
      </div>

      <div className="border-outline-variant/50 pt-sm flex items-center justify-between border-t">
        <button
          type="button"
          aria-pressed={hasReacted}
          onClick={() => {
            onToggleReaction(post.id);
          }}
          className={cn(
            ACTION_CLASS,
            hasReacted
              ? 'text-secondary hover:bg-surface-container-low'
              : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface',
          )}
        >
          <Heart aria-hidden className={cn('size-5', hasReacted && 'fill-current')} />
          Like
        </button>
        <button
          type="button"
          disabled
          title="Comments are not part of this build"
          className={cn(ACTION_CLASS, 'text-on-surface-variant/50')}
        >
          <MessageCircle aria-hidden className="size-5" />
          Comment
        </button>
        <button
          type="button"
          disabled
          title="Reposting is not part of this build"
          className={cn(ACTION_CLASS, 'text-on-surface-variant/50')}
        >
          <Share2 aria-hidden className="size-5" />
          Repost
        </button>
      </div>
    </Card>
  );
});
