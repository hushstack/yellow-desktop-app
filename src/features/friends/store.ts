/**
 * Friendship state: the accepted list, and the requests waiting on an answer.
 *
 * Both pages are held here rather than in the route, because the profile screen
 * needs the same answer the friends screen does — "what is my relationship with
 * this person?" — and two independently-fetched copies would disagree.
 *
 * Note what the API cannot tell us: there is no endpoint for *outgoing* pending
 * requests, and none for the relationship with one user. So an outgoing request
 * is remembered locally for the session after it is sent, and a
 * `FRIENDSHIP_EXISTS` rejection is treated as the same state — the server is
 * still the authority, we are only avoiding a button that lies.
 */
import type { Friendship } from '@shared/ipc-types';
import { create } from 'zustand';

import { createLogger } from '@/lib/logger';

import {
  acceptFriendRequest,
  declineFriendRequest,
  fetchFriendRequests,
  fetchFriends,
  removeFriend,
  sendFriendRequest,
  type FriendsError,
} from './api';

const log = createLogger('friends.store');

export type FriendsStatus = 'idle' | 'loading' | 'ready' | 'error';

/** What to show on a "add friend" control for one user. */
export type Relationship = 'none' | 'friends' | 'incoming' | 'outgoing' | 'self';

/** The API answers `FRIENDSHIP_EXISTS` when a request is already in flight. */
const ALREADY_EXISTS = 'FRIENDSHIP_EXISTS';

interface FriendsState {
  friends: Friendship[];
  requests: Friendship[];
  status: FriendsStatus;
  requestsStatus: FriendsStatus;
  error: string | null;
  friendsPage: number;
  friendsHasMore: boolean;
  requestsPage: number;
  requestsHasMore: boolean;
  isLoadingMore: boolean;
  /** Friendship or user ids with an operation in flight. */
  pendingIds: ReadonlySet<string>;
  /** User ids this session has sent a request to; see the note above. */
  sentRequests: ReadonlySet<string>;
  load: () => Promise<void>;
  loadMoreFriends: () => Promise<void>;
  loadMoreRequests: () => Promise<void>;
  accept: (friendshipId: string) => Promise<boolean>;
  decline: (friendshipId: string) => Promise<boolean>;
  unfriend: (userId: string) => Promise<boolean>;
  sendRequest: (userId: string) => Promise<boolean>;
  clearError: () => void;
}

function withPending(pending: ReadonlySet<string>, id: string, present: boolean): Set<string> {
  const next = new Set(pending);
  if (present) {
    next.add(id);
  } else {
    next.delete(id);
  }
  return next;
}

function messageOf(error: FriendsError): string {
  return error.message;
}

