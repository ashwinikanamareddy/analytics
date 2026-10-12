// server.js — Entry point for the Express backend.
//
// Startup order:
//   1. Load environment variables from .env
//   2. Connect to MongoDB Atlas (wait for the connection before continuing)
//   3. Register middleware (CORS, JSON body-parsing with size limit)
//   4. Mount route files
//   5. Start the HTTP listener

// Step 1 — Load environment variables FIRST so every other module
// (including db.js) can safely read process.env values.
require('dotenv').config();

const express = require('express'); // Express framework for building the API
const cors = require('cors');       // CORS middleware — lets React (port 5173) call this server (port 5000)
const connectDB = require('./config/db'); // Our MongoDB connection function

// Route modules — each file maps a group of URLs to controller functions
const eventRoutes = require('./routes/events');
const sessionRoutes = require('./routes/sessions');

const app = express(); // Create an Express application instance

// ─── Database Connection ──────────────────────────────────────────────────────
//
// We wrap startup in an async function so we can await the DB connection
// before the HTTP server begins accepting requests.
// If the connection fails, connectDB() calls process.exit(1) so the
// server never starts — no silent half-ready state.

const startServer = async () => {
  // Connect to MongoDB Atlas. Exits the process on failure.
  await connectDB();

  // ─── Middleware ─────────────────────────────────────────────────────────────

  // Allow cross-origin requests from the React dev server (port 5173).
  app.use(cors());

  // Parse incoming JSON bodies. The 10kb limit rejects unreasonably large
  // payloads before they reach any route handler.
  app.use(express.json({ limit: '10kb' }));

  // ─── Routes ─────────────────────────────────────────────────────────────────

  // Health-check — confirms the server (and implicitly the DB) is up.
  // Visit http://localhost:5000/api/health to verify.
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      message: 'Server is running',
      timestamp: new Date().toISOString(),
    });
  });

  // Mount the route files under their base paths.
  // All routes in events.js are prefixed with /api/events.
  // All routes in sessions.js are prefixed with /api/sessions.
  app.use('/api/events', eventRoutes);
  app.use('/api/sessions', sessionRoutes);

  // GET /api/pages — distinct page URLs (used by dashboard page-selector).
  // Mounted directly here because it doesn't fit neatly under /events or
  // /sessions, and it's a single endpoint that needs no separate router file.
  const { getPages } = require('./controllers/eventController');
  app.get('/api/pages', getPages);

  // ─── 404 Catch-all ──────────────────────────────────────────────────────────
  // Any request that didn't match a route above gets a clean 404 JSON response
  // instead of the default Express HTML error page.
  app.use((req, res) => {
    res.status(404).json({ error: `Cannot ${req.method} ${req.path}` });
  });

  // ─── Start HTTP Listener ─────────────────────────────────────────────────────

  const PORT = process.env.PORT || 5000;

  app.listen(PORT, () => {
    console.log(`Backend server is running on http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
  });
};

// Kick off the startup sequence.
startServer();
