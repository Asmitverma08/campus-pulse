# Campus Pulse 🎓✨

> An AI-powered campus life and event organizer designed specifically for college students. Paste messy WhatsApp forwards, forwarded emails, or poster captions, and let Gemini extract structured event details, dates, venues, categories, and actionable instructions automatically.

---

## 📸 Screenshots

| Dark Theme (Default) | Light Theme |
|---|---|
| ![Campus Pulse Dashboard - Dark Theme Placeholder](https://via.placeholder.com/800x450/0f1117/2dd4bf?text=Campus+Pulse+Dark+Dashboard) | ![Campus Pulse Dashboard - Light Theme Placeholder](https://via.placeholder.com/800x450/f8fafc/0d9488?text=Campus+Pulse+Light+Dashboard) |

| AI Event Extraction | Full Calendar View |
|---|---|
| ![AI Event Extraction Review Placeholder](https://via.placeholder.com/800x450/161a23/2dd4bf?text=Extracted+Events+Review+Cards) | ![Calendar Month Grid Placeholder](https://via.placeholder.com/800x450/161a23/14b8a6?text=Month+Calendar+Grid) |

---

## 🏆 Hackathon Rubric Alignment

| Criterion | Implementation & Highlights |
|---|---|
| **Code Quality** | Modular architecture separated into `routes/`, `services/`, and `utils/`. Strict JSDoc annotations, single-responsibility functions, and separation of app configuration (`app.js`) from server lifecycle (`server.js`). |
| **Security** | Hardened with **Helmet** (Content Security Policy for CDN/inline styles), **express-rate-limit** on AI endpoints, strict **10kb** JSON payload limit, robust server-side input validation, generic error messages to clients (no stack traces leaked), and strict XSS escaping in the frontend. Confirmed `.env` and `node_modules` in `.gitignore`. |
| **Efficiency** | Network payload **compression** (`compression` middleware), 5-minute in-memory **TTL caching** for repeated extractions and weekly digests, **debounced search** (200ms) to eliminate wasteful DOM recalculations, and **15-second timeout abort signals** on external Gemini requests. |
| **Testing** | Comprehensive unit and integration test suite using **Jest** and **Supertest**. Tests date parsing in IST, markdown fence stripping, JSON extraction, validation rules, and mocked API routes without requiring a live Gemini API key. |
| **Accessibility (WCAG AA)** | Semantic landmarks (`<header>`, `<nav>`, `<main>`, `<section>`, `<aside>`, `<footer>`), valid `lang="en"`, descriptive page title, skip-to-content link, 4.5:1+ text contrast, visible focus rings (`:focus-visible`), aria-live regions for loaders and errors, `aria-label` on all icon buttons, full keyboard navigation with Escape key modal dismiss, and `@media (prefers-reduced-motion)`. |
| **Problem Statement Alignment** | Solves student communication overload by turning unorganized chat group notices into structured schedules with relative date resolution in `Asia/Kolkata` (IST), urgency tags (within 48 hours), and an AI weekly digest. |

---

## 🚀 Key Features

1. **Smart Notice Parsing (`POST /api/extract`)**
   - Paste unstructured WhatsApp messages, emails, or captions.
   - Extracts title, date (resolving "tmrw", "this Friday", "next Mon" relative to today in IST), time, venue, category, and actionable instructions into a dedicated `notes` field.
   - Displays editable review cards before saving.
2. **Organized & Filterable Views**
   - Search across titles, venues, and notes with instant debounced filtering.
   - Filter by category (`Academic`, `Cultural`, `Sports`, `Club`, `Deadline`, `Other`) and specific date.
   - Toggle seamlessly between responsive 2-column card list view and interactive month calendar view.
3. **Priority & Urgency Detection**
   - Automatically classifies events as **Urgent** (&le; 48 hours), **Upcoming**, or **Expired**.
   - Prominent "Needs attention today & urgent" alert banner for immediate visibility.
4. **AI Weekly Digest (`POST /api/summary`)**
   - "What do I need to know this week?" generates a personalized 2–4 sentence summary prioritizing urgent deadlines and highlights over the next 7 days in IST.
5. **Privacy & Offline Persistence**
   - Saved events persist in browser `localStorage`.
   - Never exposes API keys to the browser.
6. **Responsive & Accessible Design**
   - Dark mode by default with light mode toggle.
   - Mobile-first layout: 2-column event grid on desktop, single column on mobile with stacked calendar.

---

## 🛠️ Project Structure

```
Campus Pulse/
├── public/
│   ├── index.html          # WCAG AA accessible UI with semantic markup & Tailwind CDN
│   └── app.js              # Vanilla frontend logic with debouncing, XSS escaping & keyboard support
├── routes/
│   └── events.routes.js    # Express router for /api/extract & /api/summary with rate limiting
├── services/
│   └── gemini.service.js   # Gemini AI integration with timeout, retry, & in-memory caching
├── utils/
│   ├── cache.js            # In-memory TTL cache for API responses
│   ├── date.js             # Asia/Kolkata (IST) calendar calculations
│   ├── parser.js           # Markdown fence stripping & JSON extraction
│   └── validation.js       # Strict server-side payload validation
├── tests/
│   ├── api.test.js         # Supertest integration tests for endpoints & security headers
│   ├── date.test.js        # Unit tests for date arithmetic & IST timezone
│   ├── parser.test.js      # Unit tests for extractJSON helper
│   └── validation.test.js  # Unit tests for input validation rules
├── app.js                  # Express app setup (Helmet, compression, json limit, routes)
├── server.js               # Application entry point
├── package.json            # Scripts: start, test
├── .gitignore              # Ignores node_modules/ and .env
├── .env.example            # Sample configuration
└── README.md               # Project documentation
```

---

## ⚙️ Quick Start (Local)

### Prerequisites
- Node.js >= 18
- Google AI Studio Gemini API Key

### 1. Clone & Install
```bash
git clone <your-repo-url>
cd "Campus Pulse"
npm install
```

### 2. Configure Environment
Create a `.env` file from the example:
```bash
cp .env.example .env
```
Add your Gemini API key in `.env`:
```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.0-flash
PORT=3000
```

### 3. Run the Application
```bash
npm start
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Running Tests

Run the full Jest test suite:
```bash
npm test
```
All 27 unit and integration tests run with mocked Gemini API calls, requiring no external network access or API key.

---

## 🌐 Deploy to Render (Single Web Service)

1. Push this repository to GitHub or GitLab.
2. In the [Render Dashboard](https://dashboard.render.com), click **New +** &rarr; **Web Service**.
3. Connect your repository.
4. Set the following settings:
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. Under **Environment Variables**, add:
   - `GEMINI_API_KEY`: *(Your Google AI Studio Gemini API key)*
   - `GEMINI_MODEL`: `gemini-2.0-flash`
6. Click **Deploy Web Service**.

---

## 🔒 Security Best Practices

- **Zero Client-Side Keys:** API keys remain strictly on the server and are never exposed to the frontend.
- **Payload Restrictions:** Body parsing is capped at 10kb to prevent oversized payload attacks.
- **Strict Rate Limiting:** AI endpoints are protected with IP-based rate limiting (30 requests / 15 minutes).
- **Sanitized Client Errors:** Internal system details or stack traces are logged only on the server, while generic, safe error messages are returned to the user.
- **Input & Output Sanitization:** Input data is validated server-side, and client-side rendering uses strict escaping (`escHTML`, `escAttr`, and `textContent`) to protect against stored and reflected XSS.

---

## 📄 License
ISC
