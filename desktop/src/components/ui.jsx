import { absoluteUrl } from '../lib/api.js';

// Small presentational primitives ported from android_native ui/components/*.

export function SectionLabel({ children }) {
  return <div className="label">{children}</div>;
}

export function Mono({ children, size = 12, weight = 500, color, style }) {
  return (
    <span className="mono" style={{ fontSize: size, fontWeight: weight, color, ...style }}>
      {children}
    </span>
  );
}

export function ProgressBar({ pct = 0, height = 6 }) {
  return (
    <div className="bar" style={{ height }}>
      <i style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  );
}

export function IconBox({ glyph, title, onClick, active = false }) {
  return (
    <button type="button" className={`iconbox${active ? ' on' : ''}`} title={title} onClick={onClick}>
      {glyph}
    </button>
  );
}

export function PrimaryButton({ label, glyph, onClick, primary = true }) {
  return (
    <button type="button" className={`btn${primary ? ' btn-primary' : ''}`} onClick={onClick}>
      {glyph && <span>{glyph}</span>}
      {label}
    </button>
  );
}

export function Chip({ label, on, onClick }) {
  return (
    <button type="button" className={`chip${on ? ' on' : ''}`} onClick={onClick}>
      {label}
    </button>
  );
}

/** Segmented control. `options`: [{ value, label, glyph }]. */
export function Segmented({ options, value, onChange }) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          className={value === o.value ? 'on' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.glyph && <span aria-hidden>{o.glyph}</span>}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function CoverArt({ title, kindTag, coverUrl, progressPct = 0, style }) {
  const src = coverUrl ? absoluteUrl(coverUrl) : null;
  return (
    <div className="cover" style={style}>
      {src ? (
        <img src={src} alt={title} loading="lazy" />
      ) : (
        <div className="ph">{title}</div>
      )}
      {kindTag && <span className="tag">{kindTag}</span>}
      {progressPct > 0 && progressPct <= 100 && (
        <div className="cprog"><i style={{ width: `${progressPct}%` }} /></div>
      )}
    </div>
  );
}

/** Loading / error / empty wrapper around an async value. */
export function StateHost({ status, error, onRetry, isEmpty, emptyText = 'Nothing here yet', children }) {
  if (status === 'loading') return <div className="state">Loading…</div>;
  if (status === 'error') {
    return (
      <div className="state">
        <div>Couldn’t reach the server.</div>
        <Mono size={12} color="var(--ink-4)">{error}</Mono>
        {onRetry && <button type="button" className="btn" onClick={onRetry}>Retry</button>}
      </div>
    );
  }
  if (isEmpty) return <div className="state">{emptyText}</div>;
  return children;
}
