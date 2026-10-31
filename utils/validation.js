/**
 * @fileoverview Server-side input validation utilities for API payloads.
 */

const MAX_NOTICE_LENGTH = 10000;
const MAX_EVENTS_FOR_SUMMARY = 50;
const ALLOWED_CATEGORIES = new Set(["Academic", "Cultural", "Sports", "Club", "Deadline", "Other"]);

/**
 * Validates payload for POST /api/extract.
 *
 * @param {unknown} body - The request body.
 * @returns {{ valid: boolean, error?: string, sanitizedText?: string }} Validation result.
 */
function validateExtractInput(body) {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Invalid request payload." };
  }

  const { text } = body;
  if (typeof text !== "string") {
    return { valid: false, error: "Field 'text' must be a string." };
  }

  const trimmed = text.trim();
  if (!trimmed) {
    return { valid: false, error: "Please paste notice text to extract events." };
  }

  if (trimmed.length > MAX_NOTICE_LENGTH) {
    return {
      valid: false,
      error: `Notice text exceeds maximum allowed length of ${MAX_NOTICE_LENGTH} characters.`,
    };
  }

  return { valid: true, sanitizedText: trimmed };
}

/**
 * Validates payload for POST /api/summary.
 *
 * @param {unknown} body - The request body.
 * @returns {{ valid: boolean, error?: string, sanitizedEvents?: Array }} Validation result.
 */
function validateSummaryInput(body) {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Invalid request payload." };
  }

  const { events } = body;
  if (!Array.isArray(events)) {
    return { valid: false, error: "Field 'events' must be an array." };
  }

  if (events.length === 0) {
    return { valid: false, error: "No events provided to summarise." };
  }

  if (events.length > MAX_EVENTS_FOR_SUMMARY) {
    return {
      valid: false,
      error: `Too many events. Maximum of ${MAX_EVENTS_FOR_SUMMARY} events allowed per summary.`,
    };
  }

  // Validate each event object structure
  const sanitized = [];
  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    if (!ev || typeof ev !== "object") {
      return { valid: false, error: `Event at index ${i} must be an object.` };
    }

    sanitized.push({
      title: typeof ev.title === "string" ? ev.title.slice(0, 200).trim() : "Untitled",
      date: typeof ev.date === "string" ? ev.date.slice(0, 20).trim() : "",
      time: typeof ev.time === "string" ? ev.time.slice(0, 100).trim() : "",
      venue: typeof ev.venue === "string" ? ev.venue.slice(0, 200).trim() : "",
      category: typeof ev.category === "string" && ALLOWED_CATEGORIES.has(ev.category)
        ? ev.category
        : "Other",
      notes: typeof ev.notes === "string" ? ev.notes.slice(0, 500).trim() : "",
    });
  }

  return { valid: true, sanitizedEvents: sanitized };
}

module.exports = {
  MAX_NOTICE_LENGTH,
  MAX_EVENTS_FOR_SUMMARY,
  ALLOWED_CATEGORIES,
  validateExtractInput,
  validateSummaryInput,
};

