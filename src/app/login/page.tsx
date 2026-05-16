import { login, signup } from './actions'
import { Bot, Mail, Lock, AlertCircle, CheckCircle } from 'lucide-react'

export default function LoginPage({
  searchParams,
}: {
  searchParams: { message?: string; error?: string }
}) {
  return (
    <main className="login-page flex-center">
      <div className="login-card glass animate-fade">
        <div className="login-header">
          <Bot size={48} className="hero-icon" />
          <h1>Welcome Back</h1>
          <p>Sign in to your AI Onboarding Assistant</p>
        </div>

        <form className="login-form">
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
          </div>

          {searchParams.error && (
            <div className="status-message error">
              <AlertCircle size={18} />
              <span>{decodeURIComponent(searchParams.error)}</span>
            </div>
          )}

          {searchParams.message && (
            <div className="status-message success">
              <CheckCircle size={18} />
              <span>{decodeURIComponent(searchParams.message)}</span>
            </div>
          )}

          <div className="form-actions">
            <button formAction={login} className="primary-btn">Log in</button>
            <button formAction={signup} className="secondary-btn">Sign up</button>
          </div>
        </form>

        <p className="login-footer">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>

      <style jsx>{`
        .login-page {
          min-height: 100vh;
          background: radial-gradient(circle at bottom right, #1e293b 0%, #020617 100%);
          padding: 2rem;
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

        .hero-icon {
          color: var(--accent);
          margin-bottom: 1.5rem;
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

        .form-group label {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-muted);
          margin-bottom: 0.5rem;
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
        }

        .input-with-icon :global(svg) {
          color: var(--text-muted);
        }

        .form-actions {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-top: 1rem;
        }

        .primary-btn {
          background: var(--primary);
          color: white;
          padding: 0.75rem;
          border-radius: 8px;
          font-weight: 600;
          transition: background 0.2s;
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
        }

        .secondary-btn:hover {
          background: var(--surface);
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
  )
}
