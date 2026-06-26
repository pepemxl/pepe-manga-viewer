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

async function req(method, path, body) {
  const opts = { method, headers: {} };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const r = await fetch(BASE + path, opts);
  if (!r.ok) {
    const text = await r.text().catch(() => '');
    throw new Error(`${r.status} ${r.statusText} — ${text}`);
  }
  const ct = r.headers.get('content-type') || '';
  return ct.includes('application/json') ? r.json() : r.text();
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
