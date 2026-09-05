import { CalendarDays, Pencil } from 'lucide-react';
import type { User } from '@shared/ipc-types';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { calendarDay } from '@/lib/relative-time';
import { displayName, handleOf, initialsOf } from '@/lib/user-display';

interface ProfileHeaderProps {
  user: User;
  postCount: number;
  onEdit: () => void;
}

/**
 * The banner-and-identity block: a brand-tinted strip, the avatar overlapping
 * it, then name, handle, bio and the joined date.
 */
export function ProfileHeader({ user, postCount, onEdit }: ProfileHeaderProps) {
  return (
    <header className="border-outline-variant bg-surface-container-lowest overflow-hidden rounded-2xl border">
      <div
        aria-hidden
        className="from-primary-container to-primary-fixed h-28 w-full bg-gradient-to-r"
      />

      <div className="px-lg pb-lg">
        <div className="gap-md -mt-8 flex items-end justify-between">
          <div className="border-surface-container-lowest rounded-full border-4">
            <Avatar
              initials={initialsOf(user)}
              name={displayName(user)}
              imageUrl={user.avatarUrl}
              size="lg"
            />
          </div>

          <Button leadingIcon={<Pencil className="size-4" />} onClick={onEdit}>
            Edit profile
          </Button>
        </div>

        <div className="mt-md gap-xs flex flex-col">
          <h1 className="font-heading text-h1 text-on-surface">{displayName(user)}</h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant">{handleOf(user)}</p>
        </div>

        {user.bio !== undefined && (
          <p className="font-body text-body text-on-surface mt-md whitespace-pre-wrap">
            {user.bio}
          </p>
        )}

        <div className="text-on-surface-variant font-small text-small gap-lg mt-md flex flex-wrap">
          {user.createdAt !== undefined && (
            <span className="gap-xs flex items-center">
              <CalendarDays aria-hidden className="size-4" />
              Joined {calendarDay(user.createdAt)}
            </span>
          )}
          <span>
            <strong className="text-on-surface">{postCount}</strong> posts
          </span>
          {user.email !== undefined && <span>{user.email}</span>}
        </div>
      </div>
    </header>
  );
}
