import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/auth/authContext';
import './pages.css';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  return (
    <section className="page" aria-labelledby="settings-title">
      <h1 className="page__title" id="settings-title">Settings</h1>
      <p className="page__note">
        {user ? `Signed in as ${user.username}.` : 'You are not signed in.'}
      </p>

      {user && (
        <div className="panel" style={{ marginTop: 'var(--sp-5)' }}>
          <h2>Account</h2>
          <p className="page__note" style={{ marginTop: 0 }}>{user.email}</p>
          <button
            type="button"
            className="button button-danger"
            style={{ marginTop: 'var(--sp-4)' }}
            onClick={() => {
              // Clears the token and the user, which empties the library in
              // place — the next account starts from their own data.
              signOut();
              navigate('/');
            }}
          >
            Log out
          </button>
        </div>
      )}
    </section>
  );
}
