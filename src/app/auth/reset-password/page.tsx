'use client';

import React, { useState } from 'react';
import { KeyRound, Lock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setIsLoading(false);
      return;
    }

    setSuccess(true);
    // Brief pause so they can read the success message, then send to chat
    setTimeout(() => router.push('/chat'), 2000);
  };

  return (
    <main className="reset-page flex-center">
      <div className="reset-card glass animate-fade">
        <div className="reset-header">
          <KeyRound size={48} className="hero-icon" />
          <h1>Set New Password</h1>
          <p>Choose a strong password for your account.</p>
        </div>

        {success ? (
          <div className="success-box">
            <CheckCircle size={32} className="success-icon" />
            <h2>Password Updated!</h2>
            <p>Redirecting you to the assistant...</p>
          </div>
        ) : (
          <form className="reset-form" onSubmit={handleReset}>
            <div className="form-group">
              <label htmlFor="new-password">New Password</label>
              <div className="input-with-icon">
                <Lock size={18} />
                <input
                  id="new-password"
                  type="password"
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="confirm-password">Confirm Password</label>
              <div className="input-with-icon">
                <Lock size={18} />
                <input
                  id="confirm-password"
                  type="password"
                  placeholder="Repeat your new password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            </div>

            {error && (
              <div className="status-message error">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" className="primary-btn" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="spinner" size={18} />
                  <span>Updating...</span>
                </>
              ) : (
                'Update Password'
              )}
            </button>
          </form>
        )}
      </div>

      <style jsx>{`
        .reset-page {
          min-height: 100vh;
          background: radial-gradient(circle at bottom right, #1e293b 0%, #020617 100%);
          padding: 2rem;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .reset-card {
          width: 100%;
          max-width: 420px;
          padding: 3rem;
          text-align: center;
        }

        .reset-header {
          margin-bottom: 2.5rem;
        }

        .hero-icon {
          color: var(--accent);
          margin-bottom: 1.5rem;
        }

        .reset-header h1 {
          font-size: 1.75rem;
          margin-bottom: 0.5rem;
        }

        .reset-header p {
          color: var(--text-muted);
          font-size: 0.875rem;
        }

        .reset-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          text-align: left;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group label {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-muted);
        }

        .input-with-icon {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 0 1rem;
          transition: border-color 0.2s;
        }

        .input-with-icon:focus-within {
          border-color: var(--accent);
        }

        .input-with-icon input {
          flex: 1;
          background: transparent;
          border: none;
          color: var(--text);
          padding: 0.75rem 0;
          outline: none;
          font-family: inherit;
        }

        .input-with-icon :global(svg) {
          color: var(--text-muted);
          flex-shrink: 0;
        }

        .primary-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          background: var(--primary);
          color: white;
          padding: 0.85rem;
          border-radius: 8px;
          font-weight: 600;
          transition: background 0.2s;
          cursor: pointer;
          border: none;
          font-family: inherit;
          font-size: 0.9375rem;
          margin-top: 0.5rem;
        }

        .primary-btn:hover:not(:disabled) {
          background: var(--primary-hover);
        }

        .primary-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .status-message {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          font-size: 0.875rem;
          text-align: left;
        }

        .status-message.error {
          background: rgba(239, 68, 68, 0.1);
          color: var(--error);
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .success-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          padding: 2rem 0;
          color: var(--success);
        }

        .success-icon {
          color: var(--success);
        }

        .success-box h2 {
          font-size: 1.375rem;
          color: var(--text);
        }

        .success-box p {
          color: var(--text-muted);
          font-size: 0.875rem;
        }

        .spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  );
}
