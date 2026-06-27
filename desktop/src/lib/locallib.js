// Local-only library: series imported from local files/folders, extracted into
// the local_storage area by the Rust shell (see src-tauri import_local_series).
// The index (titles + per-chapter page file paths) is persisted to localStorage;
// pages are read back through Tauri's asset: protocol — no backend involved.

import { convertFileSrc, invoke, isTauri } from '@tauri-apps/api/core';

const LOCAL_KEY = 'pepe-manga.local';

export function isDesktop() {
  try { return isTauri(); } catch { return false; }
}

function loadIndex() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}
function saveIndex(list) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(list)); } catch { /* ignore */ }
}

/** All local series (index only — page paths live on each chapter). */
export function listLocal() {
  return loadIndex();
}

export function getLocalSeries(id) {
  return loadIndex().find((s) => s.id === id) || null;
}

export function getLocalChapter(seriesId, chapterId) {
  const s = getLocalSeries(seriesId);
  if (!s) return null;
  const ch = s.chapters.find((c) => c.id === chapterId);
  if (!ch) return null;
  return { series: s, chapter: ch };
}

/** asset: URLs for a chapter's pages (from the stored absolute file paths). */
export function localChapterPageUrls(chapter) {
  return (chapter.pages || []).map((p) => convertFileSrc(p));
}

/** First available page as a cover image URL, or null. */
export function localCover(series) {
  const ch = (series.chapters || []).find((c) => (c.pages || []).length);
  return ch ? convertFileSrc(ch.pages[0]) : null;
}

/** Route id for a local chapter, consumed by the Reader. */
export function localReadId(seriesId, chapterId) {
  return `local:${seriesId}:${chapterId}`;
}

/** Parse a `local:<sid>:<cid>` reader id back into its parts, or null. */
export function parseLocalReadId(chId) {
  if (!chId || !chId.startsWith('local:')) return null;
  const rest = chId.slice('local:'.length);
  const sep = rest.indexOf(':');
  if (sep < 0) return null;
  return { seriesId: rest.slice(0, sep), chapterId: rest.slice(sep + 1) };
}

/**
 * Open the folder picker, import the chosen folder as a local series (extracting
 * pages into local_storage), persist it to the index, and return the new series.
 */
export async function importLocalFolder(storageRoot) {
  if (!isDesktop()) throw new Error('Local import is only available in the desktop app.');
  if (!storageRoot) throw new Error('Set a local storage folder in Settings first.');

  const { open } = await import('@tauri-apps/plugin-dialog');
  const dir = await open({ directory: true, multiple: false, title: 'Choose a folder to import' });
  if (typeof dir !== 'string' || !dir) return null;

  const series = await invoke('import_local_series', { root: storageRoot, path: dir });
  // Persist a compact index entry (keep page paths for the reader).
  const list = loadIndex().filter((s) => s.id !== series.id); // replace on re-import
  list.unshift(series);
  saveIndex(list);
  return series;
}

export async function removeLocalSeries(storageRoot, id) {
  saveIndex(loadIndex().filter((s) => s.id !== id));
  if (isDesktop() && storageRoot) {
    try { await invoke('delete_local_series', { root: storageRoot, seriesId: id }); } catch { /* best effort */ }
  }
}
