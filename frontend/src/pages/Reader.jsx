import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Chip, Icon, Note } from '../components/Sketch.jsx';
import { api } from '../lib/api.js';
import { useSettings } from '../lib/settings.jsx';

const MODES = ['single', 'double', 'vertical', 'horizontal'];
const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];
const ZOOM_MIN = ZOOM_STEPS[0];
const ZOOM_MAX = ZOOM_STEPS[ZOOM_STEPS.length - 1];

function nextMode(m) { return MODES[(MODES.indexOf(m) + 1) % MODES.length]; }

function clampZoom(z) { return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z)); }
function stepZoom(z, delta) {
  // snap to the nearest discrete step in the direction of delta
  const i = ZOOM_STEPS.findIndex(s => Math.abs(s - z) < 0.01);
  if (i >= 0) return ZOOM_STEPS[Math.max(0, Math.min(ZOOM_STEPS.length - 1, i + delta))];
  // off-grid (legacy value) — find the nearest step then nudge
  const nearest = ZOOM_STEPS.reduce((a, b) => Math.abs(b - z) < Math.abs(a - z) ? b : a);
  const j = ZOOM_STEPS.indexOf(nearest);
  return ZOOM_STEPS[Math.max(0, Math.min(ZOOM_STEPS.length - 1, j + delta))];
}

