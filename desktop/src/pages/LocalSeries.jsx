import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { CoverArt, IconBox, Mono, PrimaryButton, SectionLabel } from '../components/ui.jsx';
import { getLocalSeries, localCover, localReadId, removeLocalSeries } from '../lib/locallib.js';
import { useSettings } from '../lib/settings.jsx';

export default function LocalSeries() {
  const { id } = useParams();
  const nav = useNavigate();
  const { settings } = useSettings();
  const series = useMemo(() => getLocalSeries(decodeURIComponent(id)), [id]);
  const [confirm, setConfirm] = useState(false);

  if (!series) {
    return (
      <div className="page-pad col" style={{ gap: 12 }}>
        <div className="row"><IconBox glyph="←" title="Back" onClick={() => nav('/local')} /></div>
        <div className="state">This local series is no longer available.</div>
      </div>
    );
  }

  async function remove() {
    await removeLocalSeries(settings.storageRoot, series.id);
    nav('/local');
  }

  return (
    <div className="page-pad col" style={{ gap: 8 }}>
      <div className="row">
        <IconBox glyph="←" title="Back" onClick={() => nav('/local')} />
        <span className="label">local</span>
      </div>

      <div className="row" style={{ alignItems: 'flex-start', gap: 16, marginTop: 12 }}>
        <CoverArt title={series.title} kindTag="local" coverUrl={localCover(series)}
                  style={{ width: 120, aspectRatio: '2 / 3', flex: '0 0 auto' }} />
        <div className="col" style={{ gap: 8, flex: 1 }}>
          <h1 className="h2">{series.title}</h1>
          <Mono size={12} color="var(--ink-3)">{series.chapters.length} chapters · stored locally</Mono>
          <div className="row" style={{ gap: 8 }}>
            {series.chapters[0] && (
              <PrimaryButton label="Read" glyph="▷"
                onClick={() => nav(`/read/${encodeURIComponent(localReadId(series.id, series.chapters[0].id))}`)} />
            )}
            {confirm
              ? <PrimaryButton label="Confirm delete" primary={false} onClick={remove} />
              : <PrimaryButton label="Remove" primary={false} onClick={() => setConfirm(true)} />}
          </div>
        </div>
      </div>

      <SectionLabel>Chapters</SectionLabel>
      <div className="col" style={{ gap: 8 }}>
        {series.chapters.map((ch) => (
          <div key={ch.id} className="lrow" style={{ cursor: 'pointer' }}
               onClick={() => nav(`/read/${encodeURIComponent(localReadId(series.id, ch.id))}`)}>
            <div className="col" style={{ flex: 1 }}>
              <div style={{ color: 'var(--ink)', fontWeight: 600 }}>{ch.title || ch.number}</div>
              <Mono size={10} color="var(--ink-4)">{(ch.pages || []).length} pages</Mono>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
