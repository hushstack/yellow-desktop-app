/**
 * Profile reads and edits, for the caller and for other users.
 *
 * The avatar upload is the interesting one: the renderer cannot name a file, so
 * it asks for an upload and the main process opens the OS picker, reads the
 * bytes, and checks type and size before anything is sent (OWASP A01/A08) —
 * see image-picker.ts. A renderer-supplied path never reaches the filesystem.
 *
 * `GET /users/{id}` returns a narrower record than `/users/me` — no email, no
 * status — but the same schema covers both, because those two fields are
 * optional on it.
 */
import { randomUUID } from 'node:crypto';

import { ENDPOINTS } from '../../api/endpoints';
import { apiRequest } from '../../api/http-client';
import { createLogger } from '../../../shared/logger';
import { IPC_CHANNELS } from '../channels';
import { pickImageFiles, readImagePart, toSquareAvatar, type SquareImage } from '../image-picker';
import { registerIpcHandler } from '../register';

import {
  avatarCommitRequestSchema,
  avatarPickResponseSchema,
  emptyRequestSchema,
  ipcFail,
  ipcOk,
  pageOf,
  postSchema,
  profileResponseSchema,
  publicUserRequestSchema,
  updateProfileRequestSchema,
  userPostsRequestSchema,
  userPostsResponseSchema,
  userSchema,
  type AvatarPickResponse,
  type IpcResult,
  type ProfileResponse,
  type UserPostsResponse,
} from '../../../shared/ipc-types';

const log = createLogger('ipc.profile');

const postPageSchema = pageOf(postSchema);

/**
 * One staged avatar at a time: the picker validates and holds the bytes here,
 * and the renderer gets only the token below. A single slot is enough for a
 * single-window app — a fresh pick replaces the previous choice, and commit
 * only proceeds when its token still matches what is staged.
 */
let stagedAvatar: { token: string; part: SquareImage } | null = null;

export function registerProfileHandlers(): void {
  registerIpcHandler(
    IPC_CHANNELS.PROFILE_UPDATE,
    updateProfileRequestSchema,
    async (request): Promise<IpcResult<ProfileResponse>> => {
      const result = await apiRequest({
        method: 'put',
        url: ENDPOINTS.users.me,
        body: request,
        schema: userSchema,
      });

      if (!result.ok) {
        return result;
      }

      log.info('profile_updated', {});
      return ipcOk(profileResponseSchema.parse({ user: result.data }));
    },
  );

  registerIpcHandler(
    IPC_CHANNELS.PROFILE_GET_USER,
    publicUserRequestSchema,
    async ({ userId }): Promise<IpcResult<ProfileResponse>> => {
      const result = await apiRequest({
        method: 'get',
        url: ENDPOINTS.users.byId(userId),
        schema: userSchema,
      });

      return result.ok ? ipcOk(profileResponseSchema.parse({ user: result.data })) : result;
    },
  );

  registerIpcHandler(
    IPC_CHANNELS.PROFILE_PICK_AVATAR,
    emptyRequestSchema,
    async (_payload, event): Promise<IpcResult<AvatarPickResponse>> => {
      const [filePath] = await pickImageFiles(event, { title: 'Choose a profile picture' });
      if (filePath === undefined) {
        return ipcOk(
          avatarPickResponseSchema.parse({ token: null, previewDataUrl: null, cancelled: true }),
        );
      }

      const part = await readImagePart(filePath);
      if (!part.ok) {
        return part;
      }

      // Normalise to a square, consistently sized avatar before anything is
      // staged, so the stored image is crisp at every display size.
      const originalBytes = Buffer.from(await part.data.blob.arrayBuffer());
      const square = toSquareAvatar(part.data, originalBytes);

      // Build the preview from the same bytes we will upload, so what the user
      // sees is exactly what gets sent.
      const bytes = Buffer.from(await square.blob.arrayBuffer());
      const previewDataUrl = `data:${square.blob.type};base64,${bytes.toString('base64')}`;

      const token = randomUUID();
      stagedAvatar = { token, part: square };

      return ipcOk(avatarPickResponseSchema.parse({ token, previewDataUrl, cancelled: false }));
    },
  );

  registerIpcHandler(
    IPC_CHANNELS.PROFILE_COMMIT_AVATAR,
    avatarCommitRequestSchema,
    async ({ token }): Promise<IpcResult<ProfileResponse>> => {
      if (stagedAvatar?.token !== token) {
        return ipcFail('INVALID_PAYLOAD', 'That photo is no longer staged. Choose it again.');
      }

      const { part } = stagedAvatar;
      const form = new FormData();
      form.append('file', part.blob, part.fileName);

      const result = await apiRequest({
        method: 'put',
        url: ENDPOINTS.users.avatar,
        body: form,
        schema: userSchema,
      });

      if (!result.ok) {
        return result;
      }

      stagedAvatar = null;
      log.info('avatar_updated', { bytes: part.byteLength });
      return ipcOk(profileResponseSchema.parse({ user: result.data }));
    },
  );

  registerIpcHandler(
    IPC_CHANNELS.PROFILE_LIST_POSTS,
    userPostsRequestSchema,
    async ({ userId, page, size }): Promise<IpcResult<UserPostsResponse>> => {
      const result = await apiRequest({
        method: 'get',
        url: ENDPOINTS.users.posts(userId),
        schema: postPageSchema,
        params: { page, size, sort: 'createdAt,desc' },
      });

      if (!result.ok) {
        return result;
      }

      return ipcOk(
        userPostsResponseSchema.parse({
          posts: result.data.content,
          page: result.data.page,
          totalElements: result.data.totalElements,
          totalPages: result.data.totalPages,
          last: result.data.last,
        }),
      );
    },
  );
}
