import React, { useState } from 'react';

/**
 * ClickHeatmap
 * 
 * Visualizes user click interactions overlaid across a representative mockup frame.
 *
 * Coordinate Mapping Strategy & Technical Context:
 * - The tracking script records clientX and clientY (viewport-relative coordinates).
 * - A browser viewport can be any screen resolution (e.g. 1920x1080 desktop, 1280x800 laptop).
 * - In this component, we render a controlled reference viewport canvas (default 1280x800,
 *   with an option to view at 100% 1:1 scale or toggle viewport bounds).
 * - Clicks are placed at precise (x, y) pixels or normalized percentages.
 * - Each marker features a radial glow and tooltip showing click timestamp, session, and exact coordinates.
 */
export default function ClickHeatmap({
  clicks,
  selectedPageUrl,
  isLoading,
  error,
  onRetry,
}) {
  const [hoveredClick, setHoveredClick] = useState(null);
  const [filterSession, setFilterSession] = useState('all');
  const [markerRadius, setMarkerRadius] = useState(24); // density radius in px

  // Distinct sessions among clicks
  const sessions = Array.from(new Set(clicks.map((c) => c.session_id).filter(Boolean)));

  // Filter clicks if user wants to isolate one session
  const filteredClicks = filterSession === 'all'
    ? clicks
    : clicks.filter((c) => c.session_id === filterSession);

  // Compute bounding box / max coordinates to understand spread
  const maxX = clicks.reduce((max, c) => Math.max(max, Number(c.x) || 0), 0);
  const maxY = clicks.reduce((max, c) => Math.max(max, Number(c.y) || 0), 0);

  // Reference canvas baseline (supports standard desktop resolution)
  const canvasWidth = Math.max(1200, maxX + 80);
  const canvasHeight = Math.max(800, maxY + 100);

  const isDemoPage = selectedPageUrl && selectedPageUrl.includes('demo.html');

  if (isLoading) {
    return (
      <div className="card heatmap-card">
        <div className="state-container">
          <div className="spinner"></div>
          <p>Fetching click telemetry for {selectedPageUrl}...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card heatmap-card">
        <div className="state-container error-state">
          <span className="state-icon">⚠️</span>
          <h4>Failed to load click data</h4>
          <p>{error}</p>
          <div style={{ marginTop: '1rem' }}>
            <button type="button" className="btn-primary-action" onClick={onRetry}>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (clicks.length === 0) {
    return (
      <div className="card heatmap-card">
        <div className="state-container empty-state">
          <span className="state-icon">🎯</span>
          <h4>No clicks recorded for this page</h4>
          <p>
            No user has clicked on <code>{selectedPageUrl}</code> yet. Open the page in your browser and click anywhere to log events.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="heatmap-container">
      {/* Heatmap Controls Bar */}
      <div className="card heatmap-toolbar">
        <div className="toolbar-group">
          <span className="toolbar-label">Marker Radius:</span>
          <input
            type="range"
            min="12"
            max="48"
            value={markerRadius}
            onChange={(e) => setMarkerRadius(Number(e.target.value))}
            className="radius-slider"
          />
          <span className="radius-value">{markerRadius}px</span>
        </div>

        {sessions.length > 1 && (
          <div className="toolbar-group">
            <span className="toolbar-label">Filter Session:</span>
            <select
              value={filterSession}
              onChange={(e) => setFilterSession(e.target.value)}
              className="toolbar-select"
            >
              <option value="all">All Sessions ({clicks.length} clicks)</option>
              {sessions.map((sid) => (
                <option key={sid} value={sid}>
                  Session: {sid.substring(0, 10)}...
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="toolbar-legend">
          <div className="legend-item">
            <span className="legend-dot heat-high"></span>
            <span>Click Hotspot</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot heat-ring"></span>
            <span>Coordinate Radial</span>
          </div>
        </div>
      </div>

      {/* Heatmap Preview & Canvas Wrapper */}
      <div className="card heatmap-viewport-card">
        <div className="viewport-browser-bar">
          <div className="browser-dots">
            <span className="dot red"></span>
            <span className="dot yellow"></span>
            <span className="dot green"></span>
          </div>
          <div className="browser-address-bar">
            🔒 {selectedPageUrl}
          </div>
          <div className="browser-meta">
            Canvas: {canvasWidth} × {canvasHeight}px
          </div>
        </div>

        <div className="viewport-scroll-area">
          <div
            className="heatmap-canvas"
            style={{
              width: `${canvasWidth}px`,
              height: `${canvasHeight}px`,
            }}
          >
            {/* Background representative frame for demo.html or general website */}
            {isDemoPage ? (
              <div className="demo-canvas-backdrop">
                <div className="backdrop-header">
                  <h2>🔍 Tracker Demo</h2>
                  <p>Demonstrates the CausalFunnel analytics tracker.</p>
                </div>
                <div className="backdrop-banner">
                  ℹ️ How to observe events: Network tab & button targets
                </div>
                <div className="backdrop-card">
                  <h4>Click targets</h4>
                  <div className="backdrop-btn-row">
                    <span className="mock-btn primary">Primary Button</span>
                    <span className="mock-btn danger">Danger Button</span>
                    <span className="mock-btn neutral">Neutral Button</span>
                  </div>
                  <div className="backdrop-link-row">
                    <span>Go to React App (same tab)</span>
                    <span>Open React App in new tab</span>
                  </div>
                </div>
                <div className="backdrop-card log-card">
                  <h4>Live event log</h4>
                  <div className="mock-terminal"></div>
                </div>
              </div>
            ) : (
              <div className="generic-canvas-backdrop">
                <div className="grid-watermark">
                  <span>Tracked Viewport Grid (100px increments)</span>
                </div>
              </div>
            )}

            {/* Render Click Markers */}
            {filteredClicks.map((click, idx) => {
              const x = Number(click.x);
              const y = Number(click.y);
              if (isNaN(x) || isNaN(y)) return null;

              const isHovered = hoveredClick === idx;

              return (
                <div
                  key={`${click.session_id || 'c'}-${idx}`}
                  className={`heatmap-marker ${isHovered ? 'hovered' : ''}`}
                  style={{
                    left: `${x}px`,
                    top: `${y}px`,
                    width: `${markerRadius * 2}px`,
                    height: `${markerRadius * 2}px`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  onMouseEnter={() => setHoveredClick(idx)}
                  onMouseLeave={() => setHoveredClick(null)}
                >
                  <div className="marker-core"></div>
                  <div className="marker-pulse"></div>
                </div>
              );
            })}

            {/* Hover Tooltip Overlay */}
            {hoveredClick !== null && filteredClicks[hoveredClick] && (
              <div
                className="heatmap-tooltip"
                style={{
                  left: `${Number(filteredClicks[hoveredClick].x) + 16}px`,
                  top: `${Number(filteredClicks[hoveredClick].y) - 20}px`,
                }}
              >
                <div className="tooltip-title">Click Interaction</div>
                <div className="tooltip-row">
                  <span className="t-label">Coordinates:</span>
                  <strong>X: {filteredClicks[hoveredClick].x}px, Y: {filteredClicks[hoveredClick].y}px</strong>
                </div>
                {filteredClicks[hoveredClick].timestamp && (
                  <div className="tooltip-row">
                    <span className="t-label">Time:</span>
                    <span>{new Date(filteredClicks[hoveredClick].timestamp).toLocaleTimeString()}</span>
                  </div>
                )}
                {filteredClicks[hoveredClick].session_id && (
                  <div className="tooltip-row">
                    <span className="t-label">Session:</span>
                    <code>{filteredClicks[hoveredClick].session_id.substring(0, 12)}...</code>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
