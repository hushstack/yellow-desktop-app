/**
 * Typed access to the preload bridge.
 *
 * Everything the main process returns is parsed against its schema before it is
 * handed back (OWASP A08) — a response is untrusted input like any other. The
 * bridge being absent (renderer opened in a plain browser) is a normal failure
 * here, not a crash.
 */
import {
  acknowledgedResponseSchema,
  appInfoResponseSchema,
  avatarPickResponseSchema,
  commentPageSchema,
  commentResponseSchema,
  deletedResponseSchema,
  exportPostsResponseSchema,
  feedResponseSchema,
  friendshipPageSchema,
  friendshipResponseSchema,
  ipcFail,
  ipcResultSchema,
  notificationPageSchema,
  notificationResponseSchema,
  postResponseSchema,
  profileResponseSchema,
  reactionSummarySchema,
  registerResponseSchema,
  sessionResponseSchema,
  shareLinkCopiedResponseSchema,
  shareLinkResponseSchema,
  stageImagesResponseSchema,
  unreadCountSchema,
  userPostsResponseSchema,
  windowStateSchema,
  type AvatarCommitRequest,
  type ClearReactionRequest,
  type CreateCommentRequest,
  type CreatePostRequest,
  type DeleteCommentRequest,
  type DiscardImagesRequest,
  type ExportPostsRequest,
  type FeedRequest,
  type ForgotPasswordRequest,
  type FriendUserRequest,
  type FriendshipIdRequest,
  type IpcResult,
  type ListCommentsRequest,
  type ListNotificationsRequest,
  type LoginRequest,
  type NotificationIdRequest,
  type PageRequest,
  type PostIdRequest,
  type PublicUserRequest,
  type ReactionTargetRequest,
  type RegisterRequest,
  type RepostRequest,
  type ResetPasswordRequest,
  type SetReactionRequest,
  type UpdatePostRequest,
  type UpdateProfileRequest,
  type UserPostsRequest,
  type VerifyOtpRequest,
  type YelloBridge,
} from '@shared/ipc-types';
import type { z } from 'zod';

import { createLogger } from './logger';

const log = createLogger('renderer.ipc');

function bridge(): YelloBridge | undefined {
  return window.yello;
}

export function isBridgeAvailable(): boolean {
  return bridge() !== undefined;
}

async function guarded<TSchema extends z.ZodType>(
  operation: string,
  dataSchema: TSchema,
  run: (api: YelloBridge) => Promise<unknown>,
): Promise<IpcResult<z.infer<TSchema>>> {
  const api = bridge();
  if (api === undefined) {
    return ipcFail('UNKNOWN', 'Desktop bridge is unavailable.');
  }

  let raw: unknown;
  try {
    raw = await run(api);
  } catch (error) {
    log.error('ipc_call_failed', { operation, error });
    return ipcFail('UNKNOWN', 'The desktop operation failed.');
  }

  const parsed = ipcResultSchema(dataSchema).safeParse(raw);
  if (!parsed.success) {
    log.error('ipc_response_rejected', { operation, issues: parsed.error.issues.length });
    return ipcFail('INVALID_PAYLOAD', 'The desktop response had an unexpected shape.');
  }

  return parsed.data as IpcResult<z.infer<TSchema>>;
}

