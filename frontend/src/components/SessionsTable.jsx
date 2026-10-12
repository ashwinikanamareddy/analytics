import React from 'react';

/**
 * Format timestamp safely into local readable date and time string.
 */
function formatDateTime(isoString) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return 'Invalid date';
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return '—';
  }
}

export default function SessionsTable({
  sessions,
  selectedSessionId,
  onSelectSession,
  isLoading,
}) {
  if (isLoading && sessions.length === 0) {
    return (
      <div className="card table-card">
        <div className="card-header">
          <h3>Sessions Overview</h3>
        </div>
        <div className="state-container">
          <div className="spinner"></div>
          <p>Loading sessions from database...</p>
        </div>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="card table-card">
        <div className="card-header">
          <h3>Sessions Overview</h3>
        </div>
        <div className="state-container empty-state">
          <span className="state-icon">📭</span>
          <h4>No sessions recorded yet</h4>
          <p>
            Visit the demo webpage at <a href="/demo.html" target="_blank" rel="noreferrer">/demo.html</a> and interact with buttons to log tracking events.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card table-card">
      <div className="card-header">
        <div className="card-title-group">
          <h3>Sessions Overview</h3>
          <span className="badge">{sessions.length} sessions</span>
        </div>
        <span className="table-hint">Select a session row to inspect its event timeline</span>
      </div>

      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Session ID</th>
              <th>Total Events</th>
              <th>Latest Activity</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => {
              const isSelected = selectedSessionId === session.session_id;
              return (
                <tr
                  key={session.session_id}
                  className={`clickable-row ${isSelected ? 'row-selected' : ''}`}
                  onClick={() => onSelectSession(session.session_id)}
                >
                  <td className="status-cell">
                    <span className={`status-indicator ${isSelected ? 'active' : ''}`}></span>
                  </td>
                  <td className="mono-cell session-id-cell" title={session.session_id}>
                    <code>{session.session_id}</code>
                  </td>
                  <td>
                    <span className="count-pill">{session.total_events}</span>
                  </td>
                  <td className="timestamp-cell">
                    {formatDateTime(session.latest_event_at)}
                  </td>
                  <td>
                    <button
                      type="button"
                      className={`btn-table-action ${isSelected ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectSession(session.session_id);
                      }}
                    >
                      {isSelected ? 'Selected' : 'Inspect'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
