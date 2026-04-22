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
    <div className="auth-page-simple animate-fade-in">
      <main className="auth-form-container">
        <h2>{showReset ? t('login.resetPassword') : t('login.title')}</h2>

        {resetSent ? (
          <div className="msg msg-info">
            {t('login.checkEmail')}
            <button
              onClick={() => { setShowReset(false); setResetSent(false); }}
              className="auth-link block mt-4"
            >
              {t('common.back')}
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
                    {t('login.forgotPassword')}
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
              {loading ? t('login.processing') : (showReset ? t('login.sendResetLink') : t('login.submit'))}
            </button>

            {showReset && (
              <button
                type="button"
                onClick={() => { setShowReset(false); setError(''); }}
                className="text-sm text-text-muted hover:text-teal w-full text-center"
              >
                {t('common.back')}
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
      </main>
    </div>
  );
}
