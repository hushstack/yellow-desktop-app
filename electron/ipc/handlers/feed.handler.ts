/**
 * The feed, and creating posts.
 *
 * The feed is the API's one cursor-paginated endpoint: pages are keyed by the
 * previous response's `nextCursor` rather than an offset, so a post arriving
 * mid-scroll cannot shift a page boundary and duplicate a row.
 *
 * Single-post reads and edits live in posts.handler.ts; reactions in
 * reactions.handler.ts.
 */
import { z } from 'zod';

import { createLogger } from '../../../shared/logger';
import { ENDPOINTS } from '../../api/endpoints';
import { apiRequest } from '../../api/http-client';
import { IPC_CHANNELS } from '../channels';
import { pickImageFiles, readImagePart } from '../image-picker';
import { registerIpcHandler } from '../register';

import {
  createPostRequestSchema,
  createPostResponseSchema,
  feedRequestSchema,
  feedResponseSchema,
  ipcOk,
  POST_MAX_IMAGES,
  postSchema,
  type CreatePostResponse,
  type FeedResponse,
  type IpcResult,
} from '../../../shared/ipc-types';

const log = createLogger('ipc.feed');

const cursorPageSchema = z.object({
  content: z
    .array(postSchema)
    .nullish()
    .transform((value) => value ?? []),
  nextCursor: z.string().nullish(),
  hasMore: z
    .boolean()
    .nullish()
    .transform((value) => value ?? false),
});

export function registerFeedHandlers(): void {
  registerIpcHandler(
    IPC_CHANNELS.FEED_LIST,
    feedRequestSchema,
    async ({ cursor, size }): Promise<IpcResult<FeedResponse>> => {
      const result = await apiRequest({
        method: 'get',
        url: ENDPOINTS.feed.list,
        schema: cursorPageSchema,
        params: { size, ...(cursor === undefined ? {} : { cursor }) },
      });

      if (!result.ok) {
        return result;
      }

      log.info('feed_loaded', { count: result.data.content.length });
      return ipcOk(
        feedResponseSchema.parse({
          posts: result.data.content,
          nextCursor: result.data.nextCursor ?? null,
          hasMore: result.data.hasMore,
        }),
      );
    },
  );

  registerIpcHandler(
    IPC_CHANNELS.FEED_CREATE_POST,
    createPostRequestSchema,
    async ({ content, visibility, withImages }, event): Promise<IpcResult<CreatePostResponse>> => {
      // The endpoint is multipart even with no image attached.
      const form = new FormData();
      form.append('content', content);
      form.append('visibility', visibility);

      if (withImages === true) {
        const paths = await pickImageFiles(event, {
          title: 'Choose images for your post',
          multiple: true,
          limit: POST_MAX_IMAGES,
        });

        if (paths.length === 0) {
          // Cancelling the picker cancels the post; posting the text alone
          // would silently drop what the user asked for.
          return ipcOk(createPostResponseSchema.parse({ post: null, cancelled: true }));
        }

        for (const filePath of paths) {
          const part = await readImagePart(filePath);
          if (!part.ok) {
            return part;
          }
          form.append('images', part.data.blob, part.data.fileName);
        }
      }

      const result = await apiRequest({
        method: 'post',
        url: ENDPOINTS.posts.create,
        body: form,
        schema: postSchema,
      });

      if (!result.ok) {
        return result;
      }

      log.info('post_created', { images: result.data.images.length });
      return ipcOk(createPostResponseSchema.parse({ post: result.data, cancelled: false }));
    },
  );
}
