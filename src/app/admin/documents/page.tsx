'use client';

import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function AdminDocuments() {
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('General');
  const [content, setContent] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    setStatus('idle');

    try {
      const response = await fetch('/api/admin/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, department, content }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Upload failed');

      setStatus('success');
      setMessage('Document uploaded and embedded successfully!');
      setTitle('');
      setContent('');
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="documents-container animate-fade">
      <div className="page-header">
        <h1>Knowledge Base Management</h1>
        <p>Upload and index documents for the AI Assistant</p>
      </div>

      <div className="upload-section glass">
        <form onSubmit={handleUpload} className="upload-form">
          <div className="form-group">
            <label>Document Title</label>
            <input 
              type="text" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="e.g. Employee Handbook v1.2"
              required 
            />
          </div>

          <div className="form-group">
            <label>Department</label>
            <select value={department} onChange={(e) => setDepartment(e.target.value)}>
              <option value="General">General</option>
              <option value="Engineering">Engineering</option>
              <option value="HR">HR</option>
              <option value="Sales">Sales</option>
              <option value="Marketing">Marketing</option>
            </select>
          </div>

          <div className="form-group">
            <label>Content</label>
            <textarea 
              value={content} 
              onChange={(e) => setContent(e.target.value)} 
              placeholder="Paste the document content here..."
              rows={12}
              required 
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="submit-btn" disabled={isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="spinner" size={18} />
                  <span>Processing & Embedding...</span>
                </>
              ) : (
                <>
                  <Upload size={18} />
                  <span>Upload Document</span>
                </>
              )}
            </button>
          </div>

          {status !== 'idle' && (
            <div className={`status-message ${status}`}>
              {status === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
              <span>{message}</span>
            </div>
          )}
        </form>
      </div>

      <style jsx>{`
        .documents-container {
          padding: 2rem;
          max-width: 900px;
          margin: 0 auto;
        }

        .page-header {
          margin-bottom: 2rem;
        }

        .page-header h1 {
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }

        .page-header p {
          color: var(--text-muted);
        }

        .upload-section {
          padding: 2rem;
        }

        .upload-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
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

        .form-group input, .form-group select, .form-group textarea {
          background: var(--surface);
          border: 1px solid var(--border);
          padding: 0.75rem 1rem;
          border-radius: 8px;
          color: var(--text);
          font-family: inherit;
          transition: border-color 0.2s;
        }

        .form-group input:focus, .form-group textarea:focus {
          border-color: var(--primary);
          outline: none;
        }

        .submit-btn {
          background: var(--primary);
          color: white;
          padding: 0.75rem 2rem;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-weight: 600;
          transition: background 0.2s;
        }

        .submit-btn:hover:not(:disabled) {
          background: var(--primary-hover);
        }

        .submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .status-message {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          border-radius: 8px;
          font-size: 0.875rem;
        }

        .status-message.success {
          background: rgba(34, 197, 94, 0.1);
          color: var(--success);
        }

        .status-message.error {
          background: rgba(239, 68, 68, 0.1);
          color: var(--error);
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .spinner {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
