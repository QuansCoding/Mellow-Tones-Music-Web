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

// If the token expired, log out once, globally.
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.reload();
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