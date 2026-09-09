import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import HomePage from './pages/HomePage';
import LibraryPage from './pages/LibraryPage';
import LibraryListPage from './pages/LibraryListPage';
import StubPage from './pages/StubPage';
import LoginPage from './pages/LoginPage';
import UploadPage from './pages/UploadPage';
import ManagePage from './pages/ManagePage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <Routes>
      {/* Identity now comes from useAuth() wherever it is needed, rather than
          being threaded down as props from here. */}
      <Route path="/" element={<AppShell />}>
        <Route index element={<HomePage />} />

        {/* Browsing is public: GET /songs and the stream endpoint carry no
            auth dependency, so the shell renders signed out. */}
        <Route path="discover" element={<StubPage title="Discover" />} />
        <Route path="create" element={<StubPage title="Create" />} />

        <Route path="library" element={<LibraryPage />} />
        <Route path="library/liked" element={<LibraryListPage kind="liked" />} />
        <Route path="library/playlists" element={<LibraryListPage kind="playlists" />} />
        <Route path="library/artists" element={<LibraryListPage kind="artists" />} />
        {/* Downloads merged into Liked Songs — keep old links working. */}
        <Route path="library/downloads" element={<Navigate to="/library/liked" replace />} />

        <Route path="create/manage" element={<ManagePage />} />
        <Route path="create/upload" element={<UploadPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="settings" element={<SettingsPage />} />

        <Route
          path="*"
          element={<StubPage title="Not found" blurb="That page does not exist." />}
        />
      </Route>
    </Routes>
  );
}
