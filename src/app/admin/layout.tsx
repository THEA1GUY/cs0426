import React from 'react';
import Link from 'next/link';
import { LayoutDashboard, FileText, Users, MessageSquare, LogOut } from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="admin-container">
      <aside className="admin-sidebar glass">
        <div className="sidebar-header">
          <h2>AI Onboarding</h2>
          <span>Admin Panel</span>
        </div>
        
        <nav className="sidebar-nav">
          <Link href="/admin" className="nav-item active">
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </Link>
          <Link href="/admin/documents" className="nav-item">
            <FileText size={20} />
            <span>Documents</span>
          </Link>
          <Link href="/admin/users" className="nav-item">
            <Users size={20} />
            <span>Employees</span>
          </Link>
          <Link href="/admin/escalations" className="nav-item">
            <MessageSquare size={20} />
            <span>Escalations</span>
          </Link>
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn">
            <LogOut size={20} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-header glass">
          <div className="header-search">
            <input type="text" placeholder="Search..." />
          </div>
          <div className="header-user">
            <span>Admin User</span>
            <div className="avatar">AD</div>
          </div>
        </header>
        
        <div className="admin-content">
          {children}
        </div>
      </main>

      <style jsx>{`
        .admin-container {
          display: flex;
          min-height: 100vh;
          background-color: var(--background);
        }

        .admin-sidebar {
          width: 280px;
          display: flex;
          flex-direction: column;
          margin: 1rem;
          margin-right: 0;
        }

        .sidebar-header {
          padding: 2rem;
          border-bottom: 1px solid var(--glass-border);
        }

        .sidebar-header h2 {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--accent);
        }

        .sidebar-header span {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--text-muted);
        }

        .sidebar-nav {
          flex: 1;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          color: var(--text-muted);
          transition: all 0.2s;
        }

        .nav-item:hover, .nav-item.active {
          background: var(--surface);
          color: var(--text);
        }

        .nav-item.active {
          border-left: 3px solid var(--accent);
        }

        .sidebar-footer {
          padding: 1.5rem;
          border-top: 1px solid var(--glass-border);
        }

        .logout-btn {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          width: 100%;
          color: var(--error);
          opacity: 0.8;
          transition: opacity 0.2s;
        }

        .logout-btn:hover {
          opacity: 1;
        }

        .admin-main {
          flex: 1;
          padding: 1rem;
          display: flex;
          flex-direction: column;
        }

        .admin-header {
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 2rem;
          margin-bottom: 1rem;
        }

        .header-search input {
          background: var(--surface);
          border: 1px solid var(--border);
          padding: 0.5rem 1rem;
          border-radius: 20px;
          color: var(--text);
          width: 300px;
        }

        .header-user {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .avatar {
          width: 32px;
          height: 32px;
          background: var(--primary);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .admin-content {
          flex: 1;
          overflow-y: auto;
        }
      `}</style>
    </div>
  );
}
