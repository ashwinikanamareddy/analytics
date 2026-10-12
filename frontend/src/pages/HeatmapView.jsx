import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import ClickHeatmap from '../components/ClickHeatmap';

export default function HeatmapView({ isRefreshing, onRefreshComplete }) {
  const [pages, setPages] = useState([]);
  const [pagesLoading, setPagesLoading] = useState(true);
  const [pagesError, setPagesError] = useState(null);

  const [selectedPageUrl, setSelectedPageUrl] = useState('');
  const [clicks, setClicks] = useState([]);
  const [clicksLoading, setClicksLoading] = useState(false);
  const [clicksError, setClicksError] = useState(null);

  /**
   * Fetch distinct pages from GET /api/pages
   */
  const fetchPages = useCallback(async () => {
    setPagesLoading(true);
    setPagesError(null);
    try {
      const pageList = await api.getPages();
      const list = Array.isArray(pageList) ? pageList : [];
      setPages(list);

      // Automatically select the first page if none is currently selected
      setSelectedPageUrl((prev) => {
        if (prev && list.includes(prev)) return prev;
        return list.length > 0 ? list[0] : '';
      });
    } catch (err) {
      setPagesError(err.message || 'Failed to fetch tracked pages');
    } finally {
      setPagesLoading(false);
    }
  }, []);

  /**
   * Fetch clicks for the selected page from GET /api/events/clicks?pageUrl=...
   */
  const fetchClicks = useCallback(async (url) => {
    if (!url) {
      setClicks([]);
      return;
    }
    setClicksLoading(true);
    setClicksError(null);
    try {
      const clickData = await api.getClicksByPage(url);
      setClicks(Array.isArray(clickData) ? clickData : []);
    } catch (err) {
      setClicksError(err.message || 'Failed to load click events');
    } finally {
      setClicksLoading(false);
    }
  }, []);

  // Initial load: fetch page URLs
  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  // When selected page changes, fetch its clicks
  useEffect(() => {
    if (selectedPageUrl) {
      fetchClicks(selectedPageUrl);
    } else {
      setClicks([]);
    }
  }, [selectedPageUrl, fetchClicks]);

  // Handle external refresh trigger from sidebar
  useEffect(() => {
    if (isRefreshing) {
      const reload = async () => {
        await fetchPages();
        if (selectedPageUrl) {
          await fetchClicks(selectedPageUrl);
        }
        if (onRefreshComplete) {
          onRefreshComplete();
        }
      };
      reload();
    }
  }, [isRefreshing, fetchPages, fetchClicks, selectedPageUrl, onRefreshComplete]);

  const handlePageChange = (e) => {
    setSelectedPageUrl(e.target.value);
  };

  /**
   * Format URL into user-friendly label (path + search query)
   */
  const formatPageLabel = (urlStr) => {
    try {
      const parsed = new URL(urlStr);
      return parsed.pathname + (parsed.search || '') + ` (${parsed.host})`;
    } catch {
      return urlStr;
    }
  };

  return (
    <div className="dashboard-content">
      <div className="dashboard-header heatmap-header-row">
        <div>
          <h1>Click Heatmap Analysis</h1>
          <p className="subtitle">
            Visual aggregation of user click coordinates across tracked pages
          </p>
        </div>

        {/* Page selector dropdown */}
        <div className="page-selector-card">
          <label htmlFor="page-select" className="selector-label">
            Target Page:
          </label>
          {pagesLoading ? (
            <span className="selector-status">Loading pages...</span>
          ) : pages.length > 0 ? (
            <select
              id="page-select"
              value={selectedPageUrl}
              onChange={handlePageChange}
              className="page-dropdown"
            >
              {pages.map((p) => (
                <option key={p} value={p}>
                  {formatPageLabel(p)}
                </option>
              ))}
            </select>
          ) : (
            <span className="selector-status empty">No tracked pages yet</span>
          )}
        </div>
      </div>

      {pagesError && (
        <div className="alert-banner error-banner">
          <span className="banner-icon">⚠️</span>
          <div className="banner-text">
            <strong>Error loading pages:</strong> {pagesError}
          </div>
          <button type="button" className="retry-btn" onClick={fetchPages}>
            Retry
          </button>
        </div>
      )}

      {/* Summary stats for active heatmap */}
      {selectedPageUrl && (
        <div className="heatmap-stats-strip">
          <div className="strip-item">
            <span className="strip-label">Selected URL:</span>
            <code className="strip-code" title={selectedPageUrl}>
              {selectedPageUrl}
            </code>
          </div>
          <div className="strip-item">
            <span className="strip-label">Total Recorded Clicks:</span>
            <span className="strip-badge">{clicks.length}</span>
          </div>
        </div>
      )}

      {/* Heatmap visualization component */}
      {!pagesLoading && pages.length === 0 ? (
        <div className="card placeholder-card">
          <div className="state-container empty-state">
            <span className="state-icon">🌐</span>
            <h4>No Page Telemetry Available</h4>
            <p>
              The tracking script has not recorded any events yet. Visit <a href="/demo.html" target="_blank" rel="noreferrer">/demo.html</a> and click elements to generate coordinate data.
            </p>
          </div>
        </div>
      ) : (
        <ClickHeatmap
          clicks={clicks}
          selectedPageUrl={selectedPageUrl}
          isLoading={clicksLoading}
          error={clicksError}
          onRetry={() => fetchClicks(selectedPageUrl)}
        />
      )}
    </div>
  );
}
