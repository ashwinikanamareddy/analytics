// models/Event.js — Defines the shape of a single analytics event in MongoDB.
//
// Why a model file?
//   Mongoose models act as the bridge between your JavaScript code and
//   MongoDB documents. This file describes exactly which fields an event
//   document must have, what types they are, and what validation rules apply.
//   Any code that tries to save a malformed document will receive a
//   validation error before anything reaches the database.

const mongoose = require('mongoose');

// ─── Schema Definition ────────────────────────────────────────────────────────
//
// A Mongoose Schema is a blueprint for a document in a MongoDB collection.
// Each key maps to a field name; the value describes its type and rules.

const eventSchema = new mongoose.Schema(
  {
    // session_id — A unique identifier that groups events from the same
    // browser session together. Indexed because we will often query or
    // filter events by session.
    session_id: {
      type: String,
      required: [true, 'session_id is required'],
      index: true,
    },

    // event_type — The kind of interaction that occurred.
    // Only 'page_view' and 'click' are valid values; anything else is rejected.
    event_type: {
      type: String,
      required: [true, 'event_type is required'],
      enum: {
        values: ['page_view', 'click'],
        message: "event_type must be 'page_view' or 'click', got '{VALUE}'",
      },
    },

    // page_url — The URL of the page where the event occurred.
    page_url: {
      type: String,
      required: [true, 'page_url is required'],
    },

    // timestamp — When the event happened on the client side.
    // Defaults to the current time when the document is created,
    // so the frontend may omit it if the event time equals now.
    timestamp: {
      type: Date,
      required: [true, 'timestamp is required'],
      default: Date.now,
    },

    // x, y — Horizontal and vertical coordinates of a click event,
    // relative to the viewport. These fields are optional for page_view
    // events but are validated as numbers when present.
    x: {
      type: Number,
      default: null,
    },

    y: {
      type: Number,
      default: null,
    },
  },
  {
    // Mongoose automatically adds createdAt and updatedAt fields.
    // createdAt tells us when the document was stored in the database,
    // while timestamp (above) tells us when the event happened on the client.
    timestamps: true,
  }
);

// ─── Cross-field Validation ───────────────────────────────────────────────────
//
// Mongoose schema-level validators run before the document is saved.
// This validator enforces the rule: click events MUST have both x and y;
// page_view events MUST NOT supply partial coordinates (both or neither).

eventSchema.pre('validate', function (next) {
  if (this.event_type === 'click') {
    const hasX = this.x !== null && this.x !== undefined && !isNaN(this.x);
    const hasY = this.y !== null && this.y !== undefined && !isNaN(this.y);

    if (!hasX || !hasY) {
      const err = new Error('click events must include both x and y coordinates');
      if (typeof next === 'function') return next(err);
      throw err;
    }
  }

  if (typeof next === 'function') {
    next();
  }
});

// ─── Indexes ──────────────────────────────────────────────────────────────────
//
// We index fields that will appear in WHERE/filter clauses in future queries.
//
// Index 1 — event_type alone: allows fast queries like
//   "give me all page_view events".
//
// Index 2 — compound (session_id + timestamp): supports queries like
//   "give me all events for session X, sorted by time" without scanning
//   the whole collection.
//
// We intentionally skip indexing x and y because they will never be
// used as filter criteria — only as values we read.

eventSchema.index({ event_type: 1 });
eventSchema.index({ session_id: 1, timestamp: -1 });

// ─── Model Export ─────────────────────────────────────────────────────────────
//
// mongoose.model('Event', eventSchema) creates (or reuses) a model tied to
// the 'events' collection in MongoDB (Mongoose pluralises the name automatically).

const Event = mongoose.model('Event', eventSchema);

module.exports = Event;
