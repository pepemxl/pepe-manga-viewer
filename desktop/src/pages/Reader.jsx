import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { IconBox, Mono, SectionLabel, Segmented } from '../components/ui.jsx';
import { api, pageUrl } from '../lib/api.js';
import { DIRECTIONS, FITS, MODES, isContinuous, normalizeDir } from '../lib/reader.js';
import { useSettings } from '../lib/settings.jsx';

const HIDE_MS = 2800;

/** Double-spread slot indices (0-based, -1 = blank), ported from ReaderScreen.kt. */
function spreadIndices(page, total, rtl) {
  if (page <= 1) return [-1, 0];
  const base = page % 2 === 0 ? page : page - 1;   // 1-based first of the pair
  const a = base - 1;
  const b = base + 1 <= total ? base : -1;
  return rtl ? [b, a] : [a, b];
}

export default function Reader() {
  const { chId } = useParams();
  const [sp] = useSearchParams();
  const startPage = Math.max(1, parseInt(sp.get('page') || '1', 10) || 1);
  const nav = useNavigate();
  const { settings } = useSettings();

  const [ch, setCh] = useState(null);
  const [neighbors, setNeighbors] = useState({ prev: null, next: null });
  const [page, setPage] = useState(startPage);
  const [mode, setMode] = useState(settings.defaultMode);
  const [dir, setDir] = useState(settings.defaultDirection);
  const [fit, setFit] = useState(settings.defaultFit);
  const [chrome, setChrome] = useState(true);
  const [panel, setPanel] = useState(false);
  const [toast, setToast] = useState('');

  const idle = useRef(null);
  const skipCfgSave = useRef(false);
  const cfgTimer = useRef(null);
  const progTimer = useRef(null);

  // ── load chapter (+ neighbors), then resolve mode/dir/fit ──────────────
  useEffect(() => {
    let cancel = false;
    setCh(null);
    (async () => {
      const info = await api.readerChapter(chId);
      if (cancel) return;
      setCh(info);
      setPage(Math.max(1, Math.min(startPage, info.page_count || 1)));

      const seriesMode = info.reading_mode
        || ((info.direction === 'vert' || info.kind === 'manhwa') ? 'vertical' : null);
      skipCfgSave.current = true;
      setMode(seriesMode || settings.defaultMode || 'single');
      setDir(info.direction && info.direction !== 'vert'
        ? normalizeDir(info.direction)
        : (settings.defaultDirection || 'RTL'));
      setFit(info.fit || settings.defaultFit || 'height');

      try {
        const nb = await api.neighbors(info.series_id, info.id);
        if (!cancel) setNeighbors(nb);
      } catch { /* neighbors optional */ }
    })().catch((e) => !cancel && setToast(String(e.message || e)));
    return () => { cancel = true; };
  }, [chId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── persist per-series reader config (debounced; skip first post-load) ──
  useEffect(() => {
    if (!ch) return;
    if (skipCfgSave.current) { skipCfgSave.current = false; return; }
    clearTimeout(cfgTimer.current);
    cfgTimer.current = setTimeout(() => {
      api.setReaderConfig(ch.series_id, { reading_mode: mode, direction: dir, fit }).catch(() => {});
    }, 400);
    return () => clearTimeout(cfgTimer.current);
  }, [ch, mode, dir, fit]);

  // ── report progress (debounced) ────────────────────────────────────────
  useEffect(() => {
    if (!ch) return;
    clearTimeout(progTimer.current);
    progTimer.current = setTimeout(() => {
      api.progress(ch.id, page, page >= ch.page_count).catch(() => {});
    }, 450);
    return () => clearTimeout(progTimer.current);
  }, [ch, page]);

  // ── chrome auto-hide ────────────────────────────────────────────────────
  const bump = useCallback(() => {
    setChrome(true);
    clearTimeout(idle.current);
    idle.current = setTimeout(() => setChrome(false), HIDE_MS);
  }, []);
  useEffect(() => { bump(); return () => clearTimeout(idle.current); }, [bump]);
  // don't auto-hide while the settings panel is open
  useEffect(() => { if (panel) { setChrome(true); clearTimeout(idle.current); } }, [panel]);

  const total = ch?.page_count || 1;

  const goTo = useCallback((p) => {
    setPage((cur) => {
      const clamped = Math.max(1, Math.min(p, total));
      return clamped === cur ? cur : clamped;
    });
  }, [total]);

  const advance = useCallback((delta) => {
    const step = mode === 'double' ? 2 : 1;
    setPage((p) => {
      const target = p + delta * step;
      if (target < 1) { if (neighbors.prev) nav(`/read/${neighbors.prev}`); return 1; }
      if (target > total) { if (neighbors.next) nav(`/read/${neighbors.next}`); return total; }
      return target;
    });
    bump();
  }, [mode, neighbors, total, nav, bump]);

  const goChapter = useCallback((delta) => {
    const t = delta < 0 ? neighbors.prev : neighbors.next;
    if (t) nav(`/read/${t}`);
  }, [neighbors, nav]);

  // ── keyboard + mouse ────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      bump();
      const rtl = dir === 'RTL';
      switch (e.key) {
        case 'ArrowLeft':  e.preventDefault(); e.shiftKey ? goChapter(-1) : advance(rtl ? 1 : -1); break;
        case 'ArrowRight': e.preventDefault(); e.shiftKey ? goChapter(1)  : advance(rtl ? -1 : 1); break;
        case ' ':          e.preventDefault(); advance(1); break;
        case 'Escape':     nav(ch ? `/series/${ch.series_id}` : '/'); break;
        case 'm': case 'M': setMode((m) => MODES[(MODES.findIndex((x) => x.key === m) + 1) % MODES.length].key); break;
        case 'f': case 'F':
          if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
          else document.exitFullscreen?.();
          break;
        case 'b': case 'B': setToast('bookmark added'); setTimeout(() => setToast(''), 1400); break;
        default: break;
      }
    };
    const onMove = () => bump();
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousemove', onMove);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('mousemove', onMove); };
  }, [advance, goChapter, dir, ch, nav, bump]);

  const pages = useMemo(
    () => (ch ? Array.from({ length: ch.page_count }, (_, i) => pageUrl(ch.id, i)) : []),
    [ch],
  );

  if (!ch) {
    return <div className="reader"><div className="state">loading chapter…</div></div>;
  }

  const cont = isContinuous(mode);
  const indicator = cont
    ? `${Math.round((page * 100) / Math.max(total, 1))}%`
    : `${page} / ${total}`;

  return (
    <div className={`reader${chrome ? '' : ' hide'}`}>
      <Stage mode={mode} dir={dir} fit={fit} pages={pages} page={page} onPage={goTo} onTap={() => setChrome((c) => !c)} />

      {/* paging tap zones (paged modes only) */}
      {!cont && (
        <>
          <div className="tap-zone" style={{ left: 0, width: '34%' }}
               onClick={() => advance(dir === 'RTL' ? 1 : -1)} />
          <div className="tap-zone" style={{ left: '34%', width: '32%' }}
               onClick={() => setChrome((c) => !c)} />
          <div className="tap-zone" style={{ right: 0, width: '34%' }}
               onClick={() => advance(dir === 'RTL' ? -1 : 1)} />
        </>
      )}

      {/* top chrome */}
      <div className="chrome top">
        <IconBox glyph="←" title="Back" onClick={() => nav(`/series/${ch.series_id}`)} />
        <div className="col" style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {ch.title || `Chapter ${ch.number}`}
          </div>
          <Mono size={11} color="var(--ink-3)">Ch. {ch.number}</Mono>
        </div>
        <span className="pill">{indicator}</span>
        <IconBox glyph="⚙" title="Reading settings" active={panel} onClick={() => { setPanel((p) => !p); bump(); }} />
      </div>

      {/* settings panel */}
      {panel && chrome && (
        <div className="reader-settings">
          <div className="col" style={{ gap: 8 }}>
            <SectionLabel>Reading mode</SectionLabel>
            <div className="mode-grid">
              {MODES.map((m) => (
                <button key={m.key} type="button"
                        className={`mode-tile${mode === m.key ? ' on' : ''}`}
                        onClick={() => setMode(m.key)}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <div className="col" style={{ gap: 8 }}>
            <SectionLabel>Direction</SectionLabel>
            <Segmented
              options={DIRECTIONS.map((d) => ({ value: d.key, label: d.label, glyph: d.glyph }))}
              value={dir} onChange={setDir} />
          </div>
          <div className="col" style={{ gap: 8 }}>
            <SectionLabel>Fit</SectionLabel>
            <Segmented
              options={FITS.map((f) => ({ value: f.key, label: f.label, glyph: f.glyph }))}
              value={fit} onChange={setFit} />
          </div>
        </div>
      )}

      {/* bottom chrome */}
      <div className="chrome bot">
        <IconBox glyph="‹‹" title="Previous chapter" onClick={() => goChapter(-1)} />
        <input
          className="slider"
          type="range"
          min={1}
          max={Math.max(total, 1)}
          value={page}
          onChange={(e) => goTo(parseInt(e.target.value, 10))}
        />
        <Mono size={12} color="var(--ink-2)">{page} / {total}</Mono>
        <IconBox glyph="››" title="Next chapter" onClick={() => goChapter(1)} />
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function fitStyle(fit) {
  if (fit === 'width')  return { width: '100%', height: 'auto' };
  if (fit === 'height') return { height: '100%', width: 'auto' };
  return { maxWidth: 'none', maxHeight: 'none' }; // original
}

function Stage({ mode, dir, fit, pages, page, onPage, onTap }) {
  const rtl = dir === 'RTL';
  const scrollRef = useRef(null);

  // continuous modes: report page from scroll + scroll to page on scrub
  useEffect(() => {
    if (mode !== 'vertical' && mode !== 'horizontal') return;
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const kids = el.querySelectorAll('img.page');
      if (!kids.length) return;
      const vertical = mode === 'vertical';
      let idx = 0;
      for (let i = 0; i < kids.length; i++) {
        const r = kids[i].getBoundingClientRect();
        const pos = vertical ? r.top : r.left;
        if (pos <= (vertical ? window.innerHeight : window.innerWidth) * 0.4) idx = i;
      }
      onPage(idx + 1);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [mode, onPage]);

  // scrub → scroll
  useEffect(() => {
    if (mode !== 'vertical' && mode !== 'horizontal') return;
    const el = scrollRef.current;
    const target = el?.querySelectorAll('img.page')[page - 1];
    if (target) target.scrollIntoView({ block: 'start', inline: 'start' });
  }, [page, mode]);

  if (mode === 'vertical') {
    return (
      <div className="reader-stage vertical" ref={scrollRef} onClick={onTap}>
        <div className="strip" style={{ width: 720, maxWidth: '100%' }}>
          {pages.map((src, i) => <img key={i} className="page" src={src} alt={`page ${i + 1}`} loading="lazy" />)}
        </div>
      </div>
    );
  }
  if (mode === 'horizontal') {
    const ordered = rtl ? pages.map((_, i) => pages[pages.length - 1 - i]) : pages;
    return (
      <div className="reader-stage horizontal" ref={scrollRef} onClick={onTap}>
        <div className="strip">
          {ordered.map((src, i) => <img key={i} className="page" src={src} alt={`page ${i + 1}`} loading="lazy" />)}
        </div>
      </div>
    );
  }
  if (mode === 'double') {
    const [l, r] = spreadIndices(page, pages.length, rtl);
    return (
      <div className="reader-stage double">
        <div className="pair">
          {[l, r].map((idx, i) =>
            idx >= 0 && pages[idx]
              ? <img key={i} className="page" src={pages[idx]} style={fitStyle(fit)} alt={`page ${idx + 1}`} />
              : <div key={i} style={{ flex: 1 }} />,
          )}
        </div>
      </div>
    );
  }
  // single
  return (
    <div className="reader-stage single">
      <img className="page" src={pages[page - 1]} style={fitStyle(fit)} alt={`page ${page}`} />
    </div>
  );
}
