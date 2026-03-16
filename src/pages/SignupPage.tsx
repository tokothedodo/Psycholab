import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { signUp } from '../lib/supabase';
import './AuthPages.css';

export function SignupPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const data = await signUp(email, password);
      if (data.user) navigate('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page animate-fade-in">
      <aside className="auth-sidebar">
        <img
          src="/scientific_lab_auth_bg_1773641959796.png"
          alt="Lab background"
          className="auth-sidebar-img"
        />
        <div className="auth-sidebar-content">
          <h1>Join the Future of Research.</h1>
          <p>Access our vast library of cognitive tasks and start collecting high-precision data from across the globe in minutes.</p>
        </div>
      </aside>

      <main className="auth-main">
        <div className="auth-form-container">
          <h2>{t('signup.title')}</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="config-field">
              <label className="config-label">{t('signup.email')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-premium"
                placeholder="researcher@university.edu"
                required
              />
            </div>

            <div className="config-field">
              <label className="config-label">{t('signup.password')}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-premium"
                placeholder="••••••••"
                required
              />
            </div>

            <div className="config-field">
              <label className="config-label">{t('signup.confirmPassword')}</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-premium"
                placeholder="••••••••"
                required
              />
            </div>

            {error && <div className="msg msg-error">{error}</div>}

            <button type="submit" disabled={loading} className="btn-primary w-full py-4 text-lg">
              {loading ? 'Creating Account...' : t('signup.submit')}
            </button>
          </form>

          <p className="mt-8 text-center text-text-muted">
            {t('signup.hasAccount')}{' '}
            <Link to="/login" className="auth-link">{t('nav.login')}</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
