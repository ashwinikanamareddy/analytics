# User Analytics Application

## Objective

A full-stack application that tracks user interactions on a webpage and displays them in an analytics dashboard.

## Tech Stack

| Layer      | Technology                    |
|------------|-------------------------------|
| Frontend   | React 19 + Vite               |
| Styling    | CSS                           |
| Backend    | Node.js + Express.js          |
| Database   | MongoDB Atlas + Mongoose      |
| HTTP       | Fetch API                     |

---

## Architecture & Event Data Flow

```
[ User Interaction ] 
       │ (page load or click)
       ▼
[ tracker.js (Browser) ]
       │ - Generates / reuses tab session ID (sessionStorage)
       │ - Captures viewport coordinates (clientX, clientY)
       │ - Dispatches POST request via fetch(..., { keepalive: true })
       ▼
[ Express API Server (port 5000) ]
       │ - express.json({ limit: '10kb' }) & cors()
       │ - Ingestion validation (controller + Mongoose schema pre-validation)
       ▼
[ MongoDB Atlas (Cloud) ]
       │ - 'events' collection
       │ - Indexes: session_id, event_type, compound (session_id, timestamp)
       ▼
[ Aggregation & Queries ]
       │ - POST /api/events               (Store event)
       │ - GET  /api/sessions             (Aggregation pipeline: group, sort, project)
       │ - GET  /api/sessions/:id/events  (Chronological journey)
       │ - GET  /api/events/clicks        (Page click coordinates)
       │ - GET  /api/pages                (Distinct page URLs)
       ▼
[ React Analytics Dashboard (port 5173) ]
       ├── Sessions Overview Table & Summary Cards
       ├── User Journey Chronological Timeline
       └── Visual Click Heatmap Overlay with Live Radius & Filtering
```

## Project Structure

```
user-analytics/
├── frontend/                        # React application (Vite, port 5173)
│   ├── public/
│   │   ├── tracker.js               # Analytics tracking script (plain JS, no React)
│   │   └── demo.html                # Standalone demo page for testing the tracker
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.jsx          # App navigation & reload control
│   │   │   ├── StatsCards.jsx       # Aggregated telemetry summary cards
│   │   │   ├── SessionsTable.jsx    # Interactive session records table
│   │   │   ├── EventTimeline.jsx    # Ordered user journey event sequence
│   │   │   └── ClickHeatmap.jsx     # Visual click coordinate heatmap with tooltips
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx        # Sessions & journeys dashboard view
│   │   │   └── HeatmapView.jsx      # Page-filtered click heatmap analysis view
│   │   ├── services/
│   │   │   └── api.js               # Centralized API service helper (Fetch API)
│   │   ├── App.jsx                  # Main application container & view routing
│   │   ├── App.css                  # Dashboard theme & layout styles
│   │   └── main.jsx                 # React root mount
│   ├── .env.example                 # Frontend env configuration template
│   ├── index.html
│   └── vite.config.js
├── backend/                         # Express API server (port 5000)
│   ├── config/
│   │   └── db.js                    # MongoDB Atlas connection
│   ├── controllers/
│   │   ├── eventController.js       # Logic for event endpoints
│   │   └── sessionController.js     # Logic for session endpoints
│   ├── models/
│   │   └── Event.js                 # Mongoose schema + cross-field validation
│   ├── routes/
│   │   ├── events.js                # URL → controller mapping for /api/events
│   │   └── sessions.js              # URL → controller mapping for /api/sessions
│   ├── tests/
│   │   └── eventValidation.test.js  # Automated unit tests for Event validation
│   ├── server.js                    # App entry point
│   ├── .env.example                 # Credential template (safe to commit)
│   └── package.json
├── .gitignore
└── README.md
```

---

## Tracking Script

### How it works

`frontend/public/tracker.js` is a self-contained, dependency-free script that runs in any browser.

