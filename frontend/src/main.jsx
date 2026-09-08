import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import PlayerProvider from './components/player/PlayerProvider';
import LibraryProvider from './components/library/LibraryProvider';
import App from './App.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      {/* Above the router so the single <audio> element survives navigation. */}
      <PlayerProvider>
        {/* Shared so the Trending heart and Library → Liked Songs are the
            same state rather than two views that drift apart. */}
        <LibraryProvider>
          <App />
        </LibraryProvider>
      </PlayerProvider>
    </BrowserRouter>
  </StrictMode>,
);
