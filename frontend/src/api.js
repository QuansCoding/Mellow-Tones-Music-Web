import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
});

// Attach the token to every request automatically.
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// If the token expired, drop it and let the app react.
API.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginAttempt = error.config?.url?.includes('/auth/login');
    // A 401 from /auth/login is just wrong credentials, not an expired
    // session — clearing the token there would sign out a valid session
    // because someone mistyped a password.
    if (error.response?.status === 401 && !isLoginAttempt) {
      localStorage.removeItem('token');
      // AuthProvider listens for this and clears the user + library in place,
      // rather than reloading the page out from under whatever they were doing.
      window.dispatchEvent(new Event('mellowtones:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export const register = (username, email, password) =>
  API.post('/auth/register', { username, email, password });

// Login is form-encoded — this must match OAuth2PasswordRequestForm.
export const login = (username, password) =>
  API.post('/auth/login', new URLSearchParams({ username, password }));

export const fetchSongs  = () => API.get('/songs');
export const deleteSong  = (id) => API.delete(`/songs/${id}`);

export const uploadSong = (title, artist, duration_sec, file) => {
  const formData = new FormData();
  formData.append('title', title);
  formData.append('artist', artist);
  formData.append('duration_sec', duration_sec);
  formData.append('file', file);
  return API.post('/songs', formData);
};

export const getSongStreamUrl = (id) =>
  `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/songs/${id}/stream`;

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

/** Who the stored token belongs to. Without this the client cannot attribute
 *  a library to anyone, which is why it used to live in localStorage. */
export const getMe = () => API.get('/auth/me');

// ---------------------------------------------------------------------------
// Library — every one of these is scoped server-side to the bearer token.
// ---------------------------------------------------------------------------

/** One aggregate read: likes, favourite artists and playlists in a single
 *  round trip rather than three. */
export const fetchLibrary = () => API.get('/me/library');

// PUT/DELETE rather than POST: idempotent, so a double-click is harmless.
export const likeSong = (songId) => API.put(`/me/likes/${songId}`);
export const unlikeSong = (songId) => API.delete(`/me/likes/${songId}`);

export const favoriteArtist = (artistId) => API.put(`/me/artists/${artistId}`);
export const unfavoriteArtist = (artistId) => API.delete(`/me/artists/${artistId}`);

export const createPlaylist = (name) => API.post('/me/playlists', { name });
export const renamePlaylist = (id, name) => API.patch(`/me/playlists/${id}`, { name });
export const deletePlaylist = (id) => API.delete(`/me/playlists/${id}`);

export const addSongToPlaylist = (playlistId, songId) =>
  API.put(`/me/playlists/${playlistId}/songs/${songId}`);
export const removeSongFromPlaylist = (playlistId, songId) =>
  API.delete(`/me/playlists/${playlistId}/songs/${songId}`);

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

/** Mixed search. Playlists come back only when signed in, and only ever the
 *  caller's own — the server never searches anyone else's. */
export const searchAll = (q, limit = 6) =>
  API.get('/search', { params: { q, limit } });
