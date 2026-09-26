# Voice2Gov — Backend API

**NLP & ML-Based Citizen Grievance Intelligence System**  
Erode Sengunthar Engineering College · M.Tech CSE (5-Year Integrated) · May 2026

---

## Project Structure

```
voice2gov-backend/
├── src/
│   ├── config/
│   │   ├── db.js              # MongoDB connection with retry logic
│   │   └── logger.js          # Winston logger (console + file)
│   ├── controllers/
│   │   ├── authController.js       # Register, login, profile
│   │   ├── complaintController.js  # Full complaint lifecycle + AI
│   │   └── dashboardController.js  # Analytics & reporting
│   ├── middleware/
│   │   ├── auth.js            # JWT protect + role authorise
│   │   ├── errorHandler.js    # Global error handler + asyncHandler
│   │   └── upload.js          # Multer config (image/audio/video)
│   ├── models/
│   │   ├── User.js            # User schema (citizen/admin/department)
│   │   └── Complaint.js       # Complaint schema with AI sub-doc
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── complaintRoutes.js
│   │   └── dashboardRoutes.js
│   ├── utils/
│   │   ├── nlpEngine.js       # Rule-based NLP classifier
│   │   ├── responseHelper.js  # Standardised API responses
│   │   └── seedData.js        # Dev seed script
│   ├── __tests__/
│   │   └── nlpEngine.test.js  # Unit tests
│   ├── app.js                 # Express app (middleware + routes)
│   └── server.js              # Entry point
├── uploads/                   # Uploaded attachments (gitignored)
├── logs/                      # Log files (gitignored)
├── .env.example
└── package.json
```

---

## Quick Start

### 1. Install MongoDB
Download from https://www.mongodb.com/try/download/community and start it:
```bash
mongod --dbpath /data/db
```

### 2. Clone and Install
```bash
cd voice2gov-backend
npm install
```

### 3. Configure Environment
```bash
cp .env.example .env
# Edit .env — set MONGO_URI, JWT_SECRET at minimum
```

### 4. Seed Sample Data (optional)
```bash
node src/utils/seedData.js
```
Creates:
- Admin: `admin@voice2gov.in` / `Admin@123`
- Citizen: `aravinth@example.com` / `Test@1234`
- 6 sample complaints with AI analysis

### 5. Start the Server
```bash
npm run dev      # development (nodemon auto-reload)
npm start        # production
```

Server runs at: `http://localhost:5000`

### 6. Run Tests
```bash
npm test
```

---

## API Reference

### Base URL
```
http://localhost:5000/api
```

### Health Check
```
GET /api/health
```

---

### Auth Routes (`/api/auth`)

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/register` | — | Register new user |
| POST | `/login` | — | Login and get JWT |
| GET | `/me` | ✅ | Get profile |
| PUT | `/me` | ✅ | Update profile |
| PUT | `/password` | ✅ | Change password |

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "Aravinth Kumar",
  "email": "aravinth@example.com",
  "password": "Test@1234",
  "phone": "9876543210"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "aravinth@example.com",
  "password": "Test@1234"
}
```
Response includes `token` — use as `Authorization: Bearer <token>` header.

---

### Complaint Routes (`/api/complaints`)

All routes require `Authorization: Bearer <token>`.

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/analyze` | citizen+ | AI analysis preview (no save) |
| POST | `/` | citizen+ | Submit complaint (+ file upload) |
| GET | `/` | citizen+ | List complaints (filtered/paginated) |
| GET | `/:id` | citizen+ | Get complaint detail |
| PUT | `/:id/status` | admin/dept | Update complaint status |
| POST | `/:id/feedback` | citizen | Submit rating after resolution |
| DELETE | `/:id` | admin | Soft-delete complaint |

#### Analyze (preview AI, no save)
```http
POST /api/complaints/analyze
Authorization: Bearer <token>
Content-Type: application/json

{
  "text": "Water pipe is leaking near my house causing flooding",
  "title": "Pipe leak"
}
```

#### Submit Complaint (text)
```http
POST /api/complaints
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Large pothole on Main Street",
  "description": "There is a dangerous pothole near the bus stop that has damaged two vehicles.",
  "inputType": "text",
  "address": "14 Main St, Erode",
  "lat": 11.3410,
  "lng": 77.7172
}
```

#### Submit Complaint (with image — multipart)
```http
POST /api/complaints
Authorization: Bearer <token>
Content-Type: multipart/form-data

