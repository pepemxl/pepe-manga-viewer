import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import AppBar from '../components/AppBar.jsx';
import { Cover, Btn, Chip, Bar, Lines } from '../components/Sketch.jsx';
import { api } from '../lib/api.js';

const KIND_TO_TAG = { manga: 'CBZ', manhwa: 'webtoon', comic: 'CBR', book: 'EPUB' };

function ChapterRow({ ch, onOpen }) {
  const state = ch.finished ? 'read' : (ch.progress_page > 0 ? 'current' : 'unread');
  const bg = state === 'current' ? 'var(--accent-soft)' : (state === 'read' ? 'var(--panel)' : 'var(--paper)');
  const pct = ch.page_count ? Math.round((ch.progress_page / ch.page_count) * 100) : 0;
  return (
    <div
      onClick={() => onOpen(ch.id)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '9px 12px',
        borderBottom: '1px dashed var(--faint)',
        background: bg, cursor: 'pointer',
      }}
    >
      <span style={{
        width: 14, height: 14, borderRadius: '50%',
        border: '1.5px solid var(--ink2)',
        background: state === 'read' ? 'var(--ink2)' : (state === 'current' ? 'var(--accent)' : 'var(--paper)'),
      }} />
      <span style={{ fontFamily: 'var(--mono)', fontSize: 11, width: 60 }}>{ch.number}</span>
      <span style={{ fontFamily: 'var(--hand)', fontSize: 15, flex: 1 }}>{ch.title || '—'}</span>
      {pct > 0 && pct < 100 && <Bar pct={pct} style={{ width: 60 }} />}
      <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', width: 70, textAlign: 'right' }}>
        {ch.page_count} pg
      </span>
      <span style={{
        fontFamily: 'var(--hand)', fontSize: 13,
        color: state === 'current' ? 'var(--accent)' : 'var(--muted)',
        width: 70, textAlign: 'right',
      }}>
        {state === 'current' ? 'resume →' : state === 'read' ? 're-read' : 'open →'}
      </span>
    </div>
  );
}

export default function Series() {
  const { id } = useParams();
  const nav = useNavigate();
  const [s, setS] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => { api.series(id).then(setS).catch(console.error); }, [id]);

  if (!s) return <div className="app-shell"><AppBar /><div style={{ padding: 40 }}>loading…</div></div>;

  const sorted = [...s.chapters].sort((a, b) => {
    const an = parseFloat(a.number.replace(/[^\d.]/g, '')) || 0;
    const bn = parseFloat(b.number.replace(/[^\d.]/g, '')) || 0;
    return bn - an;
  });
  const filtered = filter === 'unread'
    ? sorted.filter(c => !c.finished)
    : filter === 'bookmarked'
    ? sorted.filter(c => s.bookmarks.some(b => b.chapter_id === c.id))
    : sorted;

  // resume target: the in-progress chapter, else the first unread
  const resume = sorted.find(c => c.progress_page > 0 && !c.finished)
              || sorted.slice().reverse().find(c => !c.finished)
              || sorted[0];

  const tagTokens = (s.tags || '').split(',').map(t => t.trim()).filter(Boolean);

  return (
    <div className="app-shell">
      <AppBar />
      <div style={{ padding: '8px 24px', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>
        <Link to="/" style={{ color: 'var(--muted)' }}>← Library</Link>
        {' / '}<span style={{ color: 'var(--ink)' }}>{s.title}</span>
      </div>

      <div style={{ flex: 1, display: 'flex', gap: 24, padding: '4px 24px 20px', minHeight: 0 }}>
        <div style={{ width: 240, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Cover
            tag={KIND_TO_TAG[s.kind] || (s.format || '').toUpperCase()}
            w={240} h={340}
            progress={s.progress_pct}
            hideTitle
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {resume && (
              <Btn accent onClick={() => nav(`/read/${resume.id}`)}>
                ▶ resume {resume.number}
              </Btn>
            )}
            <div style={{ display: 'flex', gap: 6 }}>
              <Btn small>♡ shelf</Btn>
              <Btn small>↺ refresh</Btn>
              <Btn small>⋯</Btn>
            </div>
          </div>
          <div className="sk-mono" style={{ fontSize: 11, color: 'var(--ink2)', lineHeight: 1.6 }}>
            <div><span style={{ color: 'var(--muted)' }}>type</span>  {s.kind} {tagTokens.includes('seinen') ? '· seinen' : ''}</div>
            <div><span style={{ color: 'var(--muted)' }}>source</span> {s.source_path}</div>
            <div><span style={{ color: 'var(--muted)' }}>chapters</span> {s.chapter_count} · {s.unread_count} unread</div>
            <div><span style={{ color: 'var(--muted)' }}>added</span>  {s.added_at?.slice(0,10)}</div>
            <div><span style={{ color: 'var(--muted)' }}>last</span>   {s.last_read_at ? s.last_read_at.slice(0,16).replace('T', ' ') : '—'}</div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {tagTokens.map(t => <Chip key={t}>{t}</Chip>)}
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ fontFamily: 'var(--hand)', fontSize: 38, fontWeight: 700, lineHeight: 1 }}>{s.title}</div>
          <div style={{ fontFamily: 'var(--hand)', fontSize: 16, color: 'var(--ink2)', marginTop: 2 }}>
            {s.author ? `by ${s.author}` : ''}
          </div>
          {s.description && (
            <div style={{ marginTop: 10, maxWidth: 560, fontFamily: 'var(--hand)', fontSize: 15, color: 'var(--ink2)' }}>
              {s.description}
            </div>
          )}

          <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: 'var(--hand)', fontSize: 20, fontWeight: 700 }}>Chapters</span>
            <span className="sk-mono" style={{ fontSize: 10, color: 'var(--muted)' }}>
              {s.chapter_count} · {s.unread_count} unread
            </span>
            <div style={{ flex: 1 }} />
            <Chip on={filter === 'all'}        onClick={() => setFilter('all')}>all</Chip>
            <Chip on={filter === 'unread'}     onClick={() => setFilter('unread')}>unread</Chip>
            <Chip on={filter === 'bookmarked'} onClick={() => setFilter('bookmarked')}>bookmarked</Chip>
            <span className="sk-mono" style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 6 }}>↓ newest first</span>
          </div>

          <div className="sk-box-flat" style={{ marginTop: 8, flex: 1, overflow: 'auto' }}>
            {filtered.length === 0 && (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--hand)' }}>
                no chapters match this filter
              </div>
            )}
            {filtered.map(c => <ChapterRow key={c.id} ch={c} onOpen={cid => nav(`/read/${cid}`)} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
