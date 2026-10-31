/**
 * @fileoverview Date manipulation utilities configured for the Asia/Kolkata (IST) timezone.
 */

const IST_TIMEZONE = "Asia/Kolkata";

/**
 * Returns today's date in YYYY-MM-DD format within the Asia/Kolkata timezone.
 *
 * @param {Date} [dateObj=new Date()] - Reference date object.
 * @returns {string} Date string in YYYY-MM-DD format.
 */
function getTodayIST(dateObj = new Date()) {
  return dateObj.toLocaleDateString("en-CA", { timeZone: IST_TIMEZONE });
}

/**
 * Returns the current day name (e.g. "Monday", "Saturday") in the Asia/Kolkata timezone.
 *
 * @param {Date} [dateObj=new Date()] - Reference date object.
 * @returns {string} Full weekday name.
 */
function getDayNameIST(dateObj = new Date()) {
  return dateObj.toLocaleDateString("en-US", {
    timeZone: IST_TIMEZONE,
    weekday: "long",
  });
}

/**
 * Adds an integer number of days to a base YYYY-MM-DD date using safe calendar arithmetic.
 *
 * @param {string} baseDate - Base date string in YYYY-MM-DD format.
 * @param {number} days - Number of days to add (or subtract if negative).
 * @returns {string} Resulting date string in YYYY-MM-DD format.
 */
function addDaysIST(baseDate, days) {
  if (typeof baseDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(baseDate)) {
    throw new Error("Base date must be in YYYY-MM-DD format");
  }
  const [y, m, d] = baseDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days, 12, 0, 0));
  return dt.toISOString().slice(0, 10);
}

/**
 * Computes calendar days between targetDate and a reference base date (defaults to today in IST).
 *
 * @param {string} targetDate - Target date in YYYY-MM-DD format.
 * @param {string} [baseDate=getTodayIST()] - Reference base date in YYYY-MM-DD format.
 * @returns {number} Difference in calendar days (positive = future, negative = past).
 */
function daysFromNow(targetDate, baseDate = getTodayIST()) {
  const [y1, m1, d1] = baseDate.split("-").map(Number);
  const [y2, m2, d2] = targetDate.split("-").map(Number);
  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((utc2 - utc1) / 86400000);
}

module.exports = {
  IST_TIMEZONE,
  getTodayIST,
  getDayNameIST,
  addDaysIST,
  daysFromNow,
};