title=Pothole issue
description=Large dangerous pothole near school
address=Main St, Erode
attachments=@/path/to/photo.jpg
```

#### List Complaints (query params)
```
GET /api/complaints?status=Open&category=Infrastructure&priority=High&page=1&limit=10&sortBy=createdAt&order=desc
```

#### Update Status
```http
PUT /api/complaints/:id/status
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "status": "In Progress",
  "note": "Assigned to road repair crew. Work begins tomorrow."
}
```
Valid statuses: `Acknowledged`, `In Progress`, `Resolved`, `Rejected`, `Escalated`

---

### Dashboard Routes (`/api/dashboard`)

Require admin or department role.

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/summary` | Total, open, resolved, critical counts |
| GET | `/by-category` | Complaint count per category |
| GET | `/by-priority` | Complaint count per priority |
| GET | `/by-status` | Complaint count per status |
| GET | `/trend?days=30` | Daily submission trend (last N days) |
| GET | `/recent?limit=5` | Most recent complaints |

---

### AI Routes (`/api/ai`)

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/status` | — | Check if external AI is configured |
| POST | `/chat` | citizen+ | Chat with the AI grievance assistant |
| POST | `/reanalyze/:id` | admin/dept | Re-run AI analysis on an existing complaint |

#### Check AI status
```http
GET /api/ai/status
```
```json
{ "success": true, "data": { "aiEnabled": true, "model": "ai-model-v1" } }
```

#### Chat with assistant
```http
POST /api/ai/chat
Authorization: Bearer <token>
Content-Type: application/json

{
  "messages": [
    { "role": "user", "content": "How long will my water complaint take to resolve?" }
  ],
  "complaintId": "65f1a2b3c4d5e6f7a8b9c0d1"
}
```
`complaintId` is optional — when provided, the AI assistant is given the complaint's title, status, category, and department as context so it can answer specifically.

#### Re-analyze an existing complaint with external AI
```http
POST /api/ai/reanalyze/:id
Authorization: Bearer <admin-token>
```
Useful for upgrading complaints that were originally classified by the rule-based engine before an external AI provider was configured.

---

## AI / NLP Engine

The `nlpEngine.js` module implements the same logic as the Python NLTK module described in the report:

| Step | Logic |
|------|-------|
| Tokenization | Whitespace + punctuation split, lowercase |
| Stop-word removal | NLTK-style minimal stop-word list |
| Keyword extraction | Non-stop tokens > 3 chars |
| Classification | Keyword frequency matching per category |
| Sentiment | Weighted keyword scoring |
| Priority | Score 1–10 based on urgency words + category |
| Summary | Template-based auto-generated summary |

### Analysis priority chain

Every complaint submission and `/analyze` preview runs through this fallback chain, defined in `complaintController.js`:

```
1. External AI        — if AI_API_KEY is set  (best accuracy, natural-language summaries)
2. Python NLP service — if NLP_SERVICE_URL is set    (NLTK + Naive Bayes + SVM ensemble)
3. JS rule-based engine — always available            (zero dependencies, instant)
```

To enable the external AI provider, set in `.env`:
```
AI_API_KEY=your-api-key-here
```
No other configuration is needed — `aiService.js` automatically takes priority over the Python microservice and JS engine when `AI_API_KEY` is present. Every complaint record stores which engine produced its analysis (`aiAnalysis.processedBy`: `ai-api` | `ml-model` | `rule-based`), so you can audit classification quality over time.

If the external AI call fails or times out (20s) for any reason — invalid key, network issue, rate limit — the system automatically falls back to the next tier in the chain rather than failing the complaint submission.

### AI chat assistant

Beyond classification, `aiService.js` also powers a conversational assistant (`chatWithAI`) used by the `/api/ai/chat` endpoint. It can:
- Explain how to file an effective complaint
- Set realistic resolution-time expectations per category
- Answer questions about a specific complaint when given its context
- Respond in Tamil or English

To swap in the Python ML model instead of the external AI provider, set `NLP_SERVICE_URL` in `.env` and leave `AI_API_KEY` unset.

---

## Security Features

- JWT authentication (7-day expiry)
- bcryptjs password hashing (salt rounds: 12)
- Helmet security headers
- CORS with whitelist
- Rate limiting (100 req / 15 min per IP)
- Input validation with express-validator
- Role-based access control (citizen / department / admin)
- Soft-delete (no data ever permanently lost)

---

## Team

| Roll No | Name |
|---------|------|
| 730455921006 | Aravinth Kumar. K |
| 730455921020 | Kavinkumar. K |
| 730455921023 | Mahendran. B |
| 730455921043 | Satheesh Kumar. M |
| 730455921045 | Suraj. R |

Subject: 23CI602 Full Stack Development  
Guide: Ms. S.M. Karpagavalli, Dept of M.Tech CSE