export default function Reader() {
  const { chId } = useParams();
  const nav = useNavigate();
  const { settings } = useSettings();

  const [ch,         setCh]         = useState(null);
  const [neighbors,  setNeighbors]  = useState({ prev: null, next: null, index: 0, total: 0 });
  const [page,       setPage]       = useState(1);      // 1-indexed
  const [mode,       setMode]       = useState('single');
  const [dir,        setDir]        = useState('LTR');
  const [fit,        setFit]        = useState('height');
  const [zoom,       setZoom]       = useState(1);
  const [chrome,     setChrome]     = useState(true);
  const [toast,      setToast]      = useState('');

  const idleTimer = useRef(null);
  const stageRef  = useRef(null);
  // Suppress the first config-save after a chapter loads, since the values
  // we just applied came *from* the server — nothing to persist back.
  const skipNextCfgSave = useRef(false);

  // load chapter
  useEffect(() => {
    let cancel = false;
    (async () => {
      const info = await api.readerChapter(chId);
      if (cancel) return;
      setCh(info);
      setPage(Math.max(1, info.current_page || 1));

      // Reading mode cascade: series-specific → kind heuristic → global default.
      const seriesMode = info.reading_mode
        || ((info.direction === 'vert' || info.kind === 'manhwa') ? 'vertical' : null);
      const resolvedMode = seriesMode
        || settings.reading_mode_default
        || 'single';

      // Direction: series direction wins (treat "vert" as LTR for horizontal navigation);
      // otherwise fall back to the global default.
      const resolvedDir = info.direction && info.direction !== 'vert'
        ? info.direction
        : (settings.direction_default || 'LTR');

      // Fit: series-specific → global default.
      const resolvedFit = info.fit || settings.fit_default || 'height';

      // Zoom: series-specific only (no global default — 1.0 means "fit").
      const resolvedZoom = clampZoom(Number(info.zoom) || 1);

      skipNextCfgSave.current = true;
      setMode(resolvedMode);
      setDir(resolvedDir);
      setFit(resolvedFit);
      setZoom(resolvedZoom);

      const nb = await api.neighbors(info.series_id, info.id);
      if (!cancel) setNeighbors(nb);
    })().catch(console.error);
    return () => { cancel = true; };
  }, [chId, settings.reading_mode_default, settings.direction_default, settings.fit_default]);

  // persist per-series reader config when the user changes mode/dir/fit (debounced)
  const cfgTimer = useRef(null);
  useEffect(() => {
    if (!ch) return;
    if (skipNextCfgSave.current) {
      skipNextCfgSave.current = false;
      return;
    }
    clearTimeout(cfgTimer.current);
    cfgTimer.current = setTimeout(() => {
      api.setReaderConfig(ch.series_id, {
        reading_mode: mode, direction: dir, fit, zoom,
      }).catch(() => {});
    }, 400);
    return () => clearTimeout(cfgTimer.current);
  }, [ch, mode, dir, fit, zoom]);

  // server-side persist on page change (debounced)
  const persistRef = useRef(null);
  useEffect(() => {
    if (!ch) return;
    clearTimeout(persistRef.current);
    persistRef.current = setTimeout(() => {
      const finished = page >= ch.page_count;
      api.progress(ch.id, page, finished).catch(() => {});
    }, 400);
    return () => clearTimeout(persistRef.current);
  }, [ch, page]);

  // chrome auto-hide
  const bumpChrome = useCallback(() => {
    setChrome(true);
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setChrome(false), 2000);
  }, []);
  useEffect(() => { bumpChrome(); return () => clearTimeout(idleTimer.current); }, [bumpChrome]);

  const advance = useCallback((delta) => {
    if (!ch) return;
    setPage(p => {
      const step = mode === 'double' ? 2 : 1;
      const target = p + delta * step;
      if (target < 1) {
        if (neighbors.prev) { nav(`/read/${neighbors.prev}`); return p; }
        return 1;
      }
      if (target > ch.page_count) {
        if (neighbors.next) { nav(`/read/${neighbors.next}`); return p; }
        return ch.page_count;
      }
      return target;
    });
    bumpChrome();
  }, [ch, mode, neighbors, nav, bumpChrome]);

  const goChapter = useCallback((delta) => {
    const target = delta < 0 ? neighbors.prev : neighbors.next;
    if (target) nav(`/read/${target}`);
  }, [neighbors, nav]);

  // keyboard nav
  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      bumpChrome();
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          if (e.shiftKey) goChapter(dir === 'RTL' ? -1 : -1);
          else advance(dir === 'RTL' ? 1 : -1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (e.shiftKey) goChapter(dir === 'RTL' ? 1 : 1);
          else advance(dir === 'RTL' ? -1 : 1);
          break;
        case ' ':
          e.preventDefault();
          advance(1);
          break;
        case 'Escape':
          nav(ch ? `/series/${ch.series_id}` : '/');
          break;
        case 'm': case 'M':
          setMode(nextMode);
          break;
        case '+': case '=':
          e.preventDefault();
          setZoom(z => stepZoom(z, +1));
          setToast(''); // clear any stale toast so the new one re-shows
          break;
        case '-': case '_':
          e.preventDefault();
          setZoom(z => stepZoom(z, -1));
          break;
        case '0':
          e.preventDefault();
          setZoom(1);
          break;
        case 'f': case 'F':
          if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
          else document.exitFullscreen?.();
          break;
        case 'b': case 'B':
          setToast('bookmark added (mock)');
          setTimeout(() => setToast(''), 1500);
          break;
        case 'g': case 'G': {
          const p = prompt(`Go to page (1–${ch?.page_count || 1})`);
          const n = parseInt(p || '', 10);
          if (Number.isFinite(n)) setPage(Math.max(1, Math.min(n, ch.page_count)));
          break;
        }
        default: break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [advance, goChapter, dir, ch, nav, bumpChrome]);

  // mouse motion reveals chrome
  useEffect(() => {
    const onMove = () => bumpChrome();
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [bumpChrome]);

  const pages = useMemo(() => {
    if (!ch) return [];
    return Array.from({ length: ch.page_count }, (_, i) => `/api/reader/page/${ch.id}/${i}`);
  }, [ch]);

  if (!ch) {
    return <div style={{ color: '#fff', background: '#15120f', position: 'fixed', inset: 0, padding: 40, fontFamily: 'var(--hand)' }}>loading chapter…</div>;
  }

  const onSlider = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const p = Math.max(1, Math.min(ch.page_count, Math.round(x * ch.page_count) || 1));
    setPage(p);
  };

  const fitStyle = fit === 'width'
    ? { width: `${100 * zoom}%`,  height: 'auto' }
    : fit === 'height'
    ? { height: `${100 * zoom}%`, width: 'auto' }
    : { transform: `scale(${zoom})`, transformOrigin: 'center center' };  // original

  return (
    <div className={`reader-host ${chrome ? '' : 'chrome-hidden'}`} ref={stageRef}>
      <div className="reader-chrome-top">
        <Icon glyph="←" onClick={() => nav(`/series/${ch.series_id}`)} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--hand)', fontSize: 16, lineHeight: 1, fontWeight: 700 }}>{ch.title || ch.number}</div>
          <div className="sk-mono" style={{ fontSize: 10, color: 'var(--muted)' }}>
            {ch.number} · {page} / {ch.page_count}
          </div>
        </div>
        {MODES.map(m => (
          <Chip key={m} on={mode === m} onClick={() => setMode(m)}>{m}</Chip>
        ))}
        <Chip onClick={() => setDir(dir === 'RTL' ? 'LTR' : 'RTL')}>{dir}</Chip>
        <Chip onClick={() => setFit(f => f === 'width' ? 'height' : f === 'height' ? 'original' : 'width')}>fit {fit}</Chip>
        <Chip
          onClick={() => setZoom(z => stepZoom(z, -1))}
          title="zoom out (-)"
          style={{ opacity: zoom <= ZOOM_MIN ? 0.4 : 1 }}
        >−</Chip>
        <span className="sk-mono" style={{ fontSize: 11, color: 'var(--ink)', minWidth: 40, textAlign: 'center', cursor: 'pointer' }}
              onClick={() => setZoom(1)} title="reset zoom (0)">
          {Math.round(zoom * 100)}%
        </span>
        <Chip
          onClick={() => setZoom(z => stepZoom(z, +1))}
          title="zoom in (+)"
          style={{ opacity: zoom >= ZOOM_MAX ? 0.4 : 1 }}
        >+</Chip>
        <Icon glyph="★" onClick={() => { setToast('bookmark added (mock)'); setTimeout(()=>setToast(''),1500); }} />
        <Icon glyph="⌕" />
        <Icon glyph="⋯" />
      </div>

      <ReaderStage
        mode={mode} dir={dir} fitStyle={fitStyle} zoom={zoom}
        pages={pages} page={page}
      />

      {mode !== 'vertical' && mode !== 'horizontal' && (
        <>
          <div
            className="click-zone left"
            onClick={() => advance(dir === 'RTL' ? 1 : -1)}
          />
          <div
            className="click-zone right"
            onClick={() => advance(dir === 'RTL' ? -1 : 1)}
          />
        </>
      )}

      {chrome && (
        <div style={{ position: 'absolute', top: 56, right: 14, zIndex: 5 }}>
          <Note>chrome auto-hides after 2s</Note>
        </div>
      )}

      <div className="reader-chrome-bot">
        <Icon glyph="‹‹" onClick={() => goChapter(-1)} />
        <Icon glyph="‹"  onClick={() => advance(-1)} />
        <span className="sk-mono" style={{ fontSize: 10, color: 'var(--ink2)', minWidth: 48 }}>pg {page}</span>

        <div className="reader-slider" onClick={onSlider}>
          <div className="track" />
          <div className="fill" style={{ width: `${(page / Math.max(ch.page_count, 1)) * 100}%` }} />
          <div className="knob" style={{ left: `${(page / Math.max(ch.page_count, 1)) * 100}%` }} />
        </div>

        <span className="sk-mono" style={{ fontSize: 10, color: 'var(--ink2)', minWidth: 48, textAlign: 'right' }}>{ch.page_count} pg</span>
        <Icon glyph="›"  onClick={() => advance(1)} />
        <Icon glyph="››" onClick={() => goChapter(1)} />
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function ReaderStage({ mode, dir, fitStyle, pages, page, zoom = 1 }) {
  // When zoomed in past the viewport, allow panning by switching the stage's
  // overflow to auto and aligning content to the start so scroll can reach the top.
  const zoomedScroll = zoom > 1
    ? { overflow: 'auto', alignItems: 'flex-start', justifyContent: 'flex-start' }
    : null;

  if (mode === 'vertical') {
    return (
      <div className="reader-stage vertical">
        <div className="strip" style={{ width: `${600 * zoom}px` }}>
          {pages.map((src, i) => (
            <img key={i} className="page" src={src} alt={`page ${i + 1}`} loading="lazy" />
          ))}
        </div>
      </div>
    );
  }
  if (mode === 'horizontal') {
    const ordered = dir === 'RTL' ? pages.slice().reverse() : pages;
    return (
      <div className="reader-stage horizontal">
        <div className="strip">
          {ordered.map((src, i) => (
            <img
              key={i} className="page" src={src} alt={`page ${i + 1}`} loading="lazy"
              style={{ height: `${100 * zoom}%` }}
            />
          ))}
        </div>
      </div>
    );
  }
  if (mode === 'double') {
    const a = pages[page - 1];
    const b = pages[page] || null;
    const order = dir === 'RTL' ? [b, a] : [a, b];
    return (
      <div className="reader-stage double" style={zoomedScroll || undefined}>
        <div className="pair">
          {order.filter(Boolean).map((src, i) => (
            <img key={i} className="page" src={src} style={fitStyle} alt="page" />
          ))}
        </div>
      </div>
    );
  }
  // single
  return (
    <div className="reader-stage single" style={zoomedScroll || undefined}>
      <img className="page" src={pages[page - 1]} style={fitStyle} alt={`page ${page}`} />
    </div>
  );
}
