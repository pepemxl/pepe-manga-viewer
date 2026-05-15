import { Link, useLocation } from 'react-router-dom';
import { Icon } from './Sketch.jsx';

const NAV = [
  { to: '/',          label: 'Library'  },
  { to: '/continue',  label: 'Continue' },
  { to: '/history',   label: 'History'  },
  { to: '/settings',  label: 'Settings' },
];

export default function AppBar({ search = true }) {
  const loc = useLocation();
  const isActive = (to) => {
    if (to === '/') return loc.pathname === '/' || loc.pathname.startsWith('/library') || loc.pathname.startsWith('/series');
    return loc.pathname.startsWith(to);
  };
  return (
    <header className="appbar">
      <Link to="/" className="appbar-logo">
        <span className="dot">◐</span> pepe-manga<span className="suffix">.read</span>
      </Link>
      <nav className="appbar-nav">
        {NAV.map(n => (
          <Link key={n.to} to={n.to} className={isActive(n.to) ? 'active' : ''}>{n.label}</Link>
        ))}
      </nav>
      <div style={{ flex: 1 }} />
      {search && (
        <label className="appbar-search">
          <span>⌕</span>
          <input placeholder="search series…" />
        </label>
      )}
      <Link to="/import"><Icon glyph="＋" /></Link>
      <Link to="/settings"><Icon glyph="⚙" /></Link>
    </header>
  );
}
