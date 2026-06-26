import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';

import App from './App.jsx';
import { SettingsProvider } from './lib/settings.jsx';
import './styles.css';

// HashRouter: works identically under the Vite dev server and the tauri://
// file-served production build (no server-side route rewriting needed).
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SettingsProvider>
      <HashRouter>
        <App />
      </HashRouter>
    </SettingsProvider>
  </React.StrictMode>,
);
