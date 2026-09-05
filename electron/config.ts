/**
 * Main-process configuration.
 *
 * The API base URL lives here rather than in a VITE_* variable because the HTTP
 * client now runs in the main process. An operator can override it per
 * environment; the default is the shared development service.
 */
const DEFAULT_API_BASE_URL = 'https://dev.yello-api.cachewraith.com';

/**
 * Where uploaded media (avatars, post images) is served from. This is the R2
 * bucket the API redirects to, a different origin than the API itself, so it
 * needs its own CSP `img-src` entry. Comma-separated so more than one CDN can be
 * allowed without a code change; operator-overridable per environment.
 */
const DEFAULT_IMAGE_BASE_URLS = 'https://pub-bbc7c2fe34614a5794960788c8da82e1.r2.dev';

export function apiBaseUrlFromEnvironment(): string {
  const configured = process.env.YELLO_API_BASE_URL;
  return configured === undefined || configured === '' ? DEFAULT_API_BASE_URL : configured;
}

/** The distinct image origins to allow, as an array (empty entries dropped). */
export function imageBaseUrlsFromEnvironment(): string[] {
  const configured = process.env.YELLO_IMAGE_BASE_URLS;
  const raw = configured === undefined || configured === '' ? DEFAULT_IMAGE_BASE_URLS : configured;
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value !== '');
}
