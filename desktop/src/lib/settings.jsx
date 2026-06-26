import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { setApiBase } from './api.js';
import { applyTheme } from './theme.js';

// Local, device-side preferences — the desktop analogue of android_native's
// DataStore-backed SettingsStore. Persisted to localStorage (survives reloads
// and lives inside the Tauri webview's profile).

const STORAGE_KEY = 'pepe-manga.settings';

// Desktop runs on the same machine as the backend by default (vs the emulator's
// 10.0.2.2). MySQL-backed compose stack exposes the API on host port 8202.
const DEFAULTS = {
  baseUrl: 'http://localhost:8202',
  theme: 'epaper',
  imageRendering: 'auto',   // 'auto' follows the theme; else color/grayscale/muted
  defaultMode: 'single',
  defaultDirection: 'RTL',
  defaultFit: 'height',
};

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULTS };
}

const SettingsCtx = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(load);

  // Push effects: API base + document theme/render attributes.
  useEffect(() => { setApiBase(settings.baseUrl); }, [settings.baseUrl]);
  useEffect(() => {
    applyTheme(settings.theme, settings.imageRendering);
  }, [settings.theme, settings.imageRendering]);
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch { /* ignore */ }
  }, [settings]);

  const value = useMemo(() => ({
    settings,
    set: (patch) => setSettings((s) => ({ ...s, ...patch })),
    reset: () => setSettings({ ...DEFAULTS }),
  }), [settings]);

  return <SettingsCtx.Provider value={value}>{children}</SettingsCtx.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsCtx);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}

// Apply persisted base URL/theme as early as possible so the first paint and
// first request use the right values (before React mounts the provider).
(function bootstrap() {
  const s = load();
  setApiBase(s.baseUrl);
  applyTheme(s.theme, s.imageRendering);
})();
