import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { CoverArt, IconBox, Mono, ProgressBar, SectionLabel, StateHost } from '../components/ui.jsx';
import { api } from '../lib/api.js';

export default function Dashboard() {
  const nav = useNavigate();
  const [stats, setStats] = useState(null);
  const [inProgress, setInProgress] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const [s, ip] = await Promise.all([api.dashStats(), api.dashInProgress()]);
      setStats(s);
      setInProgress(ip.items || []);
      setStatus('ok');
    } catch (e) {
      setError(String(e.message || e));
      setStatus('error');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <StateHost status={status} error={error} onRetry={load}>
      {stats && (
        <div className="page-pad col" style={{ gap: 14 }}>
          <h1 className="h1">Reading</h1>

          <div className="row" style={{ gap: 12, alignItems: 'stretch' }}>
            <StatCard label="Pages" value={stats.pages_month} sub="this month" />
            <StatCard label="Chapters" value={stats.chapters_month} sub="finished" />
            <StatCard label="Streak" value={stats.streak_days} sub="days" />
          </div>

          {stats.pages_per_day?.length > 0 && (
            <div className="card">
              <SectionLabel>Pages / day (30d)</SectionLabel>
              <DayBars values={stats.pages_per_day} />
            </div>
          )}

          {inProgress.length > 0 && (
            <>
              <SectionLabel>Continue reading</SectionLabel>
              <div className="col" style={{ gap: 8 }}>
                {inProgress.map((it) => (
                  <InProgressRow
                    key={it.series_id}
                    item={it}
                    onOpen={() => nav(`/series/${it.series_id}`)}
                    onRead={() => nav(`/read/${it.chapter_id}?page=${Math.max(1, it.page)}`)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </StateHost>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div className="card" style={{ flex: 1 }}>
      <SectionLabel>{label}</SectionLabel>
      <div style={{ marginTop: 6 }}>
        <Mono size={26} weight={700} color="var(--ink)">{value}</Mono>
      </div>
      <Mono size={10} color="var(--ink-4)">{sub}</Mono>
    </div>
  );
}

function DayBars({ values }) {
  const days = values.slice(-30);
  const max = Math.max(1, ...days);
  return (
    <div className="row" style={{ height: 70, gap: 3, alignItems: 'flex-end', marginTop: 12 }}>
      {days.map((v, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: `${Math.max(2, (v / max) * 100)}%`,
            borderRadius: 2,
            background: v > 0 ? 'var(--accent)' : 'var(--line-2)',
          }}
        />
      ))}
    </div>
  );
}

function InProgressRow({ item, onOpen, onRead }) {
  return (
    <div className="lrow" style={{ cursor: 'pointer' }} onClick={onOpen}>
      <CoverArt
        title={item.title}
        kindTag={item.kind}
        style={{ width: 44, height: 60, flex: '0 0 auto' }}
      />
      <div className="col" style={{ flex: 1, gap: 4 }}>
        <div style={{ color: 'var(--ink)', fontWeight: 600 }}>{item.title}</div>
        <Mono size={10} color="var(--ink-3)">Ch. {item.chapter} · p.{item.page}/{item.page_count}</Mono>
        <ProgressBar pct={item.progress_pct} height={4} />
      </div>
      <IconBox
        glyph="▷"
        title="Resume"
        active
        onClick={(e) => { e.stopPropagation(); onRead(); }}
      />
    </div>
  );
}
