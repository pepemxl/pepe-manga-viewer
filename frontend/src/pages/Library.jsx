import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import AppBar from '../components/AppBar.jsx';
import { Cover, Chip, Btn } from '../components/Sketch.jsx';
import { api } from '../lib/api.js';

const KIND_TO_TAG = { manga: 'CBZ', manhwa: 'webtoon', comic: 'CBR', book: 'EPUB' };

export default function Library() {
  const [shelves, setShelves]         = useState([]);
  const [collections, setCollections] = useState([]);
  const [languages, setLanguages]     = useState([]);
  const [sources, setSources]         = useState([]);
  const [items, setItems]             = useState([]);
  const [shelf, setShelf]             = useState('All');
  const [collectionId, setCollectionId] = useState(null);
  const [language, setLanguage]       = useState(null);  // null = any
  const [sort, setSort]               = useState('recent');
  const [count, setCount]             = useState(0);
  const [newName, setNewName]         = useState('');
  const [adding, setAdding]           = useState(false);
  const [busy, setBusy]               = useState(false);
  const [error, setError]             = useState('');

  const refreshShelves     = () => api.shelves().then(r => setShelves(r.items)).catch(() => {});
  const refreshCollections = () => api.collections().then(r => setCollections(r.items)).catch(() => {});
  const refreshLanguages   = () => api.languages().then(r => setLanguages(r.items)).catch(() => {});

  useEffect(() => {
    refreshShelves();
    refreshCollections();
    refreshLanguages();
    api.sources().then(r => setSources(r.items)).catch(() => {});
  }, []);

  useEffect(() => {
    const base = collectionId ? { collection: collectionId } : { shelf };
    const params = { ...base, sort };
    if (language) params.language = language;
    api.library(params).then(r => {
      setItems(r.items);
      setCount(r.count);
    }).catch(err => console.error(err));
  }, [shelf, collectionId, language, sort]);

  const pickShelf = (name) => {
    setShelf(name);
    setCollectionId(null);
  };

  const pickCollection = (id) => {
    setCollectionId(id);
    setShelf('');
  };

  const pickLanguage = (name) => {
    setLanguage(prev => prev === name ? null : name);
  };

  const createCollection = async () => {
    const name = newName.trim();
    if (!name) { setError('name required'); return; }
    setBusy(true);
    setError('');
    try {
      const c = await api.createCollection(name);
      await refreshCollections();
      setNewName('');
      setAdding(false);
      pickCollection(c.id);
    } catch (e) {
      const msg = String(e.message || e);
      setError(msg.replace(/^.*"detail":\s*"([^"]+)".*$/, '$1'));
    } finally {
      setBusy(false);
    }
  };

  const removeCollection = async (c) => {
    if (!window.confirm(`Delete collection "${c.name}"?\n\nSeries inside it are NOT removed.`)) return;
    await api.deleteCollection(c.id).catch(() => {});
    if (collectionId === c.id) pickShelf('All');
    await refreshCollections();
  };

  const activeCollection = collections.find(c => c.id === collectionId);
  const headerTitle = activeCollection
    ? activeCollection.name
    : shelf === 'All' ? 'All series' : (shelf || 'All series');

  return (
    <div className="app-shell">
      <AppBar />
      <div className="page-body" style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <aside className="sidebar">
          <div>
            <div className="sidebar-h">SHELVES</div>
            <div className="sk-col" style={{ gap: 6 }}>
              {shelves.filter(s => s.kind === 'system').map(s => (
                <div
                  key={s.id}
                  className={`sidebar-item ${!collectionId && shelf.toLowerCase() === s.name.toLowerCase() ? 'on' : ''}`}
                  onClick={() => pickShelf(s.name)}
                >
                  <span>{s.name}</span>
                  <span className="count">{s.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="sidebar-h">COLLECTIONS</div>
            <div className="sk-col" style={{ gap: 4 }}>
              {collections.map(c => (
                <div
                  key={c.id}
                  className={`sidebar-item ${collectionId === c.id ? 'on' : ''}`}
                  onClick={() => pickCollection(c.id)}
                  onContextMenu={e => { e.preventDefault(); removeCollection(c); }}
                  title="right-click to delete"
                  style={{ display: 'flex', justifyContent: 'space-between' }}
                >
                  <span>▸ {c.name}</span>
                  <span className="count">{c.count}</span>
                </div>
              ))}
              {!collections.length && (
                <div style={{ fontFamily: 'var(--hand)', fontSize: 13, color: 'var(--muted)', padding: '2px 8px' }}>
                  none yet
                </div>
              )}
              {adding ? (
                <div style={{ display: 'flex', gap: 4, padding: '2px 4px' }}>
                  <input
                    autoFocus
                    value={newName}
                    onChange={e => { setNewName(e.target.value); setError(''); }}
                    onKeyDown={e => {
                      if (e.key === 'Enter')   createCollection();
                      if (e.key === 'Escape')  { setAdding(false); setNewName(''); setError(''); }
                    }}
                    placeholder="name…"
                    style={{
                      flex: 1, fontFamily: 'var(--hand)', fontSize: 14,
                      padding: '2px 6px', border: '1.25px solid var(--ink2)',
                      borderRadius: 4, background: 'var(--paper)', color: 'var(--ink)',
                    }}
                  />
                  <Btn small onClick={createCollection} disabled={busy}>add</Btn>
                </div>
              ) : (
                <div
                  style={{ fontFamily: 'var(--hand)', fontSize: 14, color: 'var(--muted)', padding: '2px 8px', cursor: 'pointer' }}
                  onClick={() => setAdding(true)}
                >
                  + new collection
                </div>
              )}
              {error && (
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--accent)', padding: '2px 8px' }}>
                  ✕ {error}
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="sidebar-h">LANGUAGES</div>
            <div className="sk-col" style={{ gap: 4 }}>
              {!languages.length && (
                <div style={{ fontFamily: 'var(--hand)', fontSize: 13, color: 'var(--muted)', padding: '2px 8px' }}>
                  none detected
                </div>
              )}
              {languages.map(l => (
                <div
                  key={l.name}
                  className={`sidebar-item ${language === l.name ? 'on' : ''}`}
                  onClick={() => pickLanguage(l.name)}
                  title={language === l.name ? 'click to clear' : `show only ${l.name}`}
                  style={{ display: 'flex', justifyContent: 'space-between' }}
                >
                  <span>{l.name}</span>
                  <span className="count">{l.count}</span>
                </div>
              ))}
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
            <h1 style={{ fontFamily: 'var(--hand)', fontSize: 30, fontWeight: 700, margin: 0 }}>{headerTitle}</h1>
            <span className="sk-mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
              {count} items{activeCollection ? ' · collection' : ` · ${sources.length} sources`}
            </span>
            {language && (
              <Chip on accent onClick={() => setLanguage(null)} title="clear language filter">
                {language} ✕
              </Chip>
            )}
            <div style={{ flex: 1 }} />
            <Chip on={sort === 'title'}    onClick={() => setSort('title')}>title</Chip>
            <Chip on={sort === 'recent'}   onClick={() => setSort('recent')}>recent</Chip>
            <Chip on={sort === 'progress'} onClick={() => setSort('progress')}>progress</Chip>
          </div>

          {items.length === 0 && (
            <div className="sk-box-dashed" style={{ padding: 36, textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--hand)', fontSize: 22 }}>
                {activeCollection
                  ? `“${activeCollection.name}” is empty`
                  : 'Your library is empty.'}
              </div>
              <div style={{ marginTop: 12, fontFamily: 'var(--hand)', fontSize: 14, color: 'var(--muted)' }}>
                {activeCollection
                  ? 'Open a series and click a collection chip to add it.'
                  : ''}
              </div>
              <div style={{ marginTop: 12 }}>
                {!activeCollection && <Link to="/import"><Btn primary>＋ add folder</Btn></Link>}
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
                  {s.kind}{s.language ? ` · ${s.language}` : ''} · {s.chapter_count} ch{s.unread_count ? ` · ${s.unread_count} unread` : ''}
                </div>
              </Link>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
