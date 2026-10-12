// controllers/eventController.js
//
// PURPOSE: Contains the business logic for every event-related API endpoint.
//   A controller receives a parsed request from the router, performs validation
//   and database operations, then sends back the HTTP response.
//   Keeping this logic here (rather than in routes/events.js) means the router
//   file stays a clean list of "which URL maps to which handler".

const mongoose = require('mongoose');
const Event = require('../models/Event');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * isValidUrl — Returns true if the string is a well-formed http/https URL.
 * We reject anything that is not a real URL so garbage data never enters
 * the database and the page-selector dropdown always shows real pages.
 */
const isValidUrl = (str) => {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

/**
 * isFiniteNumber — Returns true only for actual finite numbers.
 * isNaN(null) returns false in JS, so we need this extra check so that
 * a missing x or y is not silently treated as a valid coordinate.
 */
const isFiniteNumber = (val) =>
  typeof val === 'number' && isFinite(val);

// ─── POST /api/events ─────────────────────────────────────────────────────────

/**
 * createEvent — Validates the request body, creates an Event document, and
 * returns HTTP 201 with the saved document.
 *
 * Validation performed here (before hitting Mongoose) lets us return
 * specific, human-readable 400 messages rather than Mongoose error strings.
 */
const createEvent = async (req, res) => {
  try {
    // Destructure only the fields we expect — any extra client fields are
    // silently ignored, so arbitrary data cannot be injected.
    const { session_id, event_type, page_url, timestamp, x, y } = req.body;

    // ── Required field checks ──────────────────────────────────────────────
    if (!session_id || typeof session_id !== 'string' || !session_id.trim()) {
      return res.status(400).json({ error: 'session_id is required and must be a non-empty string' });
    }

    const ALLOWED_TYPES = ['page_view', 'click'];
    if (!event_type || !ALLOWED_TYPES.includes(event_type)) {
      return res.status(400).json({
        error: `event_type is required and must be one of: ${ALLOWED_TYPES.join(', ')}`,
      });
    }

    if (!page_url || typeof page_url !== 'string') {
      return res.status(400).json({ error: 'page_url is required and must be a string' });
    }
    if (!isValidUrl(page_url)) {
      return res.status(400).json({ error: 'page_url must be a valid http or https URL' });
    }

    // ── Optional timestamp — validate if supplied ──────────────────────────
    let parsedTimestamp;
    if (timestamp !== undefined && timestamp !== null) {
      parsedTimestamp = new Date(timestamp);
      if (isNaN(parsedTimestamp.getTime())) {
        return res.status(400).json({ error: 'timestamp is not a valid date' });
      }
    }
    // If omitted, the Mongoose default (Date.now) will apply.

    // ── click-specific coordinate validation ──────────────────────────────
    if (event_type === 'click') {
      if (!isFiniteNumber(x) || !isFiniteNumber(y)) {
        return res.status(400).json({
          error: 'click events require both x and y as finite numbers',
        });
      }
    }

    // ── Build the document with only known fields ─────────────────────────
    const eventData = {
      session_id: session_id.trim(),
      event_type,
      page_url,
      ...(parsedTimestamp && { timestamp: parsedTimestamp }),
      // Only set x/y when they were supplied — null is the schema default
      ...(event_type === 'click' && { x, y }),
    };

    const event = new Event(eventData);
    const saved = await event.save();

    return res.status(201).json(saved);
  } catch (err) {
    // Mongoose validation errors (schema-level) — return 400
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ error: messages.join('; ') });
    }
    // Unexpected errors — log internally, return generic 500 (no stack trace)
    console.error('createEvent error:', err.message);
    return res.status(500).json({ error: 'An unexpected server error occurred' });
  }
};

// ─── GET /api/events/clicks?pageUrl=<url> ─────────────────────────────────────

/**
 * getClicksByPage — Returns all click events for the given page URL.
 * Only fields relevant to a heatmap are returned (no internal _id noise).
 */
const getClicksByPage = async (req, res) => {
  try {
    const { pageUrl } = req.query;

    if (!pageUrl || typeof pageUrl !== 'string' || !pageUrl.trim()) {
      return res.status(400).json({ error: 'pageUrl query parameter is required' });
    }
    if (!isValidUrl(pageUrl)) {
      return res.status(400).json({ error: 'pageUrl must be a valid http or https URL' });
    }

    const clicks = await Event.find(
      { event_type: 'click', page_url: pageUrl },
      { session_id: 1, page_url: 1, timestamp: 1, x: 1, y: 1, _id: 0 }
    ).sort({ timestamp: 1 });

    return res.json(clicks);
  } catch (err) {
    console.error('getClicksByPage error:', err.message);
    return res.status(500).json({ error: 'An unexpected server error occurred' });
  }
};

// ─── GET /api/pages ───────────────────────────────────────────────────────────

/**
 * getPages — Returns the distinct page_url values stored in the events
 * collection. The dashboard page-selector calls this to populate its dropdown.
 */
const getPages = async (req, res) => {
  try {
    const pages = await Event.distinct('page_url');
    return res.json(pages.sort()); // alphabetical order
  } catch (err) {
    console.error('getPages error:', err.message);
    return res.status(500).json({ error: 'An unexpected server error occurred' });
  }
};

module.exports = { createEvent, getClicksByPage, getPages };
