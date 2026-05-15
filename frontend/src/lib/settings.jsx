import { createContext, useContext, useEffect, useState, useCallback } from 'react';

import { api } from './api.js';

const SettingsCtx = createContext(null);

const DEFAULTS = {
  theme: 'light',
  reading_mode_default: 'single',
  direction_default: 'LTR',
  fit_default: 'height',
  auto_hide_chrome: '1',
  click_zones: '1',
  reduce_motion: '0',
  cover_progress: '1',
};

const THEMES = ['light', 'sepia', 'dark', 'oled', 'noir'];

function applyToBody(s) {
  const body = document.body;
  THEMES.forEach(t => body.classList.remove(`theme-${t}`));
  body.classList.add(`theme-${THEMES.includes(s.theme) ? s.theme : 'light'}`);
  body.classList.toggle('reduce-motion',   s.reduce_motion === '1');
  body.classList.toggle('no-cover-progress', s.cover_progress !== '1');
}

export function SettingsProvider({ children }) {
  const [s, setS] = useState(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.settings()
      .then(remote => setS(prev => ({ ...prev, ...remote })))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => { applyToBody(s); }, [s]);

  const update = useCallback((key, value) => {
    const v = String(value);
    setS(prev => ({ ...prev, [key]: v }));
    api.setSetting(key, v).catch(console.error);
  }, []);

  return (
    <SettingsCtx.Provider value={{ settings: s, update, loaded }}>
      {children}
    </SettingsCtx.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsCtx);
  if (!ctx) throw new Error('useSettings outside SettingsProvider');
  return ctx;
}
