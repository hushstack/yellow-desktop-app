/**
 * Profile hooks.
 *
 * A successful edit or avatar change writes the fresh profile straight back
 * into the auth store, so the sidebar, top bar and composer all repaint from
 * one source rather than each holding a stale copy.
 */
import type { Post, User } from '@shared/ipc-types';
import { useCallback, useEffect, useState } from 'react';

import { useAuthStore } from '@/features/auth/store';
import { PROFILE_POSTS_PAGE_SIZE } from '@/lib/constants';

import { commitAvatar, fetchUserPosts, pickAvatar, updateProfile, type ProfileError } from './api';
import type { EditProfileValues } from './types';

export type ProfilePostsStatus = 'loading' | 'ready' | 'error';

interface ProfilePostsState {
  posts: Post[];
  status: ProfilePostsStatus;
  error: string | null;
  totalPosts: number;
  hasMore: boolean;
  isLoadingMore: boolean;
  loadMore: () => void;
}

/** The signed-in user's own timeline, offset-paginated by the API. */
export function useProfilePosts(userId: string | undefined): ProfilePostsState {
  const [posts, setPosts] = useState<Post[]>([]);
  const [status, setStatus] = useState<ProfilePostsStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [totalPosts, setTotalPosts] = useState(0);
  const [page, setPage] = useState(0);
  const [isLast, setIsLast] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    if (userId === undefined) {
      return;
    }

    let cancelled = false;

    void fetchUserPosts(userId, page, PROFILE_POSTS_PAGE_SIZE).then((result) => {
      if (cancelled) {
        return;
      }

      if (!result.ok) {
        setError(result.error.message);
        setStatus('error');
        setIsLoadingMore(false);
        return;
      }

      // Page 0 replaces; later pages append.
      setPosts((current) => (page === 0 ? result.data.posts : [...current, ...result.data.posts]));
      setTotalPosts(result.data.totalElements);
      setIsLast(result.data.last);
      setStatus('ready');
      setIsLoadingMore(false);
    });

    return () => {
      cancelled = true;
    };
  }, [userId, page]);

  const loadMore = useCallback(() => {
    setIsLoadingMore(true);
    setPage((current) => current + 1);
  }, []);

  return { posts, status, error, totalPosts, hasMore: !isLast, isLoadingMore, loadMore };
}

/** A photo chosen but not yet uploaded: a token to commit and a preview to show. */
export interface StagedAvatar {
  token: string;
  previewDataUrl: string;
}

export interface ProfileMutation {
  /** Saves the fields, and — when `avatarToken` is set — the staged photo too. */
  save: (values: EditProfileValues, avatarToken?: string | null) => Promise<boolean>;
  /** Opens the OS picker and stages the choice; null when cancelled. */
  pickAvatar: () => Promise<StagedAvatar | null>;
  isSaving: boolean;
  isPicking: boolean;
  error: ProfileError | null;
}

export function useProfileMutations(user: User | null): ProfileMutation {
  const adoptUser = useAuthStore((state) => state.adoptUser);
  const [isSaving, setIsSaving] = useState(false);
  const [isPicking, setIsPicking] = useState(false);
  const [error, setError] = useState<ProfileError | null>(null);

  const save = useCallback(
    async (values: EditProfileValues, avatarToken?: string | null) => {
      if (user === null) {
        return false;
      }

      setIsSaving(true);
      setError(null);

      // Commit the photo first, so the profile update below returns a user that
      // already carries the new avatar URL.
      if (avatarToken !== undefined && avatarToken !== null) {
        const avatar = await commitAvatar(avatarToken);
        if (!avatar.ok) {
          setError(avatar.error);
          setIsSaving(false);
          return false;
        }
        adoptUser(avatar.data);
      }

      const result = await updateProfile(values, user);
      setIsSaving(false);

      if (!result.ok) {
        setError(result.error);
        return false;
      }

      adoptUser(result.data);
      return true;
    },
    [user, adoptUser],
  );

  const pick = useCallback(async () => {
    setIsPicking(true);
    setError(null);
    const result = await pickAvatar();
    setIsPicking(false);

    if (!result.ok) {
      setError(result.error);
      return null;
    }

    const { token, previewDataUrl, cancelled } = result.data;
    if (cancelled || token === null || previewDataUrl === null) {
      return null;
    }

    return { token, previewDataUrl };
  }, []);

  return { save, pickAvatar: pick, isSaving, isPicking, error };
}
