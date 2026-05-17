'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Users, MessageSquare, TrendingUp, Loader2 } from 'lucide-react';

interface Stats {
  totalDocuments: number;
  totalEmployees: number;
  pendingEscalations: number;
  satisfaction: number;
}

interface ChartItem {
  label: string;
  dateKey: string;
  count: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalDocuments: 0,
    totalEmployees: 0,
    pendingEscalations: 0,
    satisfaction: 95.0,
  });
  const [chartData, setChartData] = useState<ChartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/admin/stats');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load stats');

        setStats(data.metrics);
        setChartData(data.chartData);
      } catch (err: any) {
        console.error(err);
        setErrorMsg('Could not fetch live dashboard metrics. Displaying static data.');
        // Fallback mockup stats for safe error handling
        setStats({
          totalDocuments: 4,
          totalEmployees: 1,
          pendingEscalations: 0,
          satisfaction: 96.5,
        });
        setChartData([
          { label: 'Mon', dateKey: '', count: 5 },
          { label: 'Tue', dateKey: '', count: 12 },
          { label: 'Wed', dateKey: '', count: 8 },
          { label: 'Thu', dateKey: '', count: 15 },
          { label: 'Fri', dateKey: '', count: 22 },
          { label: 'Sat', dateKey: '', count: 6 },
          { label: 'Sun', dateKey: '', count: 10 },
        ]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, []);

  const maxChartCount = Math.max(...chartData.map(c => c.count), 1);

  return (
    <div className="dashboard-grid animate-fade">
      {isLoading ? (
        <div className="loader-box">
          <Loader2 className="spinner" size={32} />
          <p>Compiling live organizational intelligence metrics...</p>
        </div>
      ) : (
        <>
          {errorMsg && (
            <div className="dashboard-notice glass">
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="stat-card glass">
            <div className="stat-icon" style={{ background: 'rgba(56, 189, 248, 0.1)', color: 'var(--accent)' }}>
              <FileText size={24} />
            </div>
            <div className="stat-info">
              <h3>Knowledge Base</h3>
              <p className="stat-value">{stats.totalDocuments} Documents</p>
              <span className="stat-change">Active pgvector RAG</span>
            </div>
          </div>

          <div className="stat-card glass">
            <div className="stat-icon" style={{ background: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)' }}>
              <Users size={24} />
            </div>
            <div className="stat-info">
              <h3>New Hires</h3>
              <p className="stat-value">{stats.totalEmployees} Employees</p>
              <span className="stat-change">Active Whitelist Directory</span>
            </div>
          </div>

          <div className="stat-card glass">
            <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)' }}>
              <MessageSquare size={24} />
            </div>
            <div className="stat-info">
              <h3>Escalations</h3>
              <p className="stat-value">{stats.pendingEscalations} Pending</p>
              <span className="stat-change">Needs Human Assistance</span>
            </div>
          </div>

          <div className="stat-card glass">
            <div className="stat-icon" style={{ background: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary)' }}>
              <TrendingUp size={24} />
            </div>
            <div className="stat-info">
              <h3>AI Satisfaction</h3>
              <p className="stat-value">{stats.satisfaction}%</p>
              <span className="stat-change">High confidence SLA</span>
            </div>
          </div>

          <div className="chart-section glass">
            <h3>Onboarding Activity (Messages Exchanged)</h3>
            <div className="chart-wrapper">
              <div className="activity-chart">
                {chartData.map((item, idx) => {
                  const percentageHeight = (item.count / maxChartCount) * 100;
                  return (
                    <div key={idx} className="chart-bar-group">
                      <div className="bar-tooltip">{item.count} messages</div>
                      <div 
                        className="bar" 
                        style={{ height: `${Math.max(8, percentageHeight)}%` }}
                      ></div>
                      <span className="bar-label">{item.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1.5rem;
          padding: 1.5rem;
        }

        .loader-box {
          grid-column: span 4;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 8rem 0;
          color: var(--text-muted);
          gap: 1rem;
        }

        .dashboard-notice {
          grid-column: span 4;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-size: 0.8125rem;
          color: var(--accent);
          border-color: rgba(56, 189, 248, 0.2);
          background: rgba(56, 189, 248, 0.05);
        }

        .stat-card {
          padding: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1.25rem;
        }

        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .stat-info h3 {
          font-size: 0.875rem;
          color: var(--text-muted);
          font-weight: 500;
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0.25rem 0;
        }

        .stat-change {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .chart-section {
          grid-column: span 4;
          padding: 2rem;
          height: 380px;
          display: flex;
          flex-direction: column;
        }

        .chart-section h3 {
          margin-bottom: 2rem;
          font-size: 1.125rem;
          font-weight: 600;
        }

        .chart-wrapper {
          flex: 1;
          display: flex;
          align-items: flex-end;
          padding-bottom: 1rem;
        }

        .activity-chart {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          height: 200px;
          width: 100%;
          padding: 0 1rem;
        }

        .chart-bar-group {
          width: 10%;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          align-items: center;
          position: relative;
        }

        .bar {
          width: 80%;
          max-width: 48px;
          background: linear-gradient(to top, var(--primary), var(--accent));
          border-radius: 6px 6px 0 0;
          transition: height 0.6s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
        }

        .bar:hover {
          background: linear-gradient(to top, var(--primary-hover), var(--accent));
          box-shadow: 0 0 15px rgba(56, 189, 248, 0.4);
        }

        .bar-label {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-top: 0.75rem;
          text-align: center;
          white-space: nowrap;
        }

        .bar-tooltip {
          position: absolute;
          top: -24px;
          background: var(--surface);
          border: 1px solid var(--border);
          color: var(--text);
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.6875rem;
          opacity: 0;
          transition: opacity 0.2s, transform 0.2s;
          pointer-events: none;
          transform: translateY(4px);
          white-space: nowrap;
          z-index: 10;
        }

        .chart-bar-group:hover .bar-tooltip {
          opacity: 1;
          transform: translateY(0);
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
