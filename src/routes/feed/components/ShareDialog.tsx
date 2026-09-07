import { Check, Copy, TriangleAlert } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { copyShareLink, fetchShareLink } from '@/features/feed/api';
import type { Post } from '@/features/feed/types';
import { displayName } from '@/lib/user-display';

interface ShareDialogProps {
  post: Post;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * The share dialog: shows the link, and copies it on request.
 *
 * Two calls rather than one, on purpose. The URL is read so it can be shown and
 * so a non-public post fails here — with `POST_NOT_VISIBLE` — rather than after
 * the user has already been told a link exists. Copying then goes back through
 * the main process, because the page holds no clipboard permission and must not
 * be the thing that decides what gets written (OWASP A01).
 *
 * Mounted only while open, so the link is re-read each time rather than shown
 * from a stale fetch.
 */
export function ShareDialog({ post, isOpen, onClose }: ShareDialogProps) {
  const [url, setUrl] = useState<string | null>(null);
  // Starts true: the fetch below is kicked off on mount, so there is never a
  // frame where the dialog claims to have no link yet is not loading one.
  const [isLoading, setIsLoading] = useState(true);
  const [isCopying, setIsCopying] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void fetchShareLink(post.id).then((result) => {
      if (cancelled) {
        return;
      }
      setIsLoading(false);
      if (result.ok) {
        setUrl(result.data.url);
      } else {
        setError(result.error.message);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [post.id]);

  const copy = (): void => {
    setIsCopying(true);
    setError(null);

    void copyShareLink(post.id).then((result) => {
      setIsCopying(false);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setUrl(result.data.url);
      setHasCopied(result.data.copied);
      if (!result.data.copied) {
        setError('The clipboard was unavailable. Copy the link by hand.');
      }
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Share this post"
      description={`Anyone with this link can read ${displayName(post.author)}'s post.`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Done
          </Button>
          <Button
            leadingIcon={hasCopied ? <Check className="size-4" /> : <Copy className="size-4" />}
            isLoading={isCopying}
            disabled={url === null}
            onClick={copy}
          >
            {hasCopied ? 'Copied' : 'Copy link'}
          </Button>
        </>
      }
    >
      {isLoading && (
        <div className="py-md flex justify-center">
          <Spinner label="Getting the link…" />
        </div>
      )}

      {!isLoading && url !== null && (
        <>
          <label className="sr-only" htmlFor={`share-url-${post.id}`}>
            Link to this post
          </label>
          <Input
            id={`share-url-${post.id}`}
            value={url}
            readOnly
            spellCheck={false}
            onFocus={(event) => {
              event.target.select();
            }}
          />
        </>
      )}

      {error !== null && (
        <p
          role="alert"
          className="text-on-error-container bg-error-container/40 font-body-sm text-body-sm gap-sm px-md py-sm flex items-center rounded-lg"
        >
          <TriangleAlert aria-hidden className="size-4 shrink-0" />
          {error}
        </p>
      )}
    </Modal>
  );
}