| Behaviour | Detail |
|---|---|
| **Session ID** | Generated once per tab using `crypto.randomUUID()` (fallback: `Math.random`), stored in `sessionStorage` |
| **Session lifetime** | Lives as long as the tab is open. Closing the tab ends the session. Each new tab starts a new session. |
| **Page view** | One `page_view` event sent automatically when the page loads |
| **Clicks** | One `click` event sent per mouse click, with `clientX`/`clientY` viewport coordinates |
| **Network delivery** | `fetch()` with `keepalive: true` so clicks on navigating links are delivered even if the page unloads |
| **Failure handling** | Network/server errors are logged as `console.warn` only — the page is never disrupted |
| **Privacy** | Collects only: page URL, click position, timestamp, session ID. No form inputs, no keystrokes. |

### Adding the tracker to any page

```html
<script src="/tracker.js" data-api-url="http://localhost:5000/api/events"></script>
```

Place this in `<head>` or just before `</body>`. `data-api-url` is optional — it defaults to `http://localhost:5000/api/events`.

### Demo page

With the Vite dev server running, open:
```
http://localhost:5173/demo.html
```

The demo page has clickable buttons, navigation links, and a live event log panel so you can watch tracker requests in real time without opening DevTools.

---

## Testing the Tracker (Manual — Browser DevTools)

**Prerequisites:** Both the backend (`npm run dev` in `backend/`) and the frontend (`npm run dev` in `frontend/`) must be running.

### Test 1 — Verify a page_view event
1. Open `http://localhost:5173/demo.html`.
2. Open DevTools → **Network** tab → filter by `api/events`.
3. A `POST` to `http://localhost:5000/api/events` appears immediately.
4. Click the request → **Payload** → confirm `"event_type": "page_view"` with no `x`/`y`.

### Test 2 — Verify a click event with coordinates
1. Click **"Primary Button"** on the demo page.
2. Find the new POST in the Network tab.
3. Confirm `"event_type": "click"` and that `x` and `y` are numeric values.

### Test 3 — Session ID reuse across navigation within the same tab
1. Note the session ID shown at the top of the demo page.
2. Navigate to `http://localhost:5173/`.
3. In DevTools Console run: `sessionStorage.getItem('cf_session_id')`
4. The value matches the ID from step 1.

### Test 4 — New tab gets its own session
1. Open the demo page in a **new tab** (Ctrl+T).
2. Compare the session ID with the original tab — they must be different UUIDs.

### Test 5 — Refresh keeps the same session
1. Note the session ID. Press F5.
2. Session ID is the same. A new `page_view` event appears (same ID, new timestamp).

### Test 6 — Backend offline does not break the page
1. Stop the backend (Ctrl+C).
2. Refresh the demo page — it loads normally.
3. The live log shows a `console.warn` network error. No crash, no alert, no broken UI.

### Test 7 — Confirm events appear in MongoDB
```powershell
# All sessions
Invoke-WebRequest -Uri "http://localhost:5000/api/sessions" -UseBasicParsing | Select-Object -ExpandProperty Content

# Events for your session (replace <your-session-id>)
Invoke-WebRequest -Uri "http://localhost:5000/api/sessions/<your-session-id>/events" -UseBasicParsing | Select-Object -ExpandProperty Content

# Click coordinates for the demo page
$enc = [Uri]::EscapeDataString("http://localhost:5173/demo.html")
Invoke-WebRequest -Uri "http://localhost:5000/api/events/clicks?pageUrl=$enc" -UseBasicParsing | Select-Object -ExpandProperty Content
```

---

## MongoDB Atlas Setup

