# Campus Pulse

AI-powered campus event organiser for college students. Paste messy WhatsApp forwards, emails, or poster captions and let Gemini extract structured event details automatically.

## Features

- **Smart extraction** – paste any notice and AI pulls out title, date, time, venue, and category
- **Organised view** – searchable event list with category/date filters and a calendar toggle
- **Priority badges** – Urgent (≤ 48 h), Upcoming, and Expired colour-coded tags
- **AI weekly digest** – one-click summary of the week's events, urgent items first
- **Dark / light mode** – dark by default, toggle in the nav bar
- **Mobile-first** – fully responsive layout

## Quick Start (local)

```bash
# 1. Clone and install
git clone <repo-url> && cd campus-pulse
npm install

# 2. Create .env from the example
cp .env.example .env
# Edit .env and add your Gemini API key

# 3. Run
npm start
# → http://localhost:3000
```

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `GEMINI_API_KEY` | **yes** | – | Google AI Studio API key |
| `GEMINI_MODEL` | no | `gemini-2.0-flash` | Gemini model name |
| `PORT` | no | `3000` | Server port |

## Deploy on Render

1. Create a new **Web Service** and connect your repo.
2. **Build command:** `npm install`
3. **Start command:** `npm start`
4. Add `GEMINI_API_KEY` as an environment variable.
5. Deploy.

## Tech Stack

- Frontend: HTML, Tailwind CSS (CDN), vanilla JavaScript
- Backend: Node.js + Express
- AI: Google Gemini API (Flash)

