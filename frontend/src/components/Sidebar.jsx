import React from 'react';

export default function Sidebar({ currentView, onViewChange, onRefresh, isRefreshing }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-icon">CF</div>
        <div className="brand-text">
          <h2>CausalFunnel</h2>
          <span className="brand-subtitle">Analytics Suite</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <button
          type="button"
          className={`nav-item ${currentView === 'sessions' ? 'active' : ''}`}
          onClick={() => onViewChange('sessions')}
        >
          <span className="nav-icon">📊</span>
          <span className="nav-label">Sessions & Journeys</span>
        </button>

        <button
          type="button"
          className={`nav-item ${currentView === 'heatmap' ? 'active' : ''}`}
          onClick={() => onViewChange('heatmap')}
        >
          <span className="nav-icon">🔥</span>
          <span className="nav-label">Click Heatmap</span>
        </button>
      </nav>

      <div className="sidebar-footer">
        <button
          type="button"
          className="refresh-btn"
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Reload data from server"
        >
          <span className={`refresh-icon ${isRefreshing ? 'spinning' : ''}`}>🔄</span>
          <span>{isRefreshing ? 'Refreshing...' : 'Refresh Data'}</span>
        </button>
      </div>
    </aside>
  );
}
