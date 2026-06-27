import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { CoverArt, Mono, PrimaryButton, SectionLabel } from '../components/ui.jsx';
import { importLocalFolder, isDesktop, listLocal, localCover } from '../lib/locallib.js';
import { useSettings } from '../lib/settings.jsx';

// Local-only library: series imported from local files, kept entirely on this
// machine (no backend). Pages are extracted into the local_storage folder.
export default function Local() {
  const nav = useNavigate();
  const { settings } = useSettings();
  const [series, setSeries] = useState(listLocal());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const refresh = useCallback(() => setSeries(listLocal()), []);
  useEffect(() => { refresh(); }, [refresh]);

  async function addFolder() {
    setBusy(true); setMsg('');
    try {
      const s = await importLocalFolder(settings.storageRoot);
      if (s) {
        refresh();
        const extra = s.skipped?.length ? ` (${s.skipped.length} unsupported skipped)` : '';
        setMsg(`Imported “${s.title}” — ${s.chapters.length} chapter(s)${extra}.`);
      }
    } catch (e) {
      setMsg(String(e.message || e));
    } finally { setBusy(false); }
  }

  if (!isDesktop()) {
    return (
      <div className="page-pad col" style={{ gap: 12, maxWidth: 640 }}>
        <h1 className="h1">Local library</h1>
        <p style={{ color: 'var(--ink-3)' }}>
          Importing local files needs filesystem access — run the desktop app
          (`npm run tauri:dev`), not the browser preview.
        </p>
      </div>
    );
  }

  return (
    <div className="page-pad col" style={{ gap: 16 }}>
      <div className="spread">
        <h1 className="h1">Local library</h1>
        <PrimaryButton label="Add folder…" glyph="＋" onClick={addFolder} />
      </div>
      <p style={{ color: 'var(--ink-3)', margin: 0 }}>
        Import a folder of <Mono size={12}>.cbz/.zip/.pdf</Mono> chapters or images.
        Pages are extracted into your local storage folder and read entirely offline.
      </p>
      {(busy || msg) && (
        <Mono size={12} color="var(--ink-3)">{busy ? 'importing…' : msg}</Mono>
      )}

      {series.length === 0 ? (
        <div className="state">No local series yet — click <b>Add folder…</b>.</div>
      ) : (
        <div className="grid">
          {series.map((s) => (
            <div key={s.id} className="series-card" style={{ cursor: 'pointer' }}
                 onClick={() => nav(`/local/${encodeURIComponent(s.id)}`)}>
              <CoverArt
                title={s.title}
                kindTag="local"
                coverUrl={localCover(s)}
                style={{ aspectRatio: '2 / 3' }}
              />
              <div className="title">{s.title}</div>
              <div className="spread">
                <div className="meta">{s.chapters.length} ch</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
