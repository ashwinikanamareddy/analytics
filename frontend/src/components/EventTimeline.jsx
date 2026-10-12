import React from 'react';

function formatDateTime(isoString) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return 'Invalid date';
    return d.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    });
  } catch {
    return '—';
  }
}

export default function EventTimeline({
  sessionId,
  events,
  isLoading,
  error,
  onClose,
}) {
  if (!sessionId) {
    return (
      <div className="card timeline-card placeholder-card">
        <div className="state-container empty-state">
          <span className="state-icon">👈</span>
          <h4>No Session Selected</h4>
          <p>Click on any session in the table to inspect its chronological event journey.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card timeline-card">
      <div className="card-header timeline-header">
        <div className="header-meta">
          <h3>User Journey Timeline</h3>
          <span className="timeline-session-badge" title={sessionId}>
            Session: <code>{sessionId}</code>
          </span>
        </div>
        <div className="header-actions">
          {events.length > 0 && <span className="badge">{events.length} events</span>}
          {onClose && (
            <button type="button" className="close-btn" onClick={onClose} title="Deselect session">
              ✕
            </button>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="state-container">
          <div className="spinner"></div>
          <p>Fetching events for session...</p>
        </div>
      )}

      {error && !isLoading && (
        <div className="state-container error-state">
          <span className="state-icon">⚠️</span>
          <h4>Failed to load events</h4>
          <p>{error}</p>
        </div>
      )}

      {!isLoading && !error && events.length === 0 && (
        <div className="state-container empty-state">
          <span className="state-icon">ℹ️</span>
          <h4>No events found for this session</h4>
          <p>This session has no recorded activity.</p>
        </div>
      )}

      {!isLoading && !error && events.length > 0 && (
        <div className="timeline-container">
          <div className="timeline-track">
            {events.map((evt, index) => {
              const isClick = evt.event_type === 'click';
              return (
                <div key={evt._id || index} className="timeline-item">
                  <div className={`timeline-marker ${isClick ? 'marker-click' : 'marker-view'}`}>
                    {isClick ? '👆' : '👁️'}
                  </div>

                  <div className="timeline-content">
                    <div className="timeline-meta-row">
                      <span className={`event-type-tag ${isClick ? 'tag-click' : 'tag-view'}`}>
                        {evt.event_type}
                      </span>
                      <span className="timeline-time" title={evt.timestamp}>
                        {formatDateTime(evt.timestamp)}
                      </span>
                    </div>

                    <div className="timeline-url-row">
                      <span className="field-label">URL:</span>
                      <a
                        href={evt.page_url}
                        target="_blank"
                        rel="noreferrer"
                        className="url-link"
                        title={evt.page_url}
                      >
                        {evt.page_url}
                      </a>
                    </div>

                    {isClick && (
                      <div className="timeline-coordinates-row">
                        <span className="field-label">Viewport Coordinates:</span>
                        <span className="coord-chip">X: {evt.x}px</span>
                        <span className="coord-chip">Y: {evt.y}px</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
