import { useNavigate } from 'react-router-dom';
import LoginForm from '../components/LoginForm';
import { useAuth } from '../components/auth/authContext';
import './pages.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();

  return (
    <LoginForm
      // signIn stores the token AND fetches /auth/me, which is what causes the
      // library to reload for the account that just signed in.
      onLoginSuccess={async (token) => {
        await signIn(token);
        navigate('/');
      }}
    />
  );
}
