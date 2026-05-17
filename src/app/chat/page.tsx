'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useChat } from 'ai/react';
import { Mic, Send, Bot, User, Paperclip, AlertCircle, Loader2, Square, Menu, X, Plus, Trash2, ShieldCheck, LogOut, CheckCircle, FileText, Camera } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

interface UserProfile {
  id: string;
  name: string;
  department: string;
  job_title: string;
  role: 'new_employee' | 'department_head' | 'admin';
  status: string;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  status: string;
}

export default function ChatPage() {
  const router = useRouter();
  const supabase = createClient();

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [department, setDepartment] = useState('General');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [escalationStatus, setEscalationStatus] = useState<'idle' | 'escalating' | 'success' | 'error'>('idle');

  // Custom Avatar upload states
  const [avatarTimestamp, setAvatarTimestamp] = useState<number>(Date.now());
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Vercel AI SDK hook
  const { messages, input, handleInputChange, handleSubmit, isLoading, error, setMessages, setInput } = useChat({
    api: '/api/chat',
    body: {
      department,
      conversationId: activeConversationId,
      userId: userProfile?.id,
    },
  });

  // Verify auth session and load user profile
  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      // 1. Try to get session from local storage/cookies quickly
      const { data: { session } } = await supabase.auth.getSession();
      let user = session?.user || null;

      // 2. If no user from session, try getUser (fresh API request)
      if (!user) {
        const { data: { user: freshUser } } = await supabase.auth.getUser();
        user = freshUser;
      }

      // 3. Grace period check: if still no user, wait 300ms to allow client-side hydration to catch up, then try once more
      if (!user) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        const { data: { user: retryUser } } = await supabase.auth.getUser();
        user = retryUser;
      }

      if (!user) {
        if (isMounted) {
          console.warn('No active session found. Redirecting to login.');
          router.push('/login');
        }
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (isMounted) {
        if (error || !profile) {
          console.warn('Profile not found in database or RLS block, initializing client-side self-healing profile:', error);
          const fallbackProfile: UserProfile = {
            id: user.id,
            name: user.email?.split('@')[0] || 'Staff Member',
            role: 'new_employee',
            department: 'General',
            job_title: 'Staff Member',
            status: 'active'
          };
          setUserProfile(fallbackProfile);
          setDepartment('General');
        } else {
          setUserProfile(profile);
          if (profile.department) {
            setDepartment(profile.department);
          }
        }
      }
    };

    checkSession();

    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch list of conversations for sidebar
  const loadConversations = async () => {
    try {
      const res = await fetch('/api/conversations');
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch (err) {
      console.error('Error loading conversations:', err);
    }
  };

  useEffect(() => {
    if (userProfile) {
      loadConversations();
    }
  }, [userProfile]);

  // Load selected conversation history
  useEffect(() => {
    if (activeConversationId) {
      const loadHistory = async () => {
        try {
          const res = await fetch(`/api/conversations?conversationId=${activeConversationId}`);
          if (res.ok) {
            const data = await res.json();
            const formatted = data.map((m: any) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              createdAt: new Date(m.created_at),
            }));
            setMessages(formatted);
          }
        } catch (err) {
          console.error('Error fetching chat history:', err);
        }
      };
      loadHistory();
      setEscalationStatus('idle');
    } else {
      setMessages([]);
    }
  }, [activeConversationId]);

  // Scroll to bottom when messages are appended
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Department color brand mapper
  const getDeptBranding = (dept: string) => {
    switch (dept) {
      case 'Engineering':
        return { primary: '#2563eb', hover: '#1d4ed8', themeName: 'Engineering Brand', accent: '#60a5fa' };
      case 'HR':
        return { primary: '#10b981', hover: '#059669', themeName: 'Culture/HR Green', accent: '#34d399' };
      case 'Support':
        return { primary: '#8b5cf6', hover: '#7c3aed', themeName: 'Violet Support', accent: '#a78bfa' };
      case 'Sales':
        return { primary: '#f59e0b', hover: '#d97706', themeName: 'Amber Growth', accent: '#fbbf24' };
      default:
        return { primary: '#0ea5e9', hover: '#0284c7', themeName: 'Standard Cyan', accent: '#38bdf8' };
    }
  };

  const branding = getDeptBranding(department);

  // Audio Recording (Groq Whisper)
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('file', audioBlob);

        try {
          setIsTranscribing(true);
          const res = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData,
          });
          const data = await res.json();
          if (data.text) {
            handleInputChange({ target: { value: data.text } } as any);
          }
        } catch (err) {
          console.error('Error transcribing audio:', err);
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error starting audio recording:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
    }
  };

  const toggleRecording = () => {
    if (!isRecording) {
      startRecording();
    } else {
      stopRecording();
    }
  };

  const handleCustomSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    let currentId = activeConversationId;

    if (!currentId) {
      try {
        const res = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: input.substring(0, 30) || 'New Onboarding Chat' }),
        });
        if (res.ok) {
          const newConv = await res.json();
          currentId = newConv.id;
          setActiveConversationId(newConv.id);
          loadConversations();
        }
      } catch (err) {
        console.error('Failed to create new conversation session:', err);
      }
    }

    handleSubmit(e, {
      body: {
        department,
        conversationId: currentId,
        userId: userProfile?.id,
      },
    });
  };

  const handleStartNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
    setInput('');
    setEscalationStatus('idle');
  };

  const handleDeleteConversation = async (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this chat session permanently?')) return;
    try {
      const res = await fetch('/api/conversations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId }),
      });
      if (res.ok) {
        if (activeConversationId === conversationId) {
          handleStartNewChat();
        }
        loadConversations();
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  const handleEscalateToHuman = async () => {
    if (!activeConversationId || !userProfile) return;
    setEscalationStatus('escalating');
    try {
      const { data: heads } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'department_head')
        .eq('department', department)
        .limit(1);

      let assigneeId = heads && heads.length > 0 ? heads[0].id : null;

      if (!assigneeId) {
        const { data: admins } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'admin')
          .limit(1);
        assigneeId = admins && admins.length > 0 ? admins[0].id : null;
      }

      const res = await fetch('/api/escalations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: activeConversationId,
          userId: userProfile.id,
          departmentHeadId: assigneeId,
        }),
      });

      if (res.ok) {
        setEscalationStatus('success');
      } else {
        setEscalationStatus('error');
      }
    } catch (err) {
      console.error('Error during escalation process:', err);
      setEscalationStatus('error');
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // Avatar Upload Logic
  const handleAvatarClick = () => {
    avatarInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !userProfile) return;
    const file = e.target.files[0];
    
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('Image file must be smaller than 2MB.');
      return;
    }

    setIsAvatarUploading(true);
    setAvatarError(false);
    try {
      const fileName = `${userProfile.id}.png`;
      const { error } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          contentType: 'image/png',
          upsert: true
        });

      if (error) throw error;
      setAvatarTimestamp(Date.now());
    } catch (err: any) {
      console.error('Avatar upload error:', err);
      alert(`Avatar upload failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsAvatarUploading(false);
    }
  };

  // Helper to parse sources out of the LLM responses
  const parseSources = (text: string) => {
    const marker = "📚 Sources Cited:";
    const markerIndex = text.indexOf(marker);
    
    if (markerIndex === -1) {
      return { cleanText: text, sources: [] as string[] };
    }
    
    const cleanText = text.substring(0, markerIndex).trim();
    const sourcesPart = text.substring(markerIndex + marker.length);
    
    const sources = sourcesPart
      .split('\n')
      .map(line => line.replace(/^-\s*/, '').trim())
      .filter(line => line.length > 0);
      
    return { cleanText, sources };
  };

  return (
    <div className="portal-container" style={{
      '--primary': branding.primary,
      '--primary-hover': branding.hover,
      '--accent': branding.accent,
    } as React.CSSProperties}>
      
      {/* Sidebar Panel */}
      <aside className={`portal-sidebar glass ${isSidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="logo-box">
            <Bot size={24} className="icon-pulse" />
            <h2>AI Assistant</h2>
          </div>
          <button className="toggle-close" onClick={() => setIsSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <button onClick={handleStartNewChat} className="new-chat-btn">
          <Plus size={18} />
          <span>New Chat Session</span>
        </button>

        <div className="sessions-list">
          <h3>Recent Onboarding Chats</h3>
          {conversations.length === 0 ? (
            <p className="no-chats">No previous chats. Start by sending a message!</p>
          ) : (
            conversations.map((c) => (
              <div 
                key={c.id} 
                className={`session-card ${activeConversationId === c.id ? 'active' : ''}`}
                onClick={() => setActiveConversationId(c.id)}
              >
                <div className="session-info">
                  <span className="session-title">{c.title}</span>
                  <span className="session-date">{new Date(c.created_at).toLocaleDateString()}</span>
                </div>
                <button 
                  onClick={(e) => handleDeleteConversation(e, c.id)} 
                  className="delete-session"
                  title="Delete Chat Session"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="sidebar-footer">
          {userProfile && (
            <div className="profile-info">
              <div 
                className="avatar-upload-wrapper" 
                onClick={handleAvatarClick}
                title="Click to upload custom picture"
              >
                <input 
                  type="file" 
                  ref={avatarInputRef} 
                  onChange={handleAvatarChange} 
                  accept="image/*" 
                  style={{ display: 'none' }} 
                />
                <div className="avatar-circle glass">
                  {isAvatarUploading ? (
                    <Loader2 className="spinner" size={16} />
                  ) : !avatarError ? (
                    <img 
                      src={`https://lipaoxkalejwkfcqdoqf.supabase.co/storage/v1/object/public/avatars/${userProfile.id}.png?t=${avatarTimestamp}`}
                      alt={userProfile.name}
                      onError={() => setAvatarError(true)}
                    />
                  ) : (
                    userProfile.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'E'
                  )}
                  <div className="avatar-hover-overlay">
                    <Camera size={14} />
                  </div>
                </div>
              </div>
              <div className="details">
                <strong>{userProfile.name}</strong>
                <span>{userProfile.job_title}</span>
              </div>
            </div>
          )}
          <div className="footer-actions">
            {userProfile?.role === 'admin' && (
              <button onClick={() => router.push('/admin')} className="admin-redirect-btn glass" title="Admin Panel">
                <ShieldCheck size={18} />
                <span>Admin Panel</span>
              </button>
            )}
            <button onClick={handleSignOut} className="sign-out-btn" title="Sign Out">
              <LogOut size={18} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Chat Interface */}
      <main className="chat-main">
        <header className="chat-header glass">
          <div className="left">
            <button className="hamburger" onClick={() => setIsSidebarOpen(true)}>
              <Menu size={24} />
            </button>
            <div className="bot-status-wrapper">
              <div className="avatar-box">
                <Bot size={22} />
              </div>
              <div>
                <h1>Company Onboarding AI</h1>
                <span className="online-pill">Active Agent</span>
              </div>
            </div>
          </div>

          <div className="header-actions">
            <div className="dept-pill glass">
              <span className="label">Department:</span>
              <select 
                value={department} 
                onChange={(e) => setDepartment(e.target.value)}
                className="department-select"
              >
                <option value="General">General (Default)</option>
                <option value="Engineering">Engineering Branch</option>
                <option value="HR">HR / Culture</option>
                <option value="Support">Customer Support</option>
                <option value="Sales">Sales & Growth</option>
              </select>
            </div>

            {activeConversationId && (
              <button 
                onClick={handleEscalateToHuman} 
                disabled={escalationStatus === 'escalating' || escalationStatus === 'success'}
                className={`escalate-btn ${escalationStatus}`}
              >
                {escalationStatus === 'escalating' && <Loader2 className="spinner" size={16} />}
                {escalationStatus === 'success' && <CheckCircle size={16} />}
                {escalationStatus === 'idle' && <span>Escalate to Human</span>}
                {escalationStatus === 'escalating' && <span>Summarizing Chat...</span>}
                {escalationStatus === 'success' && <span>Handoff Dispatched</span>}
                {escalationStatus === 'error' && <span>Escalation Failed</span>}
              </button>
            )}
          </div>
        </header>

        {/* Message Container Area */}
        <div className="messages-area" ref={scrollRef}>
          {escalationStatus === 'success' && (
            <div className="escalated-banner glass animate-fade">
              <CheckCircle className="icon-success" size={24} />
              <div className="banner-text">
                <h3>Conversation Escalated to Department Head</h3>
                <p>The AI has generated a concise summary of this interaction and created a ticket. A department lead will review and respond shortly.</p>
              </div>
            </div>
          )}

          {messages.length === 0 && (
            <div className="welcome-section animate-fade">
              <Bot size={54} className="welcome-logo" />
              <h2>Welcome to the team, {userProfile?.name?.split(' ')[0] || 'Hire'}!</h2>
              <p>I am your dedicated 24/7 AI Onboarding Assistant. Ask me questions about company policies, department systems, handbook guidelines, or tools setup.</p>
              
              <div className="prompt-suggestions">
                <button onClick={() => handleInputChange({ target: { value: 'What is the company vacation policy?' } } as any)}>
                  "What is the vacation policy?"
                </button>
                <button onClick={() => handleInputChange({ target: { value: 'How do I set up my corporate email and accounts?' } } as any)}>
                  "How do I set up my email?"
                </button>
                <button onClick={() => handleInputChange({ target: { value: 'What tools are used in my department?' } } as any)}>
                  "What tools does my department use?"
                </button>
              </div>
            </div>
          )}

          {messages.map((m) => {
            const { cleanText, sources } = parseSources(m.content);
            return (
              <div key={m.id} className={`message-wrapper ${m.role}`}>
                <div className={`message-bubble ${m.role} glass`}>
                  <div className="avatar-icon">
                    {m.role === 'user' ? (
                      userProfile && !avatarError ? (
                        <img 
                          src={`https://lipaoxkalejwkfcqdoqf.supabase.co/storage/v1/object/public/avatars/${userProfile.id}.png?t=${avatarTimestamp}`}
                          alt={userProfile.name}
                          className="user-bubble-avatar"
                          onError={() => setAvatarError(true)}
                        />
                      ) : (
                        <User size={16} />
                      )
                    ) : (
                      <Bot size={16} />
                    )}
                  </div>
                  <div className="message-content-wrapper">
                    <div className="message-content">{cleanText}</div>
                    
                    {/* Render visual RAG sources */}
                    {sources.length > 0 && (
                      <div className="citations-section">
                        <div className="citations-header">
                          <Paperclip size={10} />
                          <span>VERIFIED HANDBOOK SOURCES</span>
                        </div>
                        <div className="citations-grid">
                          {sources.map((src, idx) => (
                            <div key={idx} className="citation-card glass">
                              <FileText size={12} className="icon-blue" />
                              <span>{src}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Bouncing dots natural typing indicator */}
          {isLoading && (
            <div className="message-wrapper assistant">
              <div className="message-bubble assistant glass typing-bubble">
                <div className="avatar-icon">
                  <Bot size={16} />
                </div>
                <div className="typing-indicator">
                  <span className="dot"></span>
                  <span className="dot"></span>
                  <span className="dot"></span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="error-banner glass">
              <AlertCircle size={18} />
              <span>Failed to connect to the assistant. Please retry.</span>
            </div>
          )}
        </div>

        {/* Message Input Footer Form */}
        <footer className="chat-footer glass">
          <form onSubmit={handleCustomSubmit} className="input-row">
            <button type="button" className="attachment-btn" title="Attach file">
              <Paperclip size={20} />
            </button>
            <input 
              value={input}
              onChange={handleInputChange}
              placeholder="Ask the AI Onboarding Assistant a question..."
              className="chat-input"
            />
            
            {/* Groq Whisper Recording Button */}
            <button 
              type="button" 
              onClick={toggleRecording} 
              disabled={isTranscribing}
              className={`voice-record-btn ${isRecording ? 'recording' : ''} ${isTranscribing ? 'transcribing' : ''}`}
              title={isRecording ? 'Stop Recording' : 'Speak to Assistant'}
            >
              {isTranscribing ? (
                <Loader2 className="spinner" size={20} />
              ) : isRecording ? (
                <Square size={14} fill="#ef4444" className="stop-icon" />
              ) : (
                <Mic size={20} />
              )}
            </button>

            <button 
              type="submit" 
              disabled={!input.trim() || isLoading}
              className="send-btn"
            >
              <Send size={18} />
            </button>
          </form>
        </footer>
      </main>

      <style jsx>{`
        .portal-container {
          display: flex;
          height: 100vh;
          width: 100vw;
          overflow: hidden;
          background: radial-gradient(circle at bottom right, #1e293b 0%, #090d16 100%);
        }

        /* Glass Sidebar Panel */
        .portal-sidebar {
          width: 320px;
          display: flex;
          flex-direction: column;
          border-radius: 0;
          border-top: none;
          border-bottom: none;
          border-left: none;
          z-index: 100;
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @media (max-width: 768px) {
          .portal-sidebar {
            position: absolute;
            top: 0;
            left: 0;
            height: 100%;
          }
          .portal-sidebar.closed {
            transform: translateX(-100%);
          }
          .portal-sidebar.open {
            transform: translateX(0);
          }
        }

        .sidebar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem 2rem;
          border-bottom: 1px solid var(--glass-border);
        }

        .logo-box {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: var(--accent);
        }

        .logo-box h2 {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--text);
        }

        .toggle-close {
          display: none;
          color: var(--text-muted);
        }

        @media (max-width: 768px) {
          .toggle-close {
            display: block;
          }
        }

        .new-chat-btn {
          margin: 1.5rem;
          background: linear-gradient(135deg, var(--primary), var(--primary-hover));
          color: white;
          padding: 0.85rem;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          font-weight: 600;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
          transition: transform 0.2s, opacity 0.2s;
        }

        .new-chat-btn:hover {
          transform: translateY(-1px);
          opacity: 0.95;
        }

        .sessions-list {
          flex: 1;
          padding: 0 1.5rem;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .sessions-list h3 {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
          margin-bottom: 0.5rem;
        }

        .no-chats {
          font-size: 0.8125rem;
          color: var(--text-muted);
          text-align: center;
          padding: 2rem 0;
          line-height: 1.5;
        }

        .session-card {
          padding: 0.85rem 1rem;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid var(--glass-border);
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .session-card:hover {
          background: rgba(255, 255, 255, 0.03);
          border-color: var(--accent);
        }

        .session-card.active {
          background: rgba(56, 189, 248, 0.08);
          border-color: var(--accent);
        }

        .session-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          flex: 1;
          min-width: 0;
        }

        .session-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .session-date {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .delete-session {
          color: var(--text-muted);
          padding: 0.25rem;
          border-radius: 4px;
          opacity: 0;
          transition: opacity 0.2s, color 0.2s;
        }

        .session-card:hover .delete-session {
          opacity: 1;
        }

        .delete-session:hover {
          color: var(--error);
          background: rgba(239, 68, 68, 0.1);
        }

        .sidebar-footer {
          padding: 1.5rem;
          border-top: 1px solid var(--glass-border);
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .profile-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        /* Avatar Upload Circle Stylings */
        .avatar-upload-wrapper {
          position: relative;
          cursor: pointer;
        }

        .avatar-circle {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: var(--primary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8125rem;
          font-weight: 700;
          color: white;
          overflow: hidden;
          position: relative;
          border: 1px solid var(--glass-border);
        }

        .avatar-circle img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .avatar-hover-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.65);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.2s;
          color: white;
        }

        .avatar-upload-wrapper:hover .avatar-hover-overlay {
          opacity: 1;
        }

        .profile-info .details {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .profile-info .details strong {
          font-size: 0.875rem;
          color: var(--text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .profile-info .details span {
          font-size: 0.75rem;
          color: var(--text-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .footer-actions {
          display: flex;
          gap: 0.5rem;
        }

        .admin-redirect-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          padding: 0.6rem;
          border-radius: 8px;
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--accent);
          cursor: pointer;
        }

        .admin-redirect-btn:hover {
          background: rgba(56, 189, 248, 0.1);
        }

        .sign-out-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          padding: 0.6rem 1rem;
          border-radius: 8px;
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--error);
          background: rgba(239, 68, 68, 0.05);
          border: 1px solid rgba(239, 68, 68, 0.1);
          cursor: pointer;
          flex: 1;
          transition: background 0.2s;
        }

        .sign-out-btn:hover {
          background: rgba(239, 68, 68, 0.15);
        }

        /* Main Chat Window Panel */
        .chat-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          height: 100%;
          position: relative;
        }

        .chat-header {
          height: 80px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 2rem;
          z-index: 10;
          border-radius: 0;
          border-top: none;
          border-left: none;
          border-right: none;
        }

        .chat-header .left {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .hamburger {
          display: none;
          color: var(--text);
        }

        @media (max-width: 768px) {
          .hamburger {
            display: block;
          }
        }

        .bot-status-wrapper {
          display: flex;
          align-items: center;
          gap: 0.85rem;
        }

        .avatar-box {
          width: 42px;
          height: 42px;
          border-radius: 10px;
          background: linear-gradient(135deg, var(--primary), var(--primary-hover));
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 0 15px rgba(37, 99, 235, 0.35);
        }

        .bot-status-wrapper h1 {
          font-size: 1.0625rem;
          font-weight: 600;
        }

        .online-pill {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.75rem;
          color: var(--success);
        }

        .online-pill::before {
          content: '';
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--success);
          box-shadow: 0 0 8px var(--success);
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .dept-pill {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.4rem 0.85rem;
          border-radius: 20px;
        }

        .dept-pill .label {
          font-size: 0.75rem;
          color: var(--text-muted);
          font-weight: 600;
          text-transform: uppercase;
        }

        .department-select {
          background: transparent;
          border: none;
          color: var(--accent);
          font-weight: 700;
          outline: none;
          cursor: pointer;
          font-size: 0.8125rem;
        }

        .escalate-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.55rem 1.15rem;
          border-radius: 8px;
          font-size: 0.8125rem;
          font-weight: 700;
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: var(--text);
          background: rgba(255, 255, 255, 0.05);
          transition: all 0.3s;
          cursor: pointer;
        }

        .escalate-btn:hover:not(:disabled) {
          border-color: var(--accent);
          background: rgba(56, 189, 248, 0.1);
        }

        .escalate-btn.escalating {
          background: rgba(245, 158, 11, 0.08);
          color: #f59e0b;
          border-color: rgba(245, 158, 11, 0.3);
        }

        .escalate-btn.success {
          background: rgba(34, 197, 94, 0.08);
          color: var(--success);
          border-color: rgba(34, 197, 94, 0.3);
          cursor: default;
        }

        /* Message Display Area */
        .messages-area {
          flex: 1;
          overflow-y: auto;
          padding: 2.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .messages-area::-webkit-scrollbar {
          width: 6px;
        }
        .messages-area::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.08);
          border-radius: 3px;
        }

        .escalated-banner {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          padding: 1.25rem 1.5rem;
          border-radius: 12px;
          background: rgba(34, 197, 94, 0.04);
          border-color: rgba(34, 197, 94, 0.15);
          max-width: 600px;
          margin: 0 auto 1.5rem auto;
        }

        .escalated-banner .icon-success {
          color: var(--success);
          margin-top: 0.15rem;
        }

        .escalated-banner h3 {
          font-size: 0.9375rem;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 0.25rem;
        }

        .escalated-banner p {
          font-size: 0.8125rem;
          color: var(--text-muted);
          line-height: 1.45;
        }

        .welcome-section {
          max-width: 520px;
          margin: 4rem auto;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.25rem;
        }

        .welcome-logo {
          color: var(--accent);
          filter: drop-shadow(0 0 12px rgba(56, 189, 248, 0.4));
          margin-bottom: 0.5rem;
        }

        .welcome-section h2 {
          font-size: 1.75rem;
          font-weight: 800;
        }

        .welcome-section p {
          font-size: 0.9375rem;
          color: var(--text-muted);
          line-height: 1.6;
        }

        .prompt-suggestions {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 0.75rem;
          margin-top: 1.5rem;
        }

        .prompt-suggestions button {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--glass-border);
          padding: 0.55rem 1.15rem;
          border-radius: 20px;
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--text-muted);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .prompt-suggestions button:hover {
          background: rgba(56, 189, 248, 0.08);
          border-color: var(--accent);
          color: var(--text);
          transform: translateY(-1px);
        }

        .message-wrapper {
          display: flex;
          width: 100%;
        }

        .message-wrapper.user {
          justify-content: flex-end;
        }

        .message-bubble {
          max-width: 70%;
          padding: 1.15rem 1.5rem;
          display: flex;
          gap: 1rem;
          align-items: flex-start;
          border-radius: 20px;
          border: 1px solid var(--glass-border);
        }

        @media (max-width: 640px) {
          .message-bubble {
            max-width: 85%;
          }
        }

        .message-bubble.user {
          background: var(--primary);
          border: none;
          color: white;
          border-radius: 20px 20px 0 20px;
          box-shadow: 0 4px 15px rgba(37, 99, 235, 0.2);
        }

        .message-bubble.assistant {
          border-radius: 20px 20px 20px 0;
        }

        .avatar-icon {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: var(--text-muted);
          overflow: hidden;
        }

        .message-bubble.user .avatar-icon {
          background: rgba(255, 255, 255, 0.2);
          color: white;
        }

        .user-bubble-avatar {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 50%;
        }

        .message-content-wrapper {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          flex: 1;
        }

        .message-content {
          font-size: 0.9375rem;
          line-height: 1.55;
          white-space: pre-wrap;
          word-break: break-word;
        }

        /* Verified Sources Styles */
        .citations-section {
          margin-top: 0.5rem;
          padding-top: 0.75rem;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .citations-header {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.625rem;
          font-weight: 700;
          color: var(--accent);
          letter-spacing: 0.05em;
        }

        .citations-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .citation-card {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.35rem 0.65rem;
          border-radius: 6px;
          font-size: 0.75rem;
          color: var(--text-muted);
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--glass-border);
          transition: all 0.2s;
        }

        .citation-card:hover {
          color: var(--text);
          border-color: var(--accent);
          background: rgba(56, 189, 248, 0.04);
        }

        .icon-blue {
          color: var(--accent);
        }

        /* Typing Bouncing Animation */
        .typing-bubble {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          padding: 0.95rem 1.35rem !important;
        }

        .typing-indicator {
          display: flex;
          align-items: center;
          gap: 5px;
          height: 20px;
        }

        .typing-indicator .dot {
          width: 8px;
          height: 8px;
          background-color: var(--text-muted);
          border-radius: 50%;
          display: inline-block;
          animation: bounce 1.4s infinite ease-in-out both;
        }

        .typing-indicator .dot:nth-child(1) {
          animation-delay: -0.32s;
        }

        .typing-indicator .dot:nth-child(2) {
          animation-delay: -0.16s;
        }

        @keyframes bounce {
          0%, 80%, 100% { 
            transform: scale(0);
          } 40% { 
            transform: scale(1.0);
          }
        }

        .error-banner {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1.25rem;
          border-radius: 10px;
          background: rgba(239, 68, 68, 0.05);
          border-color: rgba(239, 68, 68, 0.15);
          color: var(--error);
          font-size: 0.875rem;
        }

        /* Message Entry Input Section */
        .chat-footer {
          padding: 1.25rem 2rem;
          margin: 1.5rem;
          border-radius: 20px;
        }

        .input-row {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 0.4rem 0.85rem;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .input-row:focus-within {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
        }

        .attachment-btn {
          color: var(--text-muted);
          padding: 0.4rem;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s, color 0.2s;
        }

        .attachment-btn:hover {
          color: var(--text);
          background: rgba(255, 255, 255, 0.04);
        }

        .chat-input {
          flex: 1;
          background: transparent;
          border: none;
          color: var(--text);
          padding: 0.65rem 0;
          font-size: 0.9375rem;
          outline: none;
        }

        .chat-input::placeholder {
          color: var(--text-muted);
          opacity: 0.8;
        }

        .voice-record-btn {
          color: var(--text-muted);
          padding: 0.5rem;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .voice-record-btn:hover:not(:disabled) {
          color: var(--accent);
          background: rgba(56, 189, 248, 0.08);
        }

        .voice-record-btn.recording {
          color: var(--error);
          background: rgba(239, 68, 68, 0.1);
          animation: pulse 1.5s infinite;
        }

        .voice-record-btn.transcribing {
          color: var(--accent);
          cursor: default;
        }

        .send-btn {
          background: var(--primary);
          color: white;
          width: 38px;
          height: 38px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          cursor: pointer;
          border: none;
        }

        .send-btn:hover:not(:disabled) {
          background: var(--primary-hover);
          transform: scale(1.03);
        }

        .send-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.08); }
          100% { transform: scale(1); }
        }

        .icon-pulse {
          animation: pulseIcon 2s infinite ease-in-out;
        }

        @keyframes pulseIcon {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(0.96); }
        }
      `}</style>
    </div>
  );
}
