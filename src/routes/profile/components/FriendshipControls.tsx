import { Check, UserCheck, UserMinus, UserPlus, X } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import type { RelationshipControl } from '@/features/friends/hooks';

interface FriendshipControlsProps {
  control: RelationshipControl;
}

/**
 * The friendship button on someone else's profile.
 *
 * Four states, because the API models the relationship as a request that is
 * sent, then answered: nothing yet, a request you sent, a request waiting on
 * you, and an accepted friendship. There is no endpoint for "my outgoing
 * requests", so `outgoing` is what this session sent — see the note in
 * features/friends/store.ts.
 */
export function FriendshipControls({ control }: FriendshipControlsProps) {
  const { relationship, isBusy } = control;

  if (relationship === 'self') {
    return null;
  }

  if (relationship === 'friends') {
    return (
      <Button
        variant="secondary"
        leadingIcon={<UserMinus className="size-4" />}
        isLoading={isBusy}
        onClick={control.unfriend}
      >
        Friends
      </Button>
    );
  }

  if (relationship === 'incoming') {
    return (
      <div className="gap-sm flex">
        <Button
          leadingIcon={<Check className="size-4" />}
          isLoading={isBusy}
          onClick={control.accept}
        >
          Accept
        </Button>
        <Button
          variant="secondary"
          leadingIcon={<X className="size-4" />}
          disabled={isBusy}
          onClick={control.decline}
        >
          Decline
        </Button>
      </div>
    );
  }

  if (relationship === 'outgoing') {
    return (
      <Button variant="secondary" leadingIcon={<UserCheck className="size-4" />} disabled>
        Request sent
      </Button>
    );
  }

  return (
    <Button
      leadingIcon={<UserPlus className="size-4" />}
      isLoading={isBusy}
      onClick={control.sendRequest}
    >
      Add friend
    </Button>
  );
}
