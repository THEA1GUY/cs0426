'use client';

import React from 'react';
import { FileText, Users, MessageSquare, TrendingUp } from 'lucide-react';

export default function AdminDashboard() {
  return (
    <div className="dashboard-grid animate-fade">
      <div className="stat-card glass">
        <div className="stat-icon" style={{ background: 'rgba(56, 189, 248, 0.1)', color: 'var(--accent)' }}>
          <FileText size={24} />
        </div>
        <div className="stat-info">
          <h3>Knowledge Base</h3>
          <p className="stat-value">24 Documents</p>
          <span className="stat-change">+2 this week</span>
        </div>
      </div>

      <div className="stat-card glass">
        <div className="stat-icon" style={{ background: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)' }}>
          <Users size={24} />
        </div>
        <div className="stat-info">
          <h3>New Hires</h3>
          <p className="stat-value">128 Employees</p>
          <span className="stat-change">+15 active today</span>
        </div>
      </div>

      <div className="stat-card glass">
        <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)' }}>
          <MessageSquare size={24} />
        </div>
        <div className="stat-info">
          <h3>Escalations</h3>
          <p className="stat-value">3 Pending</p>
          <span className="stat-change">-5 since yesterday</span>
        </div>
      </div>

      <div className="stat-card glass">
        <div className="stat-icon" style={{ background: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary)' }}>
          <TrendingUp size={24} />
        </div>
        <div className="stat-info">
          <h3>AI Satisfaction</h3>
          <p className="stat-value">94.2%</p>
          <span className="stat-change">High confidence</span>
        </div>
      </div>

      <div className="chart-section glass">
        <h3>Onboarding Activity</h3>
        <div className="placeholder-chart">
          {/* Chart would go here */}
          <div className="bar" style={{ height: '40%' }}></div>
          <div className="bar" style={{ height: '70%' }}></div>
          <div className="bar" style={{ height: '55%' }}></div>
          <div className="bar" style={{ height: '90%' }}></div>
          <div className="bar" style={{ height: '65%' }}></div>
          <div className="bar" style={{ height: '80%' }}></div>
          <div className="bar" style={{ height: '75%' }}></div>
        </div>
      </div>

      <style jsx>{`
        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1.5rem;
          padding: 1.5rem;
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
          color: var(--success);
        }

        .chart-section {
          grid-column: span 4;
          padding: 2rem;
          height: 300px;
        }

        .chart-section h3 {
          margin-bottom: 2rem;
        }

        .placeholder-chart {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          height: 150px;
          padding: 0 1rem;
        }

        .bar {
          width: 8%;
          background: linear-gradient(to top, var(--primary), var(--accent));
          border-radius: 4px 4px 0 0;
          transition: height 1s ease-in-out;
        }
      `}</style>
    </div>
  );
}
