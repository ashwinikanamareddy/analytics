import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';
import StatsCards from '../components/StatsCards';
import SessionsTable from '../components/SessionsTable';
import EventTimeline from '../components/EventTimeline';

export default function Dashboard({ isRefreshing, onRefreshComplete }) {
  // Sessions state
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsError, setSessionsError] = useState(null);

  // Selected session and timeline state
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState(null);

  // Track active request to prevent race conditions / stale data
  const activeTimelineFetchRef = useRef(null);

  /**
   * Load or reload session summaries from GET /api/sessions
   */
  const fetchSessions = useCallback(async () => {
    setSessionsLoading(true);
    setSessionsError(null);
    try {
      const data = await api.getSessions();
      setSessions(Array.isArray(data) ? data : []);
    } catch (err) {
      setSessionsError(err.message || 'Failed to fetch sessions');
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  /**
   * Load chronological events for a specific session
   */
  const fetchSessionEvents = useCallback(async (sessionId) => {
    if (!sessionId) {
      setTimelineEvents([]);
      return;
    }

    setTimelineLoading(true);
    setTimelineError(null);
    activeTimelineFetchRef.current = sessionId;

    try {
      const events = await api.getSessionEvents(sessionId);
      // Ensure we only update state if this request matches the current active selection
      if (activeTimelineFetchRef.current === sessionId) {
        setTimelineEvents(Array.isArray(events) ? events : []);
      }
    } catch (err) {
      if (activeTimelineFetchRef.current === sessionId) {
        setTimelineError(err.message || 'Failed to load session events');
      }
    } finally {
      if (activeTimelineFetchRef.current === sessionId) {
        setTimelineLoading(false);
      }
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Handle external refresh trigger from sidebar/header
  useEffect(() => {
    if (isRefreshing) {
      const reloadAll = async () => {
        await fetchSessions();
        if (selectedSessionId) {
          await fetchSessionEvents(selectedSessionId);
        }
        if (onRefreshComplete) {
          onRefreshComplete();
        }
      };
      reloadAll();
    }
  }, [isRefreshing, fetchSessions, fetchSessionEvents, selectedSessionId, onRefreshComplete]);

  // Handle session selection
  const handleSelectSession = (sessionId) => {
    if (selectedSessionId === sessionId) {
      // Toggle / re-fetch
      fetchSessionEvents(sessionId);
    } else {
      setSelectedSessionId(sessionId);
      fetchSessionEvents(sessionId);
    }
  };

  const handleCloseTimeline = () => {
    setSelectedSessionId(null);
    setTimelineEvents([]);
    setTimelineError(null);
  };

  // Derive aggregated metrics directly from real MongoDB session data
  const totalSessions = sessions.length;
  const totalEvents = sessions.reduce((sum, s) => sum + (s.total_events || 0), 0);

  return (
    <div className="dashboard-content">
      <div className="dashboard-header">
        <div>
          <h1>User Analytics Dashboard</h1>
          <p className="subtitle">Real-time session telemetry & interaction journeys</p>
        </div>
      </div>

      {sessionsError && (
        <div className="alert-banner error-banner">
          <span className="banner-icon">⚠️</span>
          <div className="banner-text">
            <strong>Error loading analytics data:</strong> {sessionsError}
          </div>
          <button type="button" className="retry-btn" onClick={fetchSessions}>
            Retry
          </button>
        </div>
      )}

      {/* Top statistics summary cards */}
      <StatsCards
        totalSessions={totalSessions}
        totalEvents={totalEvents}
        selectedSessionId={selectedSessionId}
      />

      {/* Main layout: Sessions Table & Journey Timeline */}
      <div className="dashboard-grid">
        <div className="grid-left">
          <SessionsTable
            sessions={sessions}
            selectedSessionId={selectedSessionId}
            onSelectSession={handleSelectSession}
            isLoading={sessionsLoading}
          />
        </div>

        <div className="grid-right">
          <EventTimeline
            sessionId={selectedSessionId}
            events={timelineEvents}
            isLoading={timelineLoading}
            error={timelineError}
            onClose={handleCloseTimeline}
          />
        </div>
      </div>
    </div>
  );
}
