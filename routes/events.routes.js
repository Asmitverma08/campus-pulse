/**
 * @fileoverview Express router handling AI event extraction and weekly summary generation.
 */

const express = require("express");
const rateLimit = require("express-rate-limit");
const { validateExtractInput, validateSummaryInput } = require("../utils/validation");
const geminiService = require("../services/gemini.service");

const router = express.Router();

// Rate limiter for AI endpoints: 30 requests per 15-minute window per IP
const aiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many AI requests. Please slow down and try again shortly.",
  },
});

/**
 * POST /api/extract
 * Extracts campus events from raw text.
 */
router.post("/extract", aiRateLimiter, async (req, res) => {
  const validation = validateExtractInput(req.body);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  try {
    const events = await geminiService.extractEventsFromText(validation.sanitizedText);
    return res.status(200).json({ events });
  } catch (err) {
    console.error("[POST /api/extract] Error:", err.message, err.details || "");

    if (err.message === "GEMINI_API_KEY_MISSING") {
      return res.status(503).json({
        error: "AI service is currently unavailable. GEMINI_API_KEY is not configured.",
      });
    }

    // Generic error message to prevent leaking internal stack traces or secrets
    return res.status(500).json({
      error: "Unable to extract events from the provided text. Please check the text and try again.",
    });
  }
});

/**
 * POST /api/summary
 * Generates an AI weekly digest.
 */
router.post("/summary", aiRateLimiter, async (req, res) => {
  const validation = validateSummaryInput(req.body);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  try {
    const summary = await geminiService.generateWeeklySummary(validation.sanitizedEvents);
    return res.status(200).json({ summary });
  } catch (err) {
    console.error("[POST /api/summary] Error:", err.message, err.details || "");

    if (err.message === "GEMINI_API_KEY_MISSING") {
      return res.status(503).json({
        error: "AI service is currently unavailable. GEMINI_API_KEY is not configured.",
      });
    }

    return res.status(500).json({
      error: "Unable to generate digest at this time. Please try again later.",
    });
  }
});

module.exports = {
  eventsRouter: router,
  aiRateLimiter,
};
