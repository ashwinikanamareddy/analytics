import React from 'react';

export default function StatsCards({ totalSessions, totalEvents, selectedSessionId }) {
  const avgEventsPerSession = totalSessions > 0 ? (totalEvents / totalSessions).toFixed(1) : '0';

  return (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-header">
          <span className="stat-title">Total Sessions</span>
          <span className="stat-icon-badge blue">👥</span>
        </div>
        <div className="stat-value">{totalSessions.toLocaleString()}</div>
        <div className="stat-footer">Distinct tracking sessions</div>
      </div>

      <div className="stat-card">
        <div className="stat-header">
          <span className="stat-title">Total Events Tracked</span>
          <span className="stat-icon-badge purple">⚡</span>
        </div>
        <div className="stat-value">{totalEvents.toLocaleString()}</div>
        <div className="stat-footer">Page views and click interactions</div>
      </div>

      <div className="stat-card">
        <div className="stat-header">
          <span className="stat-title">Avg. Events / Session</span>
          <span className="stat-icon-badge green">📈</span>
        </div>
        <div className="stat-value">{avgEventsPerSession}</div>
        <div className="stat-footer">Interaction depth per visit</div>
      </div>

      <div className="stat-card">
        <div className="stat-header">
          <span className="stat-title">Active Inspection</span>
          <span className="stat-icon-badge amber">🎯</span>
        </div>
        <div className="stat-value stat-small">
          {selectedSessionId ? (
            <span className="active-session-text" title={selectedSessionId}>
              {selectedSessionId.substring(0, 12)}...
            </span>
          ) : (
            <span className="none-text">None selected</span>
          )}
        </div>
        <div className="stat-footer">
          {selectedSessionId ? 'Viewing timeline below' : 'Click a session to inspect'}
        </div>
      </div>
    </div>
  );
}
