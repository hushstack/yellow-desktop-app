/**
 * Choosing and reading image files for upload.
 *
 * The renderer never names a path: it asks for an upload, and the main process
 * opens the OS picker, so the set of readable files is whatever the user just
 * pointed at and nothing else (OWASP A01). Extension and size are checked here
 * before any bytes are sent.
 *
 * Avatars and post images share this module deliberately — two copies of an
 * allowlist is one copy that eventually drifts.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { BrowserWindow, dialog, nativeImage, type IpcMainInvokeEvent } from 'electron';

import { createLogger } from '../../shared/logger';
import { ipcFail, ipcOk, type IpcResult } from '../../shared/ipc-types';

const log = createLogger('ipc.images');

/** The API caps every image — avatar or post — at 5 MB. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * The server validates uploads by decoding them and the JVM has no WebP
 * decoder, so WebP is refused even though it appears in the allowlist.
 */
const ALLOWED_IMAGE_EXTENSIONS: Readonly<Record<string, string>> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
};

const PICKER_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif'];

export interface PickOptions {
  title: string;
  /** Allow more than one file, capped at `limit`. */
  multiple?: boolean;
  limit?: number;
}

/** Returns the chosen paths, or an empty array when the user cancelled. */
export async function pickImageFiles(
  event: IpcMainInvokeEvent,
  options: PickOptions,
): Promise<string[]> {
  const parentWindow = BrowserWindow.fromWebContents(event.sender);
  if (parentWindow === null) {
    return [];
  }

  const { canceled, filePaths } = await dialog.showOpenDialog(parentWindow, {
    title: options.title,
    properties: options.multiple === true ? ['openFile', 'multiSelections'] : ['openFile'],
    filters: [{ name: 'Images', extensions: PICKER_EXTENSIONS }],
  });

  if (canceled) {
    return [];
  }

  const limit = options.limit ?? 1;
  return filePaths.slice(0, limit);
}

export interface ImagePart {
  blob: Blob;
  fileName: string;
  byteLength: number;
}

/** Reads one chosen file into a form part, refusing anything off the allowlist. */
export async function readImagePart(filePath: string): Promise<IpcResult<ImagePart>> {
  const extension = path.extname(filePath).toLowerCase();
  const contentType = ALLOWED_IMAGE_EXTENSIONS[extension];
  if (contentType === undefined) {
    return ipcFail('INVALID_PAYLOAD', 'Choose a JPEG, PNG or GIF image.');
  }

  let bytes: Buffer;
  try {
    bytes = await readFile(filePath);
  } catch {
    log.warn('image_unreadable', {});
    return ipcFail('IO_ERROR', 'That file could not be read.');
  }

  if (bytes.byteLength > MAX_IMAGE_BYTES) {
    return ipcFail('INVALID_PAYLOAD', 'Images must be 5 MB or smaller.');
  }

  // Copy into a plain ArrayBuffer: a Node Buffer is not a valid BlobPart.
  const body = new Uint8Array(bytes).buffer;
  return ipcOk({
    blob: new Blob([body], { type: contentType }),
    fileName: path.basename(filePath),
    byteLength: bytes.byteLength,
  });
}

/** The square edge, in pixels, every stored avatar is normalised to. */
export const AVATAR_SIZE = 512;

export interface SquareImage {
  blob: Blob;
  fileName: string;
  byteLength: number;
}

/**
 * Centre-crops an image to a square and scales it to at most {@link AVATAR_SIZE}
 * px, so every avatar is stored at a consistent, crisp resolution rather than
 * whatever odd shape or size the user happened to pick. Never upscales — a
 * smaller source keeps its own size instead of being blurred larger. Emits PNG
 * (lossless, transparency-safe). Falls back to the original bytes if the image
 * cannot be decoded, so a valid-but-exotic file still uploads.
 *
 * Animated GIFs collapse to their first frame, which is the norm for avatars.
 */
export function toSquareAvatar(part: ImagePart, bytes: Buffer): SquareImage {
  const image = nativeImage.createFromBuffer(bytes);
  const { width, height } = image.getSize();
  if (width === 0 || height === 0) {
    return { blob: part.blob, fileName: part.fileName, byteLength: part.byteLength };
  }

  const side = Math.min(width, height);
  const cropped = image.crop({
    x: Math.floor((width - side) / 2),
    y: Math.floor((height - side) / 2),
    width: side,
    height: side,
  });

  const target = Math.min(AVATAR_SIZE, side);
  const resized = cropped.resize({ width: target, height: target, quality: 'best' });
  const png = resized.toPNG();
  const body = new Uint8Array(png).buffer;

  const fileName = `${path.basename(part.fileName, path.extname(part.fileName))}.png`;
  return {
    blob: new Blob([body], { type: 'image/png' }),
    fileName,
    byteLength: png.byteLength,
  };
}
