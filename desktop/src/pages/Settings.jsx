import { useState } from 'react';

import { PrimaryButton, SectionLabel, Segmented, Mono } from '../components/ui.jsx';
import { api } from '../lib/api.js';
import {
  allowStorage, chooseStorageDir, defaultStorageRoot, isDesktop,
} from '../lib/cache.js';
import { DIRECTIONS, FITS, MODES } from '../lib/reader.js';
import { useSettings } from '../lib/settings.jsx';
import { RENDERINGS, THEMES } from '../lib/theme.js';

export default function Settings() {
  const { settings, set } = useSettings();
  const [url, setUrl] = useState(settings.baseUrl);
  const [probe, setProbe] = useState('');

  const dirty = url.trim().replace(/\/+$/, '') !== settings.baseUrl;

  async function saveServer() {
    const clean = url.trim().replace(/\/+$/, '');
    set({ baseUrl: clean });
    setProbe('checking…');
    try { await api.health(); setProbe('reachable ✓'); }
    catch { setProbe('saved — but no response yet'); }
  }

  async function pickStorage() {
    const chosen = await chooseStorageDir(settings.storageRoot);
    if (!chosen) return;
    set({ storageRoot: chosen });
    await allowStorage(chosen);
  }

  async function resetStorage() {
    const def = await defaultStorageRoot();
    set({ storageRoot: def });
    await allowStorage(def);
  }

  return (
    <div className="page-pad col" style={{ gap: 24, maxWidth: 640 }}>
      <h1 className="h1">Settings</h1>

      {/* Display panel */}
      <section className="col" style={{ gap: 10 }}>
        <SectionLabel>Display panel</SectionLabel>
        <p style={{ color: 'var(--ink-3)', margin: 0 }}>
          Mono and color e-paper modes flatten color, drop animation and filter
          page art to match the hardware.
        </p>
        {THEMES.map((t) => (
          <ThemeRow key={t.key} theme={t} selected={settings.theme === t.key} onClick={() => set({ theme: t.key })} />
        ))}
      </section>

      {/* Image color */}
      <section className="col" style={{ gap: 10 }}>
        <SectionLabel>Image color</SectionLabel>
        <p style={{ color: 'var(--ink-3)', margin: 0 }}>
          Override how page art is rendered, independent of the theme — e.g. keep
          the mono e-paper look but read pages in full color.
        </p>
        <Segmented
          options={RENDERINGS.map((r) => ({ value: r.key, label: r.label }))}
          value={settings.imageRendering}
          onChange={(v) => set({ imageRendering: v })}
        />
      </section>

      {/* Server */}
      <section className="col" style={{ gap: 10 }}>
        <SectionLabel>Server</SectionLabel>
        <div className="row" style={{ gap: 8 }}>
          <input
            className="field"
            placeholder="http://localhost:8202"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <PrimaryButton label="Save" onClick={saveServer} />
        </div>
        {dirty && <Mono size={12} color="var(--ink-4)">Click Save to switch servers.</Mono>}
        {!dirty && probe && <Mono size={12} color="var(--ink-4)">{probe}</Mono>}
      </section>

      {/* Local storage (desktop only) */}
      {isDesktop() && (
        <section className="col" style={{ gap: 10 }}>
          <SectionLabel>Local storage</SectionLabel>
          <p style={{ color: 'var(--ink-3)', margin: 0 }}>
            Pages you read are cached on disk and loaded from there next time —
            so re-reads are instant and work offline. Stored under
            {' '}<Mono size={12}>&lt;folder&gt;/pepe_manga_server/&lt;manga&gt;/chapter_&lt;n&gt;/</Mono>.
          </p>
          <div className="field" style={{ overflowWrap: 'anywhere', userSelect: 'text' }}>
            {settings.storageRoot || 'resolving default…'}
          </div>
          <div className="row" style={{ gap: 8 }}>
            <PrimaryButton label="Choose folder…" glyph="📁" onClick={pickStorage} />
            <PrimaryButton label="Use default" primary={false} onClick={resetStorage} />
          </div>
        </section>
      )}

      {/* Reading defaults */}
      <section className="col" style={{ gap: 10 }}>
        <SectionLabel>Reading mode</SectionLabel>
        <Segmented
          options={MODES.map((m) => ({ value: m.key, label: m.label, glyph: m.glyph }))}
          value={settings.defaultMode}
          onChange={(v) => set({ defaultMode: v })}
        />
        <SectionLabel>Direction</SectionLabel>
        <Segmented
          options={DIRECTIONS.map((d) => ({ value: d.key, label: d.label, glyph: d.glyph }))}
          value={settings.defaultDirection}
          onChange={(v) => set({ defaultDirection: v })}
        />
        <SectionLabel>Fit</SectionLabel>
        <Segmented
          options={FITS.map((f) => ({ value: f.key, label: f.label, glyph: f.glyph }))}
          value={settings.defaultFit}
          onChange={(v) => set({ defaultFit: v })}
        />
      </section>
    </div>
  );
}

function ThemeRow({ theme, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="row"
      style={{
        gap: 12,
        padding: 12,
        borderRadius: 10,
        textAlign: 'left',
        background: selected ? 'var(--accent-soft)' : 'var(--panel)',
        border: `1px solid ${selected ? 'var(--accent-line)' : 'var(--line)'}`,
        color: selected ? 'var(--accent)' : 'var(--ink)',
      }}
    >
      <div className="row" style={{ gap: 0 }}>
        <span className="swatch" style={{ background: theme.swatch.bg }} />
        <span className="swatch" style={{ background: theme.swatch.ink }} />
        <span className="swatch" style={{ background: theme.swatch.accent }} />
      </div>
      <span style={{ fontWeight: 600 }}>{theme.label}</span>
    </button>
  );
}
