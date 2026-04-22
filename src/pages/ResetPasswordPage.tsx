import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { updatePassword } from '../lib/supabase';
import './AuthPages.css';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [validating, setValidating] = useState(true);

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const type = hashParams.get('type');

    if (type === 'recovery' && accessToken) {
      setValidating(false);
    } else {
      setError('Invalid or expired reset link. Please request a new password reset.');
      setValidating(false);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await updatePassword(password);
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="auth-page animate-fade-in">
        <main className="auth-main">
          <div className="auth-form-container">
            <div className="msg msg-info">Validating reset link...</div>
          </div>
        </main>
      </div>
    );
  }

  if (success) {
    return (
      <div className="auth-page animate-fade-in">
        <aside className="auth-sidebar">
          <img
            src="/scientific_lab_auth_bg_1773641959796.png"
            alt="Lab background"
            className="auth-sidebar-img"
          />
          <div className="auth-sidebar-content">
            <h1>Password Updated</h1>
            <p>Your password has been successfully reset. Redirecting you to login...</p>
          </div>
        </aside>

        <main className="auth-main">
          <div className="auth-form-container">
            <div className="msg msg-success">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Password updated successfully!</span>
            </div>
            <p className="text-text-muted text-center mt-4">
              Redirecting to login in 3 seconds...
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="auth-page animate-fade-in">
      <aside className="auth-sidebar">
        <img
          src="/scientific_lab_auth_bg_1773641959796.png"
          alt="Lab background"
          className="auth-sidebar-img"
        />
        <div className="auth-sidebar-content">
          <h1>Create New Password</h1>
          <p>Enter a new password for your account. Make sure it's something memorable but secure.</p>
        </div>
      </aside>

      <main className="auth-main">
        <div className="auth-form-container">
          <h2>Reset Password</h2>

          {error && <div className="msg msg-error">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="config-field">
              <label className="config-label">New Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-premium"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            <div className="config-field">
              <label className="config-label">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-premium"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-4 text-lg">
              {loading ? 'Updating...' : 'Update Password'}
            </button>

            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-sm text-text-muted hover:text-teal w-full text-center"
            >
              Back to Login
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}