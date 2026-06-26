import { useCallback, useEffect, useState } from 'react';

import { Mono, PrimaryButton, SectionLabel } from '../components/ui.jsx';
import { api } from '../lib/api.js';

// Library content is imported server-side (the backend scans host folders /
// .cbz / .cbr). Like android_native's AddScreen this points at that flow — but
// since the desktop app runs on the same machine as the backend, it also lets
// you register a source folder and trigger a re-scan directly.
export default function Add() {
  const [sources, setSources] = useState([]);
  const [path, setPath] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const refresh = useCallback(async () => {
    try {
      const res = await api.sources();
      setSources(Array.isArray(res) ? res : (res.items || []));
    } catch { /* sources endpoint optional */ }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  async function addSource() {
    if (!path.trim()) return;
    setBusy(true); setMsg('');
    try {
      await api.addSource(path.trim(), true);
      setPath('');
      setMsg('Source added and scanning…');
      refresh();
    } catch (e) {
      setMsg(String(e.message || e));
    } finally { setBusy(false); }
  }

  async function rescan() {
    setBusy(true); setMsg('');
    try { await api.rescan(); setMsg('Re-scan triggered.'); }
    catch (e) { setMsg(String(e.message || e)); }
    finally { setBusy(false); }
  }

  const list = sources;

  return (
    <div className="page-pad col" style={{ gap: 18, maxWidth: 640 }}>
      <h1 className="h1">Add to library</h1>
      <p style={{ color: 'var(--ink-3)', lineHeight: 1.5, margin: 0 }}>
        Series are imported on the server. Register a source folder below (or drop
        .cbz / .cbr files into the backend’s media folder) then re-scan. New series
        appear in Home automatically.
      </p>

      <div className="card col" style={{ gap: 10 }}>
        <SectionLabel>Source folder</SectionLabel>
        <div className="row" style={{ gap: 8 }}>
          <input
            className="field"
            placeholder="/host/Comics or an absolute path the backend can read"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addSource()}
          />
          <PrimaryButton label="Add" onClick={addSource} />
        </div>
        <div className="row" style={{ gap: 8 }}>
          <PrimaryButton label="Re-scan library" glyph="↻" primary={false} onClick={rescan} />
          {busy && <Mono size={12} color="var(--ink-4)">working…</Mono>}
          {msg && <Mono size={12} color="var(--ink-3)">{msg}</Mono>}
        </div>
      </div>

      {list.length > 0 && (
        <div className="card col" style={{ gap: 8 }}>
          <SectionLabel>Sources</SectionLabel>
          {list.map((s) => (
            <div key={s.id || s.path} className="row" style={{ gap: 10 }}>
              <Mono size={12} color="var(--ink-2)" style={{ flex: 1, wordBreak: 'break-all' }}>{s.path}</Mono>
              {s.id != null && (
                <button type="button" className="chip" onClick={() => api.scanSource(s.id).then(() => setMsg('Scanning ' + s.path))}>
                  Scan
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="card col" style={{ gap: 8 }}>
        <SectionLabel>Supported</SectionLabel>
        <div style={{ color: 'var(--ink-2)' }}>• .cbz / .cbr archives</div>
        <div style={{ color: 'var(--ink-2)' }}>• Loose-image chapter folders</div>
        <div style={{ color: 'var(--ink-2)' }}>• Manga · Manhwa · Comics · Books</div>
      </div>
    </div>
  );
}
