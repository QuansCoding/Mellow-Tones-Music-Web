import { useNavigate } from 'react-router-dom';
import './pages.css';

export default function SettingsPage({ onLogout }) {
  const navigate = useNavigate();

  return (
    <section className="page" aria-labelledby="settings-title">
      <h1 className="page__title" id="settings-title">Settings</h1>
      <p className="page__note">You are signed in.</p>
      <div className="panel" style={{ marginTop: 'var(--sp-5)' }}>
        <h2>Account</h2>
        <button
          type="button"
          className="button button-danger"
          onClick={() => {
            onLogout();
            navigate('/');
          }}
        >
          Log out
        </button>
      </div>
    </section>
  );
}
