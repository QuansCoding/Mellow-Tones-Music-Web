import { useState } from 'react';
import { login, register } from '../api';

export default function LoginForm({ onLoginSuccess }) {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();                 // stop the browser's full page reload
    setError('');
    setLoading(true);
    try {
      if (mode === 'register') {
        await register(username, email, password);
      }
      const res = await login(username, password);
      // Hand the token up: AuthProvider owns storing it and loading /auth/me,
      // so exactly one place decides who is signed in.
      await onLoginSuccess(res.data.access_token);
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-screen">
      <form className="panel" onSubmit={handleSubmit}>
        <h2>{mode === 'login' ? 'Log in' : 'Create account'}</h2>
        {error && <div className="error">{error}</div>}

        <label>Username</label>
        <input value={username} onChange={(e) => setUsername(e.target.value)} required />

        {mode === 'register' && (
          <>
            <label>Email</label>
            <input type="email" value={email}
                   onChange={(e) => setEmail(e.target.value)} required />
          </>
        )}

        <label>Password</label>
        <input type="password" value={password} minLength={8}
               onChange={(e) => setPassword(e.target.value)} required />

        <button className="button button-primary" disabled={loading}>
          {loading ? 'Working…' : mode === 'login' ? 'Log in' : 'Register'}
        </button>

        <p>
          {mode === 'login' ? "No account? " : 'Have an account? '}
          <button type="button" className="linkish"
                  onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
            {mode === 'login' ? 'Register' : 'Log in'}
          </button>
        </p>
      </form>
    </div>
  );
}