export const useFriendsStore = create<FriendsState>((set, get) => ({
  friends: [],
  requests: [],
  status: 'idle',
  requestsStatus: 'idle',
  error: null,
  friendsPage: 0,
  friendsHasMore: false,
  requestsPage: 0,
  requestsHasMore: false,
  isLoadingMore: false,
  pendingIds: new Set(),
  sentRequests: new Set(),

  load: async () => {
    set({ status: 'loading', requestsStatus: 'loading', error: null });

    // Independent reads: one failing must not blank the other.
    const [friends, requests] = await Promise.all([fetchFriends(0), fetchFriendRequests(0)]);

    if (friends.ok) {
      set({
        friends: friends.data.content,
        friendsPage: friends.data.page,
        friendsHasMore: !friends.data.last,
        status: 'ready',
      });
    } else {
      set({ status: 'error', error: messageOf(friends.error) });
    }

    if (requests.ok) {
      set({
        requests: requests.data.content,
        requestsPage: requests.data.page,
        requestsHasMore: !requests.data.last,
        requestsStatus: 'ready',
      });
    } else {
      set({ requestsStatus: 'error', error: messageOf(requests.error) });
    }
  },

  loadMoreFriends: async () => {
    const { friendsHasMore, isLoadingMore, friendsPage, friends } = get();
    if (!friendsHasMore || isLoadingMore) {
      return;
    }

    set({ isLoadingMore: true });
    const result = await fetchFriends(friendsPage + 1);
    set({ isLoadingMore: false });

    if (!result.ok) {
      set({ error: messageOf(result.error) });
      return;
    }

    set({
      friends: [...friends, ...result.data.content],
      friendsPage: result.data.page,
      friendsHasMore: !result.data.last,
    });
  },

  loadMoreRequests: async () => {
    const { requestsHasMore, isLoadingMore, requestsPage, requests } = get();
    if (!requestsHasMore || isLoadingMore) {
      return;
    }

    set({ isLoadingMore: true });
    const result = await fetchFriendRequests(requestsPage + 1);
    set({ isLoadingMore: false });

    if (!result.ok) {
      set({ error: messageOf(result.error) });
      return;
    }

    set({
      requests: [...requests, ...result.data.content],
      requestsPage: result.data.page,
      requestsHasMore: !result.data.last,
    });
  },

  accept: async (friendshipId) => {
    if (get().pendingIds.has(friendshipId)) {
      return false;
    }

    set((state) => ({ pendingIds: withPending(state.pendingIds, friendshipId, true) }));
    const result = await acceptFriendRequest(friendshipId);

    if (!result.ok) {
      set((state) => ({
        pendingIds: withPending(state.pendingIds, friendshipId, false),
        error: messageOf(result.error),
      }));
      return false;
    }

    // The answered request leaves the inbox and joins the friends list.
    set((state) => ({
      requests: state.requests.filter((item) => item.id !== friendshipId),
      friends: [result.data, ...state.friends],
      pendingIds: withPending(state.pendingIds, friendshipId, false),
      error: null,
    }));
    log.info('friend_request_accepted', {});
    return true;
  },

  decline: async (friendshipId) => {
    if (get().pendingIds.has(friendshipId)) {
      return false;
    }

    set((state) => ({ pendingIds: withPending(state.pendingIds, friendshipId, true) }));
    const result = await declineFriendRequest(friendshipId);

    if (!result.ok) {
      set((state) => ({
        pendingIds: withPending(state.pendingIds, friendshipId, false),
        error: messageOf(result.error),
      }));
      return false;
    }

    set((state) => ({
      requests: state.requests.filter((item) => item.id !== friendshipId),
      pendingIds: withPending(state.pendingIds, friendshipId, false),
      error: null,
    }));
    return true;
  },

  unfriend: async (userId) => {
    if (get().pendingIds.has(userId)) {
      return false;
    }

    set((state) => ({ pendingIds: withPending(state.pendingIds, userId, true) }));
    const result = await removeFriend(userId);

    if (!result.ok) {
      set((state) => ({
        pendingIds: withPending(state.pendingIds, userId, false),
        error: messageOf(result.error),
      }));
      return false;
    }

    set((state) => ({
      friends: state.friends.filter((item) => item.user.id !== userId),
      pendingIds: withPending(state.pendingIds, userId, false),
      sentRequests: withPending(state.sentRequests, userId, false),
      error: null,
    }));
    log.info('friendship_removed', {});
    return true;
  },

  sendRequest: async (userId) => {
    if (get().pendingIds.has(userId)) {
      return false;
    }

    set((state) => ({ pendingIds: withPending(state.pendingIds, userId, true) }));
    const result = await sendFriendRequest(userId);

    if (!result.ok) {
      // A request that already exists is not a failure to report — the button
      // just needs to stop offering to send it again.
      const exists = result.error.apiCode === ALREADY_EXISTS;
      set((state) => ({
        pendingIds: withPending(state.pendingIds, userId, false),
        sentRequests: exists ? withPending(state.sentRequests, userId, true) : state.sentRequests,
        error: exists ? null : messageOf(result.error),
      }));
      return exists;
    }

    set((state) => ({
      pendingIds: withPending(state.pendingIds, userId, false),
      sentRequests: withPending(state.sentRequests, userId, true),
      error: null,
    }));
    log.info('friend_request_sent', {});
    return true;
  },

  clearError: () => {
    set({ error: null });
  },
}));
