/**
 * The feed, staging post images, and creating posts.
 *
 * The feed is the API's one cursor-paginated endpoint: pages are keyed by the
 * previous response's `nextCursor` rather than an offset, so a post arriving
 * mid-scroll cannot shift a page boundary and duplicate a row.
 *
 * Images are staged before they are posted, the same two-step shape the avatar
 * upload uses: the picker runs here, the bytes stay here, and the renderer gets
 * a token and a thumbnail. It never names a path (OWASP A01) and never holds
 * the bytes — and the user gets to look at what they picked before it is
 * published.
 *
 * Single-post reads and edits live in posts.handler.ts; reactions in
 * reactions.handler.ts.
 */
import { randomUUID } from 'node:crypto';

import { z } from 'zod';

import { createLogger } from '../../../shared/logger';
import { ENDPOINTS } from '../../api/endpoints';
import { apiRequest } from '../../api/http-client';
import { IPC_CHANNELS } from '../channels';
import { pickImageFiles, readImagePart, toPreviewDataUrl, type ImagePart } from '../image-picker';
import { registerIpcHandler } from '../register';

import {
  acknowledgedResponseSchema,
  createPostRequestSchema,
  discardImagesRequestSchema,
  emptyRequestSchema,
  feedRequestSchema,
  feedResponseSchema,
  ipcFail,
  ipcOk,
  POST_MAX_IMAGES,
  postResponseSchema,
  postSchema,
  stageImagesResponseSchema,
  type AcknowledgedResponse,
  type FeedResponse,
  type IpcResult,
  type PostResponse,
  type StageImagesResponse,
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

/**
 * Images the user has picked but not yet posted.
 *
 * Hard-capped at POST_MAX_IMAGES so a renderer that keeps asking cannot grow it
 * without limit (A06). The cap *refuses* rather than evicting: the entries here
 * are exactly the ones the composer is showing thumbnails for, so dropping the
 * oldest to make room would quietly invalidate a photo the user can still see
 * attached, and the post would fail at publish time.
 */
const stagedImages = new Map<string, ImagePart>();

function remainingCapacity(): number {
  return Math.max(0, POST_MAX_IMAGES - stagedImages.size);
}

function stage(part: ImagePart): string {
  const token = randomUUID();
  stagedImages.set(token, part);
  return token;
}

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
    IPC_CHANNELS.FEED_STAGE_IMAGES,
    emptyRequestSchema,
    async (_payload, event): Promise<IpcResult<StageImagesResponse>> => {
      const paths = await pickImageFiles(event, {
        title: 'Choose images for your post',
        multiple: true,
        limit: POST_MAX_IMAGES,
      });

      if (paths.length === 0) {
        return ipcOk(stageImagesResponseSchema.parse({ images: [], cancelled: true, skipped: 0 }));
      }

      // Whatever is already staged is already attached in the composer, so the
      // room left here is the room left there.
      const accepted = paths.slice(0, remainingCapacity());
      const images = [];

      for (const filePath of accepted) {
        const part = await readImagePart(filePath);
        if (!part.ok) {
          return part;
        }

        // The thumbnail is derived from the same bytes that will be uploaded,
        // so what the user approves is exactly what gets sent.
        const bytes = Buffer.from(await part.data.blob.arrayBuffer());
        images.push({
          token: stage(part.data),
          fileName: part.data.fileName,
          previewDataUrl: toPreviewDataUrl(bytes, part.data.blob.type),
          byteSize: part.data.byteLength,
        });
      }

      log.info('post_images_staged', { count: images.length });
      return ipcOk(
        stageImagesResponseSchema.parse({
          images,
          cancelled: false,
          skipped: paths.length - accepted.length,
        }),
      );
    },
  );

  registerIpcHandler(
    IPC_CHANNELS.FEED_DISCARD_IMAGES,
    discardImagesRequestSchema,
    ({ tokens }): IpcResult<AcknowledgedResponse> => {
      for (const token of tokens) {
        stagedImages.delete(token);
      }
      return ipcOk(acknowledgedResponseSchema.parse({ acknowledged: true }));
    },
  );

  registerIpcHandler(
    IPC_CHANNELS.FEED_CREATE_POST,
    createPostRequestSchema,
    async ({ content, visibility, imageTokens }): Promise<IpcResult<PostResponse>> => {
      // The endpoint is multipart even with no image attached.
      const form = new FormData();
      form.append('content', content);
      form.append('visibility', visibility);

      // Resolved before anything is sent: a half-posted set of images is worse
      // than a refusal the composer can explain (A10).
      const parts: ImagePart[] = [];
      for (const token of imageTokens) {
        const part = stagedImages.get(token);
        if (part === undefined) {
          return ipcFail(
            'INVALID_PAYLOAD',
            'One of those photos is no longer attached. Add it again.',
          );
        }
        parts.push(part);
      }

      for (const part of parts) {
        form.append('images', part.blob, part.fileName);
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

      // Only once the server has them: a failed post keeps its attachments, so
      // retrying does not mean picking every file again.
      for (const token of imageTokens) {
        stagedImages.delete(token);
      }

      log.info('post_created', { images: result.data.images.length });
      return ipcOk(postResponseSchema.parse({ post: result.data }));
    },
  );
}
