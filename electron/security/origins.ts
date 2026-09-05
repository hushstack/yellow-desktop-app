/**
 * The only two origins this app ever runs its own UI from.
 *
 * Everything that needs to answer "is this really our renderer?" — sender
 * validation, CSP, navigation blocking — derives the answer from here.
 */
export const APP_PROTOCOL = 'app';
export const APP_PROTOCOL_HOST = 'bundle';
export const APP_ORIGIN = `${APP_PROTOCOL}://${APP_PROTOCOL_HOST}`;
export const APP_ENTRY_URL = `${APP_ORIGIN}/index.html`;

/** Set by scripts/dev.ts. Absent in every packaged build. */
export function devServerUrl(): string | undefined {
  return process.env.VITE_DEV_SERVER_URL;
}

export function isDevRuntime(): boolean {
  return devServerUrl() !== undefined;
}

/**
 * `URL.origin` is the string "null" for non-special schemes such as app://,
 * so origins are compared as protocol + host instead.
 */
export function originOf(rawUrl: string): string | undefined {
  try {
    const url = new URL(rawUrl);
    return `${url.protocol}//${url.host}`;
  } catch {
    return undefined;
  }
}

export function trustedRendererOrigin(): string {
  const devUrl = devServerUrl();
  if (devUrl !== undefined) {
    return originOf(devUrl) ?? APP_ORIGIN;
  }
  return APP_ORIGIN;
}
