// Thin fetch wrapper. Vite dev-server proxies /api → backend container.

const BASE = '';

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

export const api = {
  library:   (params = {}) => req('GET', '/api/library' + qs(params)),
  shelves:   () => req('GET', '/api/library/shelves'),
  languages: () => req('GET', '/api/library/languages'),

  collections:         () => req('GET',  '/api/library/collections'),
  createCollection:    (name) => req('POST',   '/api/library/collections', { name }),
  deleteCollection:    (id) => req('DELETE', `/api/library/collections/${id}`),
  addToCollection:     (id, seriesId) =>
    req('POST', `/api/library/collections/${id}/series`, { series_id: seriesId }),
  removeFromCollection: (id, seriesId) =>
    req('DELETE', `/api/library/collections/${id}/series/${seriesId}`),

  sources:       () => req('GET', '/api/library/sources'),
  addSource:     (path, scan = true) => req('POST', '/api/library/sources', { path, scan }),
  updateSource:  (id, body) => req('PATCH', `/api/library/sources/${id}`, body),
  deleteSource:  (id) => req('DELETE', `/api/library/sources/${id}`),
  scanSource:    (id) => req('POST', `/api/library/sources/${id}/scan`),
  series:   (id) => req('GET', `/api/series/${id}`),
  setShelf: (id, shelf) => req('PATCH', `/api/series/${id}/shelf`, { shelf }),
  setReaderConfig: (id, cfg) => req('PATCH', `/api/series/${id}/reader-config`, cfg),
  redetectChapters: (id) => req('POST', `/api/series/${id}/redetect-chapters`),
  chapter:  (id) => req('GET', `/api/chapters/${id}`),
  progress: (id, page, finished) =>
    req('POST', `/api/chapters/${id}/progress`, { chapter_id: id, page, finished }),

  readerChapter: (id) => req('GET', `/api/reader/chapter/${id}`),
  neighbors:     (sid, cid) => req('GET', `/api/reader/series/${sid}/neighbors/${cid}`),

  browse:        (path) => req('GET', '/api/import/browse' + qs(path ? { path } : {})),
  importPreview: (path) => req('POST', '/api/import/preview', { path }),
  importCommit:  (path, itemPaths) =>
    req('POST', '/api/import/commit', { path, item_paths: itemPaths }),
  rescan:        () => req('POST', '/api/import/rescan'),

  dashStats:      () => req('GET', '/api/dashboard/stats'),
  dashInProgress: () => req('GET', '/api/dashboard/in-progress'),
  dashTimeline:   () => req('GET', '/api/dashboard/timeline'),

  settings:       () => req('GET', '/api/settings'),
  setSetting:     (key, value) => req('POST', '/api/settings', { key, value: String(value) }),
};

function qs(obj) {
  const e = Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== '');
  return e.length ? '?' + new URLSearchParams(e).toString() : '';
}
