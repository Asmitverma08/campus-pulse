/**
 * @fileoverview Campus Pulse frontend client application (Vanilla JS).
 * Handles notice parsing, event filtering, calendar rendering, theme toggling, and WCAG AA accessibility.
 */

(function () {
  "use strict";

  /* ───── Constants & Theme Configurations ───── */

  const CATEGORIES = ["Academic", "Cultural", "Sports", "Club", "Deadline", "Other"];

  const CAT_COLORS = {
    Academic: { bg: "bg-blue-500/20", text: "text-blue-300", border: "border-blue-500/40", dot: "bg-blue-400" },
    Cultural: { bg: "bg-purple-500/20", text: "text-purple-300", border: "border-purple-500/40", dot: "bg-purple-400" },
    Sports: { bg: "bg-green-500/20", text: "text-green-300", border: "border-green-500/40", dot: "bg-green-400" },
    Club: { bg: "bg-amber-500/20", text: "text-amber-300", border: "border-amber-500/40", dot: "bg-amber-400" },
    Deadline: { bg: "bg-rose-500/20", text: "text-rose-300", border: "border-rose-500/40", dot: "bg-rose-400" },
    Other: { bg: "bg-slate-500/20", text: "text-slate-300", border: "border-slate-500/40", dot: "bg-slate-400" },
  };

  const PRIORITY_BADGES = {
    Urgent: { label: "Urgent", classes: "bg-red-500/25 text-red-300 border border-red-500/40" },
    Upcoming: { label: "Upcoming", classes: "bg-amber-500/25 text-amber-300 border border-amber-500/40" },
    Expired: { label: "Expired", classes: "bg-slate-500/25 text-slate-300 border border-slate-500/40" },
  };

  const STORAGE_KEY = "campusPulse_events";
  let currentView = "list";
  let miniCalDate = new Date();
  let lastActiveElementBeforeModal = null;

  /* ───── Safe Sanitization & Debounce Utilities ───── */

  /**
   * Debounces a function call by the specified delay in milliseconds.
   * @param {Function} func - Target function.
   * @param {number} wait - Debounce delay in ms.
   * @returns {Function} Debounced function.
   */
  function debounce(func, wait) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  /**
   * Escapes HTML special characters to prevent Cross-Site Scripting (XSS).
   * @param {unknown} str - Input string.
   * @returns {string} Sanitized HTML string.
   */
  function escHTML(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
      .replace(/\//g, "&#x2F;");
  }

  /**
   * Escapes double quotes and tags for safe insertion into HTML attributes.
   * @param {unknown} str - Input attribute string.
   * @returns {string} Sanitized attribute string.
   */
  function escAttr(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  /* ───── Date Calculation Utilities (Asia/Kolkata) ───── */

  /**
   * Returns current date string in Asia/Kolkata timezone (YYYY-MM-DD).
   * @returns {string} Date string.
   */
  function todayISO() {
    return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  }

  /**
   * Adds calendar days to a base date without UTC drift.
   * @param {string} base - Base date in YYYY-MM-DD.
   * @param {number} n - Days to add.
   * @returns {string} Resulting date string.
   */
  function addDays(base, n) {
    const [y, m, d] = base.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + n, 12, 0, 0));
    return dt.toISOString().slice(0, 10);
  }

  /**
   * Computes calendar days from today in Asia/Kolkata.
   * @param {string} dateStr - Target date string.
   * @returns {number} Difference in calendar days.
   */
  function daysFromNow(dateStr) {
    const [y1, m1, d1] = todayISO().split("-").map(Number);
    const [y2, m2, d2] = dateStr.split("-").map(Number);
    const utc1 = Date.UTC(y1, m1 - 1, d1);
    const utc2 = Date.UTC(y2, m2 - 1, d2);
    return Math.round((utc2 - utc1) / 86400000);
  }

  /**
   * Determines urgency status tag.
   * @param {string} dateStr - Event date string.
   * @returns {"Urgent"|"Upcoming"|"Expired"} Priority status.
   */
  function priority(dateStr) {
    const diff = daysFromNow(dateStr);
    if (diff < 0) return "Expired";
    if (diff <= 2) return "Urgent";
    return "Upcoming";
  }

  /**
   * Formats a date string for user-friendly localized display.
   * @param {string} dateStr - Date string (YYYY-MM-DD).
   * @returns {string} Formatted localized date string.
   */
  function fmtDate(dateStr) {
    try {
      const [y, m, d] = dateStr.split("-").map(Number);
      const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
      return dt.toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      });
    } catch {
      return dateStr;
    }
  }

  /**
   * Generates a unique client-side ID for new events.
   * @returns {string} Unique ID string.
   */
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /**
   * Returns human-readable relative label (Today, Tomorrow, Yesterday).
   * @param {string} dateStr - Date string.
   * @returns {string|null} Relative label or null.
   */
  function relDay(dateStr) {
    const diff = daysFromNow(dateStr);
    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    if (diff === -1) return "Yesterday";
    return null;
  }

  /* ───── Local Storage Persistence ───── */

  function loadEvents() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }

  function saveEvents(events) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    } catch (e) {
      console.error("Failed to persist events to localStorage:", e);
    }
  }

  function addEvent(ev) {
    const events = loadEvents();
    ev.id = ev.id || uid();
    events.push(ev);
    saveEvents(events);
    return ev;
  }

  function updateEvent(id, data) {
    const events = loadEvents();
    const idx = events.findIndex((e) => e.id === id);
    if (idx !== -1) {
      Object.assign(events[idx], data);
      saveEvents(events);
    }
  }

  function deleteEvent(id) {
    saveEvents(loadEvents().filter((e) => e.id !== id));
  }

  /* ───── Realistic Sample Data Relative to Today ───── */

  function getSampleEvents() {
    const t = todayISO();
    return [
      {
        id: uid(),
        title: "Data Structures Assignment Due",
        date: addDays(t, 1),
        time: "11:59 PM",
        venue: "Online LMS Portal",
        category: "Deadline",
        notes: "Submit PDF report with execution screenshots and GitHub repository link.",
      },
      {
        id: uid(),
        title: "Annual Cultural Fest – Rhythms",
        date: addDays(t, 3),
        time: "2:00 PM – 6:00 PM",
        venue: "Main Auditorium",
        category: "Cultural",
        notes: "College ID card is mandatory for entry. Passes available at student council desk.",
      },
      {
        id: uid(),
        title: "Inter-Department Cricket Match",
        date: addDays(t, 5),
        time: "9:00 AM",
        venue: "Sports Ground",
        category: "Sports",
        notes: "Wear departmental sports jersey. Refreshments provided after the match.",
      },
    ];
  }

  function sampleNotice() {
    return `Hey everyone!! 🎉
Coding Club meet tmrw 5pm in Lab 3, bring ur laptops!! 💻
Also don't forget - Prof. Sharma's extra class on Linear Algebra this Friday at 10am in Room 204.
And guys the deadline for the hackathon registration is day after tomorrow, submit on the college portal before 11:59pm.
See you there! 🙌`;
  }

  /* ───── DOM Element References ───── */

  const $ = (s) => document.querySelector(s);

  const searchInput = $("#searchInput");
  const pasteInput = $("#pasteInput");
  const extractBtn = $("#extractBtn");
  const sampleBtn = $("#sampleBtn");
  const extractSpinner = $("#extractSpinner");
  const extractError = $("#extractError");
  const extractedPreview = $("#extractedPreview");
  const extractedCards = $("#extractedCards");
  const categoryFilter = $("#categoryFilter");
  const dateFilter = $("#dateFilter");
  const listViewBtn = $("#listViewBtn");
  const calViewBtn = $("#calViewBtn");
  const listView = $("#listView");
  const calendarView = $("#calendarView");
  const emptyState = $("#emptyState");
  const loadSamplesBtn = $("#loadSamplesBtn");
  const digestBtn = $("#digestBtn");
  const digestText = $("#digestText");
  const digestSpinner = $("#digestSpinner");
  const attentionBanner = $("#attentionBanner");
  const attentionList = $("#attentionList");
  const themeToggle = $("#themeToggle");

  // Mini calendar refs
  const miniCalTitle = $("#miniCalTitle");
  const miniCalGrid = $("#miniCalGrid");
  const prevMonthBtn = $("#prevMonth");
  const nextMonthBtn = $("#nextMonth");

  // Edit modal refs
  const editModal = $("#editModal");
  const editOverlay = $("#editOverlay");
  const editForm = $("#editForm");
  const editId = $("#editId");
  const editTitle = $("#editTitle");
  const editDate = $("#editDate");
  const editTime = $("#editTime");
  const editVenue = $("#editVenue");
  const editCategory = $("#editCategory");
  const editNotes = $("#editNotes");
  const editCancel = $("#editCancel");

  // Stats refs
  const statTotal = $("#statTotal");
  const statUrgent = $("#statUrgent");
  const statWeek = $("#statWeek");

  /* ───── Theme Management ───── */

  function initTheme() {
    const stored = localStorage.getItem("campusPulse_theme");
    if (stored === "light") {
      document.documentElement.classList.remove("dark");
    } else {
      document.documentElement.classList.add("dark");
    }
  }

  themeToggle.addEventListener("click", () => {
    document.documentElement.classList.toggle("dark");
    localStorage.setItem(
      "campusPulse_theme",
      document.documentElement.classList.contains("dark") ? "dark" : "light"
    );
  });

  /* ───── Attention Banner Rendering ───── */

  function renderAttention() {
    const events = loadEvents();
    const urgent = events.filter((e) => priority(e.date) === "Urgent");

    if (urgent.length === 0) {
      attentionBanner.classList.add("hidden");
      attentionList.innerHTML = "";
      return;
    }

    attentionBanner.classList.remove("hidden");
    attentionList.innerHTML = urgent
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((e) => {
        const rel = relDay(e.date);
        const tag = rel
          ? `<span class="font-semibold text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded text-xs">${escHTML(rel)}</span>`
          : "";
        return `<div class="flex items-center gap-2.5 py-1">
          <span class="cal-dot shrink-0 ${CAT_COLORS[e.category]?.dot || "bg-slate-400"}" aria-hidden="true"></span>
          <span class="font-medium truncate flex-1">${escHTML(e.title)}</span>
          ${tag}
          <span class="dark:text-slate-300 text-gray-600 text-xs shrink-0">${escHTML(e.time || "")}</span>
        </div>`;
      })
      .join("");
  }

  /* ───── Filtered Events Extraction ───── */

  function getFilteredEvents() {
    let events = loadEvents();
    const search = searchInput.value.toLowerCase().trim();
    const cat = categoryFilter.value;
    const dateVal = dateFilter.value;

    if (search) {
      events = events.filter(
        (e) =>
          e.title.toLowerCase().includes(search) ||
          (e.venue && e.venue.toLowerCase().includes(search)) ||
          (e.notes && e.notes.toLowerCase().includes(search))
      );
    }
    if (cat !== "All") events = events.filter((e) => e.category === cat);
    if (dateVal) events = events.filter((e) => e.date === dateVal);

    // Sort: Urgent items first, then chronologically by date
    events.sort((a, b) => {
      const pa = priority(a.date) === "Urgent" ? 0 : priority(a.date) === "Upcoming" ? 1 : 2;
      const pb = priority(b.date) === "Urgent" ? 0 : priority(b.date) === "Upcoming" ? 1 : 2;
      if (pa !== pb) return pa - pb;
      return a.date.localeCompare(b.date);
    });
    return events;
  }

  /* ───── Event Card HTML Template ───── */

  function eventCardHTML(e) {
    const p = priority(e.date);
    const badge = PRIORITY_BADGES[p];
    const cat = CAT_COLORS[e.category] || CAT_COLORS.Other;
    const rel = relDay(e.date);

    return `<article class="theme-transition rounded-2xl p-4 sm:p-5 dark:bg-dark-700 bg-white border dark:border-dark-600 border-gray-200 hover:border-teal-500/50 shadow-sm transition fade-in" aria-label="${escAttr(e.title)}">
      <div class="flex items-start justify-between gap-2.5 mb-2.5">
        <h3 class="font-bold text-sm sm:text-base leading-snug flex-1">${escHTML(e.title)}</h3>
        <span class="shrink-0 text-xs px-2.5 py-0.5 rounded-full font-semibold ${badge.classes}">${escHTML(badge.label)}</span>
      </div>
      <div class="space-y-1.5 text-xs sm:text-sm dark:text-slate-300 text-gray-600">
        <div class="flex items-center gap-2">
          <svg class="w-4 h-4 text-teal-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          <span>${fmtDate(e.date)}${rel ? ` <strong class="text-teal-400 font-semibold">(${escHTML(rel)})</strong>` : ""}</span>
        </div>
        ${e.time ? `<div class="flex items-center gap-2">
          <svg class="w-4 h-4 text-teal-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <span>${escHTML(e.time)}</span></div>` : ""}
        ${e.venue ? `<div class="flex items-center gap-2">
          <svg class="w-4 h-4 text-teal-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          <span>${escHTML(e.venue)}</span></div>` : ""}
        ${e.notes ? `<div class="flex items-start gap-2 mt-2 pt-2 border-t dark:border-dark-600 border-gray-100">
          <svg class="w-4 h-4 text-teal-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <span class="text-xs dark:text-slate-300 text-gray-700 italic">${escHTML(e.notes)}</span></div>` : ""}
      </div>
      <div class="flex items-center justify-between mt-4 pt-2 border-t dark:border-dark-600/60 border-gray-100">
        <span class="text-xs px-2.5 py-0.5 rounded-full ${cat.bg} ${cat.text} ${cat.border} border font-medium">${escHTML(e.category)}</span>
        <div class="flex gap-1.5">
          <button
            type="button"
            onclick="window._editEvent('${escAttr(e.id)}')"
            class="p-2 rounded-lg dark:hover:bg-dark-600 hover:bg-gray-100 text-slate-300 hover:text-white transition"
            aria-label="Edit event: ${escAttr(e.title)}"
            title="Edit event"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          </button>
          <button
            type="button"
            onclick="window._deleteEvent('${escAttr(e.id)}')"
            class="p-2 rounded-lg hover:bg-red-500/20 text-red-400 hover:text-red-300 transition"
            aria-label="Delete event: ${escAttr(e.title)}"
            title="Delete event"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>
      </div>
    </article>`;
  }

  /* ───── Render List View ───── */

  function renderList() {
    const events = getFilteredEvents();
    const allEvents = loadEvents();

    if (events.length === 0 && allEvents.length === 0) {
      listView.classList.add("hidden");
      emptyState.classList.remove("hidden");
      return;
    }
    emptyState.classList.add("hidden");

    if (events.length === 0) {
      listView.innerHTML = `<div class="col-span-full text-center py-8 dark:text-slate-400 text-gray-500 text-sm">No events match your search or filter criteria.</div>`;
      listView.classList.remove("hidden");
      return;
    }

    listView.innerHTML = events.map(eventCardHTML).join("");
    listView.classList.remove("hidden");
  }

  /* ───── Full Calendar View ───── */

  function renderCalendarView() {
    const events = getFilteredEvents();
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayDate = now.getDate();

    const dayMap = {};
    events.forEach((e) => {
      const [y, m, d] = e.date.split("-").map(Number);
      if (y === year && m === month + 1) {
        if (!dayMap[d]) dayMap[d] = [];
        dayMap[d].push(e);
      }
    });

    const monthName = new Date(year, month).toLocaleString("default", { month: "long", year: "numeric" });
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    let html = `<div class="rounded-2xl p-4 sm:p-5 dark:bg-dark-700 bg-white border dark:border-dark-600 border-gray-200 shadow-sm">
      <h3 class="font-bold text-base mb-3">${escHTML(monthName)}</h3>
      <div class="grid grid-cols-7 gap-1.5 text-center" role="grid">`;

    dayNames.forEach((d) => {
      html += `<div class="text-xs font-semibold dark:text-slate-400 text-gray-600 py-1" role="columnheader">${d}</div>`;
    });

    for (let i = 0; i < firstDay; i++) {
      html += `<div class="p-2" aria-hidden="true"></div>`;
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const isToday = d === todayDate;
      const count = dayMap[d] ? dayMap[d].length : 0;
      const hasEvents = count > 0;

      if (hasEvents) {
        html += `<button
          type="button"
          class="relative p-2 rounded-xl text-sm font-semibold transition border ${
            isToday
              ? "bg-teal-500/20 border-teal-500 text-teal-300"
              : "dark:bg-dark-800 bg-gray-50 dark:hover:bg-dark-600 hover:bg-gray-100 border-transparent"
          }"
          onclick="window._showCalDay(${year},${month},${d})"
          aria-label="${d} ${monthName}, ${count} events"
        >
          <span>${d}</span>
          <div class="flex justify-center gap-1 mt-1">
            ${dayMap[d].slice(0, 3).map((e) => `<span class="cal-dot ${CAT_COLORS[e.category]?.dot || "bg-slate-400"}" aria-hidden="true"></span>`).join("")}
          </div>
        </button>`;
      } else {
        html += `<div class="p-2 rounded-xl text-sm ${isToday ? "bg-teal-500/10 font-bold text-teal-400" : "dark:text-slate-400 text-gray-500"}">${d}</div>`;
      }
    }

    html += `</div></div>`;

    const showDay = dayMap[todayDate]
      ? todayDate
      : Object.keys(dayMap).map(Number).sort((a, b) => a - b)[0];

    if (showDay && dayMap[showDay]) {
      const dayHeader = fmtDate(`${year}-${String(month + 1).padStart(2, "0")}-${String(showDay).padStart(2, "0")}`);
      html += `<div class="mt-4 space-y-3" id="calDayEvents">
        <h4 class="text-sm font-bold text-teal-400">${escHTML(dayHeader)}</h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          ${dayMap[showDay].map(eventCardHTML).join("")}
        </div>
      </div>`;
    }

    calendarView.innerHTML = html;
  }

  window._showCalDay = function (year, month, day) {
    const formatted = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const events = getFilteredEvents().filter((e) => e.date === formatted);

    let existing = document.getElementById("calDayEvents");
    if (!existing) {
      existing = document.createElement("div");
      existing.id = "calDayEvents";
      existing.className = "mt-4 space-y-3";
      calendarView.appendChild(existing);
    }
    const dayHeader = fmtDate(formatted);
    existing.innerHTML = `<h4 class="text-sm font-bold text-teal-400">${escHTML(dayHeader)}</h4>` +
      (events.length
        ? `<div class="grid grid-cols-1 md:grid-cols-2 gap-3">${events.map(eventCardHTML).join("")}</div>`
        : `<p class="text-sm dark:text-slate-400 text-gray-500">No events found on this date.</p>`);
  };

  /* ───── Mini Calendar in Sidebar ───── */

  function renderMiniCal() {
    const year = miniCalDate.getFullYear();
    const month = miniCalDate.getMonth();
    miniCalTitle.textContent = new Date(year, month).toLocaleString("default", { month: "long", year: "numeric" });

    const events = loadEvents();
    const eventDays = new Set();
    events.forEach((e) => {
      const [y, m, d] = e.date.split("-").map(Number);
      if (y === year && m === month + 1) eventDays.add(d);
    });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayStr = todayISO();
    const [tY, tM, tD] = todayStr.split("-").map(Number);
    const isCurrentMonth = tY === year && tM === month + 1;

    const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
    let html = dayNames
      .map((d) => `<div class="font-semibold dark:text-slate-400 text-gray-600 py-1" role="columnheader">${d}</div>`)
      .join("");

    for (let i = 0; i < firstDay; i++) {
      html += `<div aria-hidden="true"></div>`;
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const isToday = isCurrentMonth && d === tD;
      const hasEvent = eventDays.has(d);
      html += `<div class="relative py-1 rounded-lg ${
        isToday ? "bg-teal-500 text-white font-bold" : ""
      } ${hasEvent && !isToday ? "font-bold text-teal-400" : "dark:text-slate-300 text-gray-700"}">
        <span>${d}</span>
        ${hasEvent ? `<div class="absolute bottom-0.5 left-1/2 -translate-x-1/2"><span class="cal-dot ${isToday ? "bg-white" : "bg-teal-400"}" aria-hidden="true"></span></div>` : ""}
      </div>`;
    }
    miniCalGrid.innerHTML = html;
  }

  prevMonthBtn.addEventListener("click", () => {
    miniCalDate.setMonth(miniCalDate.getMonth() - 1);
    renderMiniCal();
  });

  nextMonthBtn.addEventListener("click", () => {
    miniCalDate.setMonth(miniCalDate.getMonth() + 1);
    renderMiniCal();
  });

  /* ───── Statistics ───── */

  function renderStats() {
    const events = loadEvents();
    statTotal.textContent = events.length;
    statUrgent.textContent = events.filter((e) => priority(e.date) === "Urgent").length;

    // 7-day range in Asia/Kolkata
    const startStr = todayISO();
    const endStr = addDays(startStr, 7);
    statWeek.textContent = events.filter((e) => e.date >= startStr && e.date <= endStr).length;
  }

  /* ───── Full Re-render Orchestration ───── */

  function renderAll() {
    renderAttention();
    if (currentView === "list") {
      calendarView.classList.add("hidden");
      renderList();
    } else {
      listView.classList.add("hidden");
      emptyState.classList.add("hidden");
      calendarView.classList.remove("hidden");
      renderCalendarView();
    }
    renderMiniCal();
    renderStats();
  }

  /* ───── View Switcher ───── */

  listViewBtn.addEventListener("click", () => {
    currentView = "list";
    listViewBtn.classList.add("dark:bg-teal-600", "bg-teal-500", "text-white");
    listViewBtn.classList.remove("dark:bg-dark-700", "bg-gray-100", "dark:text-slate-200", "text-gray-700");
    listViewBtn.setAttribute("aria-pressed", "true");

    calViewBtn.classList.remove("dark:bg-teal-600", "bg-teal-500", "text-white");
    calViewBtn.classList.add("dark:bg-dark-700", "bg-gray-100", "dark:text-slate-200", "text-gray-700");
    calViewBtn.setAttribute("aria-pressed", "false");

    renderAll();
  });

  calViewBtn.addEventListener("click", () => {
    currentView = "calendar";
    calViewBtn.classList.add("dark:bg-teal-600", "bg-teal-500", "text-white");
    calViewBtn.classList.remove("dark:bg-dark-700", "bg-gray-100", "dark:text-slate-200", "text-gray-700");
    calViewBtn.setAttribute("aria-pressed", "true");

    listViewBtn.classList.remove("dark:bg-teal-600", "bg-teal-500", "text-white");
    listViewBtn.classList.add("dark:bg-dark-700", "bg-gray-100", "dark:text-slate-200", "text-gray-700");
    listViewBtn.setAttribute("aria-pressed", "false");

    renderAll();
  });

  /* ───── Debounced Search & Instant Filters ───── */

  searchInput.addEventListener("input", debounce(renderAll, 200));
  categoryFilter.addEventListener("change", renderAll);
  dateFilter.addEventListener("change", renderAll);

  /* ───── AI Extract Events ───── */

  extractBtn.addEventListener("click", async () => {
    const text = pasteInput.value.trim();
    if (!text) {
      showExtractError("Please paste some text first before extracting.");
      return;
    }

    extractSpinner.classList.remove("hidden");
    extractBtn.disabled = true;
    extractBtn.classList.add("opacity-60", "cursor-not-allowed");
    hideExtractError();
    extractedPreview.classList.add("hidden");

    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Event extraction failed.");
      if (!data.events || data.events.length === 0) {
        throw new Error("No campus events or dates could be identified in the text.");
      }
      showExtractedPreview(data.events);
    } catch (err) {
      showExtractError(err.message || "An unexpected error occurred while extracting events.");
    } finally {
      extractSpinner.classList.add("hidden");
      extractBtn.disabled = false;
      extractBtn.classList.remove("opacity-60", "cursor-not-allowed");
    }
  });

  function showExtractError(msg) {
    extractError.textContent = msg;
    extractError.classList.remove("hidden");
  }

  function hideExtractError() {
    extractError.textContent = "";
    extractError.classList.add("hidden");
  }

  function showExtractedPreview(events) {
    extractedPreview.classList.remove("hidden");
    extractedCards.innerHTML = events
      .map((e, i) => {
        return `<div class="theme-transition rounded-2xl p-4 sm:p-5 dark:bg-dark-800 bg-gray-50 border dark:border-dark-600 border-gray-200 fade-in" data-idx="${i}">
        <div class="space-y-2.5">
          <div>
            <label class="block text-xs font-semibold dark:text-slate-300 text-gray-700 mb-1">Title</label>
            <input value="${escAttr(e.title)}" data-field="title" class="theme-transition w-full rounded-lg dark:bg-dark-700 bg-white dark:text-gray-100 text-gray-900 p-2 text-sm font-semibold border dark:border-dark-600 border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-xs font-semibold dark:text-slate-300 text-gray-700 mb-1">Date</label>
              <input type="date" value="${escAttr(e.date)}" data-field="date" class="theme-transition w-full rounded-lg dark:bg-dark-700 bg-white dark:text-gray-100 text-gray-900 p-2 text-sm border dark:border-dark-600 border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div>
              <label class="block text-xs font-semibold dark:text-slate-300 text-gray-700 mb-1">Time</label>
              <input value="${escAttr(e.time)}" data-field="time" placeholder="Time" class="theme-transition w-full rounded-lg dark:bg-dark-700 bg-white dark:text-gray-100 text-gray-900 p-2 text-sm border dark:border-dark-600 border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
          </div>
          <div>
            <label class="block text-xs font-semibold dark:text-slate-300 text-gray-700 mb-1">Venue</label>
            <input value="${escAttr(e.venue)}" data-field="venue" placeholder="Venue location" class="theme-transition w-full rounded-lg dark:bg-dark-700 bg-white dark:text-gray-100 text-gray-900 p-2 text-sm border dark:border-dark-600 border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <div>
            <label class="block text-xs font-semibold dark:text-slate-300 text-gray-700 mb-1">Category</label>
            <select data-field="category" class="theme-transition w-full rounded-lg dark:bg-dark-700 bg-white dark:text-gray-100 text-gray-900 p-2 text-sm border dark:border-dark-600 border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500">
              ${CATEGORIES.map((c) => `<option ${c === e.category ? "selected" : ""}>${escHTML(c)}</option>`).join("")}
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold dark:text-slate-300 text-gray-700 mb-1">Notes &amp; Instructions</label>
            <textarea data-field="notes" rows="2" placeholder="Instructions, requirements, or links" class="theme-transition w-full rounded-lg dark:bg-dark-700 bg-white dark:text-gray-100 text-gray-900 p-2 text-sm border dark:border-dark-600 border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none">${escHTML(e.notes || "")}</textarea>
          </div>
        </div>
        <button
          type="button"
          onclick="window._saveExtracted(this)"
          class="mt-3 px-4 py-2 text-sm font-semibold rounded-lg bg-teal-500 hover:bg-teal-600 text-white transition w-full shadow-sm"
        >
          Save Event
        </button>
      </div>`;
      })
      .join("");
  }

  window._saveExtracted = function (btn) {
    const card = btn.closest("[data-idx]");
    const ev = {
      title: card.querySelector('[data-field="title"]').value.trim() || "Untitled Event",
      date: card.querySelector('[data-field="date"]').value || todayISO(),
      time: card.querySelector('[data-field="time"]').value.trim(),
      venue: card.querySelector('[data-field="venue"]').value.trim(),
      category: card.querySelector('[data-field="category"]').value,
      notes: (card.querySelector('[data-field="notes"]')?.value || "").trim(),
    };
    addEvent(ev);
    card.innerHTML = `<div class="text-center py-4 text-teal-400 font-bold text-sm fade-in" role="status">✓ Event Saved Successfully!</div>`;
    renderAll();
  };

  /* ───── Sample Data Helpers ───── */

  sampleBtn.addEventListener("click", () => {
    pasteInput.value = sampleNotice();
    pasteInput.focus();
  });

  loadSamplesBtn.addEventListener("click", () => {
    getSampleEvents().forEach(addEvent);
    renderAll();
  });

  /* ───── Event Edit Modal Management ───── */

  window._editEvent = function (id) {
    const events = loadEvents();
    const ev = events.find((e) => e.id === id);
    if (!ev) return;

    lastActiveElementBeforeModal = document.activeElement;

    editId.value = id;
    editTitle.value = ev.title;
    editDate.value = ev.date;
    editTime.value = ev.time || "";
    editVenue.value = ev.venue || "";
    editCategory.value = ev.category || "Other";
    editNotes.value = ev.notes || "";

    editModal.classList.remove("hidden");
    editTitle.focus();
  };

  window._deleteEvent = function (id) {
    const events = loadEvents();
    const ev = events.find((e) => e.id === id);
    const title = ev ? ev.title : "this event";
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;
    deleteEvent(id);
    renderAll();
  };

  function closeEditModal() {
    editModal.classList.add("hidden");
    if (lastActiveElementBeforeModal && typeof lastActiveElementBeforeModal.focus === "function") {
      lastActiveElementBeforeModal.focus();
    }
  }

  editCancel.addEventListener("click", closeEditModal);
  editOverlay.addEventListener("click", closeEditModal);

  // Close modal with Escape key
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !editModal.classList.contains("hidden")) {
      closeEditModal();
    }
  });

  editForm.addEventListener("submit", (e) => {
    e.preventDefault();
    updateEvent(editId.value, {
      title: editTitle.value.trim() || "Untitled Event",
      date: editDate.value,
      time: editTime.value.trim(),
      venue: editVenue.value.trim(),
      category: editCategory.value,
      notes: editNotes.value.trim(),
    });
    closeEditModal();
    renderAll();
  });

  /* ───── AI Weekly Digest Generation ───── */

  digestBtn.addEventListener("click", async () => {
    const events = loadEvents();
    // 7-day range in Asia/Kolkata
    const startStr = todayISO();
    const endStr = addDays(startStr, 7);
    const weekEvents = events.filter((e) => e.date >= startStr && e.date <= endStr);

    console.log(
      `[AI Digest] Found ${weekEvents.length} events for date range: ${startStr} to ${endStr}`,
      weekEvents
    );

    if (weekEvents.length === 0) {
      digestText.textContent = "No events scheduled for the next 7 days. Enjoy the break! 😊";
      return;
    }

    digestSpinner.classList.remove("hidden");
    digestBtn.disabled = true;
    digestBtn.classList.add("opacity-60", "cursor-not-allowed");
    digestText.textContent = "";

    try {
      const res = await fetch("/api/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events: weekEvents }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to generate summary digest.");

      // Set securely with textContent to avoid XSS
      digestText.textContent = data.summary;
    } catch (err) {
      digestText.textContent = "Couldn't generate digest right now. " + (err.message || "");
    } finally {
      digestSpinner.classList.add("hidden");
      digestBtn.disabled = false;
      digestBtn.classList.remove("opacity-60", "cursor-not-allowed");
    }
  });

  /* ───── Initialization ───── */

  function init() {
    initTheme();

    if (loadEvents().length === 0) {
      const firstVisit = !localStorage.getItem("campusPulse_visited");
      if (firstVisit) {
        getSampleEvents().forEach(addEvent);
        localStorage.setItem("campusPulse_visited", "1");
      }
    }

    renderAll();
  }

  init();
})();
