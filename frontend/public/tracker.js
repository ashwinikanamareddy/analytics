/**
 * tracker.js — CausalFunnel User Analytics Tracker
 *
 * A plain JavaScript file that can be dropped into any webpage with a single
 * <script> tag. It has no dependencies on React, Node.js, or any third-party
 * library — it runs entirely in the browser.
 *
 * What it does:
 *   1. Reads configuration from the <script> tag's data-api-url attribute.
 *   2. Creates or reuses a session ID stored in sessionStorage.
 *   3. Sends one page_view event when the page loads.
 *   4. Sends a click event (with x/y coordinates) on every mouse click.
 *
 * How to add it to a page:
 *   <script src="/tracker.js" data-api-url="http://localhost:5000/api/events"></script>
 *
 * Privacy:
 *   - Collects only: page URL, click position (x, y), timestamp, session ID.
 *   - Does NOT collect: form inputs, passwords, keystrokes, user identity.
 */

(function () {
  'use strict';

  // ─── 1. CONFIGURATION ──────────────────────────────────────────────────────
  //
  // We find this very <script> element so we can read custom data attributes
  // from it. `document.currentScript` works for synchronously-executed scripts.
  // The querySelector fallback handles edge cases (e.g., loaded via a bundler).
  //
  // The backend URL can be overridden per-page using the data-api-url attribute:
  //   <script src="/tracker.js" data-api-url="https://api.example.com/api/events">

  var scriptEl =
    document.currentScript ||
    document.querySelector('script[data-api-url]') ||
    document.querySelector('script[src*="tracker"]');

  var API_URL =
    (scriptEl && scriptEl.getAttribute('data-api-url')) ||
    'http://localhost:5000/api/events';

  // ─── 2. SESSION MANAGEMENT ─────────────────────────────────────────────────
  //
  // A "session" is one continuous visit in a single browser tab.
  //
  // We use sessionStorage (not localStorage) because:
  //   - sessionStorage is scoped to the tab. Each new tab gets its own session.
  //   - sessionStorage is cleared when the tab is closed.
  //   - localStorage persists forever across tabs, which would make every
  //     visit look like the same long session — not useful for analytics.
  //
  // Limitations of sessionStorage:
  //   - If the user opens a link in a new tab, the new tab starts a new session.
  //   - If the user duplicates a tab, the new tab inherits the session ID.
  //   - Private / Incognito mode still uses sessionStorage (cleared on close).

  var SESSION_STORAGE_KEY = 'cf_session_id';

  /**
   * generateId — Creates a UUID v4 string.
   *
   * Uses crypto.randomUUID() when available (all modern browsers since 2021).
   * Falls back to a Math.random-based UUID for older browsers.
   * The fallback is not cryptographically secure but is sufficient for an
   * analytics session identifier.
   */
  function generateId() {
    if (
      typeof crypto !== 'undefined' &&
      typeof crypto.randomUUID === 'function'
    ) {
      return crypto.randomUUID();
    }
    // RFC 4122 §4.4 compliant UUID v4 fallback
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * getOrCreateSessionId — Returns the session ID for this tab.
   *
   * On the very first page load in a tab:
   *   → generates a new ID and saves it to sessionStorage.
   * On every subsequent page load in the same tab (navigation, refresh):
   *   → returns the existing ID from sessionStorage.
   */
  function getOrCreateSessionId() {
    var existing = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (existing) {
      return existing;
    }
    var newId = generateId();
    sessionStorage.setItem(SESSION_STORAGE_KEY, newId);
    return newId;
  }

  // Resolve the session ID once at script load time. Every event in this tab
  // will carry this same ID, so all clicks and page views can be grouped.
  var SESSION_ID = getOrCreateSessionId();

  // ─── 3. EVENT SENDING ──────────────────────────────────────────────────────
  //
  // We use the Fetch API with `keepalive: true`.
  //
  // Why keepalive?
  //   When a user clicks a link, the browser may navigate away and cancel any
  //   in-flight fetch requests before they complete. Setting `keepalive: true`
  //   tells the browser to keep the request alive even if the page is unloaded.
  //   This ensures click events on navigating links are delivered reliably.
  //
  // Why NOT navigator.sendBeacon()?
  //   sendBeacon() does not accept a Content-Type: application/json header
  //   natively — it sends text/plain or requires a Blob workaround. Our
  //   backend's express.json() middleware expects application/json. Using
  //   keepalive fetch avoids any content-type mismatch.
  //
  // Trade-offs of keepalive:
  //   - The browser limits total keepalive payload to ~64 KB per page.
  //     Our JSON payloads are ~200 bytes each, so this limit is not a concern.
  //   - If the browser crashes (not just navigates), keepalive cannot help.
  //   - Some very old browsers do not support keepalive; they fall back to a
  //     regular fetch which may be cancelled on navigation. The data loss is
  //     acceptable for an analytics use-case.

  /**
   * sendEvent — Sends one analytics event to the backend as a JSON POST.
   *
   * Errors (network failure, server rejection) are logged as console warnings
   * only. They never throw, never alert, and never affect page behavior.
   *
   * @param {Object} payload  The event object matching the Event model schema.
   */
  function sendEvent(payload) {
    try {
      fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true, // survive page navigation
      })
        .then(function (response) {
          if (!response.ok) {
            // Server returned 4xx or 5xx. Log for the developer; don't alert.
            console.warn(
              '[tracker] Server rejected event. Status:',
              response.status
            );
          }
        })
        .catch(function (networkError) {
          // fetch itself failed (backend down, CORS issue, no internet).
          // The page continues working normally.
          console.warn('[tracker] Could not reach analytics server:', networkError.message);
        });
    } catch (err) {
      // fetch() is not available (extremely old environment).
      console.warn('[tracker] fetch() unavailable:', err.message);
    }
  }

  // ─── 4. PAGE VIEW TRACKING ─────────────────────────────────────────────────
  //
  // We send exactly one page_view event per script initialization.
  // The `pageViewSent` flag prevents duplicates in cases where the
  // DOMContentLoaded listener fires more than once or the script is
  // accidentally included twice on the same page.

  var pageViewSent = false;

  function trackPageView() {
    if (pageViewSent) return; // guard: send at most once per initialization
    pageViewSent = true;

    sendEvent({
      session_id: SESSION_ID,
      event_type: 'page_view',
      page_url: window.location.href,
      timestamp: new Date().toISOString(),
      // x and y are intentionally absent for page_view events.
      // The Event model schema defaults them to null, so omitting them is correct.
    });
  }

  // ─── 5. CLICK TRACKING ─────────────────────────────────────────────────────
  //
  // A single listener on `document` captures every click on the page via
  // event bubbling. This means we never need to attach listeners to individual
  // buttons, links, or elements — the tracker works automatically for all
  // current and future page content.
  //
  // We use `clientX` / `clientY` (viewport-relative coordinates) because:
  //   - They are reliable and consistent across browsers.
  //   - They represent where the user actually clicked on the screen.
  //   - `pageX`/`pageY` include scroll offset, which makes heatmaps harder
  //     to normalize across different scroll positions.
  //
  // We do NOT call event.preventDefault() or event.stopPropagation().
  // The tracker is entirely passive — links, buttons, forms, and all other
  // page interactions continue to work exactly as before.

  function trackClick(event) {
    sendEvent({
      session_id: SESSION_ID,
      event_type: 'click',
      page_url: window.location.href,
      timestamp: new Date().toISOString(),
      x: event.clientX,
      y: event.clientY,
    });
  }

  // Register the click listener at the document level (capture phase = false,
  // so it runs after the element's own handlers — fully non-intrusive).
  document.addEventListener('click', trackClick);

  // ─── 6. INITIALIZE ─────────────────────────────────────────────────────────
  //
  // Track the page view as soon as the DOM is ready.
  //
  // Why check readyState?
  //   If the script tag is in <head> without defer/async, the DOM might not
  //   be fully parsed yet when this code runs. We wait for DOMContentLoaded.
  //   If the script is at the bottom of <body> or already loaded, readyState
  //   will be 'interactive' or 'complete' and we call trackPageView directly.

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', trackPageView);
  } else {
    trackPageView();
  }
})();
