/**
 * Notification shapes.
 *
 * `type` is carried as text rather than a union so a type the server adds later
 * renders as a generic row instead of breaking the list. `describeTarget` names
 * what `targetId` points at, which differs per type.
 */
import { NOTIFICATION_TYPES, type Notification, type NotificationType } from '@shared/ipc-types';

export const NOTIFICATIONS_PAGE_SIZE = 20;
export const NOTIFICATION_POLL_MS = 60_000;

const KNOWN: ReadonlySet<string> = new Set(NOTIFICATION_TYPES);

export function isKnownType(notification: Notification): boolean {
  return KNOWN.has(notification.type);
}

/** What `targetId` refers to, per the API's contract. */
export function targetKindOf(notification: Notification): 'friendship' | 'comment' | 'post' | null {
  switch (notification.type) {
    case 'FRIEND_REQUEST':
    case 'FRIEND_ACCEPTED':
      return 'friendship';
    case 'COMMENT':
      return 'comment';
    case 'REPOST':
      return 'post';
    default:
      return null;
  }
}

/**
 * The human sentence for a row, keyed off `type`. An unknown type falls through
 * to a generic line rather than throwing, matching the schema's decision to
 * carry `type` as text (A10 — an added server type must not break the list).
 */
export function describeNotification(notification: Notification): string {
  switch (notification.type) {
    case 'FRIEND_REQUEST':
      return 'sent you a friend request';
    case 'FRIEND_ACCEPTED':
      return 'accepted your friend request';
    case 'COMMENT':
      return 'commented on your post';
    case 'REPOST':
      return 'reposted your post';
    default:
      return 'sent you a notification';
  }
}

/**
 * The in-app destination for a row, derived from `type` and `targetId`.
 *
 * Friend notifications carry a *friendship* id, which no screen is addressed
 * by, so they land on /friends. A comment's target is the comment itself, and
 * the API gives no way to resolve a comment id back to its post — so those go
 * to /notifications' own list rather than pretending to deep-link. A repost's
 * target is a post, which does have a page.
 */
export function linkTargetOf(notification: Notification): string | null {
  const { targetId } = notification;

  switch (notification.type) {
    case 'FRIEND_REQUEST':
    case 'FRIEND_ACCEPTED':
      return '/friends';
    case 'REPOST':
      return targetId === undefined ? null : `/posts/${targetId}`;
    default:
      return null;
  }
}

export type { Notification, NotificationType };
