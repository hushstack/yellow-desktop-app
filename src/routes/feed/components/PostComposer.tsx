import { Image, Sticker, Video } from 'lucide-react';
import { useState } from 'react';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';
import { useCurrentUser } from '@/features/auth/hooks';
import { usePostComposer } from '@/features/feed/hooks';
import { composePostSchema, POST_MAX_LENGTH } from '@/features/feed/types';
import { displayName, initialsOf } from '@/lib/user-display';

const ATTACHMENT_ACTIONS = [
  { label: 'Add a photo', icon: <Image className="size-5" /> },
  { label: 'Add a video', icon: <Video className="size-5" /> },
  { label: 'Add a reaction', icon: <Sticker className="size-5" /> },
] as const;

/** The "What's on your mind?" composer that opens the home feed. */
export function PostComposer() {
  const user = useCurrentUser();
  const { publish, isPublishing } = usePostComposer();
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);

  const remaining = POST_MAX_LENGTH - body.trim().length;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (user === null) {
      return;
    }

    const parsed = composePostSchema.safeParse({ content: body });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'That post is not valid.');
      return;
    }

    setError(null);
    void publish(parsed.data).then((published) => {
      if (published) {
        setBody('');
      }
    });
  };

  return (
    <Card elevation="floating" className="p-md md:p-lg">
      <form className="gap-md flex flex-col" onSubmit={handleSubmit}>
        <div className="gap-md flex items-start">
          {user !== null && (
            <Avatar
              initials={initialsOf(user)}
              name={displayName(user)}
              imageUrl={user.avatarUrl}
            />
          )}
          <label className="sr-only" htmlFor="post-composer">
            Write a post
          </label>
          <textarea
            id="post-composer"
            value={body}
            rows={2}
            maxLength={POST_MAX_LENGTH}
            placeholder="What's on your mind?"
            onChange={(event) => {
              setBody(event.target.value);
              setError(null);
            }}
            className="font-body text-body text-on-surface placeholder:text-on-surface-variant min-h-10 w-full resize-none border-none bg-transparent p-0 focus:outline-none"
          />
        </div>

        {error !== null && (
          <p role="alert" className="font-small text-small text-error">
            {error}
          </p>
        )}

        <div className="border-outline-variant/50 pt-md flex items-center justify-between border-t">
          <div className="gap-xs flex">
            {ATTACHMENT_ACTIONS.map((action) => (
              <IconButton
                key={action.label}
                label={action.label}
                icon={action.icon}
                disabled
                title="Attachments need the live API"
              />
            ))}
          </div>
          <div className="gap-md flex items-center">
            <span className="font-small text-small text-on-surface-variant">{remaining}</span>
            <Button type="submit" isLoading={isPublishing} disabled={body.trim() === ''}>
              Post
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
}
