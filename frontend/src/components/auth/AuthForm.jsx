import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { oauthUrl } from '../../services/auth';

const OAUTH_PROVIDERS = [
  { id: 'google', label: 'Google', logo: '/google-logo.png' },
  { id: 'github', label: 'GitHub', logo: '/github-logo.png' },
];

export default function AuthForm({ mode }) {
  const isSignup = mode === 'signup';
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(searchParams.get('error') || '');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (isSignup) {
        await register(name, email, password);
      } else {
        await login(email, password);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 min-h-screen">
     

<div className="hidden md:flex flex-col justify-center items-center px-16 bg-[#F4F7FF]">
  <img
    src="/logo-login.png"
    alt="FlowEngine"
    className="w-full max-w-[460px] h-auto object-contain"
  />
</div>



      <div className="flex flex-col justify-center px-8 md:px-16 max-w-[440px] mx-auto w-full">
        <div className="flex gap-1 bg-ink/[0.08] rounded-full p-1 mb-8 w-fit">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className={`px-4.5 py-2 rounded-full text-[13.5px] font-semibold transition-colors ${!isSignup ? 'bg-white shadow-sm text-ink' : 'text-ink/50'}`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => navigate('/signup')}
            className={`px-4.5 py-2 rounded-full text-[13.5px] font-semibold transition-colors ${isSignup ? 'bg-white shadow-sm text-ink' : 'text-ink/50'}`}
          >
            Create account
          </button>
        </div>

        {error && <div className="mb-4 px-4 py-2.5 rounded-lg bg-coral-bg text-coral-hover text-[13px]">{error}</div>}

        <div className="flex flex-col gap-2.5 mb-5">
          {OAUTH_PROVIDERS.map(({ id, label, logo }) => (
            <a
              key={id}
              href={oauthUrl(id)}
              className="w-full py-3 rounded-full flex items-center justify-center gap-2.5 font-semibold text-[14.5px] text-ink border-[1.5px] border-ink/10 hover:border-ink/30 transition-colors"
            >
              <img src={logo} alt="" className="w-[18px] h-[18px] object-contain shrink-0" />
              Continue with {label}
            </a>
          ))}
          <div className="text-center text-[12px] text-ink/40 font-mono">or use email</div>
        </div>

        <form onSubmit={handleSubmit}>
          {isSignup && (
            <>
              <label className="block text-[12.5px] font-semibold text-ink/70 mb-1.5">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ada Lovelace"
                required
                className="w-full px-3.5 py-3 rounded-lg border-[1.5px] border-ink/10 text-[14.5px] mb-4 focus:border-teal outline-none"
              />
            </>
          )}

          <label className="block text-[12.5px] font-semibold text-ink/70 mb-1.5">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="w-full px-3.5 py-3 rounded-lg border-[1.5px] border-ink/10 text-[14.5px] mb-4 focus:border-teal outline-none"
          />

          <label className="block text-[12.5px] font-semibold text-ink/70 mb-1.5">Password</label>
          <div className="relative mb-6">
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
              className="w-full px-3.5 py-3 pr-16 rounded-lg border-[1.5px] border-ink/10 text-[14.5px] focus:border-teal outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-teal px-2 py-1.5"
            >
              {showPw ? 'Hide' : 'Show'}
            </button>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-full font-semibold text-[14.5px] bg-teal text-white hover:bg-teal-dark disabled:opacity-60 transition-colors"
          >
            {submitting ? (isSignup ? 'Creating account…' : 'Signing in…') : isSignup ? 'Create account' : 'Sign in'}
          </button>
        </form>

        {!isSignup && (
          <a href="#" className="block text-center mt-4.5 text-[13px] text-ink/50 hover:text-teal">
            Forgot password?
          </a>
        )}
      </div>
    </div>
  );
}