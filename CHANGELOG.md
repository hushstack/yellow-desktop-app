# Changelog

All notable changes to the Yello desktop client are recorded here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Electron + React shell built on the "Luminous Minimalist" design system
  extracted from Stitch project `5967079738026567667`.
- Live integration with the Yello API (`https://dev.yello-api.cachewraith.com`):
  login, registration with OTP verification, silent token refresh, the
  cursor-paginated feed, post creation and reactions.
- Frameless window with a custom 72px title bar, keychain-backed "remember me",
  route-level code splitting and a default-deny permission policy.
- Profile tab: banner-and-identity header, inline editing of display name,
  username and bio, avatar upload through the OS file picker, and the user's own
  paginated timeline.
- Messages screen, running on local sample data — the API has no messaging
  endpoints yet, and the screen says so.
- Full coverage of the Yello API: all 35 documented endpoints are now reachable
  through the main-process client and the preload bridge. New since the initial
  integration are password reset (`forgot-password`, `reset-password`), public
  user profiles, single-post read/edit/delete, reposts and share links, the
  whole comments surface, reactions on comments as well as posts plus the
  reaction summary, all six friendship routes, and all four notification routes.
- Post creation accepts images: up to ten, chosen through the OS picker in the
  main process so the renderer never names a path.

### Security

- All HTTP runs in the main process. The renderer never receives an access or
  refresh token, so an XSS payload has no credential to steal.
- Refresh tokens are persisted only through Electron `safeStorage` (OS keychain),
  never in `localStorage` or a plaintext file, and only when the user opts in.
- `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false` on every
  window, plus `app.enableSandbox()`.
- Strict CSP in production: `default-src 'none'`, no `unsafe-inline`, no
  `unsafe-eval`. The API host is allowed for images only.
- IPC channels are allowlisted, the sender frame is validated on every call, and
  every payload crossing the boundary is parsed with zod in both directions.
- Every id that becomes a URL path segment is percent-encoded in one place
  (`electron/api/endpoints.ts`), and `targetType` is a closed enum, so a crafted
  id from the renderer cannot address a route of its choosing.
- Authorisation is never re-implemented client-side: post visibility, comment
  moderation rights and notification ownership are the server's decisions, and
  its `POST_NOT_VISIBLE` / `ACCESS_DENIED` / `404` answers pass straight through.
- Password-reset tokens and passwords are never logged, and `forgot-password`
  reports the same acknowledgement whether or not the address is registered.

## Release checklist

Run before cutting any release:

```sh
npm run lint          # zero errors, zero warnings
npm run typecheck     # tsc --noEmit
npm run audit:prod    # npm audit --omit=dev --audit-level=high
npm run build         # renderer + main bundles
npm run package       # electron-builder artifacts
```

`npm run audit:prod` is the gate that matters for shipped code: it audits only
the dependencies that end up inside the asar. Run the unfiltered `npm audit` as
well and triage anything it reports in the build toolchain. Electron and
electron-builder are pinned to exact versions — bump them deliberately, read the
release notes for security fixes, and re-run the checklist afterwards.
