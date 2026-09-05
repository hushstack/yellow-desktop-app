# Yello — desktop client

An Electron + React desktop client for the Yello social API: a home feed you can
post to, reactions, a profile you can edit, and account creation with email
verification.

The interface is built from the design system attached to Stitch project
`5967079738026567667` ("Luminous Minimalist"), and the tokens in
`src/styles/globals.css` are that system's values verbatim.

## Running it

```sh
npm install
npm run dev        # Vite dev server + Electron, restarts main on change
```

Other scripts:

| Script                               | What it does                                           |
| ------------------------------------ | ------------------------------------------------------ |
| `npm run build`                      | Typecheck, build the renderer, bundle main and preload |
| `npm start`                          | Build, then run the packaged-path app (`app://bundle`) |
| `npm run package`                    | Build and produce installers with electron-builder     |
| `npm run lint` / `npm run typecheck` | The two gates the pre-commit hook runs                 |
| `npm run audit:prod`                 | Audit only the dependencies that ship                  |

### Pointing at a different API

The base URL is a **main-process** setting, not a `VITE_*` one:

```sh
YELLO_API_BASE_URL=https://staging.example.com npm run dev
```

It defaults to `https://dev.yello-api.cachewraith.com`. HTTPS is required unless
the host is loopback.

### Signing in

There are no seeded accounts — this talks to the real service. Register in the
app, then enter the six-digit code emailed to you. The account stays
`PENDING_VERIFICATION` until that code is accepted. Note the API's password rule:
**12 characters minimum**.

## Why HTTP lives in the main process

Two reasons, and the second is the important one:

1. The API's CORS allowlist is `http://localhost:3000`. A renderer request from
   `app://bundle` is refused before it leaves the machine.
2. Keeping the client in main means the renderer is never handed an access or
   refresh token. There is no IPC channel that returns one, so an XSS payload in
   the renderer has no credential to exfiltrate.

The renderer asks for _data_; the main process decides what a request needs.

## Architecture

```
electron/
  api/          HTTP client, token store, endpoints, response envelope
  ipc/          channel allowlist, the guarded registrar, one handler per area
  security/     CSP, permission + navigation policy, trusted origins
src/
  features/     auth, feed (API-backed), messages (local sample data)
  routes/       auth, feed, messages, settings
  components/   ui/ (presentational only), layout/
shared/         ipc-types.ts — the main <-> renderer contract; logger.ts
```

`shared/ipc-types.ts` is the single source of truth for the boundary. Every
payload has a zod schema, and both sides parse before they trust: the main
process validates requests because a renderer is untrusted, and the renderer
validates responses because a network payload is untrusted.

## Security posture

| Control                                                        | Where                                     |
| -------------------------------------------------------------- | ----------------------------------------- |
| `contextIsolation`, `sandbox`, no `nodeIntegration`            | `electron/main.ts`                        |
| Strict CSP, no `unsafe-inline` / `unsafe-eval`                 | `electron/security/csp.ts`                |
| Default-deny permissions, blocked navigation and popups        | `electron/security/permissions.ts`        |
| Allowlisted IPC channels + sender-frame validation             | `electron/ipc/channels.ts`, `register.ts` |
| Tokens in main-process memory; refresh token via `safeStorage` | `electron/api/token-store.ts`             |
| HTTPS enforced, one refresh-and-retry on 401                   | `electron/api/http-client.ts`             |
| Structured logging with key redaction                          | `shared/logger.ts`                        |

The renderer is served over a custom `app://bundle` scheme rather than `file://`,
which gives it a real origin for CSP and sender checks, and keeps asset
resolution inside the bundle directory.

## The profile tab

`/profile` is the signed-in user's own page, in the shape X and Substack use: a
banner strip, the avatar overlapping it, display name, `@handle`, bio, joined
date and post count, then their timeline below.

Everything on it is live:

| Action                           | Endpoint                       |
| -------------------------------- | ------------------------------ |
| Edit display name, username, bio | `PUT /api/v1/users/me`         |
| Change profile photo             | `PUT /api/v1/users/me/avatar`  |
| Own timeline, paged              | `GET /api/v1/users/{id}/posts` |

The edit form sends only the fields that actually changed, since every field on
that endpoint is optional.

**Avatar upload is driven from the main process.** The renderer cannot name a
file: it asks for an upload, and main opens the OS picker, reads the bytes and
checks type and size (JPEG/PNG/GIF, 5 MB cap) before anything is sent. A
renderer-supplied path never reaches the filesystem. WebP is rejected on
purpose — the server decodes uploads to validate them and the JVM has no WebP
decoder, so it would fail server-side anyway.

A successful edit writes the fresh profile back into the auth store, so the
sidebar, top bar and composer all repaint from one source.

## Known gaps

- **Messages are sample data.** The API has no messaging endpoints; the screen
  is labelled accordingly.
- **Comments, reposts, friends and notifications** exist in the API but are not
  built here. The disabled controls mark where they attach.
- **Other people's profiles** are not browsable yet; `/profile` is your own.
  `GET /api/v1/users/{id}` is the endpoint that would back it.
- **Image upload** is not wired into the composer, though the endpoint accepts it.
- **Virtualization**: the timeline is windowing-ready — uniform keyed rows, a
  fixed `FEED_ROW_HEIGHT_PX`, and `content-visibility` for off-screen rows — but
  does not use `react-window`. That library sets inline `style` attributes on
  every row, which the strict CSP rejects. Past `VIRTUALIZATION_THRESHOLD` rows,
  either add `style-src-attr 'unsafe-inline'` or use a windowing library that
  writes classes rather than inline styles.
