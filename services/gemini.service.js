/**
 * @fileoverview Gemini AI integration service for event extraction and weekly summary generation.
 */

const { extractJSON } = require("../utils/parser");
const { getTodayIST, getDayNameIST } = require("../utils/date");
const { memoryCache } = require("../utils/cache");

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const REQUEST_TIMEOUT_MS = 15000;

/**
 * Calls the Google Gemini REST API with the provided prompt and a request timeout.
 *
 * @param {string} prompt - Text prompt for Gemini.
 * @returns {Promise<string>} Model candidate response text.
 * @throws {Error} If API key is missing, call fails, or request times out.
 */
async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY_MISSING");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.2 },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    const error = new Error(`Gemini API responded with status ${response.status}`);
    error.statusCode = response.status;
    error.details = errorBody;
    throw error;
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
  return text;
}

/**
 * Extracts structured campus events from messy user text using Gemini.
 * Caches repeated requests for 5 minutes.
 *
 * @param {string} noticeText - Raw text from email, WhatsApp, or poster.
 * @returns {Promise<Array<Object>>} Array of extracted event objects.
 */
async function extractEventsFromText(noticeText) {
  const cacheKey = memoryCache.makeKey("extract", noticeText);
  const cached = memoryCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const todayIST = getTodayIST();
  const dayNameIST = getDayNameIST();

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
${noticeText}
"""`;

  let lastError = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const raw = await callGemini(prompt);
      let parsed = extractJSON(raw);
      if (!Array.isArray(parsed)) parsed = [parsed];

      const validEvents = parsed.map((e) => ({
        title: String(e.title || "Untitled Event").slice(0, 200),
        date: String(e.date || todayIST).slice(0, 20),
        time: String(e.time || "").slice(0, 100),
        venue: String(e.venue || "").slice(0, 200),
        category: ["Academic", "Cultural", "Sports", "Club", "Deadline", "Other"].includes(e.category)
          ? e.category
          : "Other",
        notes: String(e.notes || "").slice(0, 500),
      }));

      // Cache successful response
      memoryCache.set(cacheKey, validEvents, 300);
      return validEvents;
    } catch (err) {
      lastError = err;
      if (err.message === "GEMINI_API_KEY_MISSING") throw err;
      // If first attempt failed to parse JSON, retry once
    }
  }

  throw lastError || new Error("Failed to extract valid event JSON");
}

/**
 * Generates an AI weekly digest summarizing upcoming events.
 * Caches identical weekly requests for 5 minutes.
 *
 * @param {Array<Object>} events - Sanitized list of events for the week.
 * @returns {Promise<string>} Summary digest string.
 */
async function generateWeeklySummary(events) {
  const cacheKey = memoryCache.makeKey("summary", JSON.stringify(events));
  const cached = memoryCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const todayIST = getTodayIST();
  const prompt = `You are a helpful campus assistant. Today is ${todayIST}.

Here are the student's events/deadlines for this week:
${JSON.stringify(events, null, 2)}

Write a short, friendly 2–4 sentence digest paragraph. Mention urgent or today items first.
Do NOT use markdown. Just plain text. Be concise, warm, and helpful.`;

  let lastError = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const raw = await callGemini(prompt);
      const cleaned = raw.replace(/[*#_`]/g, "").trim();

      memoryCache.set(cacheKey, cleaned, 300);
      return cleaned;
    } catch (err) {
      lastError = err;
      if (err.message === "GEMINI_API_KEY_MISSING") throw err;
    }
  }

  throw lastError || new Error("Failed to generate weekly summary");
}

module.exports = {
  callGemini,
  extractEventsFromText,
  generateWeeklySummary,
};

