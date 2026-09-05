/**
 * The one place an IPC handler may be registered.
 *
 * Every registration goes through the same gate, in this order:
 *   1. the channel must be on the allowlist in channels.ts (OWASP A01);
 *   2. the sender must be this app's own top-level frame (A01);
 *   3. the payload must satisfy its zod schema (A05 / A08);
 *   4. an unexpected throw becomes a Result failure, never a leaked stack (A10).
 *
 * Handlers therefore only ever see a validated payload from a trusted frame.
 */
import { ipcMain, type IpcMainInvokeEvent } from 'electron';
import type { z } from 'zod';

import { createLogger } from '../../shared/logger';
import { originOf, trustedRendererOrigin } from '../security/origins';

import { isAllowedChannel, type IpcChannel } from './channels';

import { ipcFail, type IpcResult } from '../../shared/ipc-types';

const log = createLogger('ipc');

function isTrustedSender(event: IpcMainInvokeEvent): boolean {
  try {
    const frame = event.senderFrame;
    if (frame === null) {
      return false;
    }
    // Only the top-level document may talk to the main process.
    if (frame.parent !== null) {
      return false;
    }
    return originOf(frame.url) === trustedRendererOrigin();
  } catch {
    // A destroyed frame throws on access; treat it as untrusted.
    return false;
  }
}

export type IpcHandler<TRequest, TResponse> = (
  payload: TRequest,
  event: IpcMainInvokeEvent,
) => IpcResult<TResponse> | Promise<IpcResult<TResponse>>;

export function registerIpcHandler<TSchema extends z.ZodType, TResponse>(
  channel: IpcChannel,
  requestSchema: TSchema,
  handler: IpcHandler<z.infer<TSchema>, TResponse>,
): void {
  // Widened on purpose: the guard has to be a runtime check, not just a type one.
  const channelName: string = channel;
  if (!isAllowedChannel(channelName)) {
    // Fail at startup rather than exposing an unlisted channel.
    throw new Error(`Refusing to register non-allowlisted IPC channel: ${channelName}`);
  }

  ipcMain.handle(channel, async (event, rawPayload: unknown): Promise<IpcResult<TResponse>> => {
    if (!isTrustedSender(event)) {
      log.error('sender_rejected', { channel });
      return ipcFail('UNAUTHORIZED_SENDER', 'Sender frame is not trusted.');
    }

    const parsed = requestSchema.safeParse(rawPayload);
    if (!parsed.success) {
      log.warn('payload_rejected', { channel, issues: parsed.error.issues.length });
      return ipcFail('INVALID_PAYLOAD', 'Request payload failed validation.');
    }

    try {
      return await handler(parsed.data, event);
    } catch (error) {
      log.error('handler_threw', { channel, error });
      return ipcFail('UNKNOWN', 'The operation could not be completed.');
    }
  });
}
