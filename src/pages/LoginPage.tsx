import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { signIn, resetPasswordForEmail } from '../lib/supabase';
import './AuthPages.css';

export function LoginPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [showReset, setShowReset] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (showReset) {
        await resetPasswordForEmail(email);
        setResetSent(true);
      } else {
        const data = await signIn(email, password);
        if (data.user) navigate('/dashboard');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Action failed');
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
          <h1>Scientific Precision Meets Clarity.</h1>
          <p>Join the next generation of cognitive researchers using PsychoLab to design, deploy, and analyze behavioral data with unprecedented ease.</p>
        </div>
      </aside>

      <main className="auth-main">
        <div className="auth-form-container">
          <h2>{showReset ? 'Reset Password' : t('login.title')}</h2>

          {resetSent ? (
            <div className="msg msg-info">
              Check your email for a password reset link.
              <button
                onClick={() => { setShowReset(false); setResetSent(false); }}
                className="auth-link block mt-4"
              >
                Back to Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="config-field">
                <label className="config-label">{t('login.email')}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-premium"
                  placeholder="researcher@university.edu"
                  required
                />
              </div>

              {!showReset && (
                <div className="config-field">
                  <div className="flex justify-between items-center mb-2">
                    <label className="config-label mb-0">{t('login.password')}</label>
                    <button
                      type="button"
                      onClick={() => { setShowReset(true); setError(''); }}
                      className="text-xs text-teal hover:underline"
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-premium"
                    placeholder="••••••••"
                    required
                  />
                </div>
              )}

              {error && <div className="msg msg-error">{error}</div>}

              <button type="submit" disabled={loading} className="btn-primary w-full py-4 text-lg">
                {loading ? 'Processing...' : (showReset ? 'Send Reset Link' : t('login.submit'))}
              </button>

              {showReset && (
                <button
                  type="button"
                  onClick={() => { setShowReset(false); setError(''); }}
                  className="text-sm text-text-muted hover:text-teal w-full text-center"
                >
                  Back to Login
                </button>
              )}
            </form>
          )}

          {!showReset && (
            <p className="mt-8 text-center text-text-muted">
              {t('login.noAccount')}{' '}
              <Link to="/signup" className="auth-link">{t('login.signUp')}</Link>
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
