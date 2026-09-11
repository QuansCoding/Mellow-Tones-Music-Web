import { useState } from 'react';
import { errorMessage, login, register } from '../api';
import Turnstile from './auth/Turnstile';
import VerifyEmailForm from './auth/VerifyEmailForm';

// The human check only runs where a site key is configured (production).
const turnstileEnabled = Boolean(import.meta.env.VITE_TURNSTILE_SITE_KEY);

/** The API's VerificationPending, in the shape VerifyEmailForm reads. */
const toPending = (data) => ({
  token: data.verification_token,
  email: data.email,
  emailSent: data.email_sent,
  resendIn: data.resend_in,
});

export default function LoginForm({ onLoginSuccess }) {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Set once an account exists but its email isn't verified yet.
  const [pending, setPending] = useState(null);
  const [captcha, setCaptcha] = useState(null);
  // Turnstile tokens are single-use: bumping this remounts the widget for a
  // fresh one after every attempt.
  const [captchaKey, setCaptchaKey] = useState(0);

  function resetCaptcha() {
    setCaptcha(null);
    setCaptchaKey((k) => k + 1);
  }

  async function handleSubmit(e) {
    e.preventDefault();                 // stop the browser's full page reload
    setError('');
    setLoading(true);
    try {
      if (mode === 'register') {
        // No sign-in yet: the account stays locked until the emailed code
        // comes back.
        const { data } = await register(username, email, password, captcha);
        setPending(toPending(data));
        return;
      }
      const res = await login(username, password);
      // Hand the token up: AuthProvider owns storing it and loading /auth/me,
      // so exactly one place decides who is signed in.
      await onLoginSuccess(res.data.access_token);
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (detail?.code === 'email_not_verified') {
        setPending(toPending(detail));
        return;
      }
      setError(errorMessage(err));
      if (mode === 'register') resetCaptcha();
    } finally {
      setLoading(false);
    }
  }

  if (pending) {
    return (
      <VerifyEmailForm
        pending={pending}
        onVerified={onLoginSuccess}
        onBack={() => {
          setPending(null);
          setMode('login');
          setPassword('');
          resetCaptcha();
        }}
      />
    );
  }

  const needsCaptcha = mode === 'register' && turnstileEnabled && !captcha;

  return (
    <div className="auth-screen">
      <form className="panel" onSubmit={handleSubmit}>
        <h2>{mode === 'login' ? 'Log in' : 'Create account'}</h2>
        {error && <div className="error" role="alert">{error}</div>}

        <label className="field-label">Username</label>
        <input className="field" value={username} onChange={(e) => setUsername(e.target.value)} required />

        {mode === 'register' && (
          <>
            <label className="field-label">Email</label>
            <input className="field" type="email" value={email}
                   onChange={(e) => setEmail(e.target.value)} required />
          </>
        )}

        <label className="field-label">Password</label>
        <input className="field" type="password" value={password} minLength={8}
               onChange={(e) => setPassword(e.target.value)} required />

        {mode === 'register' && <Turnstile key={captchaKey} onToken={setCaptcha} />}

        <button className="button button-primary" disabled={loading || needsCaptcha}>
          {loading ? 'Working…' : mode === 'login' ? 'Log in' : 'Register'}
        </button>

        <p>
          {mode === 'login' ? "No account? " : 'Have an account? '}
          <button type="button" className="linkish"
                  onClick={() => {
                    setMode(mode === 'login' ? 'register' : 'login');
                    setError('');
                    resetCaptcha();
                  }}>
            {mode === 'login' ? 'Register' : 'Log in'}
          </button>
        </p>
      </form>
    </div>
  );
}
