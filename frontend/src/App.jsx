import { useState } from 'react';
import LoginForm from './components/LoginForm';
import UploadForm from './components/UploadForm';
import SongList from './components/SongList';
import Player from './components/Player';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));
  const [currentSong, setCurrentSong] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  if (!isLoggedIn) {
    return <LoginForm onLoginSuccess={() => setIsLoggedIn(true)} />;
  }

  return (
    <div className="container">
      <header className="header">
        <h1>Mellow Tones</h1>
        <button className="button button-danger" onClick={() => {
          localStorage.removeItem('token');
          setIsLoggedIn(false);
          setCurrentSong(null);
        }}>Log out</button>
      </header>

      <Player song={currentSong} />
      <UploadForm onUploaded={() => setRefreshKey(k => k + 1)} />
      <SongList refreshKey={refreshKey} onPlay={setCurrentSong} />
    </div>
  );
}