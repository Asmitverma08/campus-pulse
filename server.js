require("dotenv").config();
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

/* ───── helpers ───── */

async function callGemini(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
  temperature: 0.2,
  responseMimeType: "application/json",
  thinkingConfig: { thinkingLevel: "low" }
},
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API ${res.status}: ${err}`);
  }
  const data = await res.json();
  const text =
    data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
  return text;
}

function extractJSON(raw) {
  // Strip markdown fences if present
  let cleaned = raw.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  // Try parsing directly
  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to find the first [ or { and extract
    const start = cleaned.search(/[\[{]/);
    if (start === -1) throw new Error("No JSON found in response");
    const sub = cleaned.slice(start);
    return JSON.parse(sub);
  }
}

/* ───── POST /api/extract ───── */

app.post("/api/extract", async (req, res) => {
  if (!GEMINI_API_KEY)
    return res.status(500).json({ error: "GEMINI_API_KEY not configured on the server." });

  const { text } = req.body;
  if (!text || !text.trim())
    return res.status(400).json({ error: "Please paste some text to extract events from." });

  const todayIST = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });
  const dayNameIST = new Date().toLocaleDateString("en-US", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
  });

  const prompt = `You are a campus-event extraction assistant.
Today's date is ${todayIST} (${dayNameIST}), timezone Asia/Kolkata.

The user pasted the following messy text (could be a WhatsApp forward, email, poster caption, etc.). Extract ALL events or deadlines from it.

For each event return a JSON object with these exact keys:
- title    (string, short descriptive title)
- date     (string, YYYY-MM-DD — resolve relative dates like "tmrw", "this Friday", "next Mon", "day after tomorrow" relative to today)
- time     (string, e.g. "4:00 PM" or "10:00 AM – 1:00 PM" or "" if unknown)
- venue    (string, or "" if unknown)
- category (one of: Academic, Cultural, Sports, Club, Deadline, Other)
- notes    (string, one plain sentence capturing important extra details: what to bring, who should attend, how to register or submit, dress code, links, or any other useful instruction. Do NOT repeat the title, date, time, or location. Use "" if there are no extra details.)

Return ONLY a JSON array of objects, no markdown, no explanation.

User text:
"""
${text}
"""`;

  let attempts = 0;
  while (attempts < 2) {
    attempts++;
    try {
      const raw = await callGemini(prompt);
      let events = extractJSON(raw);
      if (!Array.isArray(events)) events = [events];
      // Validate shape
      events = events.map((e) => ({
        title: String(e.title || "Untitled Event"),
        date: String(e.date || todayIST),
        time: String(e.time || ""),
        venue: String(e.venue || ""),
        category: ["Academic", "Cultural", "Sports", "Club", "Deadline", "Other"].includes(e.category)
          ? e.category
          : "Other",
        notes: String(e.notes || ""),
      }));
      return res.json({ events });
    } catch (err) {
      if (attempts >= 2) {
        console.error("Gemini extract error:", err);
        return res.status(500).json({ error: "Could not parse events. Please try again." });
      }
    }
  }
});

/* ───── POST /api/summary ───── */

app.post("/api/summary", async (req, res) => {
  if (!GEMINI_API_KEY)
    return res.status(500).json({ error: "GEMINI_API_KEY not configured on the server." });

  const { events } = req.body;
  if (!events || !events.length)
    return res.status(400).json({ error: "No events to summarise." });

  const todayIST = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });

  const prompt = `You are a helpful campus assistant. Today is ${todayIST}.

Here are the student's events/deadlines for this week:
${JSON.stringify(events, null, 2)}

Write a short, friendly 2–4 sentence digest paragraph. Mention urgent or today items first.
Do NOT use markdown. Just plain text. Be concise, warm, and helpful.`;

  let attempts = 0;
  while (attempts < 2) {
    attempts++;
    try {
      const raw = await callGemini(prompt);
      // Just return the plain text
      return res.json({ summary: raw });
    } catch (err) {
      if (attempts >= 2) {
        console.error("Gemini summary error:", err);
        return res.status(500).json({ error: "Could not generate summary. Please try again." });
      }
    }
  }
});

/* ───── fallback to index.html ───── */
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Campus Pulse running on http://localhost:${PORT}`);
});

