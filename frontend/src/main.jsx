import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import AuthProvider from './components/auth/AuthProvider';
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
        <PlayerProvider>
          <LibraryProvider>
            <App />
          </LibraryProvider>
        </PlayerProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
