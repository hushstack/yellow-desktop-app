/**
 * Profile operations, as seen by the renderer: one allowlisted IPC call each.
 */
import type { AvatarPickResponse, IpcError, User, UserPostsResponse } from '@shared/ipc-types';

import { ipc } from '@/lib/ipc';
import { fail, ok, type Result } from '@/lib/result';

import type { EditProfileValues } from './types';

export type ProfileError = IpcError;

export async function updateProfile(
  values: EditProfileValues,
  current: User,
): Promise<Result<User, ProfileError>> {
  // Send only what actually changed; every field on this endpoint is optional.
  const request: { fullName?: string; bio?: string; username?: string } = {};

  if (values.fullName !== (current.fullName ?? '')) {
    request.fullName = values.fullName;
  }
  if (values.bio !== (current.bio ?? '')) {
    request.bio = values.bio;
  }
  if (values.username !== current.username) {
    request.username = values.username;
  }

  const result = await ipc.updateProfile(request);
  return result.ok ? ok(result.data.user) : fail(result.error);
}

/** Step 1: choose and stage a file, returning a token and a preview to show. */
export async function pickAvatar(): Promise<Result<AvatarPickResponse, ProfileError>> {
  const result = await ipc.pickAvatar();
  return result.ok ? ok(result.data) : fail(result.error);
}

/** Step 2: upload the staged file for `token`, returning the updated user. */
export async function commitAvatar(token: string): Promise<Result<User, ProfileError>> {
  const result = await ipc.commitAvatar({ token });
  return result.ok ? ok(result.data.user) : fail(result.error);
}

/**
 * Another user's public profile. Narrower than the signed-in one — no email,
 * no status — and readable without being signed in.
 */
export async function fetchUser(userId: string): Promise<Result<User, ProfileError>> {
  const result = await ipc.getUser({ userId });
  return result.ok ? ok(result.data.user) : fail(result.error);
}

export async function fetchUserPosts(
  userId: string,
  page: number,
  size: number,
): Promise<Result<UserPostsResponse, ProfileError>> {
  const result = await ipc.listUserPosts({ userId, page, size });
  return result.ok ? ok(result.data) : fail(result.error);
}
