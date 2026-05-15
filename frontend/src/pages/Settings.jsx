import { useEffect, useState } from 'react';

import AppBar from '../components/AppBar.jsx';
import { Chip, Toggle, Radio, Btn } from '../components/Sketch.jsx';
import { api } from '../lib/api.js';
import { useSettings } from '../lib/settings.jsx';

const NAV = [
  ['reader',      'Reader',     '▣'],
  ['appearance',  'Appearance', '◐'],
  ['library',     'Library',    '▥'],
  ['sources',     'Sources',    '📁'],
  ['shortcuts',   'Shortcuts',  '⌘'],
  ['storage',     'Storage',    '▤'],
  ['about',       'About',      'ⓘ'],
];

const MODE_LABELS = [
  ['single',     '▢',  'single'],
  ['double',     '▢▢', 'double'],
  ['horizontal', '▥',  'horizontal cont.'],
  ['vertical',   '▤',  'vertical cont.'],
];

export default function Settings() {
  const [section, setSection] = useState('reader');
  const [sources, setSources] = useState([]);
  const { settings: s, update: save } = useSettings();

  const refreshSources = () => api.sources()
    .then(r => setSources(r.items))
    .catch(() => {});

  useEffect(() => { refreshSources(); }, []);

  return (
    <div className="app-shell">
      <AppBar />
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <aside className="sidebar" style={{ width: 220 }}>
          <div className="sidebar-h">SETTINGS</div>
          <div className="sk-col" style={{ gap: 4 }}>
            {NAV.map(([key, label, glyph]) => (
              <div
                key={key}
                className={`sidebar-item ${section === key ? 'on' : ''}`}
                onClick={() => setSection(key)}
              >
                <span><span style={{ display: 'inline-block', width: 22, textAlign: 'center' }}>{glyph}</span>{label}</span>
              </div>
            ))}
          </div>
        </aside>

        <main style={{ flex: 1, padding: '20px 28px', overflow: 'auto' }}>
          {section === 'reader'     && <ReaderPane s={s} save={save} />}
          {section === 'appearance' && <AppearancePane s={s} save={save} />}
          {section === 'library'    && <LibraryPane s={s} save={save} />}
          {section === 'sources'    && <SourcesPane sources={sources} refresh={refreshSources} />}
          {section === 'shortcuts'  && <ShortcutsPane />}
          {section === 'storage'    && <StoragePane />}
          {section === 'about'      && <AboutPane />}
        </main>
      </div>
    </div>
  );
}

function Row({ label, hint, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0', borderBottom: '1px dashed var(--faint)' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'var(--hand)', fontSize: 15 }}>{label}</div>
        {hint && <div className="sk-mono" style={{ fontSize: 10, color: 'var(--muted)' }}>{hint}</div>}
      </div>
      {children}
    </div>
  );
}

