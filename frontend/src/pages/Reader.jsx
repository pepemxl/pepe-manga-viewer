import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Chip, Icon, Note } from '../components/Sketch.jsx';
import { api } from '../lib/api.js';

const MODES = ['single', 'double', 'vertical', 'horizontal'];

function nextMode(m) { return MODES[(MODES.indexOf(m) + 1) % MODES.length]; }

export default function Reader() {
  const { chId } = useParams();
  const nav = useNavigate();

  const [ch,         setCh]         = useState(null);
  const [neighbors,  setNeighbors]  = useState({ prev: null, next: null, index: 0, total: 0 });
  const [page,       setPage]       = useState(1);      // 1-indexed
  const [mode,       setMode]       = useState('single');
  const [dir,        setDir]        = useState('RTL');
  const [fit,        setFit]        = useState('height');
  const [chrome,     setChrome]     = useState(true);
  const [toast,      setToast]      = useState('');

  const idleTimer = useRef(null);
  const stageRef  = useRef(null);

  // load chapter
  useEffect(() => {
    let cancel = false;
    (async () => {
      const info = await api.readerChapter(chId);
      if (cancel) return;
      setCh(info);
      setPage(Math.max(1, info.current_page || 1));
      if (info.direction) setDir(info.direction === 'vert' ? 'RTL' : info.direction);
      if (info.kind === 'manhwa') setMode('vertical');
      const nb = await api.neighbors(info.series_id, info.id);
      if (!cancel) setNeighbors(nb);
    })().catch(console.error);
    return () => { cancel = true; };
  }, [chId]);

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
    ? { width: '100%',  height: 'auto' }
    : fit === 'height'
    ? { height: '100%', width: 'auto' }
    : {};  // original

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
        <Chip on onClick={() => setMode(nextMode)}>{mode}</Chip>
        <Chip onClick={() => setDir(dir === 'RTL' ? 'LTR' : 'RTL')}>{dir}</Chip>
        <Chip onClick={() => setFit(f => f === 'width' ? 'height' : f === 'height' ? 'original' : 'width')}>fit {fit}</Chip>
        <Icon glyph="★" onClick={() => { setToast('bookmark added (mock)'); setTimeout(()=>setToast(''),1500); }} />
        <Icon glyph="⌕" />
        <Icon glyph="⋯" />
      </div>

      <ReaderStage
        mode={mode} dir={dir} fitStyle={fitStyle}
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

function ReaderStage({ mode, dir, fitStyle, pages, page }) {
  if (mode === 'vertical') {
    return (
      <div className="reader-stage vertical">
        <div className="strip">
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
            <img key={i} className="page" src={src} alt={`page ${i + 1}`} loading="lazy" />
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
      <div className="reader-stage double">
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
    <div className="reader-stage single">
      <img className="page" src={pages[page - 1]} style={fitStyle} alt={`page ${page}`} />
    </div>
  );
}
