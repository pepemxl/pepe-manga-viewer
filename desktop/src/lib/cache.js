// On-disk page cache, backed by the Tauri Rust shell (see src-tauri/src/lib.rs).
//
// Pages downloaded from a provider's API are stored under
//     <storageRoot>/<provider>/<manga_name>/chapter_<n>/<page>.<ext>
// and served back to the webview through Tauri's `asset:` protocol. Reads check
// the cache first and only fall back to the network when a page is missing.
//
// Everything here is a no-op outside a Tauri window (e.g. the `npm run dev` web
// preview), so callers can use it unconditionally — they just get `null` back
// and keep using the backend URL.

import { invoke, convertFileSrc, isTauri } from '@tauri-apps/api/core';

// The only provider today is the project's own FastAPI backend.
export const PROVIDER = 'pepe_manga_server';

export function isDesktop() {
  try { return isTauri(); } catch { return false; }
}

/**
 * Folder label for a chapter within a manga's cache directory: the chapter
 * number, zero-padded to 4 digits — e.g. 1 → `chapter_0001`, "Ch. 12" →
 * `chapter_0012`, 1.5 → `chapter_0001.5`.
 */
export function chapterFolder(number) {
  const m = String(number ?? '').match(/(-?)(\d+)(\.\d+)?/);
  if (!m) return 'chapter_unknown';
  const [, sign, intPart, frac = ''] = m;
  return `chapter_${sign}${intPart.padStart(4, '0')}${frac}`;
}

/** Suggested default cache root (`<app data>/local_storage`). */
export async function defaultStorageRoot() {
  if (!isDesktop()) return '';
  try { return await invoke('default_storage_root'); }
  catch { return ''; }
}

/** Grant the asset protocol read access to `root` (call on startup + on change). */
export async function allowStorage(root) {
  if (!isDesktop() || !root) return;
  try { await invoke('allow_storage', { root }); } catch { /* best effort */ }
}

/** Open a native folder picker; resolves to the chosen path or `''` if cancelled. */
export async function chooseStorageDir(current) {
  if (!isDesktop()) return '';
  const { open } = await import('@tauri-apps/plugin-dialog');
  const picked = await open({
    directory: true,
    multiple: false,
    defaultPath: current || undefined,
    title: 'Choose local storage folder',
  });
  return typeof picked === 'string' ? picked : '';
}

/**
 * Return an `asset:`-protocol URL for an already-cached page, or `null` if it
 * isn't cached (or we're not running under Tauri).
 */
export async function cachedPageSrc({ root, manga, chapter, page }) {
  if (!isDesktop() || !root) return null;
  try {
    const path = await invoke('cached_page', {
      root, provider: PROVIDER, manga, chapter, page,
    });
    return path ? convertFileSrc(path) : null;
  } catch {
    return null;
  }
}

/**
 * Download `url` into the cache if it isn't there yet. Fire-and-forget — the
 * page is shown from the network meanwhile; the next read comes off disk.
 */
export async function ensureCached({ root, manga, chapter, page, url }) {
  if (!isDesktop() || !root) return;
  try {
    await invoke('cache_page', {
      root, provider: PROVIDER, manga, chapter, page, url,
    });
  } catch { /* offline / transient — try again next read */ }
}
