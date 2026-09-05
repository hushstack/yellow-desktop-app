/**
 * Where the credentials actually live.
 *
 * The access token is held in main-process memory only. The refresh token is
 * held there too, and additionally written through Electron's safeStorage when
 * the user asked to be remembered — encrypted with an OS-managed key, never as
 * plaintext JSON, and never in localStorage (OWASP A02/A04).
 *
 * The renderer has no way to read any of this: there is no IPC channel that
 * returns a token.
 */
import { chmod, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { app, safeStorage } from 'electron';
import { z } from 'zod';

import { createLogger } from '../../shared/logger';

const log = createLogger('api.tokens');

const VAULT_FILE_NAME = 'session.vault';
/** Owner read/write only. */
const VAULT_FILE_MODE = 0o600;

const vaultSchema = z.object({
  refreshToken: z.string().min(1).max(4096),
});

interface TokenState {
  accessToken: string | null;
  accessTokenExpiresAt: number | null;
  refreshToken: string | null;
}

const state: TokenState = {
  accessToken: null,
  accessTokenExpiresAt: null,
  refreshToken: null,
};

function vaultPath(): string {
  return path.join(app.getPath('userData'), VAULT_FILE_NAME);
}

export function accessToken(): string | null {
  if (state.accessToken === null || state.accessTokenExpiresAt === null) {
    return null;
  }
  return state.accessTokenExpiresAt > Date.now() ? state.accessToken : null;
}

export function accessTokenExpiresAt(): number | null {
  return state.accessTokenExpiresAt;
}

export function refreshToken(): string | null {
  return state.refreshToken;
}

export function setTokens(tokens: {
  accessToken: string;
  accessTokenExpiresAt: number;
  refreshToken: string | null;
}): void {
  state.accessToken = tokens.accessToken;
  state.accessTokenExpiresAt = tokens.accessTokenExpiresAt;
  if (tokens.refreshToken !== null) {
    state.refreshToken = tokens.refreshToken;
  }
}

export function clearTokens(): void {
  state.accessToken = null;
  state.accessTokenExpiresAt = null;
  state.refreshToken = null;
}

export function isSecureStorageAvailable(): boolean {
  return safeStorage.isEncryptionAvailable();
}

export async function persistRefreshToken(): Promise<boolean> {
  const token = state.refreshToken;
  if (token === null) {
    return false;
  }

  if (!safeStorage.isEncryptionAvailable()) {
    log.warn('secure_storage_unavailable', {});
    return false;
  }

  const ciphertext = safeStorage.encryptString(JSON.stringify({ refreshToken: token }));
  await writeFile(vaultPath(), ciphertext, { mode: VAULT_FILE_MODE });
  // writeFile's mode only applies when it creates the file; enforce it either way.
  await chmod(vaultPath(), VAULT_FILE_MODE);
  log.info('refresh_token_persisted', {});
  return true;
}

export async function discardPersistedRefreshToken(): Promise<void> {
  await rm(vaultPath(), { force: true });
}

/** Loads a remembered refresh token into memory. Returns true when one was found. */
export async function loadPersistedRefreshToken(): Promise<boolean> {
  let ciphertext: Buffer;
  try {
    ciphertext = await readFile(vaultPath());
  } catch {
    // No vault yet is the normal first-run case, not an error.
    return false;
  }

  let plaintext: string;
  try {
    plaintext = safeStorage.decryptString(ciphertext);
  } catch {
    log.warn('vault_undecryptable', {});
    await discardPersistedRefreshToken();
    return false;
  }

  // Decrypted bytes are still untrusted input: parse before use (A08).
  const parsed = vaultSchema.safeParse(JSON.parse(plaintext) as unknown);
  if (!parsed.success) {
    log.warn('vault_shape_rejected', {});
    await discardPersistedRefreshToken();
    return false;
  }

  state.refreshToken = parsed.data.refreshToken;
  return true;
}
