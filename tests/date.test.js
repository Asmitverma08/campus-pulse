const {
  getTodayIST,
  getDayNameIST,
  addDaysIST,
  daysFromNow,
} = require("../utils/date");

describe("Date Utilities (Asia/Kolkata)", () => {
  test("getTodayIST returns a date string matching YYYY-MM-DD", () => {
    const today = getTodayIST();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("getDayNameIST returns a valid weekday name", () => {
    const day = getDayNameIST();
    const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    expect(weekdays).toContain(day);
  });

  test("addDaysIST accurately adds days without UTC timezone rollback", () => {
    expect(addDaysIST("2026-10-31", 0)).toBe("2026-10-31");
    expect(addDaysIST("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDaysIST("2026-10-31", 7)).toBe("2026-11-07");
    expect(addDaysIST("2026-02-28", 1)).toBe("2026-03-01");
    expect(addDaysIST("2026-01-01", -1)).toBe("2025-12-31");
  });

  test("addDaysIST rejects invalid date strings", () => {
    expect(() => addDaysIST("invalid", 1)).toThrow("YYYY-MM-DD format");
  });

  test("daysFromNow calculates correct difference in calendar days", () => {
    expect(daysFromNow("2026-11-05", "2026-11-05")).toBe(0);
    expect(daysFromNow("2026-11-07", "2026-11-05")).toBe(2);
    expect(daysFromNow("2026-11-01", "2026-11-05")).toBe(-4);
  });
});

