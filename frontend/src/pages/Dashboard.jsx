import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import AppBar from '../components/AppBar.jsx';
import { Chip, Cover, Bar } from '../components/Sketch.jsx';
import { api } from '../lib/api.js';

export default function Dashboard() {
  const [view, setView]   = useState('stats');  // 'timeline' | 'grid' | 'stats'
  const [stats, setStats] = useState(null);
  const [progress, setProgress] = useState([]);

  useEffect(() => {
    api.dashStats().then(setStats).catch(console.error);
    api.dashInProgress().then(r => setProgress(r.items)).catch(console.error);
  }, []);

  return (
    <div className="app-shell">
      <AppBar />
      <div style={{ padding: '18px 28px 6px', display: 'flex', alignItems: 'baseline', gap: 14 }}>
        <h1 style={{ fontFamily: 'var(--hand)', fontSize: 30, fontWeight: 700, margin: 0 }}>Your reading</h1>
        <div style={{ flex: 1 }} />
        <Chip on={view === 'timeline'} onClick={() => setView('timeline')}>timeline</Chip>
        <Chip on={view === 'grid'}     onClick={() => setView('grid')}>grid</Chip>
        <Chip on={view === 'stats'}    onClick={() => setView('stats')}>stats</Chip>
      </div>

      <StatsRow stats={stats} />

      {view === 'stats' && <StatsView stats={stats} progress={progress} />}
      {view === 'grid' && <GridView progress={progress} />}
      {view === 'timeline' && <TimelineView />}
    </div>
  );
}

function StatsRow({ stats }) {
  const items = [
    ['PAGES THIS MONTH', stats?.pages_month ?? '—', `${stats?.chapters_month ?? 0} chapters`],
    ['CHAPTERS',         stats?.chapters_month ?? '—', `last 30 d`],
    ['STREAK',           stats ? `${stats.streak_days} d` : '—', `longest ${stats?.longest_streak ?? 0}`],
    ['TIME',             stats ? `~${Math.round((stats.minutes_month||0)/60)}h ${(stats.minutes_month||0)%60}m` : '—', 'rough estimate'],
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, padding: '8px 28px' }}>
      {items.map(([l, v, s]) => (
        <div key={l} className="sk-box-soft" style={{ padding: 12 }}>
          <div className="sk-mono" style={{ fontSize: 10, color: 'var(--muted)' }}>{l}</div>
          <div style={{ fontFamily: 'var(--hand)', fontSize: 30, fontWeight: 700, lineHeight: 1.1 }}>{v}</div>
          <div className="sk-mono" style={{ fontSize: 10, color: 'var(--muted)' }}>{s}</div>
        </div>
      ))}
    </div>
  );
}

