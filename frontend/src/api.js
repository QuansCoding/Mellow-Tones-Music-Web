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
// The Manage page reads this: only the songs the signed-in user uploaded.
export const fetchMySongs = () => API.get('/songs/mine');
export const updateSong  = (id, changes) => API.patch(`/songs/${id}`, changes);
export const deleteSong  = (id) => API.delete(`/songs/${id}`);

export const uploadSong = (title, artist, duration_sec, file, genre = '') => {
  const formData = new FormData();
  formData.append('title', title);
  formData.append('artist', artist);
  formData.append('duration_sec', duration_sec);
  formData.append('file', file);
  if (genre) formData.append('genre', genre);
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

/** Owner-only. Public playlists can be opened by anyone and can appear on Home. */
export const setPlaylistPublic = (id, isPublic) =>
  API.patch(`/me/playlists/${id}`, { is_public: isPublic });

// ---------------------------------------------------------------------------
// Plays + discovery — reads are public; recording a play needs an account.
// ---------------------------------------------------------------------------

/**
 * Called by the player after 30s of real listening. Only signed-in listens
 * count, so a signed-out visitor never sends one — the server would refuse
 * it (401) anyway.
 */
export const recordPlay = (songId, playlistId = null) =>
  localStorage.getItem('token')
    ? API.post('/plays', { song_id: songId, playlist_id: playlistId })
    : Promise.resolve(null);

/** Everything the front page shows, in one round trip. */
export const fetchHome = () => API.get('/home');
export const fetchArtist = (id) => API.get(`/artists/${id}`);
/** A public playlist (or your own). 404 for anyone else's private one. */
export const fetchPublicPlaylist = (id) => API.get(`/playlists/${id}`);

/** Discover's sections, personal when signed in. `genre` is for the filter
 *  row still to come — the server already honours it. */
export const fetchDiscover = (genre) =>
  API.get('/discover', { params: genre ? { genre } : {} });
export const fetchGenres = () => API.get('/genres');

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

/** Mixed search. Playlists come back only when signed in, and only ever the
 *  caller's own — the server never searches anyone else's. */
export const searchAll = (q, limit = 6, offset = 0) =>
  API.get('/search', { params: { q, limit, offset } });
