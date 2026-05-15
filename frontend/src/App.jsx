import { Routes, Route, Navigate } from 'react-router-dom';

import Library   from './pages/Library.jsx';
import Series    from './pages/Series.jsx';
import Reader    from './pages/Reader.jsx';
import Importing from './pages/Import.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Settings  from './pages/Settings.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/"              element={<Library />} />
      <Route path="/library"       element={<Navigate to="/" replace />} />
      <Route path="/series/:id"    element={<Series />} />
      <Route path="/read/:chId"    element={<Reader />} />
      <Route path="/import"        element={<Importing />} />
      <Route path="/continue"      element={<Dashboard />} />
      <Route path="/history"       element={<Dashboard />} />
      <Route path="/settings"      element={<Settings />} />
      <Route path="*"              element={<Navigate to="/" replace />} />
    </Routes>
  );
}
