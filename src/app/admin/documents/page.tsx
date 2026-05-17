'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, FileUp, X, Sparkles, Trash2, Search } from 'lucide-react';

interface DocumentItem {
  id: string;
  title: string;
  department: string;
  created_at: string;
}

export default function AdminDocuments() {
  const [activeTab, setActiveTab] = useState<'file' | 'text'>('file');
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('General');
  const [content, setContent] = useState('');
  
  // File upload states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [chunksCreated, setChunksCreated] = useState<number | null>(null);

  // Document list states
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isListLoading, setIsListLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch indexed documents
  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/admin/documents');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch documents');
      setDocuments(data.documents || []);
    } catch (err: any) {
      console.error('Error fetching documents:', err);
    } finally {
      setIsListLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      validateAndSetFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      validateAndSetFile(file);
    }
  };

  const validateAndSetFile = (file: File) => {
    const validExtensions = ['.pdf', '.txt'];
    const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (validExtensions.includes(extension)) {
      setSelectedFile(file);
      setStatus('idle');
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
    } else {
      setStatus('error');
      setMessage('Invalid file format. Please upload a .pdf or .txt file.');
      setSelectedFile(null);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    setStatus('idle');
    setChunksCreated(null);

    try {
      let res;
      if (activeTab === 'file') {
        if (!selectedFile) {
          throw new Error('Please select a file to upload first.');
        }

        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('title', title);
        formData.append('department', department);

        res = await fetch('/api/admin/documents', {
          method: 'POST',
          body: formData,
        });
      } else {
        if (!content.trim()) {
          throw new Error('Please paste the document content text first.');
        }

        res = await fetch('/api/admin/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, department, content }),
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to process document');

      setStatus('success');
      setMessage(`Document successfully chunked, vectorized, and integrated into RAG Memory!`);
      setChunksCreated(data.chunksCount || null);
      
      // Reset form
      setTitle('');
      setContent('');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      // Refresh list
      fetchDocuments();
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm('Are you sure you want to permanently delete this document and remove its text chunks from the AI vector database?')) return;
    setDeletingId(docId);
    try {
      const res = await fetch(`/api/admin/documents?id=${docId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete');
      
      // Remove from state
      setDocuments(prev => prev.filter(d => d.id !== docId));
    } catch (err: any) {
      alert(`Error deleting document: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredDocuments = documents.filter(doc =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="documents-container animate-fade">
      <div className="page-header">
        <h1>Company Knowledge Base</h1>
        <p>Index training manuals, employee policies, or troubleshooting guides into the AI Assistant's departmental memory.</p>
      </div>

      <div className="main-layout">
        {/* Left Column: Form Section */}
        <div className="form-column">
          <div className="tab-bar glass">
            <button 
              className={`tab-btn ${activeTab === 'file' ? 'active' : ''}`}
              onClick={() => { setActiveTab('file'); setStatus('idle'); }}
              type="button"
            >
              <FileUp size={16} />
              <span>Upload Document File</span>
            </button>
            <button 
              className={`tab-btn ${activeTab === 'text' ? 'active' : ''}`}
              onClick={() => { setActiveTab('text'); setStatus('idle'); }}
              type="button"
            >
              <FileText size={16} />
              <span>Paste Text Content</span>
            </button>
          </div>

          <div className="upload-section glass">
            <form onSubmit={handleUpload} className="upload-form">
              <div className="meta-row">
                <div className="form-group flex-1">
                  <label>Document Title</label>
                  <input 
                    type="text" 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                    placeholder={selectedFile ? selectedFile.name.replace(/\.[^/.]+$/, "") : "e.g. Employee Support Manual"}
                    required 
                  />
                </div>

                <div className="form-group flex-1">
                  <label>Department Access</label>
                  <select value={department} onChange={(e) => setDepartment(e.target.value)}>
                    <option value="General">General (All Hires)</option>
                    <option value="Support">Customer Support</option>
                    <option value="Engineering">Engineering</option>
                    <option value="HR">HR / Culture</option>
                    <option value="Sales">Sales & Growth</option>
                    <option value="Marketing">Marketing</option>
                  </select>
                </div>
              </div>

              {activeTab === 'file' ? (
                <div className="form-group">
                  <label>Document File (.PDF or .TXT)</label>
                  <div 
                    className={`dropzone glass ${isDragOver ? 'dragover' : ''} ${selectedFile ? 'has-file' : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={selectedFile ? undefined : triggerFileSelect}
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange}
                      accept=".pdf,.txt"
                      style={{ display: 'none' }}
                    />

                    {selectedFile ? (
                      <div className="selected-file-box">
                        <div className="file-info-icon">
                          <FileText size={36} className="icon-pulse" />
                        </div>
                        <div className="file-details">
                          <strong>{selectedFile.name}</strong>
                          <span>{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                        </div>
                        <button type="button" className="remove-file-btn" onClick={removeSelectedFile}>
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="dropzone-empty">
                        <Upload size={32} className="upload-icon" />
                        <strong>Drag & drop your document here</strong>
                        <span>or click to browse local files</span>
                        <span className="file-hint">Supports PDF and plain text documents</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="form-group">
                  <label>Copy-Paste Content</label>
                  <textarea 
                    value={content} 
                    onChange={(e) => setContent(e.target.value)} 
                    placeholder="Paste the handbook or documentation markdown/text content here..."
                    rows={10}
                    required 
                  />
                </div>
              )}

              <div className="form-actions">
                <button type="submit" className="submit-btn" disabled={isUploading || (activeTab === 'file' && !selectedFile)}>
                  {isUploading ? (
                    <>
                      <Loader2 className="spinner" size={16} />
                      <span>Chunking & Vectorizing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>Index Document Memory</span>
                    </>
                  )}
                </button>
              </div>

              {status !== 'idle' && (
                <div className={`status-message ${status} glass`}>
                  {status === 'success' ? (
                    <>
                      <CheckCircle size={18} className="icon-success" />
                      <div className="msg-text">
                        <strong>Ingested Successfully!</strong>
                        <p>{message} {chunksCreated && `Generated ${chunksCreated} vector overlapping chunks.`}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <AlertCircle size={18} className="icon-error" />
                      <div className="msg-text">
                        <strong>Processing Error</strong>
                        <p>{message}</p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Right Column: List Section */}
        <div className="list-column glass">
          <div className="list-header">
            <h2>Indexed Materials</h2>
            <p>Live vector embeddings inside postgres (pgvector)</p>
          </div>

          <div className="search-box glass">
            <Search size={16} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search indexed knowledge..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {isListLoading ? (
            <div className="list-loading-box">
              <Loader2 className="spinner" size={24} />
              <span>Fetching current document library...</span>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="empty-list-box">
              <FileText size={32} className="empty-icon" />
              <p>{searchQuery ? 'No documents match your search.' : 'No materials indexed yet.'}</p>
            </div>
          ) : (
            <div className="doc-scroll-list">
              {filteredDocuments.map(doc => (
                <div key={doc.id} className="doc-card glass">
                  <div className="doc-info">
                    <h4>{doc.title}</h4>
                    <div className="doc-meta-badges">
                      <span className={`dept-badge ${doc.department.toLowerCase()}`}>
                        {doc.department}
                      </span>
                      <span className="doc-date">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <button 
                    className="delete-doc-btn" 
                    onClick={() => handleDelete(doc.id)}
                    disabled={deletingId === doc.id}
                    title="Delete document"
                  >
                    {deletingId === doc.id ? (
                      <Loader2 className="spinner" size={16} />
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .documents-container {
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

        .main-layout {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 2rem;
          align-items: start;
        }

        @media (max-width: 1024px) {
          .main-layout {
            grid-template-columns: 1fr;
          }
        }

        .form-column {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .tab-bar {
          display: flex;
          gap: 0.5rem;
          padding: 0.4rem;
          border-radius: 10px;
        }

        .tab-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.65rem 1rem;
          border-radius: 6px;
          border: none;
          background: transparent;
          color: var(--text-muted);
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.2s;
        }

        .tab-btn.active {
          background: rgba(56, 189, 248, 0.1);
          color: var(--accent);
        }

        .tab-btn:hover:not(.active) {
          color: var(--text);
          background: rgba(255, 255, 255, 0.02);
        }

        .upload-section {
          padding: 2rem;
          border-radius: 12px;
        }

        .upload-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .meta-row {
          display: flex;
          gap: 1.25rem;
        }

        @media (max-width: 640px) {
          .meta-row {
            flex-direction: column;
          }
        }

        .flex-1 {
          flex: 1;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .form-group label {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
        }

        .form-group input, .form-group select, .form-group textarea {
          background: var(--surface);
          border: 1px solid var(--border);
          padding: 0.75rem 1rem;
          border-radius: 8px;
          color: var(--text);
          font-family: inherit;
          outline: none;
          transition: border-color 0.2s;
        }

        .form-group input:focus, .form-group select:focus, .form-group textarea:focus {
          border-color: var(--accent);
        }

        .dropzone {
          border: 2px dashed var(--border);
          border-radius: 10px;
          padding: 2.5rem 1.5rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .dropzone.dragover {
          border-color: var(--accent);
          background: rgba(56, 189, 248, 0.05);
        }

        .dropzone.has-file {
          border-style: solid;
          cursor: default;
          padding: 1.5rem;
        }

        .dropzone-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.4rem;
        }

        .upload-icon {
          color: var(--text-muted);
          margin-bottom: 0.25rem;
        }

        .dropzone:hover:not(.has-file) .upload-icon {
          color: var(--accent);
          transform: translateY(-2px);
          transition: transform 0.2s;
        }

        .dropzone-empty strong {
          font-size: 0.9375rem;
        }

        .dropzone-empty span {
          font-size: 0.8125rem;
          color: var(--text-muted);
        }

        .file-hint {
          font-size: 0.75rem !important;
          opacity: 0.6;
        }

        .selected-file-box {
          display: flex;
          align-items: center;
          gap: 1rem;
          text-align: left;
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid var(--border);
          padding: 0.75rem 1rem;
          border-radius: 8px;
        }

        .file-info-icon {
          width: 44px;
          height: 44px;
          background: rgba(56, 189, 248, 0.1);
          color: var(--accent);
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .file-details {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .file-details strong {
          font-size: 0.875rem;
          word-break: break-all;
        }

        .file-details span {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .remove-file-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          padding: 0.4rem;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
        }

        .remove-file-btn:hover {
          background: rgba(239, 68, 68, 0.1);
          color: var(--error);
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
        }

        .submit-btn {
          background: var(--primary);
          color: white;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          transition: background 0.2s;
          border: none;
        }

        .submit-btn:hover:not(:disabled) {
          background: var(--primary-hover);
        }

        .submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .status-message {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 1rem 1.25rem;
          border-radius: 10px;
          font-size: 0.8125rem;
          border: 1px solid var(--border);
        }

        .status-message.success {
          background: rgba(34, 197, 94, 0.03);
          border-color: rgba(34, 197, 94, 0.15);
        }

        .status-message.error {
          background: rgba(239, 68, 68, 0.03);
          border-color: rgba(239, 68, 68, 0.15);
        }

        .icon-success { color: var(--success); }
        .icon-error { color: var(--error); }

        .msg-text strong {
          display: block;
          margin-bottom: 0.125rem;
        }

        .msg-text p {
          color: var(--text-muted);
          line-height: 1.4;
        }

        /* List column styles */
        .list-column {
          padding: 2rem;
          border-radius: 12px;
          height: 520px;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .list-header h2 {
          font-size: 1.25rem;
          font-weight: 600;
        }

        .list-header p {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-top: 0.125rem;
        }

        .search-box {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.6rem 1rem;
          border-radius: 8px;
          border: 1px solid var(--border);
        }

        .search-icon {
          color: var(--text-muted);
        }

        .search-box input {
          background: transparent;
          border: none;
          outline: none;
          color: var(--text);
          font-family: inherit;
          width: 100%;
          font-size: 0.875rem;
        }

        .list-loading-box, .empty-list-box {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          color: var(--text-muted);
          font-size: 0.875rem;
        }

        .empty-icon {
          opacity: 0.4;
        }

        .doc-scroll-list {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          padding-right: 0.25rem;
        }

        /* Customize scrollbar */
        .doc-scroll-list::-webkit-scrollbar {
          width: 6px;
        }
        .doc-scroll-list::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }

        .doc-card {
          padding: 1rem;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          border: 1px solid var(--glass-border);
          transition: all 0.2s;
        }

        .doc-card:hover {
          border-color: rgba(56, 189, 248, 0.2);
          background: rgba(255, 255, 255, 0.01);
        }

        .doc-info {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          flex: 1;
          min-width: 0;
        }

        .doc-info h4 {
          font-size: 0.875rem;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .doc-meta-badges {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .dept-badge {
          font-size: 0.6875rem;
          font-weight: 700;
          padding: 0.15rem 0.4rem;
          border-radius: 4px;
          text-transform: uppercase;
        }

        /* Badges styles */
        .dept-badge.general { background: rgba(255, 255, 255, 0.08); color: var(--text-muted); }
        .dept-badge.engineering { background: rgba(56, 189, 248, 0.1); color: var(--accent); }
        .dept-badge.hr { background: rgba(34, 197, 94, 0.1); color: var(--success); }
        .dept-badge.support { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
        .dept-badge.sales { background: rgba(236, 72, 153, 0.1); color: #ec4899; }
        .dept-badge.marketing { background: rgba(168, 85, 247, 0.1); color: #a855f7; }

        .doc-date {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .delete-doc-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          padding: 0.5rem;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .delete-doc-btn:hover:not(:disabled) {
          color: var(--error);
          background: rgba(239, 68, 68, 0.1);
        }

        .delete-doc-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .icon-pulse {
          animation: pulse 2s infinite ease-in-out;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(0.96); }
        }
      `}</style>
    </div>
  );
}
