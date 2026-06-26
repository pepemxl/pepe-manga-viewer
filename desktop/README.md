# Pepe Manga — desktop reader

A desktop port of the native Android reader ([`../android_native`](../android_native)),
built with **React + Vite + Tauri**. Like the Android app it reimplements no
backend logic — it's a pure client of the FastAPI backend in
[`../backend`](../backend) — and it carries the same **"Manga Viewer V2"** design:
the five themes (e-paper mono, color e-paper, dark, light, sepia) with their
image-rendering filters, and the full reader UX.

## Feature parity with `android_native`

| Area            | Notes                                                                            |
|-----------------|---------------------------------------------------------------------------------|
| Themes          | `epaper` (default) · `kaleido` · `dark` · `light` · `sepia` — tokens ported 1:1 from `Tokens.kt` |
| Image rendering | Auto / Color / Mono / Muted, independent of theme (CSS `filter` on page + cover art) |
| Library (Home)  | Shelf + type chips, client-side search, cover grid with progress                |
| Series          | Hero, resume/read, chapter list with sort toggle and per-chapter progress       |
| Reader          | `single` · `double` (RTL-aware spread) · `vertical` (webtoon) · `horizontal` (strip); RTL/LTR; fit height/width/original; auto-hiding chrome; click-zones; page scrubber; chapter neighbors |
| Reading         | Month stats, 30-day bars, continue-reading list                                 |
| Settings        | Display panel, image color, server URL, **local storage folder**, default reading mode/direction/fit |
| Add             | Server-side import guidance + register source folder + re-scan                  |
| Offline cache   | Pages read are cached on disk and reloaded from there next time (desktop only)   |

The default mode/direction/fit and the per-series reader config are persisted to
the backend exactly like the web frontend (`PATCH /api/series/{id}/reader-config`).

## Run

The app talks to the FastAPI backend — start it first (`docker compose up` from
the repo root; it listens on host port **8202**).

```bash
cd desktop
npm install
npm run tauri:dev      # launches the native window (Vite dev server + Tauri)
```

For a web-only preview (no native window): `npm run dev` → http://localhost:1420.

### Build a distributable

```bash
npm run tauri:build    # → src-tauri/target/release/bundle/...
```

## Backend URL

Defaults to `http://localhost:8202` (desktop runs on the same machine as the
backend, unlike the Android emulator's `10.0.2.2`). Change it any time in
**Settings → Server**; it's stored in the webview's `localStorage`. The backend
sets `CORS allow_origins=["*"]`, so the webview can reach it cross-origin.

## Local storage (offline page cache)

The desktop build caches page images on disk so re-reads are instant and work
offline. As you read, each page is downloaded once and written under:

```
<storage root>/pepe_manga_server/<manga name>/chapter_0001/<page>.<ext>
```

`pepe_manga_server` is the provider id for the bundled FastAPI backend. The
reader checks the cache first and only falls back to the network for pages it
hasn't seen yet (which it then caches in the background).

Pick the cache root in **Settings → Local storage → Choose folder…** (a native
folder picker). It defaults to `<app data>/local_storage`; **Use default**
restores that. The chosen path is persisted in the webview's `localStorage`, and
the Rust shell grants the `asset:` protocol read access to it so cached files
render in the reader.

This is a desktop-only feature — the `npm run dev` web preview has no filesystem
access and always streams from the backend.

## Layout

```
src/
  lib/        api client, theme tokens, reader model, settings store
  components/  shared UI primitives (CoverArt, Segmented, StateHost, …)
  pages/       Library · Series · Reader · Dashboard · Settings · Add
src-tauri/    Rust shell (hosts the webview + on-disk page cache commands), tauri.conf.json, icons
```

## Keyboard shortcuts (reader)

- `← / →` page prev / next (direction-aware)
- `shift + ← / →` chapter prev / next
- `space` next page · `M` cycle mode · `F` fullscreen · `B` bookmark · `Esc` back to series
- `+` / `-` zoom in / out · `0` reset zoom (also in the ⚙ reading-settings panel)
