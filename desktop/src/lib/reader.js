// Reading mode / direction / fit definitions, ported from
// android_native reader/ReaderModels.kt.

export const MODES = [
  { key: 'single',     label: 'Single',  glyph: '▯',  continuous: false },
  { key: 'double',     label: 'Double',  glyph: '▮▮', continuous: false },
  { key: 'vertical',   label: 'Webtoon', glyph: '☰',  continuous: true },
  { key: 'horizontal', label: 'Strip',   glyph: '▭▭', continuous: true },
];

export const DIRECTIONS = [
  { key: 'RTL', label: 'Right → Left', glyph: '←' },
  { key: 'LTR', label: 'Left → Right', glyph: '→' },
];

export const FITS = [
  { key: 'height',   label: 'Fit height', glyph: '↕' },
  { key: 'width',    label: 'Fit width',  glyph: '↔' },
  { key: 'original', label: 'Original',   glyph: '⊡' },
];

export function isContinuous(mode) {
  return mode === 'vertical' || mode === 'horizontal';
}

export function normalizeDir(d) {
  return String(d || '').toUpperCase() === 'RTL' ? 'RTL' : 'LTR';
}
