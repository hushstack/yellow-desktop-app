/**
 * Auth operations, as seen by the renderer.
 *
 * Each is one allowlisted IPC call: the main process holds the tokens and talks
 * to the API, so nothing here ever sees a credential beyond the password the
 * user just typed.
 */
import type { IpcError, RegisterResponse, Session } from '@shared/ipc-types';

import { ipc } from '@/lib/ipc';
import { fail, ok, type Result } from '@/lib/result';

export type AuthError = IpcError;

/** The API's rate limiter is per-endpoint; this is the one code worth naming. */
export const RATE_LIMIT_CODE = 'RATE_LIMIT_EXCEEDED';

export async function login(
  email: string,
  password: string,
  remember: boolean,
): Promise<Result<Session | null, AuthError>> {
  const result = await ipc.login({ email, password, remember });
  return result.ok ? ok(result.data.session) : fail(result.error);
}

export async function register(input: {
  email: string;
  username: string;
  fullName: string;
  password: string;
}): Promise<Result<RegisterResponse, AuthError>> {
  const result = await ipc.register({
    email: input.email,
    username: input.username,
    password: input.password,
    ...(input.fullName.trim() === '' ? {} : { fullName: input.fullName.trim() }),
  });
  return result.ok ? ok(result.data) : fail(result.error);
}

export async function verifyOtp(
  email: string,
  code: string,
  remember: boolean,
): Promise<Result<Session | null, AuthError>> {
  const result = await ipc.verifyOtp({ email, code, remember });
  return result.ok ? ok(result.data.session) : fail(result.error);
}

export async function currentSession(): Promise<Result<Session | null, AuthError>> {
  const result = await ipc.currentSession();
  return result.ok ? ok(result.data.session) : fail(result.error);
}

export async function logout(): Promise<void> {
  await ipc.logout();
}

/**
 * Starts a password reset. Succeeds identically whether or not the address is
 * registered, so the UI must not imply the account was found.
 */
export async function forgotPassword(email: string): Promise<Result<true, AuthError>> {
  const result = await ipc.forgotPassword({ email });
  return result.ok ? ok(true) : fail(result.error);
}

/** Completes a reset with the token from the email. */
export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<Result<true, AuthError>> {
  const result = await ipc.resetPassword({ token, newPassword });
  return result.ok ? ok(true) : fail(result.error);
}
