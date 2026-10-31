/* ═══════════════════════════════════════════════
   Campus Pulse – app.js (vanilla JS)
   ═══════════════════════════════════════════════ */

(function () {
  "use strict";

  /* ───── Constants & State ───── */

  const CATEGORIES = ["Academic", "Cultural", "Sports", "Club", "Deadline", "Other"];
  const CAT_COLORS = {
    Academic: { bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/30", dot: "bg-blue-400" },
    Cultural: { bg: "bg-purple-500/20", text: "text-purple-400", border: "border-purple-500/30", dot: "bg-purple-400" },
    Sports: { bg: "bg-green-500/20", text: "text-green-400", border: "border-green-500/30", dot: "bg-green-400" },
    Club: { bg: "bg-yellow-500/20", text: "text-yellow-400", border: "border-yellow-500/30", dot: "bg-yellow-400" },
    Deadline: { bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500/30", dot: "bg-red-400" },
    Other: { bg: "bg-gray-500/20", text: "text-gray-400", border: "border-gray-500/30", dot: "bg-gray-400" },
  };
  const PRIORITY_BADGES = {
    Urgent: { label: "Urgent", classes: "bg-red-500/20 text-red-400 border border-red-500/30" },
    Upcoming: { label: "Upcoming", classes: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" },
    Expired: { label: "Expired", classes: "bg-gray-500/20 text-gray-400 border border-gray-500/30" },
  };

  const STORAGE_KEY = "campusPulse_events";
  let currentView = "list";
  let miniCalDate = new Date();

  /* ───── Helpers ───── */

  function todayISO() {
    return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  }

  function toIST(date) {
    return new Date(date.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  }

  function daysFromNow(dateStr) {
    const [y1, m1, d1] = todayISO().split("-").map(Number);
    const [y2, m2, d2] = dateStr.split("-").map(Number);
    const utc1 = Date.UTC(y1, m1 - 1, d1);
    const utc2 = Date.UTC(y2, m2 - 1, d2);
    return Math.round((utc2 - utc1) / 86400000);
  }

  function priority(dateStr) {
    const diff = daysFromNow(dateStr);
    if (diff < 0) return "Expired";
    if (diff <= 2) return "Urgent";
    return "Upcoming";
  }

  function fmtDate(dateStr) {
    try {
      const d = new Date(dateStr + "T00:00:00");
      return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
    } catch { return dateStr; }
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function relDay(dateStr) {
    const diff = daysFromNow(dateStr);
    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    if (diff === -1) return "Yesterday";
    return null;
  }

  /* ───── Storage ───── */

  function loadEvents() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch { return []; }
  }

  function saveEvents(events) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
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
    if (idx !== -1) Object.assign(events[idx], data);
    saveEvents(events);
  }

  function deleteEvent(id) {
    saveEvents(loadEvents().filter((e) => e.id !== id));
  }

  /* ───── Sample data (relative to today) ───── */

  function addDays(base, n) {
    const [y, m, d] = base.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + n, 12, 0, 0));
    return dt.toISOString().slice(0, 10);
  }

  function getSampleEvents() {
    const t = todayISO();
    return [
      { id: uid(), title: "Data Structures Assignment Due", date: addDays(t, 1), time: "11:59 PM", venue: "Online Portal", category: "Deadline" },
      { id: uid(), title: "Annual Cultural Fest – Rhythms", date: addDays(t, 3), time: "2:00 PM – 6:00 PM", venue: "Main Auditorium", category: "Cultural" },
      { id: uid(), title: "Inter-Department Cricket Match", date: addDays(t, 5), time: "9:00 AM", venue: "Sports Ground", category: "Sports" },
    ];
  }

  function sampleNotice() {
    const t = todayISO();
    const d1 = "tmrw";
    return `Hey everyone!! 🎉
Coding Club meet tmrw 5pm in Lab 3, bring ur laptops!! 💻
Also don't forget - Prof. Sharma's extra class on Linear Algebra this Friday at 10am in Room 204.
And guys the deadline for the hackathon registration is day after tomorrow, submit on the college portal before 11:59pm.
See you there! 🙌`;
  }

  /* ───── DOM refs ───── */

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

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
  const digestBanner = $("#digestBanner");
  const attentionBanner = $("#attentionBanner");
  const attentionList = $("#attentionList");
  const themeToggle = $("#themeToggle");

  // Mini calendar
  const miniCalTitle = $("#miniCalTitle");
  const miniCalGrid = $("#miniCalGrid");
  const prevMonthBtn = $("#prevMonth");
  const nextMonthBtn = $("#nextMonth");

  // Edit modal
  const editModal = $("#editModal");
  const editOverlay = $("#editOverlay");
  const editId = $("#editId");
  const editTitle = $("#editTitle");
  const editDate = $("#editDate");
  const editTime = $("#editTime");
  const editVenue = $("#editVenue");
  const editCategory = $("#editCategory");
  const editNotes = $("#editNotes");
  const editCancel = $("#editCancel");
  const editSave = $("#editSave");

  // Stats
  const statTotal = $("#statTotal");
  const statUrgent = $("#statUrgent");
  const statWeek = $("#statWeek");

  /* ───── Theme ───── */

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

  /* ───── Attention Banner ───── */

  function renderAttention() {
    const events = loadEvents();
    const today = todayISO();
    const urgent = events.filter((e) => {
      const p = priority(e.date);
      return p === "Urgent";
    });
    if (urgent.length === 0) {
      attentionBanner.classList.add("hidden");
      return;
    }
    attentionBanner.classList.remove("hidden");
    attentionList.innerHTML = urgent
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((e) => {
        const rel = relDay(e.date);
        const tag = rel ? `<span class="font-medium text-teal-400">${rel}</span>` : "";
        return `<div class="flex items-center gap-2">
          <span class="cal-dot ${CAT_COLORS[e.category]?.dot || "bg-gray-400"}"></span>
          <span>${e.title}</span>
          ${tag}
          <span class="dark:text-gray-500 text-gray-400 ml-auto text-xs">${e.time || ""}</span>
        </div>`;
      })
      .join("");
  }

  /* ───── Render Events List ───── */

  function getFilteredEvents() {
    let events = loadEvents();
    const search = searchInput.value.toLowerCase().trim();
    const cat = categoryFilter.value;
    const dateVal = dateFilter.value;

    if (search) events = events.filter((e) => e.title.toLowerCase().includes(search) || (e.venue && e.venue.toLowerCase().includes(search)));
    if (cat !== "All") events = events.filter((e) => e.category === cat);
    if (dateVal) events = events.filter((e) => e.date === dateVal);

    // Sort: urgent first, then by date ascending
    events.sort((a, b) => {
      const pa = priority(a.date) === "Urgent" ? 0 : priority(a.date) === "Upcoming" ? 1 : 2;
      const pb = priority(b.date) === "Urgent" ? 0 : priority(b.date) === "Upcoming" ? 1 : 2;
      if (pa !== pb) return pa - pb;
      return a.date.localeCompare(b.date);
    });
    return events;
  }

  function eventCardHTML(e) {
    const p = priority(e.date);
    const badge = PRIORITY_BADGES[p];
    const cat = CAT_COLORS[e.category] || CAT_COLORS.Other;
    const rel = relDay(e.date);

    return `<div class="theme-transition rounded-2xl p-4 dark:bg-dark-700 bg-white border dark:border-dark-600 border-gray-200 hover:border-teal-500/40 transition fade-in">
      <div class="flex items-start justify-between gap-2 mb-2">
        <h4 class="font-semibold text-sm leading-tight flex-1">${escHTML(e.title)}</h4>
        <span class="shrink-0 text-[10px] px-2 py-0.5 rounded-full font-medium ${badge.classes}">${badge.label}</span>
      </div>
      <div class="space-y-1 text-xs dark:text-gray-400 text-gray-500">
        <div class="flex items-center gap-1.5">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          ${fmtDate(e.date)}${rel ? ` <span class="text-teal-400 font-medium">(${rel})</span>` : ""}
        </div>
        ${e.time ? `<div class="flex items-center gap-1.5">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          ${escHTML(e.time)}</div>` : ""}
        ${e.venue ? `<div class="flex items-center gap-1.5">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          ${escHTML(e.venue)}</div>` : ""}
        ${e.notes ? `<div class="flex items-start gap-1.5 mt-1 pt-1 border-t dark:border-dark-600 border-gray-100">
          <svg class="w-3.5 h-3.5 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <span class="italic">${escHTML(e.notes)}</span></div>` : ""}
      </div>
      <div class="flex items-center justify-between mt-3">
        <span class="text-[10px] px-2 py-0.5 rounded-full ${cat.bg} ${cat.text} ${cat.border} border font-medium">${e.category}</span>
        <div class="flex gap-1">
          <button onclick="window._editEvent('${e.id}')" class="p-1.5 rounded-lg dark:hover:bg-dark-600 hover:bg-gray-200 transition" title="Edit">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          </button>
          <button onclick="window._deleteEvent('${e.id}')" class="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition" title="Delete">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>
      </div>
    </div>`;
  }

  function escHTML(s) {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  function renderList() {
    const events = getFilteredEvents();
    if (events.length === 0 && loadEvents().length === 0) {
      listView.classList.add("hidden");
      emptyState.classList.remove("hidden");
      return;
    }
    emptyState.classList.add("hidden");

    if (events.length === 0) {
      listView.innerHTML = `<div class="col-span-full text-center py-8 dark:text-gray-500 text-gray-400 text-sm">No events match your filters.</div>`;
      listView.classList.remove("hidden");
      return;
    }
    listView.innerHTML = events.map(eventCardHTML).join("");
    listView.classList.remove("hidden");
  }

  /* ───── Calendar View ───── */

  function renderCalendarView() {
    const events = getFilteredEvents();
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    // Build full month grid
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayDate = now.getDate();

    // Map events to days
    const dayMap = {};
    events.forEach((e) => {
      const d = new Date(e.date + "T00:00:00");
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (!dayMap[day]) dayMap[day] = [];
        dayMap[day].push(e);
      }
    });

    const monthName = new Date(year, month).toLocaleString("default", { month: "long", year: "numeric" });
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    let html = `<div class="rounded-2xl p-4 dark:bg-dark-700 bg-white border dark:border-dark-600 border-gray-200">
      <h3 class="font-semibold mb-3">${monthName}</h3>
      <div class="grid grid-cols-7 gap-1 text-center">`;

    dayNames.forEach((d) => {
      html += `<div class="text-xs font-medium dark:text-gray-500 text-gray-400 py-1">${d}</div>`;
    });

    for (let i = 0; i < firstDay; i++) html += `<div></div>`;

    for (let d = 1; d <= daysInMonth; d++) {
      const isToday = d === todayDate;
      const hasEvents = dayMap[d] && dayMap[d].length > 0;
      html += `<div class="relative py-2 rounded-lg ${isToday ? "bg-teal-500/20 font-bold text-teal-400" : ""} ${hasEvents ? "cursor-pointer dark:hover:bg-dark-600 hover:bg-gray-100" : ""} text-sm" ${hasEvents ? `onclick="window._showCalDay(${year},${month},${d})"` : ""}>
        ${d}
        ${hasEvents ? `<div class="flex justify-center gap-0.5 mt-0.5">${dayMap[d].slice(0, 3).map((e) => `<span class="cal-dot ${CAT_COLORS[e.category]?.dot || "bg-gray-400"}"></span>`).join("")}</div>` : ""}
      </div>`;
    }

    html += `</div></div>`;

    // Show event details below for selected day or today
    const showDay = dayMap[todayDate] ? todayDate : Object.keys(dayMap).map(Number).sort((a, b) => a - b)[0];
    if (showDay && dayMap[showDay]) {
      html += `<div class="mt-4 space-y-2" id="calDayEvents">`;
      html += `<h4 class="text-sm font-semibold dark:text-gray-300 text-gray-600">${new Date(year, month, showDay).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}</h4>`;
      dayMap[showDay].forEach((e) => { html += eventCardHTML(e); });
      html += `</div>`;
    }

    calendarView.innerHTML = html;
  }

  window._showCalDay = function (year, month, day) {
    const events = getFilteredEvents().filter((e) => {
      const d = new Date(e.date + "T00:00:00");
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });
    let existing = document.getElementById("calDayEvents");
    if (!existing) {
      existing = document.createElement("div");
      existing.id = "calDayEvents";
      existing.className = "mt-4 space-y-2";
      calendarView.appendChild(existing);
    }
    existing.innerHTML = `<h4 class="text-sm font-semibold dark:text-gray-300 text-gray-600">${new Date(year, month, day).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}</h4>` +
      (events.length ? events.map(eventCardHTML).join("") : `<p class="text-sm dark:text-gray-500 text-gray-400">No events on this day.</p>`);
  };

  /* ───── Mini Calendar ───── */

  function renderMiniCal() {
    const year = miniCalDate.getFullYear();
    const month = miniCalDate.getMonth();
    miniCalTitle.textContent = new Date(year, month).toLocaleString("default", { month: "long", year: "numeric" });

    const events = loadEvents();
    const eventDays = new Set();
    events.forEach((e) => {
      const d = new Date(e.date + "T00:00:00");
      if (d.getFullYear() === year && d.getMonth() === month) eventDays.add(d.getDate());
    });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayObj = new Date(todayISO() + "T00:00:00");
    const isCurrentMonth = todayObj.getFullYear() === year && todayObj.getMonth() === month;
    const todayDate = todayObj.getDate();

    const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
    let html = dayNames.map((d) => `<div class="font-medium dark:text-gray-500 text-gray-400 py-1">${d}</div>`).join("");

    for (let i = 0; i < firstDay; i++) html += `<div></div>`;
    for (let d = 1; d <= daysInMonth; d++) {
      const isToday = isCurrentMonth && d === todayDate;
      const hasEvent = eventDays.has(d);
      html += `<div class="relative py-1 rounded ${isToday ? "bg-teal-500 text-white font-bold" : ""} ${hasEvent && !isToday ? "font-semibold dark:text-teal-400 text-teal-600" : ""}">
        ${d}
        ${hasEvent ? `<div class="absolute bottom-0 left-1/2 -translate-x-1/2"><span class="cal-dot ${isToday ? "bg-white" : "bg-teal-400"}"></span></div>` : ""}
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

  /* ───── Stats ───── */

  function renderStats() {
    const events = loadEvents();
    statTotal.textContent = events.length;
    statUrgent.textContent = events.filter((e) => priority(e.date) === "Urgent").length;
    // This week (today through next 7 days in Asia/Kolkata)
    const startStr = todayISO();
    const endStr = addDays(startStr, 7);
    statWeek.textContent = events.filter((e) => e.date >= startStr && e.date <= endStr).length;
  }

  /* ───── Full re-render ───── */

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

  /* ───── View Toggle ───── */

  listViewBtn.addEventListener("click", () => {
    currentView = "list";
    listViewBtn.classList.add("dark:bg-teal-600", "bg-teal-500", "text-white");
    listViewBtn.classList.remove("dark:bg-dark-700", "bg-gray-100", "dark:text-gray-300", "text-gray-700");
    calViewBtn.classList.remove("dark:bg-teal-600", "bg-teal-500", "text-white");
    calViewBtn.classList.add("dark:bg-dark-700", "bg-gray-100", "dark:text-gray-300", "text-gray-700");
    renderAll();
  });

  calViewBtn.addEventListener("click", () => {
    currentView = "calendar";
    calViewBtn.classList.add("dark:bg-teal-600", "bg-teal-500", "text-white");
    calViewBtn.classList.remove("dark:bg-dark-700", "bg-gray-100", "dark:text-gray-300", "text-gray-700");
    listViewBtn.classList.remove("dark:bg-teal-600", "bg-teal-500", "text-white");
    listViewBtn.classList.add("dark:bg-dark-700", "bg-gray-100", "dark:text-gray-300", "text-gray-700");
    renderAll();
  });

  /* ───── Filters ───── */

  searchInput.addEventListener("input", renderAll);
  categoryFilter.addEventListener("change", renderAll);
  dateFilter.addEventListener("change", renderAll);

  /* ───── Extract ───── */

  extractBtn.addEventListener("click", async () => {
    const text = pasteInput.value.trim();
    if (!text) { showExtractError("Please paste some text first."); return; }

    extractSpinner.classList.remove("hidden");
    extractBtn.disabled = true;
    hideExtractError();
    extractedPreview.classList.add("hidden");

    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Extraction failed");
      if (!data.events || data.events.length === 0) throw new Error("No events found in the text.");
      showExtractedPreview(data.events);
    } catch (err) {
      showExtractError(err.message);
    } finally {
      extractSpinner.classList.add("hidden");
      extractBtn.disabled = false;
    }
  });

  function showExtractError(msg) {
    extractError.textContent = msg;
    extractError.classList.remove("hidden");
  }
  function hideExtractError() {
    extractError.classList.add("hidden");
  }

  function showExtractedPreview(events) {
    extractedPreview.classList.remove("hidden");
    extractedCards.innerHTML = events
      .map((e, i) => {
        const cat = CAT_COLORS[e.category] || CAT_COLORS.Other;
        return `<div class="theme-transition rounded-2xl p-4 dark:bg-dark-800 bg-gray-50 border dark:border-dark-600 border-gray-200 fade-in" data-idx="${i}">
        <div class="space-y-2">
          <input value="${escAttr(e.title)}" data-field="title" class="theme-transition w-full rounded-lg dark:bg-dark-700 bg-white dark:text-gray-100 text-gray-800 p-2 text-sm font-semibold border dark:border-dark-600 border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500/50" />
          <div class="grid grid-cols-2 gap-2">
            <input type="date" value="${e.date}" data-field="date" class="theme-transition rounded-lg dark:bg-dark-700 bg-white dark:text-gray-100 text-gray-800 p-2 text-sm border dark:border-dark-600 border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500/50" />
            <input value="${escAttr(e.time)}" data-field="time" placeholder="Time" class="theme-transition rounded-lg dark:bg-dark-700 bg-white dark:text-gray-100 text-gray-800 p-2 text-sm border dark:border-dark-600 border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500/50" />
          </div>
          <input value="${escAttr(e.venue)}" data-field="venue" placeholder="Venue" class="theme-transition w-full rounded-lg dark:bg-dark-700 bg-white dark:text-gray-100 text-gray-800 p-2 text-sm border dark:border-dark-600 border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500/50" />
          <select data-field="category" class="theme-transition w-full rounded-lg dark:bg-dark-700 bg-white dark:text-gray-100 text-gray-800 p-2 text-sm border dark:border-dark-600 border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500/50">
            ${CATEGORIES.map((c) => `<option ${c === e.category ? "selected" : ""}>${c}</option>`).join("")}
          </select>
          <textarea data-field="notes" rows="2" placeholder="Notes (instructions, what to bring, links, etc.)" class="theme-transition w-full rounded-lg dark:bg-dark-700 bg-white dark:text-gray-100 text-gray-800 p-2 text-sm border dark:border-dark-600 border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500/50 resize-none">${escHTML(e.notes || "")}</textarea>
        </div>
        <button onclick="window._saveExtracted(this)" class="mt-3 px-4 py-1.5 text-sm rounded-lg bg-teal-500 hover:bg-teal-600 text-white transition w-full font-medium">Save Event</button>
      </div>`;
      })
      .join("");
  }

  function escAttr(s) {
    return (s || "").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  }

  window._saveExtracted = function (btn) {
    const card = btn.closest("[data-idx]");
    const ev = {
      title: card.querySelector('[data-field="title"]').value.trim() || "Untitled",
      date: card.querySelector('[data-field="date"]').value,
      time: card.querySelector('[data-field="time"]').value.trim(),
      venue: card.querySelector('[data-field="venue"]').value.trim(),
      category: card.querySelector('[data-field="category"]').value,
      notes: (card.querySelector('[data-field="notes"]')?.value || "").trim(),
    };
    addEvent(ev);
    card.innerHTML = `<div class="text-center py-3 text-teal-400 font-medium text-sm fade-in">✓ Saved!</div>`;
    renderAll();
  };

  /* ───── Sample fill ───── */

  sampleBtn.addEventListener("click", () => {
    pasteInput.value = sampleNotice();
    pasteInput.focus();
  });

  loadSamplesBtn.addEventListener("click", () => {
    getSampleEvents().forEach(addEvent);
    renderAll();
  });

  /* ───── Edit / Delete ───── */

  window._editEvent = function (id) {
    const events = loadEvents();
    const ev = events.find((e) => e.id === id);
    if (!ev) return;
    editId.value = id;
    editTitle.value = ev.title;
    editDate.value = ev.date;
    editTime.value = ev.time;
    editVenue.value = ev.venue;
    editCategory.value = ev.category;
    editNotes.value = ev.notes || "";
    editModal.classList.remove("hidden");
  };

  window._deleteEvent = function (id) {
    if (!confirm("Delete this event?")) return;
    deleteEvent(id);
    renderAll();
  };

  editCancel.addEventListener("click", () => editModal.classList.add("hidden"));
  editOverlay.addEventListener("click", () => editModal.classList.add("hidden"));

  editSave.addEventListener("click", () => {
    updateEvent(editId.value, {
      title: editTitle.value.trim() || "Untitled",
      date: editDate.value,
      time: editTime.value.trim(),
      venue: editVenue.value.trim(),
      category: editCategory.value,
      notes: editNotes.value.trim(),
    });
    editModal.classList.add("hidden");
    renderAll();
  });

  /* ───── AI Digest ───── */

  digestBtn.addEventListener("click", async () => {
    const events = loadEvents();
    // Filter to this week: today through the next 7 days (Asia/Kolkata)
    const startStr = todayISO();
    const endStr = addDays(startStr, 7);
    const weekEvents = events.filter((e) => e.date >= startStr && e.date <= endStr);

    console.log(`[AI Digest] Found ${weekEvents.length} events for date range: ${startStr} to ${endStr}`, weekEvents);

    if (weekEvents.length === 0) {
      digestText.textContent = "No events this week. Enjoy the break! 😊";
      return;
    }

    digestSpinner.classList.remove("hidden");
    digestBtn.disabled = true;
    digestText.textContent = "";

    try {
      const res = await fetch("/api/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events: weekEvents }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Summary failed");
      digestText.textContent = data.summary;
    } catch (err) {
      digestText.textContent = "Couldn't generate digest right now. " + err.message;
    } finally {
      digestSpinner.classList.add("hidden");
      digestBtn.disabled = false;
    }
  });

  /* ───── Init ───── */

  function init() {
    initTheme();

    // Load pre-existing sample events on first visit
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

