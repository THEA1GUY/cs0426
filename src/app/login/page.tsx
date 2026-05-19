'use client';

import React, { Suspense, useState } from 'react'
import { login, signup, requestPasswordReset } from './actions'
import { Bot, Mail, Lock, AlertCircle, CheckCircle, Loader2, ArrowLeft, KeyRound } from 'lucide-react'
import { useSearchParams } from 'next/navigation'

type Mode = 'login' | 'forgot';

function LoginForm() {
  const searchParamsHook = useSearchParams();
  const error = searchParamsHook.get('error');
  const message = searchParamsHook.get('message');
  const [mode, setMode] = useState<Mode>('login');

  return (
    <main className="login-page flex-center">
      <div className="login-card glass animate-fade">
        <div className="login-header">
          <div className="icon-wrapper">
            {mode === 'forgot' ? (
              <KeyRound size={48} className="hero-icon" />
            ) : (
              <Bot size={48} className="hero-icon" />
            )}
          </div>
          <h1>{mode === 'forgot' ? 'Reset Password' : 'Welcome Back'}</h1>
          <p>
            {mode === 'forgot'
              ? "Enter your email and we'll send a reset link."
              : 'Sign in to your AI Onboarding Assistant'}
          </p>
        </div>

        {/* ── FORGOT PASSWORD FORM ── */}
        {mode === 'forgot' && (
          <form className="login-form" key="forgot">
            <div className="form-group">
              <label htmlFor="reset-email">Email Address</label>
              <div className="input-with-icon">
                <Mail size={18} />
                <input
                  id="reset-email"
                  name="email"
                  type="email"
                  placeholder="you@company.com"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="status-message error">
                <AlertCircle size={18} />
                <span>{decodeURIComponent(error)}</span>
              </div>
            )}
            {message && (
              <div className="status-message success">
                <CheckCircle size={18} />
                <span>{decodeURIComponent(message)}</span>
              </div>
            )}

            <div className="form-actions">
              <button formAction={requestPasswordReset} className="primary-btn">
                Send Reset Link
              </button>
              <button
                type="button"
                onClick={() => setMode('login')}
                className="back-btn"
              >
                <ArrowLeft size={16} />
                Back to Sign In
              </button>
            </div>
          </form>
        )}

        {/* ── LOGIN / SIGNUP FORM ── */}
        {mode === 'login' && (
          <form className="login-form" key="login">
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <div className="input-with-icon">
                <Mail size={18} />
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@company.com"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-with-icon">
                <Lock size={18} />
                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
              <button
                type="button"
                onClick={() => setMode('forgot')}
                className="forgot-link"
              >
                Forgot password?
              </button>
            </div>

            {error && (
              <div className="status-message error">
                <AlertCircle size={18} />
                <span>{decodeURIComponent(error)}</span>
              </div>
            )}
            {message && (
              <div className="status-message success">
                <CheckCircle size={18} />
                <span>{decodeURIComponent(message)}</span>
              </div>
            )}

            <div className="form-actions">
              <button formAction={login} className="primary-btn">Log in</button>
              <button formAction={signup} className="secondary-btn">Sign up</button>
            </div>
          </form>
        )}

        <p className="login-footer">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>

      <style jsx>{`
        .login-page {
          min-height: 100vh;
          background: radial-gradient(circle at bottom right, #1e293b 0%, #020617 100%);
          padding: 2rem;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .login-card {
          width: 100%;
          max-width: 420px;
          padding: 3rem;
          text-align: center;
        }

        .login-header {
          margin-bottom: 2.5rem;
        }

        .icon-wrapper {
          margin-bottom: 1.5rem;
        }

        .hero-icon {
          color: var(--accent);
        }

        .login-header h1 {
          font-size: 1.75rem;
          margin-bottom: 0.5rem;
        }

        .login-header p {
          color: var(--text-muted);
          font-size: 0.875rem;
        }

        .login-form {
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
          display: block;
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

        .forgot-link {
          align-self: flex-end;
          font-size: 0.8125rem;
          color: var(--accent);
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          transition: opacity 0.2s;
        }

        .forgot-link:hover {
          opacity: 0.75;
          text-decoration: underline;
        }

        .form-actions {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-top: 0.5rem;
        }

        .primary-btn {
          background: var(--primary);
          color: white;
          padding: 0.75rem;
          border-radius: 8px;
          font-weight: 600;
          transition: background 0.2s;
          cursor: pointer;
          border: none;
          font-family: inherit;
          font-size: 0.9375rem;
        }

        .primary-btn:hover {
          background: var(--primary-hover);
        }

        .secondary-btn {
          background: transparent;
          border: 1px solid var(--border);
          color: var(--text);
          padding: 0.75rem;
          border-radius: 8px;
          font-weight: 600;
          transition: background 0.2s;
          cursor: pointer;
          font-family: inherit;
          font-size: 0.9375rem;
        }

        .secondary-btn:hover {
          background: var(--surface);
        }

        .back-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          background: transparent;
          border: 1px solid var(--border);
          color: var(--text-muted);
          padding: 0.75rem;
          border-radius: 8px;
          font-weight: 600;
          transition: all 0.2s;
          cursor: pointer;
          font-family: inherit;
          font-size: 0.875rem;
        }

        .back-btn:hover {
          background: var(--surface);
          color: var(--text);
        }

        .status-message {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          font-size: 0.875rem;
        }

        .status-message.error {
          background: rgba(239, 68, 68, 0.1);
          color: var(--error);
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .status-message.success {
          background: rgba(34, 197, 94, 0.1);
          color: var(--success);
          border: 1px solid rgba(34, 197, 94, 0.2);
        }

        .login-footer {
          margin-top: 2.5rem;
          font-size: 0.75rem;
          color: var(--text-muted);
          line-height: 1.5;
        }
      `}</style>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main className="login-loader-page">
        <div className="login-loader-card glass">
          <Loader2 className="spinner" size={32} />
          <p>Loading login portal...</p>
        </div>
        <style jsx>{`
          .login-loader-page {
            min-height: 100vh;
            background: radial-gradient(circle at bottom right, #1e293b 0%, #020617 100%);
            padding: 2rem;
            display: flex;
            justify-content: center;
            align-items: center;
          }
          .login-loader-card {
            width: 100%;
            max-width: 420px;
            padding: 3rem;
            text-align: center;
            display: flex;
            flex-direction: column;
            gap: 1.25rem;
            justify-content: center;
            align-items: center;
            border-radius: 12px;
          }
          .login-loader-card p {
            color: var(--text-muted);
            font-size: 0.875rem;
            font-weight: 500;
          }
          .spinner {
            color: var(--accent);
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </main>
    }>
      <LoginForm />
    </Suspense>
  );
}
