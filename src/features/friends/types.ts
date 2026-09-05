/**
 * Friendship shapes.
 *
 * The records themselves come from the API (see @shared/ipc-types); what lives
 * here is the paging size and the small predicates the UI branches on.
 */
import type { Friendship, FriendshipStatus } from '@shared/ipc-types';

export const FRIENDS_PAGE_SIZE = 20;

export function isPending(friendship: Friendship): boolean {
  return friendship.status === ('PENDING' satisfies FriendshipStatus);
}

export function isAccepted(friendship: Friendship): boolean {
  return friendship.status === ('ACCEPTED' satisfies FriendshipStatus);
}

export type { Friendship, FriendshipStatus };
