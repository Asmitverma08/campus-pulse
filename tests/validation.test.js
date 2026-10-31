const {
  validateExtractInput,
  validateSummaryInput,
  MAX_NOTICE_LENGTH,
  MAX_EVENTS_FOR_SUMMARY,
} = require("../utils/validation");

describe("Input Validation Utilities", () => {
  describe("validateExtractInput", () => {
    test("passes with valid notice text", () => {
      const res = validateExtractInput({ text: "Coding club meet tmrw at 5pm in Lab 3" });
      expect(res.valid).toBe(true);
      expect(res.sanitizedText).toBe("Coding club meet tmrw at 5pm in Lab 3");
    });

    test("fails when text is missing, null, or non-string", () => {
      expect(validateExtractInput(null).valid).toBe(false);
      expect(validateExtractInput({}).valid).toBe(false);
      expect(validateExtractInput({ text: 12345 }).valid).toBe(false);
    });

    test("fails when text is empty or only whitespace", () => {
      const res = validateExtractInput({ text: "   \n\t  " });
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/paste notice text/i);
    });

    test("fails when text exceeds MAX_NOTICE_LENGTH", () => {
      const hugeText = "a".repeat(MAX_NOTICE_LENGTH + 1);
      const res = validateExtractInput({ text: hugeText });
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/exceeds maximum allowed length/i);
    });
  });

  describe("validateSummaryInput", () => {
    test("passes with a valid list of events", () => {
      const payload = {
        events: [
          {
            title: "Robotics Meet",
            date: "2026-11-02",
            time: "4:00 PM",
            venue: "Hall A",
            category: "Club",
            notes: "Bring your kit",
          },
        ],
      };
      const res = validateSummaryInput(payload);
      expect(res.valid).toBe(true);
      expect(res.sanitizedEvents.length).toBe(1);
      expect(res.sanitizedEvents[0].category).toBe("Club");
    });

    test("fails when events is not an array or is empty", () => {
      expect(validateSummaryInput(null).valid).toBe(false);
      expect(validateSummaryInput({ events: "not an array" }).valid).toBe(false);
      expect(validateSummaryInput({ events: [] }).valid).toBe(false);
    });

    test("fails when event count exceeds MAX_EVENTS_FOR_SUMMARY", () => {
      const tooMany = Array.from({ length: MAX_EVENTS_FOR_SUMMARY + 1 }, (_, i) => ({
        title: `Event ${i}`,
        date: "2026-11-01",
      }));
      const res = validateSummaryInput({ events: tooMany });
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/too many events/i);
    });

    test("sanitizes unlisted category to 'Other'", () => {
      const payload = {
        events: [{ title: "Mystery Event", category: "UnknownSpecialCat" }],
      };
      const res = validateSummaryInput(payload);
      expect(res.valid).toBe(true);
      expect(res.sanitizedEvents[0].category).toBe("Other");
    });
  });
});

