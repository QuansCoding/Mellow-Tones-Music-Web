import { useEffect, useState } from 'react';
import { errorMessage, resendCode, verifyEmail } from '../../api';

const RESEND_SECONDS = 60;             // matches RESEND_COOLDOWN on the API

/**
 * Step two of sign-up: type the 6-digit code we emailed.
 *
 * `pending` comes from /auth/register, or from a sign-in attempt on an
 * account that isn't verified yet: { token, email, emailSent, resendIn }.
 */
export default function VerifyEmailForm({ pending, onVerified, onBack }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(
    pending.emailSent ? '' : "We couldn't send your code. Press resend to try again.",
  );
  const [notice, setNotice] = useState('');
  const [wait, setWait] = useState(pending.resendIn);

  // Count the resend cooldown down one second at a time.
  useEffect(() => {
    if (wait <= 0) return undefined;
    const timer = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);
    try {
      const { data } = await verifyEmail(pending.token, code);
      await onVerified(data.access_token);
    } catch (err) {
      setError(errorMessage(err, "Couldn't check that code"));
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError('');
    setNotice('');
    try {
      await resendCode(pending.token);
      setCode('');
      setNotice(`We sent a new code to ${pending.email}.`);
      setWait(RESEND_SECONDS);
    } catch (err) {
      if (err.response?.status === 429) {
        setWait(Number(err.response.headers['retry-after']) || RESEND_SECONDS);
      }
      setError(errorMessage(err, "Couldn't send a new code"));
    }
  }

  return (
    <div className="auth-screen">
      <form className="panel" onSubmit={handleSubmit}>
        <h2>Check your email</h2>
        <p className="auth-lede">
          We sent a 6-digit code to <strong>{pending.email}</strong>. Codes
          expire after 10 minutes.
        </p>

        {error && <div className="error" role="alert">{error}</div>}
        {notice && <div className="notice" role="status">{notice}</div>}

        <label className="field-label" htmlFor="verify-code">Verification code</label>
        <input
          id="verify-code"
          className="field field--code"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          autoFocus
          required
        />

        <button className="button button-primary" disabled={loading || code.length !== 6}>
          {loading ? 'Checking…' : 'Verify and sign in'}
        </button>

        <p className="auth-foot">
          No email? Check your spam folder, or{' '}
          <button type="button" className="linkish" onClick={handleResend}
                  disabled={wait > 0}>
            {wait > 0 ? `resend in ${wait}s` : 'send a new code'}
          </button>
          .
        </p>
        <p className="auth-foot">
          <button type="button" className="linkish" onClick={onBack}>
            Back to sign in
          </button>
        </p>
      </form>
    </div>
  );
}
