import Link from 'next/link';
import { Bot, ShieldCheck, ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <main className="landing-page flex-center">
      <div className="hero glass animate-fade">
        <div className="logo-section">
          <Bot size={64} className="hero-icon" />
          <h1>AI Onboarding Assistant</h1>
          <p>Seamlessly transitioning new talent into the future of work.</p>
        </div>

        <div className="portal-selection">
          <Link href="/chat" className="portal-card glass employee">
            <div className="portal-info">
              <h2>Employee Portal</h2>
              <p>Get instant answers to your onboarding questions.</p>
            </div>
            <ArrowRight size={24} />
          </Link>

          <Link href="/admin" className="portal-card glass admin">
            <div className="portal-info">
              <div className="admin-tag">
                <ShieldCheck size={14} />
                <span>Admin</span>
              </div>
              <h2>Management Panel</h2>
              <p>Configure knowledge base and manage escalations.</p>
            </div>
            <ArrowRight size={24} />
          </Link>
        </div>
      </div>

      <style jsx>{`
        .landing-page {
          min-height: 100vh;
          background: radial-gradient(circle at top left, #1e293b 0%, #020617 100%);
          padding: 2rem;
        }

        .hero {
          max-width: 800px;
          width: 100%;
          padding: 4rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: 3rem;
        }

        .hero-icon {
          color: var(--accent);
          margin-bottom: 1.5rem;
          filter: drop-shadow(0 0 10px rgba(56, 189, 248, 0.5));
        }

        .hero h1 {
          font-size: 3rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          margin-bottom: 0.5rem;
        }

        .hero p {
          font-size: 1.125rem;
          color: var(--text-muted);
        }

        .portal-selection {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }

        .portal-card {
          padding: 2rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          text-align: left;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border: 1px solid var(--glass-border);
        }

        .portal-card:hover {
          transform: translateY(-5px);
          background: var(--surface);
          border-color: var(--accent);
        }

        .portal-info h2 {
          font-size: 1.25rem;
          margin-bottom: 0.5rem;
        }

        .portal-info p {
          font-size: 0.875rem;
          color: var(--text-muted);
        }

        .admin-tag {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          color: var(--accent);
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          margin-bottom: 0.5rem;
        }

        @media (max-width: 640px) {
          .portal-selection {
            grid-template-columns: 1fr;
          }
          
          .hero {
            padding: 2rem;
          }

          .hero h1 {
            font-size: 2rem;
          }
        }
      `}</style>
    </main>
  );
}
