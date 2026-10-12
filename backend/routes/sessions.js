// routes/sessions.js
//
// PURPOSE: Maps URL patterns for session-related endpoints to their controller
//   functions. No business logic lives here.

const express = require('express');
const router = express.Router();

const {
  getSessions,
  getSessionEvents,
} = require('../controllers/sessionController');

// GET /api/sessions — List all sessions with event counts and latest activity.
router.get('/', getSessions);

// GET /api/sessions/:sessionId/events — All events for one session, oldest first.
router.get('/:sessionId/events', getSessionEvents);

module.exports = router;
