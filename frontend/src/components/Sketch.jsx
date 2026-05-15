// Ported wireframe primitives — Cover, Btn, Chip, Bar, Note, Icon, Squiggle, Lines.

export const Cover = ({ title, tag, w, h, progress, style, src, hideTitle }) => (
  <div className="sk-cover" style={{ width: w, height: h, ...style }}>
    {src && <img src={src} alt={title || ''} />}
    {title && !hideTitle && !src && <div className="sk-cover-title">{title}</div>}
    {tag && <div className="sk-cover-tag">{tag}</div>}
    {progress != null && (
      <div className="sk-cover-progress"><i style={{ width: `${progress}%` }} /></div>
    )}
  </div>
);

export const Btn = ({ children, primary, accent, small, onClick, style, type = 'button', disabled }) => {
  const cls = ['sk-btn'];
  if (primary) cls.push('sk-btn-primary');
  if (accent)  cls.push('sk-btn-accent');
  if (small)   cls.push('sk-btn-small');
  return (
    <button className={cls.join(' ')} onClick={onClick} style={style} type={type} disabled={disabled}>
      {children}
    </button>
  );
};

export const Chip = ({ children, on, accent, onClick }) => {
  const cls = ['sk-chip'];
  if (on)     cls.push('sk-chip-on');
  if (accent) cls.push('sk-chip-accent');
  return (
    <span className={cls.join(' ')} onClick={onClick}>{children}</span>
  );
};

export const Bar = ({ pct, style }) => (
  <div className="sk-bar" style={style}><i style={{ width: `${pct}%` }} /></div>
);

export const Note = ({ children, style }) => (
  <span className="sk-note" style={style}>↳ {children}</span>
);

export const Icon = ({ glyph, onClick, style }) => (
  <span className="sk-icon" onClick={onClick} style={style}>{glyph}</span>
);

export const Squiggle = ({ style }) => <div className="sk-squiggle" style={style} />;

export const Lines = ({ widths = [100, 80, 60], gap = 5 }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap }}>
    {widths.map((w, i) => (
      <div key={i} className="sk-line" style={{ width: `${w}%` }} />
    ))}
  </div>
);

export const Toggle = ({ on, onChange }) => (
  <span className={`sk-toggle ${on ? 'on' : ''}`} onClick={() => onChange?.(!on)}>
    <i />
  </span>
);

export const Radio = ({ on, onClick }) => (
  <span className={`sk-radio ${on ? 'on' : ''}`} onClick={onClick} />
);
