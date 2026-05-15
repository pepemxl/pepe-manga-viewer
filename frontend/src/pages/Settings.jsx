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

  useEffect(() => {
    api.sources().then(r => setSources(r.items)).catch(() => {});
  }, []);

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
          {section === 'sources'    && <SourcesPane sources={sources} />}
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

function SourcesPane({ sources }) {
  return (
    <div>
      <h2 style={{ fontFamily: 'var(--hand)', fontSize: 28, fontWeight: 700, margin: 0 }}>Sources</h2>
      <div className="sk-col" style={{ gap: 6, marginTop: 14 }}>
        {sources.map(s => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px dashed var(--faint)' }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>{s.path}</span>
            <div style={{ flex: 1 }} />
            <span className="sk-mono" style={{ fontSize: 10, color: 'var(--muted)' }}>
              {s.count} series · {s.last_scan_at ? `last scan ${s.last_scan_at.replace('T',' ').slice(0,16)}` : 'never scanned'}
            </span>
          </div>
        ))}
        {!sources.length && <div style={{ color: 'var(--muted)', fontFamily: 'var(--hand)' }}>no sources yet — use Import</div>}
      </div>
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
  return (
    <div>
      <h2 style={{ fontFamily: 'var(--hand)', fontSize: 28, fontWeight: 700, margin: 0 }}>pepe-manga.read</h2>
      <div style={{ fontFamily: 'var(--hand)', fontSize: 16, marginTop: 10 }}>
        Built from Claude Design wireframes. Vite + React frontend, FastAPI backend, MySQL.
      </div>
      <div style={{ fontFamily: 'var(--hand)', fontSize: 14, color: 'var(--muted)', marginTop: 6 }}>
        Locked surfaces: Library A · Series A · Reader A · Import B · Dashboard C · Settings A.
      </div>
    </div>
  );
}
