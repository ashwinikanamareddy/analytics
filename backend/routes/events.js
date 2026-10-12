// routes/events.js
//
// PURPOSE: Maps URL patterns for event-related endpoints to their controller
//   functions.  This file contains no business logic — it is purely a
//   routing table.  All validation and database work lives in eventController.js.

const express = require('express');
const router = express.Router();

const {
  createEvent,
  getClicksByPage,
  getPages,
} = require('../controllers/eventController');

// POST /api/events — Receive and store a new analytics event.
router.post('/', createEvent);

// GET /api/events/clicks?pageUrl=<url> — Return click events for one page.
// IMPORTANT: This route must be defined BEFORE the generic /:id route (if one
// ever exists) because Express matches routes in declaration order, and "clicks"
// would otherwise be treated as an ID parameter.
router.get('/clicks', getClicksByPage);

module.exports = router;
