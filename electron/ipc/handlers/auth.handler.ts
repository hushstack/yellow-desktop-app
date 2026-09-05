/**
 * Authentication against the Yello API.
 *
 * The whole credential lifecycle stays in the main process: the renderer sends
 * an email and password in, and gets back a profile and an expiry — never a
 * token (OWASP A02). "Remember me" writes only the refresh token, encrypted by
 * safeStorage, and a cold start exchanges it for a fresh pair.
 */
import { createLogger } from '../../../shared/logger';
import { ENDPOINTS } from '../../api/endpoints';
import { adoptTokenPair, apiRequest, tokenPairResponseSchema } from '../../api/http-client';
import {
  accessToken,
  accessTokenExpiresAt,
  clearTokens,
  discardPersistedRefreshToken,
  loadPersistedRefreshToken,
  persistRefreshToken,
} from '../../api/token-store';
import { IPC_CHANNELS } from '../channels';
import { registerIpcHandler } from '../register';

import {
  acknowledgedResponseSchema,
  emptyRequestSchema,
  forgotPasswordRequestSchema,
  ipcOk,
  loginRequestSchema,
  registerRequestSchema,
  registerResponseSchema,
  resetPasswordRequestSchema,
  sessionResponseSchema,
  userSchema,
  verifyOtpRequestSchema,
  type AcknowledgedResponse,
  type IpcResult,
  type RegisterResponse,
  type SessionResponse,
} from '../../../shared/ipc-types';
import { z } from 'zod';

const log = createLogger('ipc.auth');

const EMPTY_SESSION: SessionResponse = { session: null };

/** `logout` and other empty-payload endpoints answer with `data: null`. */
const nullDataSchema = emptyRequestSchema.or(userSchema).nullish();

/** The password-reset pair answer with `data: null` and nothing else to read. */
const ignoredDataSchema = z.unknown();

/** Fetches the signed-in profile and pairs it with the access token's expiry. */
async function currentSession(): Promise<IpcResult<SessionResponse>> {
  const profile = await apiRequest({ method: 'get', url: ENDPOINTS.users.me, schema: userSchema });

  if (!profile.ok) {
    // An unusable credential is "signed out", not an error to show the user.
    return profile.error.code === 'UNAUTHENTICATED' ? ipcOk(EMPTY_SESSION) : profile;
  }

  return ipcOk(
    sessionResponseSchema.parse({
      session: { user: profile.data, expiresAt: accessTokenExpiresAt() ?? Date.now() },
    }),
  );
}

/** Runs a token-issuing call, then resolves the profile behind it. */
async function establishSession(
  url: string,
  body: unknown,
  remember: boolean,
): Promise<IpcResult<SessionResponse>> {
  const tokens = await apiRequest({
    method: 'post',
    url,
    body,
    schema: tokenPairResponseSchema,
    allowRefresh: false,
  });

  if (!tokens.ok) {
    return tokens;
  }

  adoptTokenPair(tokens.data);

  if (remember) {
    const persisted = await persistRefreshToken();
    if (!persisted) {
      // Not fatal: the session simply will not survive a restart.
      log.warn('session_persist_failed', {});
    }
  } else {
    // An earlier "remember me" must not outlive a later plain sign-in.
    await discardPersistedRefreshToken();
  }

  return currentSession();
}

export function registerAuthHandlers(): void {
  registerIpcHandler(
    IPC_CHANNELS.AUTH_LOGIN,
    loginRequestSchema,
    async ({ email, password, remember }): Promise<IpcResult<SessionResponse>> => {
      const result = await establishSession(ENDPOINTS.auth.login, { email, password }, remember);
      log.info(result.ok ? 'sign_in_succeeded' : 'sign_in_failed', {});
      return result;
    },
  );

  registerIpcHandler(
    IPC_CHANNELS.AUTH_REGISTER,
    registerRequestSchema,
    async (request): Promise<IpcResult<RegisterResponse>> => {
      const result = await apiRequest({
        method: 'post',
        url: ENDPOINTS.auth.register,
        body: request,
        schema: registerResponseSchema,
        allowRefresh: false,
      });
      log.info(result.ok ? 'registration_started' : 'registration_failed', {});
      return result;
    },
  );

  registerIpcHandler(
    IPC_CHANNELS.AUTH_VERIFY_OTP,
    verifyOtpRequestSchema,
    async ({ email, code, remember }): Promise<IpcResult<SessionResponse>> => {
      const result = await establishSession(ENDPOINTS.auth.verifyOtp, { email, code }, remember);
      log.info(result.ok ? 'otp_verified' : 'otp_rejected', {});
      return result;
    },
  );

  registerIpcHandler(
    IPC_CHANNELS.AUTH_LOGOUT,
    emptyRequestSchema,
    async (): Promise<IpcResult<SessionResponse>> => {
      if (accessToken() !== null) {
        // Revoke server-side, but a failure here still signs the user out locally.
        await apiRequest({
          method: 'post',
          url: ENDPOINTS.auth.logout,
          schema: nullDataSchema,
          allowRefresh: false,
        });
      }

      clearTokens();
      await discardPersistedRefreshToken();
      log.info('signed_out', {});
      return ipcOk(EMPTY_SESSION);
    },
  );

  registerIpcHandler(
    IPC_CHANNELS.AUTH_CURRENT_SESSION,
    emptyRequestSchema,
    async (): Promise<IpcResult<SessionResponse>> => {
      if (accessToken() !== null) {
        return currentSession();
      }

      // Cold start: a remembered refresh token is exchanged by the 401 retry
      // path on the first authenticated call.
      const remembered = await loadPersistedRefreshToken();
      if (!remembered) {
        return ipcOk(EMPTY_SESSION);
      }

      return currentSession();
    },
  );

  registerIpcHandler(
    IPC_CHANNELS.AUTH_FORGOT_PASSWORD,
    forgotPasswordRequestSchema,
    async ({ email }): Promise<IpcResult<AcknowledgedResponse>> => {
      const result = await apiRequest({
        method: 'post',
        url: ENDPOINTS.auth.forgotPassword,
        body: { email },
        schema: ignoredDataSchema,
        allowRefresh: false,
      });

      // The address is never echoed back: the whole point of this endpoint is
      // that it answers identically for a known and an unknown account (A01).
      log.info(result.ok ? 'password_reset_requested' : 'password_reset_request_failed', {});
      return result.ok ? ipcOk(acknowledgedResponseSchema.parse({ acknowledged: true })) : result;
    },
  );

  registerIpcHandler(
    IPC_CHANNELS.AUTH_RESET_PASSWORD,
    resetPasswordRequestSchema,
    async ({ token, newPassword }): Promise<IpcResult<AcknowledgedResponse>> => {
      const result = await apiRequest({
        method: 'post',
        url: ENDPOINTS.auth.resetPassword,
        body: { token, newPassword },
        schema: ignoredDataSchema,
        allowRefresh: false,
      });

      // Neither the token nor the password reaches the log (A09).
      log.info(result.ok ? 'password_reset_completed' : 'password_reset_failed', {});
      return result.ok ? ipcOk(acknowledgedResponseSchema.parse({ acknowledged: true })) : result;
    },
  );
}
