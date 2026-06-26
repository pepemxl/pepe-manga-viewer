// Theme + image-rendering model, ported from android_native ui/theme/Tokens.kt.
// The actual color values live in styles.css under [data-theme=...]; here we
// only carry the metadata (labels, swatches, default rendering) the UI needs.

export const THEMES = [
  { key: 'epaper',  label: 'E-paper (mono)', defaultRender: 'grayscale',
    swatch: { bg: '#ffffff', ink: '#000000', accent: '#141414' } },
  { key: 'kaleido', label: 'Color e-paper',  defaultRender: 'muted',
    swatch: { bg: '#e9e8e2', ink: '#1b1a17', accent: '#74628f' } },
  { key: 'dark',    label: 'Dark',           defaultRender: 'color',
    swatch: { bg: '#1b1a1f', ink: '#f2f1f4', accent: '#b46cff' } },
  { key: 'light',   label: 'Light',          defaultRender: 'color',
    swatch: { bg: '#f5f4f6', ink: '#2f2d36', accent: '#b46cff' } },
  { key: 'sepia',   label: 'Sepia',          defaultRender: 'color',
    swatch: { bg: '#ece2d2', ink: '#4a3d2e', accent: '#b46cff' } },
];

export const RENDERINGS = [
  { key: 'auto',      label: 'Auto' },   // follow the theme's default
  { key: 'color',     label: 'Color' },
  { key: 'grayscale', label: 'Mono' },
  { key: 'muted',     label: 'Muted' },
];

export function themeMeta(key) {
  return THEMES.find((t) => t.key === key) || THEMES[0];
}

/** Apply theme + (resolved) image-rendering to the document root. */
export function applyTheme(themeKey, renderingKey) {
  const root = document.documentElement;
  root.dataset.theme = themeKey || 'epaper';
  // 'auto' means: let the theme decide (no data-render override).
  if (!renderingKey || renderingKey === 'auto') {
    delete root.dataset.render;
  } else {
    root.dataset.render = renderingKey;
  }
}