export const ipc = {
  login: (request: LoginRequest) =>
    guarded('auth.login', sessionResponseSchema, (api) => api.auth.login(request)),
  register: (request: RegisterRequest) =>
    guarded('auth.register', registerResponseSchema, (api) => api.auth.register(request)),
  verifyOtp: (request: VerifyOtpRequest) =>
    guarded('auth.verifyOtp', sessionResponseSchema, (api) => api.auth.verifyOtp(request)),
  logout: () => guarded('auth.logout', sessionResponseSchema, (api) => api.auth.logout()),
  currentSession: () =>
    guarded('auth.currentSession', sessionResponseSchema, (api) => api.auth.currentSession()),

  forgotPassword: (request: ForgotPasswordRequest) =>
    guarded('auth.forgotPassword', acknowledgedResponseSchema, (api) =>
      api.auth.forgotPassword(request),
    ),
  resetPassword: (request: ResetPasswordRequest) =>
    guarded('auth.resetPassword', acknowledgedResponseSchema, (api) =>
      api.auth.resetPassword(request),
    ),

  listFeed: (request: FeedRequest) =>
    guarded('feed.list', feedResponseSchema, (api) => api.feed.list(request)),
  createPost: (request: CreatePostRequest) =>
    guarded('feed.createPost', postResponseSchema, (api) => api.feed.createPost(request)),
  stageImages: () =>
    guarded('feed.stageImages', stageImagesResponseSchema, (api) => api.feed.stageImages()),
  discardImages: (request: DiscardImagesRequest) =>
    guarded('feed.discardImages', acknowledgedResponseSchema, (api) =>
      api.feed.discardImages(request),
    ),

  getPost: (request: PostIdRequest) =>
    guarded('posts.get', postResponseSchema, (api) => api.posts.get(request)),
  updatePost: (request: UpdatePostRequest) =>
    guarded('posts.update', postResponseSchema, (api) => api.posts.update(request)),
  deletePost: (request: PostIdRequest) =>
    guarded('posts.remove', deletedResponseSchema, (api) => api.posts.remove(request)),
  repost: (request: RepostRequest) =>
    guarded('posts.repost', postResponseSchema, (api) => api.posts.repost(request)),
  postShareLink: (request: PostIdRequest) =>
    guarded('posts.shareLink', shareLinkResponseSchema, (api) => api.posts.shareLink(request)),
  copyPostShareLink: (request: PostIdRequest) =>
    guarded('posts.copyShareLink', shareLinkCopiedResponseSchema, (api) =>
      api.posts.copyShareLink(request),
    ),

  createComment: (request: CreateCommentRequest) =>
    guarded('comments.create', commentResponseSchema, (api) => api.comments.create(request)),
  listComments: (request: ListCommentsRequest) =>
    guarded('comments.list', commentPageSchema, (api) => api.comments.list(request)),
  deleteComment: (request: DeleteCommentRequest) =>
    guarded('comments.remove', deletedResponseSchema, (api) => api.comments.remove(request)),

  setReaction: (request: SetReactionRequest) =>
    guarded('reactions.set', reactionSummarySchema, (api) => api.reactions.set(request)),
  clearReaction: (request: ClearReactionRequest) =>
    guarded('reactions.clear', reactionSummarySchema, (api) => api.reactions.clear(request)),
  reactionSummary: (request: ReactionTargetRequest) =>
    guarded('reactions.summary', reactionSummarySchema, (api) => api.reactions.summary(request)),

  listFriends: (request: PageRequest) =>
    guarded('friends.list', friendshipPageSchema, (api) => api.friends.list(request)),
  listFriendRequests: (request: PageRequest) =>
    guarded('friends.pendingRequests', friendshipPageSchema, (api) =>
      api.friends.pendingRequests(request),
    ),
  sendFriendRequest: (request: FriendUserRequest) =>
    guarded('friends.sendRequest', friendshipResponseSchema, (api) =>
      api.friends.sendRequest(request),
    ),
  acceptFriendRequest: (request: FriendshipIdRequest) =>
    guarded('friends.accept', friendshipResponseSchema, (api) => api.friends.accept(request)),
  declineFriendRequest: (request: FriendshipIdRequest) =>
    guarded('friends.decline', friendshipResponseSchema, (api) => api.friends.decline(request)),
  removeFriend: (request: FriendUserRequest) =>
    guarded('friends.remove', deletedResponseSchema, (api) => api.friends.remove(request)),

  listNotifications: (request: ListNotificationsRequest) =>
    guarded('notifications.list', notificationPageSchema, (api) => api.notifications.list(request)),
  unreadNotificationCount: () =>
    guarded('notifications.unreadCount', unreadCountSchema, (api) =>
      api.notifications.unreadCount(),
    ),
  markNotificationRead: (request: NotificationIdRequest) =>
    guarded('notifications.markRead', notificationResponseSchema, (api) =>
      api.notifications.markRead(request),
    ),
  markAllNotificationsRead: () =>
    guarded('notifications.markAllRead', unreadCountSchema, (api) =>
      api.notifications.markAllRead(),
    ),

  updateProfile: (request: UpdateProfileRequest) =>
    guarded('profile.update', profileResponseSchema, (api) => api.profile.update(request)),
  pickAvatar: () =>
    guarded('profile.pickAvatar', avatarPickResponseSchema, (api) => api.profile.pickAvatar()),
  commitAvatar: (request: AvatarCommitRequest) =>
    guarded('profile.commitAvatar', profileResponseSchema, (api) =>
      api.profile.commitAvatar(request),
    ),
  listUserPosts: (request: UserPostsRequest) =>
    guarded('profile.listPosts', userPostsResponseSchema, (api) => api.profile.listPosts(request)),
  getUser: (request: PublicUserRequest) =>
    guarded('profile.getUser', profileResponseSchema, (api) => api.profile.getUser(request)),

  exportPosts: (request: ExportPostsRequest) =>
    guarded('files.exportPosts', exportPostsResponseSchema, (api) =>
      api.files.exportPosts(request),
    ),
  readAppInfo: () =>
    guarded('files.readAppInfo', appInfoResponseSchema, (api) => api.files.readAppInfo()),

  minimizeWindow: () =>
    guarded('window.minimize', windowStateSchema, (api) => api.window.minimize()),
  toggleMaximizeWindow: () =>
    guarded('window.toggleMaximize', windowStateSchema, (api) => api.window.toggleMaximize()),
  closeWindow: () => guarded('window.close', windowStateSchema, (api) => api.window.close()),
  getWindowState: () =>
    guarded('window.getState', windowStateSchema, (api) => api.window.getState()),
} as const;
