import { NavLink, Route, Routes, useLocation } from 'react-router-dom';

import Add from './pages/Add.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Library from './pages/Library.jsx';
import Local from './pages/Local.jsx';
import LocalSeries from './pages/LocalSeries.jsx';
import Reader from './pages/Reader.jsx';
import Series from './pages/Series.jsx';
import Settings from './pages/Settings.jsx';

const NAV = [
  { to: '/',         glyph: '⌂', label: 'Home',    end: true },
  { to: '/reading',  glyph: '◷', label: 'Reading' },
  { to: '/local',    glyph: '▤', label: 'Local' },
  { to: '/add',      glyph: '＋', label: 'Add' },
  { to: '/settings', glyph: '⚙', label: 'Settings' },
];

export default function App() {
  const loc = useLocation();
  // The reader is immersive — it hides the rail (matches MangaAppRoot.kt).
  const immersive = loc.pathname.startsWith('/read/');

  return (
    <div className="shell">
      {!immersive && (
        <nav className="rail">
          <div className="rail-logo" title="Pepe Manga">❖</div>
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) => `rail-btn${isActive ? ' on' : ''}`}
            >
              <span className="glyph" aria-hidden>{n.glyph}</span>
              <span className="lbl">{n.label}</span>
            </NavLink>
          ))}
        </nav>
      )}

      <main className="main">
        <Routes>
          <Route path="/" element={<Library />} />
          <Route path="/reading" element={<Dashboard />} />
          <Route path="/local" element={<Local />} />
          <Route path="/local/:id" element={<LocalSeries />} />
          <Route path="/add" element={<Add />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/series/:id" element={<Series />} />
          <Route path="/read/:chId" element={<Reader />} />
        </Routes>
      </main>
    </div>
  );
}
