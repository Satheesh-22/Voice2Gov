# Voice2Gov — React Frontend

**NLP & ML-Based Citizen Grievance Intelligence System**  
Erode Sengunthar Engineering College · M.Tech CSE · May 2026

---

## File Structure

```
voice2gov-frontend/
├── index.html
├── vite.config.js          # Vite + proxy to backend :5000
├── package.json
├── .env.example
└── src/
    ├── main.jsx             # React DOM entry — wraps Auth/Toast/Socket providers
    ├── App.jsx              # Routes (react-router-dom v6)
    ├── index.css            # Dark-theme design system
    ├── api/
    │   └── axios.js         # Axios instance + JWT interceptor
    ├── context/
    │   ├── AuthContext.jsx   # Login / logout / register state
    │   ├── ToastContext.jsx  # Global slide-in toast notifications
    │   └── SocketContext.jsx # Socket.io connection + notification state
    ├── components/
    │   ├── Navbar.jsx
    │   ├── ProtectedRoute.jsx
    │   ├── Spinner.jsx
    │   ├── StatusBadge.jsx     # StatusBadge, PriorityBadge, PriorityBar
    │   ├── Toast.jsx           # Animated toast container
    │   └── NotificationBell.jsx # Bell icon + dropdown history panel
    └── pages/
        ├── Login.jsx
        ├── Register.jsx
        ├── Home.jsx          # Metrics + category chart
        ├── Submit.jsx        # 3-step wizard (text/voice/image → AI → confirm)
        ├── Issues.jsx        # Paginated list with filters
        ├── ComplaintDetail.jsx # Full view + timeline + status update
        ├── Dashboard.jsx     # Admin charts (recharts)
        └── AIChat.jsx        # Voice2Gov AI chat assistant
```

---

## Quick Start

### Prerequisites
- Node.js ≥ 18
- Voice2Gov backend running on port 5000 (`npm run dev` in voice2gov-backend)

### Install & run
```bash
cd voice2gov-frontend
cp .env.example .env
npm install
npm run dev
```

App opens at: `http://localhost:3000`

---

## Pages & Features

### /login  /register
- JWT authentication — token stored in localStorage
- Auto-redirect to dashboard for admin/department after login

### / — Home
- Hero section with quick actions
- Live metrics (total, open, in-progress, resolved, critical)
- Complaint breakdown bar chart by category
- Citizens see only their own complaint stats

### /submit — Report an Issue (3-step wizard)
- **Step 1 — Input** with 3 modes:
  - Text: title + description + location fields
  - Voice: Web Speech API (Chrome/Edge) → auto-transcribed
  - Image: drag & drop or file picker, supports JPG/PNG/MP4
- **Step 2 — AI Analysis**: live call to `/api/complaints/analyze`  
  Shows: category, department, priority badge, sentiment, urgency score 1–10, AI summary, keywords
- **Step 3 — Confirm**: POST to `/api/complaints`, shows reference ID

### /issues — All Issues
- Search bar (debounced 400ms)
- Filter by status (All / Submitted / In Progress / Resolved …)
- Filter by priority (All / Critical / High / Medium / Low)
- Paginated (8 per page)

### /issues/:id — Complaint Detail
- Full AI analysis block
- Status timeline
- Admin/department: update status dropdown + note
- Citizen: 5-star feedback form after resolution

### /dashboard — Admin Dashboard
- Metrics row (total, open, in-progress, resolved, critical, avg resolution hours)
- Bar chart: complaints by category (recharts)
- Bar chart: complaints by priority
- Line chart: daily submission trend (7 / 14 / 30 day toggle)
- Recent reports table

### /chat — AI Assistant (Voice2Gov AI)
- Full chat UI with bubbles, typing indicator, and suggested-question chips
- Header shows a **✦ Voice2Gov AI** badge when `AI_API_KEY` is configured on the backend, or **Built-in** otherwise — pulled live from `GET /api/ai/status`
- Accessible two ways:
  - Top nav **✦ AI Chat** link — general assistant (how to report, category explanations, resolution timelines)
  - **✦ Ask AI about this** button on any Complaint Detail page — opens `/chat?complaint=<id>`, which loads that complaint's title, status, category, and department as context so answers are specific
- Supports Tamil or English input — the assistant responds in the same language
- "New chat" button resets the conversation; complaint context persists via the URL query param

---

## Auth & Roles

| Role       | Pages accessible                          |
|------------|-------------------------------------------|
| citizen    | Home, Submit, Issues, Complaint Detail, AI Chat |
| department | + Dashboard (own dept complaints only)    |
| admin      | Everything including full dashboard       |

---

## API Connection

The Vite dev server proxies `/api/*` to `http://localhost:5000` (backend).  
No CORS issues during development.

For production, set `VITE_API_URL=https://your-backend.com/api` in `.env`.

To enable the **✦ Voice2Gov AI** badge and external AI responses, set `AI_API_KEY` in the **backend's** `.env` — the frontend automatically detects it via `/api/ai/status` and requires no changes.

---

## Tech Stack

| Layer   | Technology |
|---------|-----------|
| Framework | React 18 |
| Build     | Vite 5    |
| Routing   | React Router v6 |
| HTTP      | Axios with JWT interceptor |
| Charts    | Recharts |
| Auth      | Context API + localStorage |
| Styling   | CSS custom properties (dark theme) |

---

## Team

| Roll No | Name |
|---------|------|
| 730455921006 | Aravinth Kumar. K |
| 730455921020 | Kavinkumar. K |
| 730455921023 | Mahendran. B |
| 730455921043 | Satheesh Kumar. M |
| 730455921045 | Suraj. R |
