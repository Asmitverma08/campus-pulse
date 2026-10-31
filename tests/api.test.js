const request = require("supertest");
const app = require("../app");
const geminiService = require("../services/gemini.service");
const { memoryCache } = require("../utils/cache");

describe("API Routes & Security Integration Tests", () => {
  beforeEach(() => {
    memoryCache.clear();
    jest.restoreAllMocks();
  });

  describe("GET / (Static serving & Security headers)", () => {
    test("serves frontend HTML with Helmet security headers", async () => {
      const res = await request(app).get("/");
      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toMatch(/html/);
      expect(res.headers["x-dns-prefetch-control"]).toBe("off");
      expect(res.headers["x-frame-options"]).toBe("SAMEORIGIN");
      expect(res.headers["content-security-policy"]).toBeDefined();
    });
  });

  describe("POST /api/extract", () => {
    test("returns 400 when text payload is missing or empty", async () => {
      const res = await request(app).post("/api/extract").send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();

      const emptyRes = await request(app).post("/api/extract").send({ text: "   " });
      expect(emptyRes.status).toBe(400);
      expect(emptyRes.body.error).toMatch(/paste notice text/i);
    });

    test("returns 200 with extracted events on valid input (mocked Gemini call)", async () => {
      const mockEvents = [
        {
          title: "AI Workshop",
          date: "2026-11-02",
          time: "3:00 PM",
          venue: "Seminar Hall",
          category: "Academic",
          notes: "Bring laptops",
        },
      ];

      jest
        .spyOn(geminiService, "extractEventsFromText")
        .mockResolvedValueOnce(mockEvents);

      const res = await request(app)
        .post("/api/extract")
        .send({ text: "AI Workshop on 2nd Nov at 3pm in Seminar Hall. Bring laptops!" });

      expect(res.status).toBe(200);
      expect(res.body.events).toEqual(mockEvents);
    });

    test("returns 503 if GEMINI_API_KEY is missing", async () => {
      jest
        .spyOn(geminiService, "extractEventsFromText")
        .mockRejectedValueOnce(new Error("GEMINI_API_KEY_MISSING"));

      const res = await request(app)
        .post("/api/extract")
        .send({ text: "Hackathon tomorrow 10am" });

      expect(res.status).toBe(503);
      expect(res.body.error).toMatch(/not configured/i);
    });

    test("returns 500 with generic error message on downstream failure (no leak)", async () => {
      jest
        .spyOn(geminiService, "extractEventsFromText")
        .mockRejectedValueOnce(new Error("Upstream internal connection timeout with secret details"));

      const res = await request(app)
        .post("/api/extract")
        .send({ text: "Drama audition this Friday" });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe(
        "Unable to extract events from the provided text. Please check the text and try again."
      );
      // Ensure no raw upstream error message or stack trace is exposed to client
      expect(JSON.stringify(res.body)).not.toMatch(/secret details/i);
    });
  });

  describe("POST /api/summary", () => {
    test("returns 400 when events array is empty or missing", async () => {
      const res = await request(app).post("/api/summary").send({ events: [] });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/no events/i);
    });

    test("returns 200 with summary digest on valid events (mocked Gemini call)", async () => {
      const mockSummary =
        "You have a busy week ahead! Your AI Workshop is on Monday at 3 PM, followed by the Hackathon.";

      jest
        .spyOn(geminiService, "generateWeeklySummary")
        .mockResolvedValueOnce(mockSummary);

      const res = await request(app)
        .post("/api/summary")
        .send({
          events: [
            { title: "AI Workshop", date: "2026-11-02", time: "3:00 PM" },
            { title: "Hackathon", date: "2026-11-04", time: "10:00 AM" },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.summary).toBe(mockSummary);
    });

    test("returns 503 if GEMINI_API_KEY is missing for summary", async () => {
      jest
        .spyOn(geminiService, "generateWeeklySummary")
        .mockRejectedValueOnce(new Error("GEMINI_API_KEY_MISSING"));

      const res = await request(app)
        .post("/api/summary")
        .send({
          events: [{ title: "Sports Meet", date: "2026-11-03" }],
        });

      expect(res.status).toBe(503);
      expect(res.body.error).toMatch(/not configured/i);
    });
  });
});

