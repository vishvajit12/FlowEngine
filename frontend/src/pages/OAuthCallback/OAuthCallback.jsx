import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function OAuthCallback() {
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();
  const handled = useRef(false); // StrictMode runs effects twice in dev; the hash is cleared after the first

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;
    const fail = () => navigate(`/login?error=${encodeURIComponent('Sign-in failed')}`, { replace: true });

    const token = new URLSearchParams(window.location.hash.slice(1)).get('token');
    window.history.replaceState(null, '', window.location.pathname); // remove the token from the URL/history
    if (!token) return fail();

    loginWithToken(token).then(() => navigate('/dashboard', { replace: true })).catch(fail);
  }, [loginWithToken, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-card text-ink/40 text-sm font-mono">
      Signing you in…
    </div>
  );
}