function ReaderPane({ s, save }) {
  const mode = s.reading_mode_default || 'single';
  const dir  = s.direction_default || 'LTR';
  const fit  = s.fit_default || 'height';
  return (
    <div>
      <h2 style={{ fontFamily: 'var(--hand)', fontSize: 28, fontWeight: 700, margin: 0 }}>Reader</h2>
      <div style={{ fontFamily: 'var(--hand)', fontSize: 14, color: 'var(--muted)', marginBottom: 8 }}>
        How pages display when you open a series. Each series can override these.
      </div>

      <div className="sk-mono" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 14, marginBottom: 6 }}>READING MODE · DEFAULT</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
        {MODE_LABELS.map(([k, gl, label]) => (
          <div
            key={k}
            className="sk-box"
            onClick={() => save('reading_mode_default', k)}
            style={{
              padding: '8px 10px', minWidth: 110, cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              background: mode === k ? 'var(--accent-soft)' : 'var(--paper)',
              borderColor: mode === k ? 'var(--accent)' : 'var(--ink)',
            }}
          >
            <div style={{ fontFamily: 'var(--mono)', fontSize: 18 }}>{gl}</div>
            <div style={{ fontFamily: 'var(--hand)', fontSize: 13 }}>{label}</div>
          </div>
        ))}
      </div>

      <div className="sk-mono" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 18 }}>BEHAVIOR</div>
      <Row label="Reading direction" hint="manga = RTL · comics/books = LTR">
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <Radio on={dir === 'RTL'} onClick={() => save('direction_default', 'RTL')} />
          <span style={{ fontFamily: 'var(--hand)', fontSize: 13 }}>RTL</span>
          <Radio on={dir === 'LTR'} onClick={() => save('direction_default', 'LTR')} />
          <span style={{ fontFamily: 'var(--hand)', fontSize: 13, color: 'var(--muted)' }}>LTR</span>
        </div>
      </Row>
      <Row label="Default fit">
        <div style={{ display: 'flex', gap: 6 }}>
          {['width', 'height', 'original'].map(f => (
            <Chip key={f} on={fit === f} onClick={() => save('fit_default', f)}>{f}</Chip>
          ))}
        </div>
      </Row>
      <Row label="Auto-hide chrome" hint="after 2 seconds of idle">
        <Toggle on={s.auto_hide_chrome === '1'} onChange={v => save('auto_hide_chrome', v ? 1 : 0)} />
      </Row>
      <Row label="Click zones" hint="left = prev · right = next">
        <Toggle on={s.click_zones === '1'} onChange={v => save('click_zones', v ? 1 : 0)} />
      </Row>
    </div>
  );
}

function AppearancePane({ s, save }) {
  const themes = [
    ['light', '#fbf8f1', '#1a1816', '#c96442'],
    ['sepia', '#f4e9d2', '#3a2c18', '#b85a38'],
    ['dark',  '#191815', '#e6e2d8', '#d97a58'],
    ['oled',  '#000000', '#cfcabc', '#d97a58'],
    ['noir',  '#0f0f0f', '#e0e0e0', '#ff3b3b'],
  ];
  const theme = s.theme || 'light';
  return (
    <div>
      <h2 style={{ fontFamily: 'var(--hand)', fontSize: 28, fontWeight: 700, margin: 0 }}>Appearance</h2>
      <div style={{ fontFamily: 'var(--hand)', fontSize: 14, color: 'var(--muted)', marginBottom: 12 }}>
        Pick a theme. Reader uses dark by default for OLED comfort.
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        {themes.map(([n, bg, fg, ac]) => (
          <div
            key={n}
            onClick={() => save('theme', n)}
            style={{
              flex: 1, border: `1.5px solid ${theme === n ? ac : 'var(--ink)'}`,
              borderRadius: 4, background: bg, color: fg, padding: 12, cursor: 'pointer',
              minHeight: 80, position: 'relative',
            }}
          >
            <div style={{ fontFamily: 'var(--hand)', fontSize: 16, fontWeight: 700 }}>{n}</div>
            <div className="sk-line" style={{ width: '70%', marginTop: 8, background: fg, opacity: .5 }} />
            <div className="sk-line" style={{ width: '50%', marginTop: 4, background: fg, opacity: .5 }} />
            <span style={{
              position: 'absolute', bottom: 8, right: 8,
              width: 14, height: 14, borderRadius: '50%',
              background: ac, border: `1.5px solid ${fg}`,
            }} />
            {theme === n && <div style={{ position: 'absolute', top: 6, right: 8, fontFamily: 'var(--mono)', fontSize: 10, color: ac }}>✓</div>}
          </div>
        ))}
      </div>
      <Row label="Reduce motion">
        <Toggle on={s.reduce_motion === '1'} onChange={v => save('reduce_motion', v ? 1 : 0)} />
      </Row>
      <Row label="Show progress bars on covers">
        <Toggle on={s.cover_progress === '1'} onChange={v => save('cover_progress', v ? 1 : 0)} />
      </Row>
    </div>
  );
}

