import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import PlayerProvider from './components/player/PlayerProvider';
import App from './App.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      {/* Above the router so the single <audio> element survives navigation. */}
      <PlayerProvider>
        <App />
      </PlayerProvider>
    </BrowserRouter>
  </StrictMode>,
);
