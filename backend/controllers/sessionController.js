// controllers/sessionController.js
//
// PURPOSE: Contains the business logic for session-related endpoints.
//   Sessions are not their own collection — they are derived from the events
//   collection by grouping on session_id. All aggregation happens inside
//   MongoDB using the Mongoose aggregation pipeline; we never pull every
//   event into Node.js just to count or sort them.

const Event = require('../models/Event');

// ─── GET /api/sessions ────────────────────────────────────────────────────────

/**
 * getSessions — Aggregates all events by session_id and returns a summary
 * list sorted by the most-recent activity first.
 *
 * MongoDB aggregation pipeline steps:
 *   1. $group  — collect all events per session_id, count them,
 *                find the latest timestamp.
 *   2. $sort   — newest sessions appear first.
 *   3. $project — rename fields to the public API names.
 */
const getSessions = async (req, res) => {
  try {
    const sessions = await Event.aggregate([
      {
        $group: {
          _id: '$session_id',           // group key
          total_events: { $sum: 1 },    // count documents in this group
          latest_event_at: { $max: '$timestamp' }, // most-recent event time
        },
      },
      {
        $sort: { latest_event_at: -1 }, // newest session first
      },
      {
        $project: {
          _id: 0,                        // suppress the internal _id
          session_id: '$_id',            // rename _id → session_id
          total_events: 1,
          latest_event_at: 1,
        },
      },
    ]);

    return res.json(sessions);
  } catch (err) {
    console.error('getSessions error:', err.message);
    return res.status(500).json({ error: 'An unexpected server error occurred' });
  }
};

// ─── GET /api/sessions/:sessionId/events ─────────────────────────────────────

/**
 * getSessionEvents — Returns every event for one session in chronological
 * order (oldest first).  An unknown session_id just returns an empty array
 * with 200 — no 404 needed because there is no "session" resource to look up.
 */
const getSessionEvents = async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Basic sanity-check: session IDs are non-empty strings.
    if (!sessionId || !sessionId.trim()) {
      return res.status(400).json({ error: 'sessionId parameter is required' });
    }

    const events = await Event.find(
      { session_id: sessionId },
      { __v: 0 }           // exclude the internal Mongoose version key
    ).sort({ timestamp: 1 }); // oldest first

    return res.json(events);
  } catch (err) {
    console.error('getSessionEvents error:', err.message);
    return res.status(500).json({ error: 'An unexpected server error occurred' });
  }
};

module.exports = { getSessions, getSessionEvents };
