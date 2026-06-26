import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { CoverArt, IconBox, Mono, PrimaryButton, ProgressBar, SectionLabel, StateHost } from '../components/ui.jsx';
import { api } from '../lib/api.js';

/** Chapter+page to resume: an in-progress chapter, else first unfinished. */
function resumeTarget(series) {
  const asc = [...(series.chapters || [])].sort((a, b) => a.number_sort - b.number_sort);
  const inProgress = asc.find(
    (c) => c.progress_page >= 1 && c.progress_page < Math.max(c.page_count, 2) && !c.finished,
  );
  const firstUnfinished = asc.find((c) => !c.finished);
  const target = inProgress || firstUnfinished || asc[0];
  if (!target) return null;
  return { id: target.id, page: target.progress_page > 0 ? target.progress_page : 1 };
}

export default function Series() {
  const { id } = useParams();
  const nav = useNavigate();
  const [series, setSeries] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [ascending, setAscending] = useState(true);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      setSeries(await api.series(id));
      setStatus('ok');
    } catch (e) {
      setError(String(e.message || e));
      setStatus('error');
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const chapters = useMemo(() => {
    if (!series) return [];
    const sorted = [...series.chapters].sort((a, b) => a.number_sort - b.number_sort);
    return ascending ? sorted : sorted.reverse();
  }, [series, ascending]);

  return (
    <StateHost status={status} error={error} onRetry={load}>
      {series && (
        <div className="page-pad col" style={{ gap: 8 }}>
          <div className="row">
            <IconBox glyph="←" title="Back" onClick={() => nav('/')} />
            <span className="label">{series.kind}</span>
          </div>

          <div className="row" style={{ alignItems: 'flex-start', gap: 16, marginTop: 12 }}>
            <CoverArt
              title={series.title}
              kindTag={series.format || series.kind}
              coverUrl={series.cover_url}
              style={{ width: 120, aspectRatio: '2 / 3', flex: '0 0 auto' }}
            />
            <div className="col" style={{ gap: 8, flex: 1 }}>
              <h1 className="h2">{series.title}</h1>
              {series.author && <div style={{ color: 'var(--ink-3)' }}>{series.author}</div>}
              <div className="row" style={{ gap: 12 }}>
                <Mono size={12} color="var(--ink-3)">{series.chapter_count} ch</Mono>
                {series.unread_count > 0 && (
                  <Mono size={12} color="var(--ink-3)">{series.unread_count} unread</Mono>
                )}
              </div>
              {series.progress_pct > 0 && (
                <div className="col" style={{ gap: 6, maxWidth: 320 }}>
                  <ProgressBar pct={series.progress_pct} />
                  <Mono size={11} color="var(--accent)">{series.progress_pct}%</Mono>
                </div>
              )}
              {resumeTarget(series) && (
                <div>
                  <PrimaryButton
                    label={series.progress_pct > 0 ? 'Resume' : 'Read'}
                    glyph="▷"
                    onClick={() => {
                      const t = resumeTarget(series);
                      nav(`/read/${t.id}?page=${t.page}`);
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {series.description && (
            <p style={{ color: 'var(--ink-2)', lineHeight: 1.5, marginTop: 8 }}>{series.description}</p>
          )}

          <div className="spread" style={{ marginTop: 14 }}>
            <SectionLabel>Chapters</SectionLabel>
            <button type="button" className="chip" onClick={() => setAscending((a) => !a)}>
              ⇅ {ascending ? 'Oldest first' : 'Newest first'}
            </button>
          </div>

          <div className="col" style={{ gap: 8 }}>
            {chapters.map((ch) => (
              <ChapterRow
                key={ch.id}
                ch={ch}
                onClick={() => nav(`/read/${ch.id}?page=${ch.progress_page > 0 ? ch.progress_page : 1}`)}
              />
            ))}
          </div>
        </div>
      )}
    </StateHost>
  );
}

function ChapterRow({ ch, onClick }) {
  return (
    <div className="lrow" style={{ cursor: 'pointer' }} onClick={onClick}>
      <Mono size={12} weight={600} color="var(--ink-3)">{String(ch.number).padStart(2, '0')}</Mono>
      <div className="col" style={{ flex: 1 }}>
        <div style={{ color: 'var(--ink)', fontWeight: 600 }}>{ch.title || `Chapter ${ch.number}`}</div>
        {ch.page_count > 0 && <Mono size={10} color="var(--ink-4)">{ch.page_count} pages</Mono>}
      </div>
      {ch.finished ? (
        <span style={{ color: 'var(--ink-4)' }}>✓</span>
      ) : ch.progress_page > 0 ? (
        <Mono size={10} color="var(--accent)">p.{ch.progress_page}</Mono>
      ) : null}
    </div>
  );
}
