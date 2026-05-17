'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, CheckCircle2, Clock, AlertCircle, Loader2, ArrowUpRight, User, RefreshCw, Send } from 'lucide-react';

interface Escalation {
  id: string;
  user_id: string;
  dept_head_id: string | null;
  summary: string;
  status: 'open' | 'awaiting_response' | 'resolved';
  created_at: string;
  employee?: {
    name: string;
    department: string;
    job_title: string;
  };
  dept_head?: {
    name: string;
    department: string;
    job_title: string;
  };
}

interface EscalationMessage {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  sender?: {
    name: string;
    role: string;
  };
}

export default function AdminEscalations() {
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedEscalation, setSelectedEscalation] = useState<Escalation | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  // Chat message states
  const [messages, setMessages] = useState<EscalationMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  
  const messageEndRef = useRef<HTMLDivElement>(null);

  const fetchEscalations = async () => {
    setIsLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/escalations');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch escalations');
      setEscalations(data);
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ type: 'error', text: err.message || 'Failed to load escalations.' });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async (escalationId: string) => {
    setIsMessagesLoading(true);
    try {
      const res = await fetch(`/api/escalations/messages?escalationId=${escalationId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch messages');
      setMessages(data || []);
    } catch (err: any) {
      console.error('Messages load error:', err);
    } finally {
      setIsMessagesLoading(false);
    }
  };

  useEffect(() => {
    fetchEscalations();
  }, []);

  useEffect(() => {
    if (selectedEscalation) {
      fetchMessages(selectedEscalation.id);
    } else {
      setMessages([]);
    }
  }, [selectedEscalation]);

  // Scroll to bottom of chat
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleUpdateStatus = async (escalationId: string, newStatus: 'open' | 'awaiting_response' | 'resolved') => {
    setIsUpdating(escalationId);
    try {
      const res = await fetch('/api/escalations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ escalationId, status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update status');

      // Update state locally
      setEscalations(prev => prev.map(esc => esc.id === escalationId ? { ...esc, status: newStatus } : esc));
      if (selectedEscalation?.id === escalationId) {
        setSelectedEscalation(prev => prev ? { ...prev, status: newStatus } : null);
      }
      setStatusMsg({ type: 'success', text: 'Escalation status updated successfully.' });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to update status.' });
    } finally {
      setIsUpdating(null);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedEscalation) return;

    setIsSendingMessage(true);
    try {
      const res = await fetch('/api/escalations/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          escalationId: selectedEscalation.id,
          content: newMessage.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send message');

      setMessages(prev => [...prev, data]);
      setNewMessage('');
      
      // Post-send auto update tag to Awaiting Response locally
      setEscalations(prev => prev.map(esc => 
        esc.id === selectedEscalation.id ? { ...esc, status: 'awaiting_response' } : esc
      ));
      setSelectedEscalation(prev => prev ? { ...prev, status: 'awaiting_response' } : null);
    } catch (err: any) {
      alert(`Message dispatch failed: ${err.message}`);
    } finally {
      setIsSendingMessage(false);
    }
  };

  return (
    <div className="escalations-container animate-fade">
      <div className="page-header">
        <div className="header-info">
          <h1>Human Escalation Center</h1>
          <p>Review conversations flagged by the AI and manage support handoffs for department heads.</p>
        </div>
        <button onClick={fetchEscalations} className="refresh-btn glass" title="Refresh Tickets">
          <RefreshCw size={18} className={isLoading ? 'spinner' : ''} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {statusMsg && (
        <div className={`status-banner ${statusMsg.type} glass`}>
          {statusMsg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {isLoading ? (
        <div className="loader-box">
          <Loader2 className="spinner" size={32} />
          <p>Retrieving escalated onboarding cases...</p>
        </div>
      ) : (
        <div className="escalations-layout">
          {/* Left Panel: Active tickets list */}
          <div className="escalations-list-section glass">
            <h2>Active Tickets ({escalations.length})</h2>
            
            <div className="tickets-list">
              {escalations.length === 0 ? (
                <div className="empty-tickets">
                  <MessageSquare size={48} className="empty-icon" />
                  <p>All clear! No pending escalations in your queue.</p>
                </div>
              ) : (
                escalations.map((esc) => (
                  <div 
                    key={esc.id} 
                    className={`ticket-card glass ${selectedEscalation?.id === esc.id ? 'active' : ''}`}
                    onClick={() => setSelectedEscalation(esc)}
                  >
                    <div className="ticket-header">
                      <span className={`status-tag ${esc.status}`}>
                        {esc.status === 'open' && <AlertCircle size={12} />}
                        {esc.status === 'awaiting_response' && <Clock size={12} />}
                        {esc.status === 'resolved' && <CheckCircle2 size={12} />}
                        {esc.status.replace('_', ' ')}
                      </span>
                      <span className="ticket-date">
                        {new Date(esc.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="ticket-body">
                      <h3>{esc.employee?.name || 'Anonymous Employee'}</h3>
                      <p className="job-meta">{esc.employee?.job_title} • {esc.employee?.department}</p>
                      <p className="summary-snippet">{esc.summary}</p>
                    </div>

                    <div className="ticket-footer">
                      <div className="assignee">
                        <User size={12} />
                        <span>Head: {esc.dept_head?.name || 'Unassigned'}</span>
                      </div>
                      <ArrowUpRight size={16} className="arrow-icon" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Panel: Detail and communication channel */}
          <div className="escalation-detail-section">
            {selectedEscalation ? (
              <div className="detail-card glass animate-fade">
                <div className="detail-header">
                  <div>
                    <h2>Onboarding Case Details</h2>
                    <span className="esc-id">Ticket ID: {selectedEscalation.id}</span>
                  </div>
                  <div className="detail-status-actions">
                    <select 
                      value={selectedEscalation.status} 
                      onChange={(e) => handleUpdateStatus(selectedEscalation.id, e.target.value as any)}
                      disabled={isUpdating === selectedEscalation.id}
                      className={`status-dropdown ${selectedEscalation.status}`}
                    >
                      <option value="open">🔴 Open Case</option>
                      <option value="awaiting_response">🟡 Awaiting Hire</option>
                      <option value="resolved">🟢 Resolved</option>
                    </select>
                  </div>
                </div>

                <div className="detail-body">
                  <div className="meta-box glass">
                    <div className="meta-item">
                      <span className="label">Employee</span>
                      <strong>{selectedEscalation.employee?.name || 'N/A'}</strong>
                      <span>{selectedEscalation.employee?.job_title || 'N/A'} ({selectedEscalation.employee?.department})</span>
                    </div>
                    <div className="meta-item">
                      <span className="label">Assigned Dept Head</span>
                      <strong>{selectedEscalation.dept_head?.name || 'System Admin'}</strong>
                      <span>{selectedEscalation.dept_head?.job_title || 'General Department Administrator'}</span>
                    </div>
                    <div className="meta-item">
                      <span className="label">Escalated On</span>
                      <strong>{new Date(selectedEscalation.created_at).toLocaleString()}</strong>
                    </div>
                  </div>

                  <div className="summary-box">
                    <h3>AI Conversation Summary</h3>
                    <p className="summary-text glass">{selectedEscalation.summary}</p>
                  </div>

                  {/* Messaging Widget Section */}
                  <div className="case-chat-box glass">
                    <div className="chat-box-header">
                      <h3>💬 Live Ticket Communication Channel</h3>
                      <button 
                        onClick={() => fetchMessages(selectedEscalation.id)}
                        className="mini-refresh-btn" 
                        title="Reload Messages"
                        disabled={isMessagesLoading}
                      >
                        <RefreshCw size={14} className={isMessagesLoading ? 'spinner' : ''} />
                      </button>
                    </div>

                    <div className="chat-messages-scroll">
                      {isMessagesLoading && messages.length === 0 ? (
                        <div className="chat-loading">
                          <Loader2 className="spinner" size={20} />
                          <span>Fetching support log...</span>
                        </div>
                      ) : messages.length === 0 ? (
                        <div className="chat-empty">
                          <MessageSquare size={32} className="empty-icon" />
                          <p>Send a message to open contact with this new hire.</p>
                        </div>
                      ) : (
                        messages.map((msg) => {
                          const isSelf = msg.sender?.role === 'admin' || msg.sender?.role === 'department_head';
                          return (
                            <div key={msg.id} className={`chat-bubble-row ${isSelf ? 'self' : 'other'}`}>
                              <div className="chat-bubble glass">
                                <span className="sender-name">{msg.sender?.name || 'Anonymous User'}</span>
                                <p className="bubble-content">{msg.content}</p>
                                <span className="message-time">
                                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={messageEndRef} />
                    </div>

                    <form onSubmit={handleSendMessage} className="chat-input-bar">
                      <input 
                        type="text" 
                        placeholder="Type standard response or resolution guidelines..." 
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        required
                        disabled={isSendingMessage}
                      />
                      <button type="submit" className="send-btn" disabled={isSendingMessage || !newMessage.trim()}>
                        {isSendingMessage ? (
                          <Loader2 className="spinner" size={16} />
                        ) : (
                          <Send size={16} />
                        )}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            ) : (
              <div className="detail-placeholder glass">
                <MessageSquare size={64} className="placeholder-icon" />
                <h3>No Ticket Selected</h3>
                <p>Select a human escalation ticket from the sidebar queue to read the conversation summary and open the communication chat window.</p>
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .escalations-container {
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .header-info h1 {
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }

        .header-info p {
          color: var(--text-muted);
        }

        .refresh-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.6rem 1.2rem;
          border-radius: 8px;
          color: var(--text);
          font-weight: 600;
          transition: all 0.2s;
          cursor: pointer;
        }

        .refresh-btn:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: var(--accent);
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

        .loader-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 6rem 2rem;
          text-align: center;
          color: var(--text-muted);
          gap: 1rem;
        }

        .escalations-layout {
          display: grid;
          grid-template-columns: 1fr;
          gap: 2rem;
          height: calc(100vh - 200px);
        }

        @media (min-width: 1024px) {
          .escalations-layout {
            grid-template-columns: 380px 1fr;
          }
        }

        .escalations-list-section {
          padding: 2rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          height: 100%;
          overflow: hidden;
        }

        .escalations-list-section h2 {
          font-size: 1.25rem;
          font-weight: 600;
        }

        .tickets-list {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          padding-right: 0.25rem;
        }

        /* Scrollbar styles */
        .tickets-list::-webkit-scrollbar {
          width: 4px;
        }
        .tickets-list::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
        }

        .empty-tickets {
          text-align: center;
          padding: 4rem 1rem;
          color: var(--text-muted);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .empty-icon {
          opacity: 0.3;
        }

        .ticket-card {
          padding: 1.25rem;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border-color: var(--glass-border);
          background: rgba(255, 255, 255, 0.01);
        }

        .ticket-card:hover {
          background: rgba(255, 255, 255, 0.03);
          border-color: var(--accent);
          transform: translateY(-2px);
        }

        .ticket-card.active {
          background: rgba(56, 189, 248, 0.08);
          border-color: var(--accent);
          box-shadow: 0 0 15px rgba(56, 189, 248, 0.05);
        }

        .ticket-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }

        .status-tag {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.2rem 0.5rem;
          border-radius: 20px;
          font-size: 0.6875rem;
          font-weight: 700;
          text-transform: uppercase;
        }

        .status-tag.open {
          background: rgba(239, 68, 68, 0.1);
          color: var(--error);
        }

        .status-tag.awaiting_response {
          background: rgba(245, 158, 11, 0.1);
          color: #f59e0b;
        }

        .status-tag.resolved {
          background: rgba(34, 197, 94, 0.1);
          color: var(--success);
        }

        .ticket-date {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .ticket-body h3 {
          font-size: 1.0625rem;
          margin-bottom: 0.25rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .job-meta {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-bottom: 0.75rem;
        }

        .summary-snippet {
          font-size: 0.8125rem;
          color: var(--text-muted);
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .ticket-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 1rem;
          padding-top: 0.75rem;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .assignee {
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }

        .arrow-icon {
          opacity: 0.5;
        }

        .ticket-card:hover .arrow-icon {
          opacity: 1;
          color: var(--accent);
        }

        .escalation-detail-section {
          height: 100%;
          overflow: hidden;
        }

        .detail-placeholder {
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          text-align: center;
          color: var(--text-muted);
          gap: 1rem;
        }

        .placeholder-icon {
          opacity: 0.15;
          color: var(--text-muted);
        }

        .detail-placeholder h3 {
          font-size: 1.25rem;
          color: var(--text);
        }

        .detail-placeholder p {
          max-width: 400px;
          font-size: 0.875rem;
          line-height: 1.5;
        }

        .detail-card {
          padding: 2rem;
          height: 100%;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .detail-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1.25rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--border);
        }

        .esc-id {
          font-size: 0.75rem;
          color: var(--text-muted);
          text-transform: uppercase;
        }

        .status-dropdown {
          background: var(--surface);
          border: 1px solid var(--border);
          color: var(--text);
          padding: 0.5rem 1rem;
          border-radius: 8px;
          font-weight: 600;
          outline: none;
          cursor: pointer;
        }

        .status-dropdown.open { border-color: var(--error); color: var(--error); }
        .status-dropdown.awaiting_response { border-color: #f59e0b; color: #f59e0b; }
        .status-dropdown.resolved { border-color: var(--success); color: var(--success); }

        .detail-body {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          padding-right: 0.25rem;
        }

        .detail-body::-webkit-scrollbar {
          width: 4px;
        }
        .detail-body::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.08);
          border-radius: 2px;
        }

        .meta-box {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          padding: 1.25rem;
          background: rgba(255, 255, 255, 0.01);
        }

        .meta-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .meta-item .label {
          font-size: 0.6875rem;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .meta-item strong {
          font-size: 0.9375rem;
        }

        .meta-item span {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .summary-box {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .summary-box h3 {
          font-size: 1rem;
          font-weight: 600;
        }

        .summary-text {
          padding: 1rem 1.25rem;
          line-height: 1.5;
          white-space: pre-wrap;
          font-size: 0.875rem;
          background: rgba(255, 255, 255, 0.015);
        }

        /* Messaging Panel Styles */
        .case-chat-box {
          border-radius: 10px;
          display: flex;
          flex-direction: column;
          border: 1px solid var(--glass-border);
          overflow: hidden;
          background: rgba(255, 255, 255, 0.01);
        }

        .chat-box-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1.25rem;
          background: rgba(255, 255, 255, 0.03);
          border-bottom: 1px solid var(--border);
        }

        .chat-box-header h3 {
          font-size: 0.875rem;
          font-weight: 600;
        }

        .mini-refresh-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 4px;
          display: flex;
          align-items: center;
          transition: all 0.2s;
        }

        .mini-refresh-btn:hover {
          color: var(--accent);
          background: rgba(255, 255, 255, 0.05);
        }

        .chat-messages-scroll {
          height: 250px;
          overflow-y: auto;
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          background: rgba(0, 0, 0, 0.1);
        }

        .chat-messages-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .chat-messages-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.08);
          border-radius: 2px;
        }

        .chat-loading, .chat-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: var(--text-muted);
          gap: 0.5rem;
          font-size: 0.8125rem;
        }

        .chat-bubble-row {
          display: flex;
          width: 100%;
        }

        .chat-bubble-row.self {
          justify-content: flex-end;
        }

        .chat-bubble-row.other {
          justify-content: flex-start;
        }

        .chat-bubble {
          max-width: 80%;
          padding: 0.75rem 1rem;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          border: 1px solid var(--glass-border);
        }

        .chat-bubble-row.self .chat-bubble {
          background: rgba(56, 189, 248, 0.1);
          border-color: rgba(56, 189, 248, 0.2);
          border-bottom-right-radius: 2px;
        }

        .chat-bubble-row.other .chat-bubble {
          background: rgba(255, 255, 255, 0.02);
          border-color: var(--glass-border);
          border-bottom-left-radius: 2px;
        }

        .sender-name {
          font-size: 0.6875rem;
          font-weight: 700;
          color: var(--accent);
          text-transform: uppercase;
        }

        .chat-bubble-row.other .sender-name {
          color: #f59e0b;
        }

        .bubble-content {
          font-size: 0.875rem;
          line-height: 1.4;
          word-break: break-word;
        }

        .message-time {
          font-size: 0.6875rem;
          color: var(--text-muted);
          align-self: flex-end;
        }

        .chat-input-bar {
          display: flex;
          border-top: 1px solid var(--border);
          background: var(--surface);
        }

        .chat-input-bar input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: var(--text);
          padding: 0.85rem 1.25rem;
          font-family: inherit;
          font-size: 0.875rem;
        }

        .send-btn {
          background: transparent;
          border: none;
          color: var(--accent);
          padding: 0 1.25rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .send-btn:hover:not(:disabled) {
          color: white;
          background: rgba(56, 189, 248, 0.15);
        }

        .send-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