function LibraryPane({ s, save }) {
  return (
    <div>
      <h2 style={{ fontFamily: 'var(--hand)', fontSize: 28, fontWeight: 700, margin: 0 }}>Library</h2>
      <Row label="Hide finished series">
        <Toggle on={s.hide_finished === '1'} onChange={v => save('hide_finished', v ? 1 : 0)} />
      </Row>
      <Row label="Auto-mark finished" hint="when last page is reached">
        <Toggle on={s.auto_finish !== '0'} onChange={v => save('auto_finish', v ? 1 : 0)} />
      </Row>
    </div>
  );
}

function SourcesPane({ sources, refresh }) {
  const [path, setPath] = useState('');
  const [autoScan, setAutoScan] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [browser, setBrowser] = useState(null);  // null = closed, else { loc, items, parent }

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(''), 1800); };

  const loadBrowser = async (loc) => {
    try {
      const r = await api.browse(loc);
      setBrowser({ loc: r.path, parent: r.parent, items: r.items });
    } catch (e) {
      setError(`browse failed: ${e.message || e}`);
    }
  };

  const openBrowser = () => loadBrowser('/host');

  const add = async () => {
    setError('');
    const p = path.trim();
    if (!p) { setError('enter a folder path'); return; }
    setBusy(true);
    try {
      const r = await api.addSource(p, autoScan);
      const sc = r.scanned || {};
      flash(autoScan
        ? `added ${r.path} · +${sc.series ?? 0} series, +${sc.chapters ?? 0} chapters`
        : `added ${r.path}`);
      setPath('');
      await refresh();
    } catch (e) {
      const msg = String(e.message || e);
      setError(msg.replace(/^\d{3} [A-Z][^—]*—\s*/, '').replace(/^.*"detail":\s*"([^"]+)".*$/, '$1'));
    } finally {
      setBusy(false);
    }
  };

  const scan = async (id) => {
    setBusy(true);
    try {
      const r = await api.scanSource(id);
      flash(`scan complete · +${r.series} series, +${r.chapters} chapters`);
      await refresh();
    } catch (e) { setError(String(e.message || e)); }
    finally { setBusy(false); }
  };

  const toggle = async (s) => {
    try {
      await api.updateSource(s.id, { enabled: !s.enabled });
      await refresh();
    } catch (e) { setError(String(e.message || e)); }
  };

  const remove = async (s) => {
    if (!window.confirm(`Remove source "${s.path}"?\n\nThis unlinks but doesn't delete any series.`)) return;
    setBusy(true);
    try {
      await api.deleteSource(s.id);
      flash('source removed');
      await refresh();
    } catch (e) { setError(String(e.message || e)); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--hand)', fontSize: 28, fontWeight: 700, margin: 0 }}>Sources</h2>
      <div style={{ fontFamily: 'var(--hand)', fontSize: 14, color: 'var(--muted)', marginBottom: 14 }}>
        Folders the app watches. Each scan turns one-level-deep subfolders (or .cbz files) into series.
      </div>

      <div className="sk-box-flat" style={{ padding: 14, marginBottom: 14 }}>
        <div className="sk-mono" style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 8 }}>ADD A SOURCE</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            value={path}
            onChange={e => { setPath(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && !busy && add()}
            placeholder="/manga  or  /host/Comics"
            style={{
              flex: 1, padding: '6px 8px', fontFamily: 'var(--mono)', fontSize: 12,
              border: '1.25px solid var(--ink2)', borderRadius: 4,
              background: 'var(--paper)', color: 'var(--ink)',
            }}
          />
          <Btn small onClick={browser ? () => setBrowser(null) : openBrowser}>
            {browser ? 'close ✕' : 'browse…'}
          </Btn>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--hand)', fontSize: 13, cursor: 'pointer' }}>
            <Toggle on={autoScan} onChange={setAutoScan} /> scan now
          </label>
          <Btn primary onClick={add} disabled={busy || !path.trim()}>
            {busy ? '…' : '＋ add'}
          </Btn>
        </div>
        {error && (
          <div style={{ marginTop: 8, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent)' }}>
            ✕ {error}
          </div>
        )}
        <div className="sk-mono" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 8 }}>
          paths are resolved <em>inside the backend container</em>:
          {' '}<strong>/manga</strong> is the seeded folder ·
          {' '}<strong>/host</strong> is your <code>HOST_MEDIA_DIR</code> bind-mount (set in <code>.env</code>)
        </div>

        {browser && (
          <div className="sk-box-soft" style={{ marginTop: 10, padding: 10, background: 'var(--panel)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span className="sk-mono" style={{ fontSize: 11, color: 'var(--ink)' }}>📂 {browser.loc}</span>
              <div style={{ flex: 1 }} />
              <Btn small onClick={() => { setPath(browser.loc); flash(`picked ${browser.loc}`); }}>
                use this folder
              </Btn>
            </div>
            <div style={{ maxHeight: 220, overflow: 'auto', fontFamily: 'var(--mono)', fontSize: 11 }}>
              {browser.parent && browser.parent !== browser.loc && (
                <div
                  style={{ padding: '3px 0', cursor: 'pointer', color: 'var(--muted)' }}
                  onClick={() => loadBrowser(browser.parent)}
                >
                  ↑ {browser.parent}
                </div>
              )}
              {browser.items.length === 0 && (
                <div style={{ color: 'var(--muted)', padding: '6px 0' }}>(empty)</div>
              )}
              {browser.items.map(it => (
                <div
                  key={it.path}
                  onClick={() => it.is_dir && loadBrowser(it.path)}
                  style={{
                    padding: '3px 0', cursor: it.is_dir ? 'pointer' : 'default',
                    color: it.is_dir ? 'var(--ink)' : 'var(--muted)',
                  }}
                >
                  {it.is_dir ? '▸ ' : '· '}{it.name}
                </div>
              ))}
            </div>
            <div className="sk-mono" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 6 }}>
              click a folder to navigate · click <em>use this folder</em> to fill the input
            </div>
          </div>
        )}
      </div>

      <div className="sk-mono" style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 6 }}>
        WATCHED · {sources.length}
      </div>
      <div className="sk-col" style={{ gap: 0 }}>
        {sources.map(src => (
          <div key={src.id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 6px', borderBottom: '1px dashed var(--faint)',
          }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink)' }}>📁</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink)' }}>{src.path}</div>
              <div className="sk-mono" style={{ fontSize: 10, color: 'var(--muted)' }}>
                {src.count} series ·{' '}
                {src.last_scan_at
                  ? `last scan ${src.last_scan_at.replace('T',' ').slice(0,16)}`
                  : 'never scanned'}
              </div>
            </div>
            <Btn small onClick={() => scan(src.id)} disabled={busy}>↺ scan</Btn>
            <Toggle on={!!src.enabled} onChange={() => toggle(src)} />
            <Btn small onClick={() => remove(src)} disabled={busy}>🗑</Btn>
          </div>
        ))}
        {!sources.length && (
          <div style={{ color: 'var(--muted)', fontFamily: 'var(--hand)', padding: '14px 0' }}>
            no sources yet — add one above
          </div>
        )}
      </div>

      <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
        <Btn small onClick={async () => {
          setBusy(true);
          try {
            const r = await api.rescan();
            flash(`re-scan complete · +${r.series} series, +${r.chapters} chapters`);
            await refresh();
          } catch (e) { setError(String(e.message || e)); }
          finally { setBusy(false); }
        }} disabled={busy}>↺ rescan all</Btn>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function ShortcutsPane() {
  const rows = [
    ['← / →',          'page prev / next (respects RTL)'],
    ['shift + ← / →',  'chapter prev / next'],
    ['space',          'next page'],
    ['F',              'toggle fullscreen'],
    ['B',              'bookmark current page'],
    ['M',              'cycle reading mode'],
    ['G',              'go to page…'],
    ['Esc',            'back to series'],
  ];
  return (
    <div>
      <h2 style={{ fontFamily: 'var(--hand)', fontSize: 28, fontWeight: 700, margin: 0 }}>Shortcuts</h2>
      <div style={{ marginTop: 14 }}>
        {rows.map(([k, t]) => (
          <div key={k} style={{ display: 'flex', gap: 12, padding: '5px 0', borderBottom: '1px dashed var(--faint)' }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, width: 110 }}>{k}</span>
            <span style={{ fontFamily: 'var(--hand)', fontSize: 14 }}>{t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StoragePane() {
  return (
    <div>
      <h2 style={{ fontFamily: 'var(--hand)', fontSize: 28, fontWeight: 700, margin: 0 }}>Storage</h2>
      <div className="sk-mono" style={{ fontSize: 11, color: 'var(--muted)', marginTop: 14 }}>
        Manga lives on disk under <span style={{ color: 'var(--ink)' }}>/manga</span> inside the backend container.
        Progress / bookmarks / shelves live in MySQL.
      </div>
      <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
        <Btn small>clear cache</Btn>
        <Btn small>export progress…</Btn>
      </div>
    </div>
  );
}

function AboutPane() {
  const features = [
    ['▥', 'Library',    'Sidebar shelves + cover grid. Filter, search, and hide finished series.'],
    ['▣', 'Reader',     'Four modes — single, double, horizontal & vertical continuous. RTL/LTR, fit width/height/original, click zones, fullscreen.'],
    ['▤', 'Series',     'Cover, metadata, and chapter list. Per-series overrides for reading mode and direction.'],
    ['📁', 'Sources',   'Mount any host folder as a watched source. Scan turns subfolders or .cbz / .cbr files into series.'],
    ['◐', 'Themes',     'Five themes — light, sepia, dark, oled, noir. Reduce-motion and cover-progress toggles.'],
    ['⌘', 'Shortcuts',  'Keyboard-first: pages, chapters, bookmarks, page-jump, mode cycle, fullscreen.'],
    ['▤', 'Progress',   'Last-page memory per chapter, auto-finish on last page, bookmark any page with B.'],
    ['◰', 'Dashboard',  'Stats summary and in-progress list to pick up where you left off.'],
  ];
  const stack = [
    ['frontend', 'Vite + React',          'host :8201'],
    ['backend',  'FastAPI + SQLAlchemy',  'host :8202'],
    ['database', 'MySQL 8',                'host :8203'],
    ['orchestr', 'docker compose',        '3 services'],
  ];
  return (
    <div>
      <h2 style={{ fontFamily: 'var(--hand)', fontSize: 28, fontWeight: 700, margin: 0 }}>pepe-manga.read</h2>
      <div style={{ fontFamily: 'var(--hand)', fontSize: 15, color: 'var(--muted)', marginTop: 4 }}>
        Desktop manga / manhwa / comic / book reader. 
      </div>

      <div className="sk-mono" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 18, marginBottom: 6 }}>WHAT IT DOES</div>
      <div className="sk-col" style={{ gap: 0 }}>
        {features.map(([gl, name, desc]) => (
          <div key={name} style={{
            display: 'flex', alignItems: 'flex-start', gap: 12,
            padding: '8px 0', borderBottom: '1px dashed var(--faint)',
          }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 14, width: 22, textAlign: 'center', flexShrink: 0 }}>{gl}</span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontFamily: 'var(--hand)', fontSize: 15, fontWeight: 700 }}>{name}</div>
              <div style={{ fontFamily: 'var(--hand)', fontSize: 13, color: 'var(--muted)' }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="sk-mono" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 18, marginBottom: 6 }}>STACK</div>
      <div className="sk-box-flat" style={{ padding: 12 }}>
        {stack.map(([k, v, port]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'baseline', gap: 12, padding: '3px 0' }}>
            <span className="sk-mono" style={{ fontSize: 10, color: 'var(--muted)', width: 70 }}>{k}</span>
            <span style={{ fontFamily: 'var(--hand)', fontSize: 14, flex: 1 }}>{v}</span>
            <span className="sk-mono" style={{ fontSize: 10, color: 'var(--muted)' }}>{port}</span>
          </div>
        ))}
      </div>

      <div className="sk-mono" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 18, marginBottom: 6 }}>SUPPORTED FORMATS</div>
      <div style={{ fontFamily: 'var(--hand)', fontSize: 14 }}>
        <code>.cbz</code> · <code>.cbr</code> · loose-image folders (jpg / png / webp)
      </div>

    </div>
  );
}
