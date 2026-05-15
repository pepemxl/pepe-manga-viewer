import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import AppBar from '../components/AppBar.jsx';
import { Cover, Chip, Btn } from '../components/Sketch.jsx';
import { api } from '../lib/api.js';

const KIND_TO_TAG = { manga: 'CBZ', manhwa: 'webtoon', comic: 'CBR', book: 'EPUB' };

export default function Library() {
  const [shelves, setShelves] = useState([]);
  const [sources, setSources] = useState([]);
  const [items, setItems]     = useState([]);
  const [shelf, setShelf]     = useState('All');
  const [sort, setSort]       = useState('recent');
  const [count, setCount]     = useState(0);

  useEffect(() => {
    api.shelves().then(r => setShelves(r.items)).catch(() => {});
    api.sources().then(r => setSources(r.items)).catch(() => {});
  }, []);

  useEffect(() => {
    api.library({ shelf, sort }).then(r => {
      setItems(r.items);
      setCount(r.count);
    }).catch(err => console.error(err));
  }, [shelf, sort]);

  const systemShelves   = shelves.filter(s => s.kind === 'system');
  const collections     = shelves.filter(s => s.kind === 'collection');

  return (
    <div className="app-shell">
      <AppBar />
      <div className="page-body" style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <aside className="sidebar">
          <div>
            <div className="sidebar-h">SHELVES</div>
            <div className="sk-col" style={{ gap: 6 }}>
              {systemShelves.map(s => (
                <div
                  key={s.id}
                  className={`sidebar-item ${shelf.toLowerCase() === s.name.toLowerCase() ? 'on' : ''}`}
                  onClick={() => setShelf(s.name)}
                >
                  <span>{s.name}</span>
                  <span className="count">{s.count}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="sidebar-h">COLLECTIONS</div>
            <div className="sk-col" style={{ gap: 6 }}>
              {collections.map(s => (
                <div key={s.id} style={{ fontFamily: 'var(--hand)', fontSize: 15, color: 'var(--ink2)', padding: '2px 8px' }}>
                  ▸ {s.name}
                </div>
              ))}
              <div style={{ fontFamily: 'var(--hand)', fontSize: 14, color: 'var(--muted)', padding: '2px 8px' }}>+ new collection</div>
            </div>
          </div>
          <div>
            <div className="sidebar-h">FOLDERS</div>
            <div className="sk-col" style={{ gap: 4 }}>
              {sources.map(s => (
                <div key={s.id} style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink2)' }}>{s.path}</div>
              ))}
            </div>
            <div style={{ marginTop: 8 }}>
              <Link to="/import"><Btn small>＋ add folder</Btn></Link>
            </div>
          </div>
        </aside>

        <main style={{ flex: 1, padding: '18px 24px', overflow: 'auto', minHeight: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 14 }}>
            <h1 style={{ fontFamily: 'var(--hand)', fontSize: 30, fontWeight: 700, margin: 0 }}>
              {shelf === 'All' ? 'All series' : shelf}
            </h1>
            <span className="sk-mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
              {count} items · {sources.length} sources
            </span>
            <div style={{ flex: 1 }} />
            <Chip on={sort === 'title'}    onClick={() => setSort('title')}>title</Chip>
            <Chip on={sort === 'recent'}   onClick={() => setSort('recent')}>recent</Chip>
            <Chip on={sort === 'progress'} onClick={() => setSort('progress')}>progress</Chip>
          </div>

          {items.length === 0 && (
            <div className="sk-box-dashed" style={{ padding: 36, textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--hand)', fontSize: 22 }}>Your library is empty.</div>
              <div style={{ marginTop: 12 }}>
                <Link to="/import"><Btn primary>＋ add folder</Btn></Link>
              </div>
            </div>
          )}

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: '22px 18px',
          }}>
            {items.map(s => (
              <Link key={s.id} to={`/series/${s.id}`} style={{ display: 'block' }}>
                <Cover
                  tag={KIND_TO_TAG[s.kind] || (s.format || '').toUpperCase()}
                  w="100%"
                  h={180}
                  progress={s.progress_pct}
                  hideTitle
                />
                <div style={{ fontFamily: 'var(--hand)', fontSize: 13, marginTop: 5, lineHeight: 1.15 }}>{s.title}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)', marginTop: 1 }}>
                  {s.kind} · {s.chapter_count} ch{s.unread_count ? ` · ${s.unread_count} unread` : ''}
                </div>
              </Link>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
