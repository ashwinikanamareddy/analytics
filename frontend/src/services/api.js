// src/services/api.js
// Centralized API service helper for the React application.
// Handles baseURL resolution, error parsing, and safe JSON extraction.

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

/**
 * Generic request helper with robust error handling.
 */
async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  let response;
  try {
    response = await fetch(url, options);
  } catch (networkError) {
    throw new Error(`Unable to connect to analytics server (${networkError.message}). Please check if the backend is running.`);
  }

  // Parse response body safely (handles both JSON and non-JSON responses)
  const contentType = response.headers.get('content-type');
  let data = null;
  if (contentType && contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const errorMsg = (data && data.error) || response.statusText || `Request failed with status ${response.status}`;
    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  /**
   * Check backend health status
   */
  getHealth: () => request('/api/health'),

  /**
   * Get list of session summaries (grouped and ordered by latest activity)
   */
  getSessions: () => request('/api/sessions'),

  /**
   * Get all chronological events for a given session
   */
  getSessionEvents: (sessionId) => {
    const encodedId = encodeURIComponent(sessionId);
    return request(`/api/sessions/${encodedId}/events`);
  },

  /**
   * Get distinct page URLs that have tracked events
   */
  getPages: () => request('/api/pages'),

  /**
   * Get click events for a specific page URL
   */
  getClicksByPage: (pageUrl) => {
    const encodedUrl = encodeURIComponent(pageUrl);
    return request(`/api/events/clicks?pageUrl=${encodedUrl}`);
  },
};