function StatsView({ stats, progress }) {
  const ppd = stats?.pages_per_day || [];
  const max = Math.max(1, ...ppd);
  return (
    <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18, padding: '10px 28px 22px', minHeight: 0 }}>
      <div className="sk-box-flat" style={{ overflow: 'auto' }}>
        <div style={{ padding: '10px 14px', borderBottom: '1px dashed var(--faint)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: 'var(--hand)', fontSize: 18, fontWeight: 700 }}>In progress</span>
          <div style={{ flex: 1 }} />
          <span className="sk-mono" style={{ fontSize: 10, color: 'var(--muted)' }}>sort: last opened ↓</span>
        </div>
        {progress.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--hand)' }}>
            nothing in progress yet — open a chapter to start tracking
          </div>
        )}
        {progress.map(p => (
          <Link key={p.chapter_id} to={`/read/${p.chapter_id}`} style={{ display: 'block' }}>
            <div style={{ display: 'flex', gap: 12, padding: '9px 14px', alignItems: 'center', borderBottom: '1px dashed var(--faint)' }}>
              <Cover w={32} h={44} tag="" />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--hand)', fontSize: 15, lineHeight: 1.1 }}>{p.title}</div>
                <div className="sk-mono" style={{ fontSize: 10, color: 'var(--muted)' }}>{p.chapter} · pg {p.page} / {p.page_count}</div>
              </div>
              <Bar pct={p.progress_pct} style={{ width: 90 }} />
              <span className="sk-mono" style={{ fontSize: 11, color: 'var(--accent)' }}>resume →</span>
            </div>
          </Link>
        ))}
      </div>

      <div className="sk-col">
        <div className="sk-box-soft" style={{ padding: 14 }}>
          <div className="sk-mono" style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 8 }}>PAGES · 30 DAYS</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 64 }}>
            {ppd.map((v, i) => (
              <div key={i} style={{
                flex: 1, height: `${(v / max) * 100}%`,
                background: v === max ? 'var(--accent)' : 'var(--ink2)',
                borderRadius: 1, minHeight: 2,
              }} />
            ))}
          </div>
          <div className="sk-mono" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>
            peak: {max} pg
          </div>
        </div>

        <div className="sk-box-soft" style={{ padding: 14 }}>
          <div className="sk-mono" style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 6 }}>BY TYPE</div>
          {(stats?.by_type || []).map(b => (
            <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '5px 0' }}>
              <span style={{ fontFamily: 'var(--hand)', fontSize: 13, width: 70 }}>{b.label}</span>
              <div style={{ flex: 1, height: 8, background: 'var(--panel)', border: '1px solid var(--faint)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${b.pct}%`, height: '100%', background: 'var(--accent)' }} />
              </div>
              <span className="sk-mono" style={{ fontSize: 10, color: 'var(--muted)', width: 30, textAlign: 'right' }}>{b.pct}%</span>
            </div>
          ))}
        </div>

        <div className="sk-box-soft" style={{ padding: 14 }}>
          <div className="sk-mono" style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 8 }}>RECENT FINISHES</div>
          {(stats?.recent_finishes || []).length === 0 && (
            <div style={{ fontFamily: 'var(--hand)', fontSize: 14, color: 'var(--muted)' }}>none yet</div>
          )}
          {(stats?.recent_finishes || []).map((f, i) => (
            <div key={i} style={{ fontFamily: 'var(--hand)', fontSize: 14, color: 'var(--ink2)' }}>
              ✓ {f.title} · {f.chapter}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function GridView({ progress }) {
  return (
    <div style={{ padding: '8px 28px 18px', flex: 1, overflow: 'auto', display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gridAutoRows: 'min-content', gap: 14 }}>
      {progress.map((p, i) => (
        <Link key={p.chapter_id} to={`/read/${p.chapter_id}`}>
          <div className="sk-box" style={{
            padding: 12, display: 'flex', flexDirection: 'column', gap: 8,
            background: i === 0 ? 'var(--accent-soft)' : 'var(--paper)',
            borderColor: i === 0 ? 'var(--accent)' : 'var(--ink)',
          }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <Cover w={52} h={72} tag={p.kind} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--hand)', fontSize: 17, lineHeight: 1.1, fontWeight: 700 }}>{p.title}</div>
                <div className="sk-mono" style={{ fontSize: 10, color: 'var(--ink2)' }}>{p.chapter} · pg {p.page} / {p.page_count}</div>
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 14, color: 'var(--accent)' }}>{p.progress_pct}%</div>
            </div>
            <Bar pct={p.progress_pct} />
          </div>
        </Link>
      ))}
      {!progress.length && (
        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40, color: 'var(--muted)', fontFamily: 'var(--hand)' }}>
          start reading something to see it here
        </div>
      )}
    </div>
  );
}

function TimelineView() {
  const [items, setItems] = useState([]);
  useEffect(() => { api.dashTimeline().then(r => setItems(r.items)).catch(console.error); }, []);
  return (
    <div style={{ padding: '8px 28px 22px', flex: 1, overflow: 'auto' }}>
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', left: 80, top: 0, bottom: 0, width: 1.5, background: 'var(--faint)' }} />
        {items.map((it, i) => {
          const when = it.at ? it.at.replace('T', ' ').slice(0, 16) : '—';
          return (
            <div key={i} style={{ display: 'flex', gap: 14, padding: '10px 0', alignItems: 'flex-start' }}>
              <div style={{ width: 80, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', paddingTop: 4 }}>
                {when}
              </div>
              <div style={{
                width: 14, height: 14, borderRadius: '50%', marginTop: 6,
                background: it.finished ? 'var(--ink)' : 'var(--accent)',
                border: '1.5px solid var(--ink)', position: 'relative', zIndex: 1,
              }} />
              <div style={{ flex: 1, display: 'flex', gap: 10, alignItems: 'center' }}>
                <Cover w={34} h={48} tag="" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--hand)', fontSize: 16, lineHeight: 1.1 }}>{it.title}</div>
                  <div className="sk-mono" style={{ fontSize: 10, color: 'var(--ink2)' }}>
                    {it.chapter} · pg {it.page} / {it.page_count}
                  </div>
                </div>
                <Link to={`/read/${it.chapter_id}`} className="sk-mono"
                  style={{ fontSize: 11, color: it.finished ? 'var(--muted)' : 'var(--accent)' }}>
                  {it.finished ? '✓ finished' : 'resume →'}
                </Link>
              </div>
            </div>
          );
        })}
        {!items.length && (
          <div style={{ textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--hand)', padding: 40 }}>
            no activity yet
          </div>
        )}
      </div>
    </div>
  );
}
