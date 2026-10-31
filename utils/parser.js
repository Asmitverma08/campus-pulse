/**
 * @fileoverview Utility functions for parsing JSON responses from AI models.
 */

/**
 * Extracts and parses a JSON object or array from a raw string response.
 * Handles markdown code fences (```json ... ```) and raw text preambles/postambles.
 *
 * @param {string} raw - The raw string returned by the model.
 * @returns {Array|Object} The parsed JSON object or array.
 * @throws {Error} If no valid JSON can be located or parsed.
 */
function extractJSON(raw) {
  if (typeof raw !== "string" || !raw.trim()) {
    throw new Error("Input to extractJSON must be a non-empty string");
  }

  // Strip markdown code fences if present
  let cleaned = raw.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "").trim();

  // Attempt direct JSON parse first
  try {
    return JSON.parse(cleaned);
  } catch {
    // If leading/trailing text exists, find the first '[' or '{'
    const start = cleaned.search(/[\[{]/);
    if (start === -1) {
      throw new Error("No JSON structure found in response");
    }

    // Find the matching last ']' or '}'
    const lastBracket = cleaned.lastIndexOf("]");
    const lastBrace = cleaned.lastIndexOf("}");
    const end = Math.max(lastBracket, lastBrace);

    if (end === -1 || end <= start) {
      throw new Error("Incomplete JSON structure in response");
    }

    const sub = cleaned.slice(start, end + 1);
    return JSON.parse(sub);
  }
}

module.exports = {
  extractJSON,
};