### 1. Create a free cluster
1. Go to [https://cloud.mongodb.com](https://cloud.mongodb.com) and sign up.
2. Create a **Project** → **Build a Database** → **M0 Free** → any region.

### 2. Create a database user
1. **Database Access** → **Add New Database User**.
2. Authentication: **Password**. Save the username and password.
3. Role: **Read and write to any database**.

### 3. Allow your IP address
**Network Access** → **Add IP Address** → **Add Current IP Address** → **Confirm**.

### 4. Get your connection string
1. **Database** → **Connect** → **Drivers** → **Node.js**.
2. Copy the URI, e.g.:
   ```
   mongodb+srv://alice:s3cr3t@cluster0.abc12.mongodb.net/user-analytics?retryWrites=true&w=majority
   ```

---

## Environment Variables

```bash
# From inside user-analytics\backend (Windows VS Code terminal)
copy .env.example .env
```

Open `backend/.env` and fill in real values:

```env
PORT=5000
MONGODB_URI=mongodb+srv://alice:s3cr3t@cluster0.abc12.mongodb.net/user-analytics?retryWrites=true&w=majority
```

> ⚠️ Never commit `.env` — it is excluded by `.gitignore`.

---

## Getting Started

### Start the backend
```bash
cd user-analytics\backend
npm install
npm run dev
```
Expected output:
```
MongoDB connected: cluster0.abc12.mongodb.net
Backend server is running on http://localhost:5000
Health check: http://localhost:5000/api/health
```

### Start the frontend
Open a **second** terminal:
```bash
cd user-analytics\frontend
npm install
npm run dev
```
App opens at **http://localhost:5173**.

---

## API Reference

### Health

| Method | Endpoint       | Description          |
|--------|----------------|----------------------|
| GET    | /api/health    | Server health check  |

**Response:**
```json
{ "status": "ok", "message": "Server is running", "timestamp": "2024-01-01T00:00:00.000Z" }
```

---

### Events

#### `POST /api/events` — Store a new event

**Request body:**
```json
{
  "session_id": "sess_abc123",
  "event_type": "page_view",
  "page_url": "http://localhost:5173/",
  "timestamp": "2024-01-01T10:00:00.000Z"
}
```
For a **click** event, add `x` and `y`:
```json
{
  "session_id": "sess_abc123",
  "event_type": "click",
  "page_url": "http://localhost:5173/",
  "x": 320,
  "y": 150
}
```

**Success — HTTP 201:**
```json
{
  "_id": "...",
  "session_id": "sess_abc123",
  "event_type": "click",
  "page_url": "http://localhost:5173/",
  "timestamp": "2024-01-01T10:00:00.000Z",
  "x": 320,
  "y": 150,
  "createdAt": "...",
  "updatedAt": "..."
}
```

**Error — HTTP 400 (missing coordinates):**
```json
{ "error": "click events require both x and y as finite numbers" }
```

---

#### `GET /api/events/clicks?pageUrl=<url>` — Click coordinates for a page

```
GET /api/events/clicks?pageUrl=http%3A%2F%2Flocalhost%3A5173%2F
```

**Response — HTTP 200:**
```json
[
  { "session_id": "sess_abc123", "page_url": "http://localhost:5173/", "timestamp": "...", "x": 320, "y": 150 }
]
```

**Error — HTTP 400 (missing pageUrl):**
```json
{ "error": "pageUrl query parameter is required" }
```

---

### Sessions

#### `GET /api/sessions` — All sessions with event counts

**Response — HTTP 200:**
```json
[
  { "session_id": "sess_abc123", "total_events": 5, "latest_event_at": "2024-01-01T10:05:00.000Z" }
]
```

---

#### `GET /api/sessions/:sessionId/events` — All events for one session

```
GET /api/sessions/sess_abc123/events
```

**Response — HTTP 200** (chronological, oldest first):
```json
[
  { "_id": "...", "session_id": "sess_abc123", "event_type": "page_view", "page_url": "...", "timestamp": "..." },
  { "_id": "...", "session_id": "sess_abc123", "event_type": "click",     "page_url": "...", "timestamp": "...", "x": 320, "y": 150 }
]
```

An unknown session returns `[]` with HTTP 200.

---

### Pages

#### `GET /api/pages` — Distinct page URLs

**Response — HTTP 200:**
```json
["http://localhost:5173/", "http://localhost:5173/about"]
```

---

## Testing the API — Windows PowerShell Commands

Run these from any terminal after starting the backend with `npm run dev`.

### 1. Health check
```powershell
Invoke-WebRequest -Uri "http://localhost:5000/api/health" -UseBasicParsing | Select-Object -ExpandProperty Content
```

### 2. POST a valid page_view event
```powershell
Invoke-WebRequest -Uri "http://localhost:5000/api/events" `
  -Method POST `
  -Headers @{ "Content-Type" = "application/json" } `
  -Body '{"session_id":"sess_abc123","event_type":"page_view","page_url":"http://localhost:5173/"}' `
  -UseBasicParsing | Select-Object -ExpandProperty Content
```
Expected: HTTP 201, JSON with the saved document.

### 3. POST a valid click event
```powershell
Invoke-WebRequest -Uri "http://localhost:5000/api/events" `
  -Method POST `
  -Headers @{ "Content-Type" = "application/json" } `
  -Body '{"session_id":"sess_abc123","event_type":"click","page_url":"http://localhost:5173/","x":320,"y":150}' `
  -UseBasicParsing | Select-Object -ExpandProperty Content
```
Expected: HTTP 201, JSON including `"x":320,"y":150`.

### 4. POST a click event missing coordinates (should fail)
```powershell
Invoke-WebRequest -Uri "http://localhost:5000/api/events" `
  -Method POST `
  -Headers @{ "Content-Type" = "application/json" } `
  -Body '{"session_id":"sess_abc123","event_type":"click","page_url":"http://localhost:5173/"}' `
  -UseBasicParsing -ErrorAction SilentlyContinue | Select-Object StatusCode, @{N="Body";E={$_.Content}}
```
Expected: HTTP 400, `{ "error": "click events require both x and y as finite numbers" }`.

### 5. GET all sessions
```powershell
Invoke-WebRequest -Uri "http://localhost:5000/api/sessions" -UseBasicParsing | Select-Object -ExpandProperty Content
```
Expected: JSON array with `session_id`, `total_events`, `latest_event_at`.

### 6. GET events for a session
```powershell
Invoke-WebRequest -Uri "http://localhost:5000/api/sessions/sess_abc123/events" -UseBasicParsing | Select-Object -ExpandProperty Content
```
Expected: JSON array ordered oldest-first.

### 7. GET click coordinates for a page
```powershell
$encoded = [Uri]::EscapeDataString("http://localhost:5173/")
Invoke-WebRequest -Uri "http://localhost:5000/api/events/clicks?pageUrl=$encoded" -UseBasicParsing | Select-Object -ExpandProperty Content
```
Expected: JSON array of `{ session_id, page_url, timestamp, x, y }` objects.

### 8. GET all available pages
```powershell
Invoke-WebRequest -Uri "http://localhost:5000/api/pages" -UseBasicParsing | Select-Object -ExpandProperty Content
```
Expected: JSON array of URL strings.

### 9. POST with an invalid event_type (should fail)
```powershell
Invoke-WebRequest -Uri "http://localhost:5000/api/events" `
  -Method POST `
  -Headers @{ "Content-Type" = "application/json" } `
  -Body '{"session_id":"sess_abc123","event_type":"hover","page_url":"http://localhost:5173/"}' `
  -UseBasicParsing -ErrorAction SilentlyContinue | Select-Object StatusCode, @{N="Body";E={$_.Content}}
```
Expected: HTTP 400, `{ "error": "event_type is required and must be one of: page_view, click" }`.

---

## Event Schema

| Field        | Type    | Required                  | Notes                                               |
|--------------|---------|---------------------------|-----------------------------------------------------|
| `session_id` | String  | ✅                        | Groups events from the same browser session         |
| `event_type` | String  | ✅                        | Must be `"page_view"` or `"click"`                  |
| `page_url`   | String  | ✅                        | Must be a valid `http`/`https` URL                  |
| `timestamp`  | Date    | ✅ (defaults to now)      | Client-side event time                              |
| `x`          | Number  | ✅ for click, ❌ otherwise | Horizontal coordinate                               |
| `y`          | Number  | ✅ for click, ❌ otherwise | Vertical coordinate                                 |
| `createdAt`  | Date    | auto                      | When the document was saved to the database         |
| `updatedAt`  | Date    | auto                      | Last modification time                              |

---

## React Analytics Dashboard (Step 5 & Step 6)

The React application runs at `http://localhost:5173/` and communicates with the backend via the centralized API layer in `src/services/api.js`.

### Features
1. **Aggregated Summary Cards**: Total active sessions, total interactions recorded, average events per session, and active inspection session.
2. **Interactive Sessions Table**: Sorted by newest activity with live event counts, formatted local timestamps, and direct inspection action.
3. **User Journey Event Timeline**: Chronological event flow showing event types, target URLs, viewport coordinates for clicks, and time tracking.
4. **Click Heatmap Analysis (Step 6)**: Visual aggregation of user click coordinates overlaid onto a calibrated browser frame.
   - Dynamic page selector populated via `GET /api/pages`.
   - Real-time click count and metadata strip.
   - Session filtering dropdown and customizable marker glow radius.
   - Interactive hover tooltips showing exact coordinates `(X, Y)`, timestamp, and session ID.
5. **Resilient Data States**: Built-in loading spinners, empty database states with demo guidance, network failure banners with retry options, and stale-request protection during rapid session switching.
6. **Live Refresh**: Refresh control in the sidebar to reload telemetry without reloading the whole browser.

---

## Click Heatmap Coordinate Mapping Strategy & Limitations

### Coordinate Capture
The tracking script (`tracker.js`) captures mouse click positions using standard browser event properties:
- `x: event.clientX` (horizontal offset relative to the browser viewport).
- `y: event.clientY` (vertical offset relative to the browser viewport).

### Mapping Implementation in `ClickHeatmap.jsx`
1. **Calibrated Browser Frame**: We render an interactive browser mockup canvas with standard desktop viewport dimensions (`1200px`+ width, `800px`+ height, automatically adjusting to the maximum tracked coordinates).
2. **Representative Backdrop**: For tracked demo pages (`demo.html`), the canvas renders a representative structural wireframe mirroring the demo layout (header, banners, button row, log card). For arbitrary pages, it renders a 100px reference grid.
3. **Exact Absolute Positioning**: Markers are placed at `left: x px` and `top: y px` with `-50% / -50%` transforms so the glowing core centers accurately on the recorded click target.
4. **Boundary Safety**: Overflow scrolling ensures markers recorded on wide or tall screens never get cropped.

### Technical Limitations of Viewport Coordinates (`clientX`/`clientY`)
1. **Screen Resolution Differences**: Viewport-relative coordinates depend on the user's browser window size at the moment of the click. A click on a centered element on a `1920x1080` screen has a different `clientX` than on a `1366x768` screen.
2. **Scroll Offset**: `clientX` and `clientY` measure from the visible viewport edge, not the document top. If a user scrolls down 400px and clicks, `clientY` reflects the visible distance, not `pageY`.
3. **Responsive Reflow**: Text wrapping and CSS layout changes shift elements based on device width. Without full DOM element selector tracking (e.g. tracking `target.id` or `cssPath`), static pixel coordinates are best interpreted within a controlled reference resolution.

---

## Assumptions & Engineering Trade-offs

1. **Session Scope**:
   - `sessionStorage` was chosen for session lifetime. Each browser tab operates as an independent session, preserving privacy and enabling clear tab journeys. Opening a link in a new tab generates a new session.
2. **Delivery Mechanism**:
   - `fetch()` with `keepalive: true` ensures telemetry payloads are delivered even if a navigation click unloads the page, while adhering to standard `Content-Type: application/json` without `sendBeacon()` payload conversion quirks.
3. **Database Aggregation**:
   - Sessions are dynamically computed using a MongoDB 3-stage aggregation pipeline (`$group`, `$sort`, `$project`) to avoid memory-heavy in-memory grouping in Node.js.
4. **Zero-Secret Architecture**:
   - Real credentials are strictly kept in `.env` files that are ignored by `.gitignore`. Templates (`.env.example`) contain only placeholders.
5. **No Bulky Charting Dependencies**:
   - The Click Heatmap is implemented using lightweight CSS radial gradients and absolute positioning, keeping the bundle fast and minimal.


