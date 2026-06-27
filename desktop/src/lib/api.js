// Fetch wrapper for the FastAPI backend. Unlike the web frontend (which proxies
// /api through the Vite dev server), the desktop webview talks to an absolute
// base URL that the user configures in Settings → Server. The backend sets
// CORS allow_origins=["*"], so cross-origin requests from the webview work.

let BASE = '';

export function setApiBase(url) {
  BASE = (url || '').trim().replace(/\/+$/, '');
}
export function getApiBase() {
  return BASE;
}

/** Resolve a relative cover/page path returned by the API into an absolute URL. */
export function absoluteUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//.test(path)) return path;
  return BASE + '/' + String(path).replace(/^\/+/, '');
}

/** Direct page-image URL (0-based index), matching /api/reader/page/{cid}/{idx}. */
export function pageUrl(chapterId, idx0) {
  return `${BASE}/api/reader/page/${chapterId}/${idx0}`;
}

// ── offline metadata cache ────────────────────────────────────────────────
// GET JSON responses are written through to localStorage (keyed by server +
// path). When the backend is unreachable we serve the last cached copy so the
// library, series and reader still work offline. Cached page images are handled
// separately by the Tauri local_storage layer (see lib/cache.js).
const META_PREFIX = 'pepe-manga.meta:';
const metaKey = (path) => `${META_PREFIX}${BASE}${path}`;

function cachePut(path, data) {
  try { localStorage.setItem(metaKey(path), JSON.stringify(data)); } catch { /* quota / disabled */ }
}
function cacheGet(path) {
  try {
    const raw = localStorage.getItem(metaKey(path));
    return raw == null ? undefined : JSON.parse(raw);
  } catch { return undefined; }
}

async function req(method, path, body) {
  const opts = { method, headers: {} };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }

  let r;
  try {
    r = await fetch(BASE + path, opts);
  } catch (netErr) {
    // Backend unreachable — fall back to the last cached GET response, if any.
    if (method === 'GET') {
      const cached = cacheGet(path);
      if (cached !== undefined) return cached;
    }
    throw netErr;
  }

  if (!r.ok) {
    const text = await r.text().catch(() => '');
    throw new Error(`${r.status} ${r.statusText} — ${text}`);
  }
  const ct = r.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    const data = await r.json();
    if (method === 'GET') cachePut(path, data);
    return data;
  }
  return r.text();
}

function qs(obj) {
  const e = Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== '');
  return e.length ? '?' + new URLSearchParams(e).toString() : '';
}

export const api = {
  library:   (params = {}) => req('GET', '/api/library' + qs(params)),
  shelves:   () => req('GET', '/api/library/shelves'),
  languages: () => req('GET', '/api/library/languages'),

  sources:      () => req('GET', '/api/library/sources'),
  addSource:    (path, scan = true) => req('POST', '/api/library/sources', { path, scan }),
  scanSource:   (id) => req('POST', `/api/library/sources/${id}/scan`),

  series:          (id) => req('GET', `/api/series/${id}`),
  setReaderConfig: (id, cfg) => req('PATCH', `/api/series/${id}/reader-config`, cfg),

  readerChapter: (id) => req('GET', `/api/reader/chapter/${id}`),
  neighbors:     (sid, cid) => req('GET', `/api/reader/series/${sid}/neighbors/${cid}`),
  progress:      (id, page, finished) =>
    req('POST', `/api/chapters/${id}/progress`, { chapter_id: id, page, finished }),

  rescan:         () => req('POST', '/api/import/rescan'),
  dashStats:      () => req('GET', '/api/dashboard/stats'),
  dashInProgress: () => req('GET', '/api/dashboard/in-progress'),

  // simple reachability probe for the Settings server field
  health: () => req('GET', '/health'),
};
