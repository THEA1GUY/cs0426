'use client';

import React, { useState, useEffect } from 'react';
import { UserPlus, Shield, UserX, CheckCircle, AlertCircle, Loader2, Edit3, Trash2 } from 'lucide-react';

interface Profile {
  id: string;
  name: string;
  department: string;
  job_title: string;
  role: 'new_employee' | 'department_head' | 'admin';
  status: 'active' | 'suspended' | 'blocked';
  updated_at: string;
}

interface PreRegistered {
  email: string;
  name: string;
  department: string;
  job_title: string;
  role: 'new_employee' | 'department_head' | 'admin';
  status: 'active' | 'suspended' | 'blocked';
}

export default function AdminUsers() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [preRegistered, setPreRegistered] = useState<PreRegistered[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New pre-registration form state
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('HR');
  const [jobTitle, setJobTitle] = useState('');
  const [role, setRole] = useState<'new_employee' | 'department_head' | 'admin'>('new_employee');

  const fetchData = async () => {
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch');
      setProfiles(data.profiles || []);
      setPreRegistered(data.preRegistered || []);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePreRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatusMsg(null);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, department, job_title: jobTitle, role }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add whitelist user');

      setStatusMsg({ type: 'success', text: `Successfully pre-registered ${name} (${email})` });
      setEmail('');
      setName('');
      setJobTitle('');
      setRole('new_employee');
      fetchData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateUser = async (target: 'profile' | 'pre-register', identifier: string, updates: Partial<Profile | PreRegistered>) => {
    try {
      const body = target === 'pre-register' 
        ? { type: 'pre-register', email: identifier, ...updates }
        : { type: 'profile', id: identifier, ...updates };

      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update user');

      setStatusMsg({ type: 'success', text: 'User details updated successfully.' });
      fetchData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="users-admin-container animate-fade">
      <div className="page-header">
        <h1>Staff Security & Directory</h1>
        <p>Control interior/exterior access, pre-register emails, promote roles, and enforce bans or suspensions.</p>
      </div>

      {statusMsg && (
        <div className={`status-banner ${statusMsg.type} glass`}>
          {statusMsg.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      <div className="admin-grid">
        {/* whitelist / Add pre-registered staff */}
        <div className="admin-card glass add-user-section">
          <h2><UserPlus size={20} className="icon-blue" /> Whitelist New Staff</h2>
          <p className="card-desc">Only emails added here will be permitted to register/sign up for security protection.</p>
          
          <form onSubmit={handlePreRegister} className="pre-register-form">
            <div className="form-group">
              <label>Full Name</label>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="e.g. John Doe"
                required 
              />
            </div>

            <div className="form-group">
              <label>Staff Email</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="e.g. john@company.com"
                required 
              />
            </div>

            <div className="form-group">
              <label>Department Access</label>
              <select value={department} onChange={(e) => setDepartment(e.target.value)}>
                <option value="HR">HR</option>
                <option value="Engineering">Engineering</option>
                <option value="Sales">Sales</option>
                <option value="Marketing">Marketing</option>
                <option value="General">General</option>
              </select>
            </div>

            <div className="form-group">
              <label>Job Title</label>
              <input 
                type="text" 
                value={jobTitle} 
                onChange={(e) => setJobTitle(e.target.value)} 
                placeholder="e.g. Senior Recruiter"
                required 
              />
            </div>

            <div className="form-group">
              <label>System Permission / Role</label>
              <select value={role} onChange={(e) => setRole(e.target.value as any)}>
                <option value="new_employee">New Employee (Standard Chat)</option>
                <option value="department_head">Department Head (Manage escalations)</option>
                <option value="admin">Administrator (Full panel access)</option>
              </select>
            </div>

            <button type="submit" className="submit-btn" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="spinner" size={16} /> : 'Pre-Authorize Email'}
            </button>
          </form>
        </div>

        {/* Pre-registration whitelist list */}
        <div className="admin-card glass whitelist-list-section">
          <h2><Shield size={20} className="icon-green" /> Pre-Authorized Directory</h2>
          <p className="card-desc">Approved emails awaiting user activation or registration.</p>
          
          {isLoading ? (
            <div className="loader-box"><Loader2 className="spinner" size={24} /></div>
          ) : (
            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Staff Name & Email</th>
                    <th>Dept / Title</th>
                    <th>Default Role</th>
                    <th>Security Status</th>
                  </tr>
                </thead>
                <tbody>
                  {preRegistered.length === 0 ? (
                    <tr><td colSpan={4} className="text-center text-muted">No pre-registered staff yet.</td></tr>
                  ) : (
                    preRegistered.map((u) => (
                      <tr key={u.email}>
                        <td>
                          <div className="user-info">
                            <strong>{u.name}</strong>
                            <span>{u.email}</span>
                          </div>
                        </td>
                        <td>
                          <div className="user-info">
                            <strong>{u.department}</strong>
                            <span>{u.job_title || 'N/A'}</span>
                          </div>
                        </td>
                        <td>
                          <select 
                            value={u.role} 
                            onChange={(e) => handleUpdateUser('pre-register', u.email, { role: e.target.value as any })}
                            className="inline-select"
                          >
                            <option value="new_employee">Employee</option>
                            <option value="department_head">Dept Head</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td>
                          <span className={`status-badge ${u.status}`}>{u.status}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Fully active/registered profiles with status switcher (suspend/block) */}
        <div className="admin-card glass profiles-list-section">
          <h2><UserX size={20} className="icon-red" /> Active Staff Directory</h2>
          <p className="card-desc">Users who have fully activated their accounts. Promotion, suspension, or blocking takes effect immediately.</p>
          
          {isLoading ? (
            <div className="loader-box"><Loader2 className="spinner" size={24} /></div>
          ) : (
            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Staff Name</th>
                    <th>Dept / Title</th>
                    <th>Assigned Role</th>
                    <th>Access Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.length === 0 ? (
                    <tr><td colSpan={4} className="text-center text-muted">No active staff registered yet.</td></tr>
                  ) : (
                    profiles.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <div className="user-info">
                            <strong>{p.name || 'Anonymous User'}</strong>
                            <span>ID: {p.id.substring(0, 8)}...</span>
                          </div>
                        </td>
                        <td>
                          <div className="user-info">
                            <strong>{p.department || 'N/A'}</strong>
                            <span>{p.job_title || 'N/A'}</span>
                          </div>
                        </td>
                        <td>
                          <select 
                            value={p.role} 
                            onChange={(e) => handleUpdateUser('profile', p.id, { role: e.target.value as any })}
                            className="inline-select"
                          >
                            <option value="new_employee">Employee</option>
                            <option value="department_head">Dept Head</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td>
                          <div className="action-row">
                            <select 
                              value={p.status} 
                              onChange={(e) => handleUpdateUser('profile', p.id, { status: e.target.value as any })}
                              className={`status-select ${p.status}`}
                            >
                              <option value="active">Active</option>
                              <option value="suspended">Suspended</option>
                              <option value="blocked">Blocked</option>
                            </select>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .users-admin-container {
          padding: 2rem;
        }

        .page-header {
          margin-bottom: 2rem;
        }

        .page-header h1 {
          font-size: 2rem;
          margin-bottom: 0.5rem;
          color: var(--text);
        }

        .page-header p {
          color: var(--text-muted);
        }

        .status-banner {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 1.5rem;
          border-radius: 8px;
          margin-bottom: 2rem;
          font-size: 0.875rem;
        }

        .status-banner.success {
          background: rgba(34, 197, 94, 0.1);
          color: var(--success);
          border-color: rgba(34, 197, 94, 0.2);
        }

        .status-banner.error {
          background: rgba(239, 68, 68, 0.1);
          color: var(--error);
          border-color: rgba(239, 68, 68, 0.2);
        }

        .admin-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 2rem;
        }

        @media (min-width: 1024px) {
          .admin-grid {
            grid-template-columns: 350px 1fr;
          }
          .profiles-list-section {
            grid-column: span 2;
          }
        }

        .admin-card {
          padding: 2rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .admin-card h2 {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 1.25rem;
          font-weight: 600;
        }

        .icon-blue { color: var(--accent); }
        .icon-green { color: var(--success); }
        .icon-red { color: var(--error); }

        .card-desc {
          font-size: 0.875rem;
          color: var(--text-muted);
          margin-top: -1rem;
        }

        .pre-register-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group label {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
        }

        .form-group input, .form-group select {
          background: var(--surface);
          border: 1px solid var(--border);
          padding: 0.75rem;
          border-radius: 8px;
          color: var(--text);
          font-family: inherit;
          outline: none;
          transition: border-color 0.2s;
        }

        .form-group input:focus, .form-group select:focus {
          border-color: var(--accent);
        }

        .submit-btn {
          background: var(--primary);
          color: white;
          padding: 0.75rem;
          border-radius: 8px;
          font-weight: 600;
          transition: background 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .submit-btn:hover {
          background: var(--primary-hover);
        }

        .loader-box {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 150px;
        }

        .spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .table-responsive {
          overflow-x: auto;
        }

        .admin-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .admin-table th {
          padding: 1rem;
          border-bottom: 1px solid var(--glass-border);
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
        }

        .admin-table td {
          padding: 1rem;
          border-bottom: 1px solid var(--glass-border);
          vertical-align: middle;
        }

        .user-info {
          display: flex;
          flex-direction: column;
        }

        .user-info strong {
          font-size: 0.9375rem;
          color: var(--text);
        }

        .user-info span {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .inline-select {
          background: var(--surface);
          border: 1px solid var(--border);
          color: var(--text);
          padding: 0.4rem 0.6rem;
          border-radius: 6px;
          font-size: 0.875rem;
          outline: none;
        }

        .status-badge {
          display: inline-block;
          padding: 0.25rem 0.5rem;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .status-badge.active {
          background: rgba(34, 197, 94, 0.1);
          color: var(--success);
        }

        .status-badge.suspended {
          background: rgba(245, 158, 11, 0.1);
          color: #f59e0b;
        }

        .status-badge.blocked {
          background: rgba(239, 68, 68, 0.1);
          color: var(--error);
        }

        .status-select {
          border: 1px solid var(--border);
          padding: 0.4rem 0.8rem;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 600;
          outline: none;
          cursor: pointer;
        }

        .status-select.active {
          background: rgba(34, 197, 94, 0.1);
          color: var(--success);
          border-color: rgba(34, 197, 94, 0.2);
        }

        .status-select.suspended {
          background: rgba(245, 158, 11, 0.1);
          color: #f59e0b;
          border-color: rgba(245, 158, 11, 0.2);
        }

        .status-select.blocked {
          background: rgba(239, 68, 68, 0.1);
          color: var(--error);
          border-color: rgba(239, 68, 68, 0.2);
        }

        .text-center { text-align: center; }
        .text-muted { color: var(--text-muted); }
      `}</style>
    </div>
  );
}
