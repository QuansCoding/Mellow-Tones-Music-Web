import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import AuthProvider from './components/auth/AuthProvider';
import CatalogProvider from './components/catalog/CatalogProvider';
import PlayerProvider from './components/player/PlayerProvider';
import LibraryProvider from './components/library/LibraryProvider';
import App from './App.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      {/* Auth is outermost: the library is keyed off who is signed in. */}
      <AuthProvider>
        {/* Above the router so the single <audio> element survives navigation. */}
        {/* Catalogue above the player: playlist playback resolves stored
            song ids through it. */}
        <CatalogProvider>
          <PlayerProvider>
            <LibraryProvider>
              <App />
            </LibraryProvider>
          </PlayerProvider>
        </CatalogProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
