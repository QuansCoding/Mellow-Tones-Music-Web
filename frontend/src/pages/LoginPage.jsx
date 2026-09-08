import { useNavigate } from 'react-router-dom';
import LoginForm from '../components/LoginForm';
import './pages.css';

export default function LoginPage({ onLogin }) {
  const navigate = useNavigate();

  return (
    <LoginForm
      onLoginSuccess={() => {
        onLogin();
        navigate('/');
      }}
    />
  );
}
