'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useChat } from 'ai/react';
import { Mic, Send, Bot, User, Paperclip, MoreHorizontal, AlertCircle, Loader2, Square } from 'lucide-react';

export default function ChatPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [department, setDepartment] = useState('General');
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: '/api/chat',
    body: {
      department,
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

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
            // Fill the chat input with transcribed text
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

  return (
    <div className="chat-container">
      <header className="chat-header glass">
        <div className="bot-info">
          <div className="bot-avatar">
            <Bot size={20} />
          </div>
          <div>
            <h1>Onboarding Assistant</h1>
            <span className="status-online">Online • AI Support</span>
          </div>
        </div>
        <div className="header-actions">
          <select 
            value={department} 
            onChange={(e) => setDepartment(e.target.value)}
            className="dept-select"
          >
            <option value="General">General</option>
            <option value="Engineering">Engineering</option>
            <option value="HR">HR</option>
          </select>
          <button className="action-btn"><MoreHorizontal size={20} /></button>
        </div>
      </header>

      <div className="messages-area" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="welcome-message animate-fade">
            <Bot size={48} className="welcome-icon" />
            <h2>Welcome to the Team!</h2>
            <p>I'm your AI Onboarding Assistant. You can ask me anything about company policies, department workflows, or where to find your tools.</p>
            <div className="suggested-prompts">
              <button onClick={() => handleInputChange({ target: { value: 'What is the vacation policy?' } } as any)}>
                "What is the vacation policy?"
              </button>
              <button onClick={() => handleInputChange({ target: { value: 'How do I set up my email?' } } as any)}>
                "How do I set up my email?"
              </button>
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`message-wrapper ${m.role}`}>
            <div className={`message-bubble ${m.role} glass`}>
              <div className="message-icon">
                {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className="message-content">
                {m.content}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="message-wrapper assistant">
            <div className="message-bubble assistant glass typing">
              <Loader2 className="spinner" size={16} />
              <span>AI is thinking...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="error-banner glass">
            <AlertCircle size={18} />
            <span>Connection error. Please try again.</span>
          </div>
        )}
      </div>

      <footer className="chat-footer glass">
        <div className="input-area">
          <button className="utility-btn"><Paperclip size={20} /></button>
          <form onSubmit={handleSubmit} className="input-form">
            <input
              value={input}
              onChange={handleInputChange}
              placeholder="Ask a question..."
              className="chat-input"
            />
            <button 
              type="button" 
              className={`voice-btn ${isRecording ? 'recording' : ''} ${isTranscribing ? 'transcribing' : ''}`}
              onClick={toggleRecording}
              disabled={isTranscribing}
            >
              {isTranscribing ? (
                <Loader2 className="spinner" size={20} />
              ) : isRecording ? (
                <Square size={16} fill="#ef4444" className="stop-icon" />
              ) : (
                <Mic size={20} />
              )}
            </button>
            <button type="submit" className="send-btn" disabled={!input.trim() || isLoading}>
              <Send size={20} />
            </button>
          </form>
        </div>
      </footer>

      <style jsx>{`
        .chat-container {
          height: 100vh;
          display: flex;
          flex-direction: column;
          background: radial-gradient(circle at bottom right, #1e293b 0%, #0f172a 100%);
        }

        .chat-header {
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 2rem;
          z-index: 10;
        }

        .bot-info {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .bot-avatar {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, var(--primary), var(--accent));
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 0 20px rgba(37, 99, 235, 0.3);
        }

        .bot-info h1 {
          font-size: 1.125rem;
          font-weight: 600;
        }

        .status-online {
          font-size: 0.75rem;
          color: var(--success);
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .status-online::before {
          content: '';
          width: 6px;
          height: 6px;
          background: var(--success);
          border-radius: 50%;
        }

        .dept-select {
          background: var(--surface);
          border: 1px solid var(--border);
          color: var(--text);
          padding: 0.4rem 0.75rem;
          border-radius: 8px;
          margin-right: 1rem;
          font-size: 0.875rem;
        }

        .messages-area {
          flex: 1;
          overflow-y: auto;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .welcome-message {
          text-align: center;
          max-width: 500px;
          margin: 4rem auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .welcome-icon {
          color: var(--accent);
          margin-bottom: 1rem;
        }

        .welcome-message p {
          color: var(--text-muted);
        }

        .suggested-prompts {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 0.75rem;
          margin-top: 1.5rem;
        }

        .suggested-prompts button {
          background: var(--surface);
          border: 1px solid var(--border);
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-size: 0.875rem;
          transition: all 0.2s;
        }

        .suggested-prompts button:hover {
          background: var(--surface-hover);
          border-color: var(--accent);
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
          padding: 1rem;
          display: flex;
          gap: 1rem;
          position: relative;
        }

        .message-bubble.user {
          background: var(--primary);
          border-radius: 18px 18px 0 18px;
          border: none;
        }

        .message-bubble.assistant {
          border-radius: 18px 18px 18px 0;
        }

        .message-icon {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .message-content {
          font-size: 0.9375rem;
          white-space: pre-wrap;
        }

        .typing {
          align-items: center;
          gap: 0.75rem;
          color: var(--text-muted);
        }

        .chat-footer {
          padding: 1.5rem 2rem;
          margin: 1rem;
          border-radius: 24px;
        }

        .input-area {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .input-form {
          flex: 1;
          display: flex;
          align-items: center;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 0.5rem 1rem;
          gap: 0.75rem;
          transition: border-color 0.2s;
        }

        .input-form:focus-within {
          border-color: var(--primary);
        }

        .chat-input {
          flex: 1;
          background: transparent;
          border: none;
          color: var(--text);
          padding: 0.5rem 0;
          outline: none;
        }

        .voice-btn {
          color: var(--text-muted);
          transition: all 0.2s;
        }

        .voice-btn.recording {
          color: var(--error);
          animation: pulse 1.5s infinite;
        }

        .send-btn {
          background: var(--primary);
          color: white;
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s;
        }

        .send-btn:hover:not(:disabled) {
          transform: scale(1.05);
          background: var(--primary-hover);
        }

        .send-btn:disabled {
          opacity: 0.5;
        }

        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
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
