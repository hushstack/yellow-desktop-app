/**
 * Friend operations, as seen by the renderer: one allowlisted IPC call each.
 *
 * Watch which id each call takes — the API is not uniform here and the types
 * are what keep it straight: a request is *sent* to a user id, *answered* by a
 * friendship id, and unfriending goes back to the user id.
 */
import type { Friendship, FriendshipPage, IpcError } from '@shared/ipc-types';

import { ipc } from '@/lib/ipc';
import { fail, ok, type Result } from '@/lib/result';

import { FRIENDS_PAGE_SIZE } from './types';

export type FriendsError = IpcError;

export async function fetchFriends(
  page = 0,
  size: number = FRIENDS_PAGE_SIZE,
): Promise<Result<FriendshipPage, FriendsError>> {
  const result = await ipc.listFriends({ page, size });
  return result.ok ? ok(result.data) : fail(result.error);
}

/** Incoming requests awaiting the caller's answer. */
export async function fetchFriendRequests(
  page = 0,
  size: number = FRIENDS_PAGE_SIZE,
): Promise<Result<FriendshipPage, FriendsError>> {
  const result = await ipc.listFriendRequests({ page, size });
  return result.ok ? ok(result.data) : fail(result.error);
}

export async function sendFriendRequest(userId: string): Promise<Result<Friendship, FriendsError>> {
  const result = await ipc.sendFriendRequest({ userId });
  return result.ok ? ok(result.data.friendship) : fail(result.error);
}

export async function acceptFriendRequest(
  friendshipId: string,
): Promise<Result<Friendship, FriendsError>> {
  const result = await ipc.acceptFriendRequest({ friendshipId });
  return result.ok ? ok(result.data.friendship) : fail(result.error);
}

export async function declineFriendRequest(
  friendshipId: string,
): Promise<Result<Friendship, FriendsError>> {
  const result = await ipc.declineFriendRequest({ friendshipId });
  return result.ok ? ok(result.data.friendship) : fail(result.error);
}

/** Addressed by the other user's id, not the friendship id. */
export async function removeFriend(userId: string): Promise<Result<true, FriendsError>> {
  const result = await ipc.removeFriend({ userId });
  return result.ok ? ok(true) : fail(result.error);
}
