import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { CoverArt, Chip, Mono, PrimaryButton, StateHost } from '../components/ui.jsx';
import { api } from '../lib/api.js';

const SHELVES = [
  ['all', 'All series'],
  ['reading', 'Currently Reading'],
  ['want', 'Want to Read'],
  ['finished', 'Finished'],
];
const TYPES = [
  ['all', 'All'], ['manga', 'Manga'], ['manhwa', 'Manhwa'], ['book', 'Books'], ['comic', 'Comics'],
];

export default function Library() {
  const nav = useNavigate();
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [shelf, setShelf] = useState('all');
  const [type, setType] = useState('all');
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const res = await api.library({
        shelf: shelf === 'all' ? undefined : shelf,
        kind: type === 'all' ? undefined : type,
      });
      setItems(res.items || []);
      setStatus('ok');
    } catch (e) {
      setError(String(e.message || e));
      setStatus('error');
    }
  }, [shelf, type]);

  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (s) => s.title?.toLowerCase().includes(q) || s.author?.toLowerCase().includes(q),
    );
  }, [items, query]);

  return (
    <div className="page-pad col" style={{ gap: 14 }}>
      <div className="spread">
        <h1 className="h1">Home</h1>
        <PrimaryButton label="Add" glyph="＋" onClick={() => nav('/add')} />
      </div>

      <input
        className="field"
        placeholder="Search library…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="scroll-x">
        {SHELVES.map(([key, label]) => (
          <Chip key={key} label={label} on={shelf === key} onClick={() => setShelf(key)} />
        ))}
      </div>
      <div className="scroll-x">
        {TYPES.map(([key, label]) => (
          <Chip key={key} label={label} on={type === key} onClick={() => setType(key)} />
        ))}
      </div>

      <StateHost
        status={status}
        error={error}
        onRetry={load}
        isEmpty={status === 'ok' && visible.length === 0}
        emptyText="No series here yet"
      >
        <div className="grid">
          {visible.map((s) => (
            <SeriesCard key={s.id} series={s} onClick={() => nav(`/series/${s.id}`)} />
          ))}
        </div>
      </StateHost>
    </div>
  );
}

function SeriesCard({ series, onClick }) {
  const meta = [series.kind, series.language, `${series.chapter_count} ch`]
    .filter(Boolean)
    .join(' · ');
  return (
    <div className="series-card" style={{ cursor: 'pointer' }} onClick={onClick}>
      <CoverArt
        title={series.title}
        kindTag={series.format || series.kind}
        coverUrl={series.cover_url}
        progressPct={series.progress_pct}
        style={{ aspectRatio: '2 / 3' }}
      />
      <div className="title">{series.title}</div>
      <div className="spread">
        <div className="meta">{meta}</div>
        {series.progress_pct > 0 && series.progress_pct <= 100 && (
          <Mono size={10} weight={600} color="var(--accent)">{series.progress_pct}%</Mono>
        )}
      </div>
    </div>
  );
}
