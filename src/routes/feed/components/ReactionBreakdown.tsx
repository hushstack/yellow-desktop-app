import { useState } from 'react';

import { Spinner } from '@/components/ui/Spinner';
import { fetchReactionSummary } from '@/features/feed/api';
import { reactionTotal, type Post } from '@/features/feed/types';
import { REACTION_TYPES } from '@shared/ipc-types';
import { cn } from '@/lib/cn';

interface ReactionBreakdownProps {
  post: Post;
}

/** How each of the six reaction types reads on screen. */
const REACTION_LABELS: Record<string, string> = {
  LIKE: '👍 Like',
  LOVE: '❤️ Love',
  HAHA: '😄 Haha',
  WOW: '😮 Wow',
  SAD: '😢 Sad',
  ANGRY: '😠 Angry',
};

/**
 * The reaction count, expandable into a per-type breakdown.
 *
 * A post carries `reactionCounts` from whichever list loaded it, which can be
 * minutes old by the time someone looks. Opening this re-reads
 * `GET /reactions/POST/{id}/summary` so the breakdown is current — that
 * endpoint's whole reason to exist next to the counts already on the post.
 *
 * `counts` is a partial map: only non-zero types appear, so an absent key is a
 * zero rather than a missing value.
 */
export function ReactionBreakdown({ post }: ReactionBreakdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [total, setTotal] = useState(reactionTotal(post));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = (): void => {
    setIsOpen(true);
    setIsLoading(true);
    setError(null);

    void fetchReactionSummary(post.id).then((result) => {
      setIsLoading(false);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setCounts(result.data.counts);
      setTotal(result.data.total);
    });
  };

  const rows =
    counts === null
      ? []
      : // Iterating the closed enum rather than the map's own keys keeps the
        // order stable and skips the `total` key the API mixes in alongside it.
        REACTION_TYPES.map((type) => ({ type, count: counts[type] ?? 0 })).filter(
          (row) => row.count > 0,
        );

  return (
    <div className="gap-xs flex flex-col">
      <button
        type="button"
        aria-expanded={isOpen}
        disabled={total === 0}
        onClick={() => {
          if (isOpen) {
            setIsOpen(false);
          } else {
            open();
          }
        }}
        className={cn(
          'font-small text-small text-on-surface-variant rounded-md text-left transition-colors',
          total > 0 && 'hover:text-on-surface underline-offset-2 hover:underline',
        )}
      >
        {total} reactions
      </button>

      {isOpen && (
        <div className="gap-xs flex flex-wrap items-center">
          {isLoading && <Spinner label="Counting…" />}

          {error !== null && (
            <span role="alert" className="font-small text-small text-error">
              {error}
            </span>
          )}

          {!isLoading &&
            error === null &&
            (rows.length === 0 ? (
              <span className="font-small text-small text-on-surface-variant">
                No reactions yet.
              </span>
            ) : (
              rows.map((row) => (
                <span
                  key={row.type}
                  className="bg-surface-container-low font-small text-small text-on-surface px-sm rounded-full py-0.5"
                >
                  {REACTION_LABELS[row.type] ?? row.type} {row.count}
                </span>
              ))
            ))}
        </div>
      )}
    </div>
  );
}
