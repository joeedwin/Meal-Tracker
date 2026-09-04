// Room Meal Tracker - Frontend Application

const MEAL_LABELS = { bf: "Breakfast", lunch: "Lunch", dinner: "Dinner" };
const MEAL_ICONS = { bf: "🌅", lunch: "☀️", dinner: "🌙" };
const MEAL_TYPES = ["bf", "lunch", "dinner"];

const PERSON_CONFIG = {
  ragul: { key: "ragul", initial: "R", colorClass: "ragul" },
  arun: { key: "arun", initial: "A", colorClass: "arun" },
  joe: { key: "joe", initial: "J", colorClass: "joe" },
  vishakan: { key: "vishakan", initial: "V", colorClass: "vishakan" },
};

function getPersonMeta(name) {
  const lower = (name || "").toLowerCase().trim();
  return PERSON_CONFIG[lower] || { key: "default", initial: name.charAt(0).toUpperCase(), colorClass: "ragul" };
}

// DOM Elements
const dayPicker = document.getElementById("dayPicker");
const dateDisplay = document.getElementById("dateDisplay");
const prevDayBtn = document.getElementById("prevDay");
const nextDayBtn = document.getElementById("nextDay");
const todayBtn = document.getElementById("todayBtn");
const calendarTriggerBtn = document.getElementById("calendarTriggerBtn");
const dayClosedEl = document.getElementById("dayClosed");
const dayStatusDot = document.getElementById("dayStatusDot");
const closeDayBtn = document.getElementById("closeDayBtn");
const lockBtnIcon = document.getElementById("lockBtnIcon");
const lockBtnText = document.getElementById("lockBtnText");
const gridEl = document.getElementById("grid");
const dayTotalEl = document.getElementById("dayTotal");
const dayMealCountEl = document.getElementById("dayMealCount");
const dayPersonTotalsEl = document.getElementById("dayPersonTotals");
const syncStatusEl = document.getElementById("syncStatus");
const toastEl = document.getElementById("toast");
const themeToggleBtn = document.getElementById("themeToggle");

// Summary Tab Elements
const rangeStart = document.getElementById("rangeStart");
const rangeEnd = document.getElementById("rangeEnd");
const customDateRow = document.getElementById("customDateRow");
const applyRangeBtn = document.getElementById("applyRangeBtn");
const periodLabel = document.getElementById("periodLabel");
const grandTotalEl = document.getElementById("grandTotal");
const totalMealsStatEl = document.getElementById("totalMealsStat");
const avgPerPersonStatEl = document.getElementById("avgPerPersonStat");
const unbilledStatEl = document.getElementById("unbilledStat");
const splitBarEl = document.getElementById("splitBar");
const splitBarSummaryEl = document.getElementById("splitBarSummary");
const summaryCard = document.getElementById("summaryCard");
const lastSettlementCard = document.getElementById("lastSettlementCard");
const shareWhatsappBtn = document.getElementById("shareWhatsappBtn");
const openSettleModalBtn = document.getElementById("openSettleModalBtn");

// Modal Elements
const settleModal = document.getElementById("settleModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const cancelSettleBtn = document.getElementById("cancelSettleBtn");
const confirmSettleBtn = document.getElementById("confirmSettleBtn");
const modalDateRange = document.getElementById("modalDateRange");
const modalTotalAmount = document.getElementById("modalTotalAmount");
const modalSplitPreview = document.getElementById("modalSplitPreview");
const settleNotesInput = document.getElementById("settleNotes");
const settledByInput = document.getElementById("settledBy");

// History Elements
const historyToggleBtn = document.getElementById("historyToggleBtn");
const historyContent = document.getElementById("historyContent");
const historyList = document.getElementById("historyList");
const historyArrow = document.getElementById("historyArrow");

// Daily Sheet Elements
const sheetRangeStart = document.getElementById("sheetRangeStart");
const sheetRangeEnd = document.getElementById("sheetRangeEnd");
const sheetCustomDateRow = document.getElementById("sheetCustomDateRow");
const sheetApplyRangeBtn = document.getElementById("sheetApplyRangeBtn");
const sheetPeriodLabel = document.getElementById("sheetPeriodLabel");
const sheetDaysCount = document.getElementById("sheetDaysCount");
const sheetTotalMealsStat = document.getElementById("sheetTotalMealsStat");
const sheetTotalCostStat = document.getElementById("sheetTotalCostStat");
const sheetDaysBadge = document.getElementById("sheetDaysBadge");
const dailySheetList = document.getElementById("dailySheetList");
const sheetRoommateFilterGroup = document.getElementById("sheetRoommateFilterGroup");

// State
let lastData = null;
let currentSummaryData = null;
let currentSheetData = null;
let activeRoommateFilter = "all";
let saveTimer = null;

// Helpers
function todayStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function formatDatePretty(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const today = new Date();
  const isToday =
    target.getFullYear() === today.getFullYear() &&
    target.getMonth() === today.getMonth() &&
    target.getDate() === today.getDate();

  const options = { weekday: "short", month: "short", day: "numeric" };
  const formatted = target.toLocaleDateString("en-US", options);
  return isToday ? `Today (${formatted})` : formatted;
}

function shiftDate(dateStr, delta) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + delta);
  return date.toISOString().slice(0, 10);
}

function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  setTimeout(() => toastEl.classList.remove("show"), 2200);
}

function setSyncStatus(status) {
  if (status === "syncing") {
    syncStatusEl.classList.add("syncing");
    syncStatusEl.querySelector(".sync-text").textContent = "Saving…";
  } else if (status === "synced") {
    syncStatusEl.classList.remove("syncing");
    syncStatusEl.querySelector(".sync-text").textContent = "Synced";
  } else if (status === "error") {
    syncStatusEl.classList.remove("syncing");
    syncStatusEl.querySelector(".sync-text").textContent = "Sync error";
  }
}

function getCurrentMealSlot() {
  const hour = new Date().getHours();
  if (hour < 11) return "bf";
  if (hour < 16) return "lunch";
  return "dinner";
}

// Theme Handling
function initTheme() {
  const saved = localStorage.getItem("meal_tracker_theme");
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = saved ? saved === "dark" : prefersDark;

  if (isDark) {
    document.documentElement.setAttribute("data-theme", "dark");
    themeToggleBtn.textContent = "☀️";
  } else {
    document.documentElement.removeAttribute("data-theme");
    themeToggleBtn.textContent = "🌙";
  }
}

themeToggleBtn.addEventListener("click", () => {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  if (isDark) {
    document.documentElement.removeAttribute("data-theme");
    localStorage.setItem("meal_tracker_theme", "light");
    themeToggleBtn.textContent = "🌙";
  } else {
    document.documentElement.setAttribute("data-theme", "dark");
    localStorage.setItem("meal_tracker_theme", "dark");
    themeToggleBtn.textContent = "☀️";
  }
});

// Day Navigation
function updateDateDisplay(dateStr) {
  dayPicker.value = dateStr;
  dateDisplay.textContent = formatDatePretty(dateStr);
  const isToday = dateStr === todayStr();
  todayBtn.classList.toggle("active", isToday);
}

prevDayBtn.addEventListener("click", () => {
  const newDate = shiftDate(dayPicker.value, -1);
  updateDateDisplay(newDate);
  loadDay(newDate);
});

nextDayBtn.addEventListener("click", () => {
  const newDate = shiftDate(dayPicker.value, 1);
  updateDateDisplay(newDate);
  loadDay(newDate);
});

todayBtn.addEventListener("click", () => {
  const t = todayStr();
  updateDateDisplay(t);
  loadDay(t);
});

calendarTriggerBtn.addEventListener("click", () => {
  try {
    dayPicker.showPicker ? dayPicker.showPicker() : dayPicker.focus();
  } catch {
    dayPicker.focus();
  }
});

dayPicker.addEventListener("change", () => {
  updateDateDisplay(dayPicker.value);
  loadDay(dayPicker.value);
});

// Load and Render Day
async function loadDay(dateStr) {
  gridEl.innerHTML = `<div style="text-align:center; padding: 24px; color: var(--ink-secondary);">Loading meals…</div>`;
  setSyncStatus("syncing");
  try {
    const res = await fetch(`/api/meals?action=day&date=${dateStr}`);
    lastData = await res.json();
    renderGrid(lastData);
    setSyncStatus("synced");
  } catch (err) {
    console.error(err);
    setSyncStatus("error");
    showToast("Failed to load day data");
  }
}

function renderGrid(data) {
  const { mealCost, grid, closed, date } = data;
  const currentSlot = getCurrentMealSlot();
  const isToday = date === todayStr();

  // Status banner
  dayStatusDot.className = `status-indicator-dot ${closed ? "closed" : "open"}`;
  dayClosedEl.textContent = closed ? "Day locked — edits closed" : "Open for edits";
  lockBtnIcon.textContent = closed ? "🔓" : "🔒";
  lockBtnText.textContent = closed ? "Reopen day" : "Close day";
  closeDayBtn.disabled = false;

  gridEl.innerHTML = "";

  for (const mealType of MEAL_TYPES) {
    const block = document.createElement("div");
    const isCurrent = isToday && mealType === currentSlot;
    block.className = `meal-block-card ${isCurrent ? "current-meal" : ""}`;

    const header = document.createElement("div");
    header.className = "meal-card-header";

    const titleGroup = document.createElement("div");
    titleGroup.className = "meal-title-group";
    titleGroup.innerHTML = `
      <span style="font-size: 1.1rem;">${MEAL_ICONS[mealType]}</span>
      <span class="meal-name">${MEAL_LABELS[mealType]}</span>
      <span class="meal-price-badge">₹${mealCost[mealType]}</span>
      ${isCurrent ? `<span class="meal-active-tag">Now</span>` : ""}
    `;

    const batchActions = document.createElement("div");
    batchActions.className = "meal-batch-actions";
    batchActions.innerHTML = `
      <button class="batch-btn" data-batch="all-in" data-meal="${mealType}" ${closed ? "disabled" : ""}>All In</button>
      <button class="batch-btn" data-batch="all-out" data-meal="${mealType}" ${closed ? "disabled" : ""}>All Out</button>
    `;

    header.appendChild(titleGroup);
    header.appendChild(batchActions);
    block.appendChild(header);

    const roomGrid = document.createElement("div");
    roomGrid.className = "roommates-grid";

    for (const row of grid) {
      const isAttending = !!row.meals[mealType];
      const meta = getPersonMeta(row.name);

      const tile = document.createElement("div");
      tile.className = `roommate-tile ${isAttending ? "selected" : ""} ${closed ? "disabled" : ""}`;
      tile.dataset.personId = row.personId;
      tile.dataset.mealType = mealType;

      tile.innerHTML = `
        <div class="tile-left">
          <div class="avatar-circle ${meta.colorClass}">${meta.initial}</div>
          <span class="roommate-name">${row.name}</span>
        </div>
        <div class="tile-check">✓</div>
      `;

      if (!closed) {
        tile.addEventListener("click", () => toggleRoommateTile(tile, row.personId, mealType));
      }

      roomGrid.appendChild(tile);
    }

    block.appendChild(roomGrid);
    gridEl.appendChild(block);
  }

  // Attach batch action listeners
  gridEl.querySelectorAll(".batch-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const action = btn.dataset.batch;
      const meal = btn.dataset.meal;
      batchToggleMeal(meal, action === "all-in");
    });
  });

  updateDayTotalsView(data);
}

function toggleRoommateTile(tileEl, personId, mealType) {
  if (lastData.closed) {
    showToast("This day is locked for edits");
    return;
  }

  const isSelected = tileEl.classList.toggle("selected");

  // Update in memory state
  const person = lastData.grid.find((p) => p.personId === Number(personId));
  if (person) {
    person.meals[mealType] = isSelected;
  }

  updateDayTotalsView(lastData);
  triggerAutoSave();
}

function batchToggleMeal(mealType, attendAll) {
  if (lastData.closed) {
    showToast("This day is locked for edits");
    return;
  }

  for (const person of lastData.grid) {
    person.meals[mealType] = attendAll;
  }

  // Update UI tiles for this meal
  const tiles = gridEl.querySelectorAll(`.roommate-tile[data-meal-type="${mealType}"]`);
  tiles.forEach((t) => {
    t.classList.toggle("selected", attendAll);
  });

  updateDayTotalsView(lastData);
  triggerAutoSave();
  showToast(attendAll ? `All marked for ${MEAL_LABELS[mealType]}` : `All unmarked for ${MEAL_LABELS[mealType]}`);
}

function updateDayTotalsView(data) {
  let grandTotal = 0;
  let totalAttendedMeals = 0;
  const personAmounts = [];

  for (const person of data.grid) {
    let personTotal = 0;
    for (const m of MEAL_TYPES) {
      if (person.meals[m]) {
        personTotal += data.mealCost[m];
        totalAttendedMeals++;
      }
    }
    grandTotal += personTotal;
    personAmounts.push({
      personId: person.personId,
      name: person.name,
      total: personTotal,
    });
  }

  dayTotalEl.textContent = `₹${grandTotal}`;
  dayMealCountEl.textContent = `${totalAttendedMeals} meals attended`;

  // Render per-person day split chips
  dayPersonTotalsEl.innerHTML = "";
  for (const p of personAmounts) {
    const chip = document.createElement("div");
    chip.className = `day-person-chip ${p.total > 0 ? "active-cost" : ""}`;
    chip.innerHTML = `
      <span class="name">${p.name}</span>
      <span class="cost">₹${p.total}</span>
    `;
    dayPersonTotalsEl.appendChild(chip);
  }
}

function triggerAutoSave() {
  setSyncStatus("syncing");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    const date = dayPicker.value;
    try {
      const res = await fetch(`/api/meals?action=day`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, grid: lastData.grid }),
      });
      if (res.ok) {
        lastData = await res.json();
        setSyncStatus("synced");
      } else {
        const payload = await res.json().catch(() => ({}));
        if (payload.error === "date closed") {
          showToast("Edits blocked: this day is closed");
          refreshDay();
        } else {
          setSyncStatus("error");
          showToast("Sync failed, check connection");
        }
      }
    } catch (err) {
      console.error(err);
      setSyncStatus("error");
      showToast("Sync failed, check connection");
    }
  }, 400);
}

async function refreshDay() {
  await loadDay(dayPicker.value);
}

// Lock / Reopen Day
closeDayBtn.addEventListener("click", async () => {
  const willClose = !lastData.closed;
  closeDayBtn.disabled = true;
  setSyncStatus("syncing");

  try {
    const date = dayPicker.value;
    const res = await fetch(`/api/meals?action=close`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, closed: willClose }),
    });
    if (res.ok) {
      lastData = await res.json();
      renderGrid(lastData);
      setSyncStatus("synced");
      showToast(willClose ? "🔒 Day closed & locked" : "🔓 Day reopened for edits");
    } else {
      showToast("Unable to update day status");
      setSyncStatus("error");
      closeDayBtn.disabled = false;
    }
  } catch (err) {
    console.error(err);
    showToast("Error updating day status");
    setSyncStatus("error");
    closeDayBtn.disabled = false;
  }
});

// =======================================
// SUMMARY & BILLING LOGIC
// =======================================

function getMonthRange(offset = 0) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + offset;
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  return [start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)];
}

function getWeekRange() {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 is Sun
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const start = new Date(now);
  start.setDate(now.getDate() + diffToMonday);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return [start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)];
}

// Preset filter buttons
document.querySelectorAll(".preset-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".preset-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const preset = btn.dataset.preset;

    if (preset === "this-month") {
      customDateRow.classList.add("hidden");
      const [s, e] = getMonthRange(0);
      rangeStart.value = s;
      rangeEnd.value = e;
      periodLabel.textContent = "This Month";
      loadSummary();
    } else if (preset === "last-month") {
      customDateRow.classList.add("hidden");
      const [s, e] = getMonthRange(-1);
      rangeStart.value = s;
      rangeEnd.value = e;
      periodLabel.textContent = "Last Month";
      loadSummary();
    } else if (preset === "this-week") {
      customDateRow.classList.add("hidden");
      const [s, e] = getWeekRange();
      rangeStart.value = s;
      rangeEnd.value = e;
      periodLabel.textContent = "This Week";
      loadSummary();
    } else if (preset === "custom") {
      customDateRow.classList.remove("hidden");
      periodLabel.textContent = "Custom Range";
    }
  });
});

applyRangeBtn.addEventListener("click", () => {
  if (rangeStart.value && rangeEnd.value) {
    periodLabel.textContent = `${rangeStart.value} to ${rangeEnd.value}`;
    loadSummary();
  }
});

async function loadSummary() {
  summaryCard.innerHTML = `<div style="text-align:center; padding: 24px; color: var(--ink-secondary);">Calculating room bills…</div>`;
  lastSettlementCard.innerHTML = `<div style="text-align:center; padding: 14px; color: var(--ink-secondary);">Checking last cleared bill…</div>`;

  try {
    const res = await fetch(`/api/meals?action=summary&start=${rangeStart.value}&end=${rangeEnd.value}`);
    const data = await res.json();
    currentSummaryData = data;
    renderSummary(data);
  } catch (err) {
    console.error(err);
    showToast("Failed to load summary");
    summaryCard.innerHTML = `<div style="text-align:center; padding: 16px; color: var(--danger);">Failed to load summary data</div>`;
  }
}

function renderSummary(data) {
  const { people, grandTotal, totalMealsCount, unbilledGrandTotal, lastSettlement } = data;

  // 1. Render Last Cleared Bill
  renderLastSettlement(lastSettlement);

  // 2. Metrics Bar
  grandTotalEl.textContent = `₹${grandTotal.toLocaleString("en-IN")}`;
  totalMealsStatEl.textContent = totalMealsCount || 0;
  const avg = people.length > 0 ? Math.round(grandTotal / people.length) : 0;
  avgPerPersonStatEl.textContent = `₹${avg.toLocaleString("en-IN")}`;
  unbilledStatEl.textContent = `₹${(unbilledGrandTotal || 0).toLocaleString("en-IN")}`;

  // 3. Proportional Split Bar
  splitBarEl.innerHTML = "";
  if (grandTotal > 0) {
    for (const p of people) {
      if (p.total > 0) {
        const meta = getPersonMeta(p.name);
        const seg = document.createElement("div");
        seg.className = `split-bar-segment ${meta.colorClass}`;
        const pct = ((p.total / grandTotal) * 100).toFixed(1);
        seg.style.width = `${pct}%`;
        seg.title = `${p.name}: ₹${p.total} (${pct}%)`;
        splitBarEl.appendChild(seg);
      }
    }
  }

  // 4. Detailed Per-Person Split Cards
  summaryCard.innerHTML = "";
  for (const p of people) {
    const meta = getPersonMeta(p.name);
    const c = p.counts || { bf: 0, lunch: 0, dinner: 0 };
    const totalMeals = (c.bf || 0) + (c.lunch || 0) + (c.dinner || 0);
    const pct = p.percentage || 0;

    const card = document.createElement("div");
    card.className = "person-split-card";
    card.innerHTML = `
      <div class="split-card-top">
        <div class="user-identity">
          <div class="avatar-circle ${meta.colorClass}">${meta.initial}</div>
          <div class="user-name-box">
            <span class="name">${p.name}</span>
            <span class="share-tag">${pct}% of room bill</span>
          </div>
        </div>
        <div class="user-total-box">
          <span class="amount">₹${p.total.toLocaleString("en-IN")}</span>
          <span class="total-meals">${totalMeals} meals</span>
        </div>
      </div>
      <div class="meal-sub-breakdown">
        <div class="sub-pill">🌅 Bf: <strong>${c.bf || 0}</strong> (₹${(c.bf || 0) * data.mealCost.bf})</div>
        <div class="sub-pill">☀️ Lunch: <strong>${c.lunch || 0}</strong> (₹${(c.lunch || 0) * data.mealCost.lunch})</div>
        <div class="sub-pill">🌙 Dinner: <strong>${c.dinner || 0}</strong> (₹${(c.dinner || 0) * data.mealCost.dinner})</div>
      </div>
    `;
    summaryCard.appendChild(card);
  }
}

function renderLastSettlement(settlement) {
  if (!settlement) {
    lastSettlementCard.innerHTML = `
      <div class="settlement-empty-card">
        <strong style="color: var(--ink-primary);">No Cleared Bills Yet</strong>
        <p>When you settle up with the room or cook, click "Clear & Settle Bill" to record the clearance.</p>
      </div>
    `;
    return;
  }

  const items = settlement.items || [];
  const settledDateStr = settlement.settledAt
    ? new Date(settlement.settledAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "";

  let splitChipsHtml = "";
  for (const it of items) {
    splitChipsHtml += `
      <div class="cleared-person-chip">
        <span class="name">${it.personName}</span>
        <span class="amt">₹${it.amount.toLocaleString("en-IN")}</span>
      </div>
    `;
  }

  lastSettlementCard.innerHTML = `
    <div class="settlement-hero-header">
      <div class="cleared-badge">
        <span>✓</span> LAST BILL CLEARED
      </div>
      <span class="settled-date">Cleared on ${settledDateStr}</span>
    </div>
    <div class="settlement-hero-body">
      <div>
        <span class="settlement-period">${settlement.startDate} to ${settlement.endDate}</span>
        <span class="settlement-period-sub">${settlement.notes ? `Note: ${settlement.notes}` : "All dues settled"}</span>
      </div>
      <div class="settlement-amount">₹${settlement.totalAmount.toLocaleString("en-IN")}</div>
    </div>
    <div class="settlement-split-chips">
      ${splitChipsHtml}
    </div>
  `;
}

// WhatsApp Share Formatter
shareWhatsappBtn.addEventListener("click", () => {
  if (!currentSummaryData) {
    showToast("Please wait for summary to load");
    return;
  }

  const { people, grandTotal, start, end, totalMealsCount, lastSettlement } = currentSummaryData;

  let text = `🍽️ *Room Meal Bill Summary*\n`;
  text += `📅 Period: ${start} to ${end}\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `*Total Room Bill:* ₹${grandTotal.toLocaleString("en-IN")} (${totalMealsCount || 0} meals)\n\n`;
  text += `*Split by Roommate:*\n`;

  for (const p of people) {
    const c = p.counts || {};
    text += `• *${p.name}:* ₹${p.total.toLocaleString("en-IN")} (${p.percentage}%)\n`;
    text += `   ↳ ${p.totalMeals} meals (Bf: ${c.bf || 0}, Lunch: ${c.lunch || 0}, Dinner: ${c.dinner || 0})\n`;
  }

  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  if (lastSettlement) {
    text += `✓ *Last Cleared Bill:* ₹${lastSettlement.totalAmount.toLocaleString("en-IN")} (${lastSettlement.startDate} to ${lastSettlement.endDate})\n`;
  } else {
    text += `ℹ️ *Last Cleared Bill:* None recorded yet\n`;
  }

  navigator.clipboard.writeText(text).then(
    () => {
      showToast("📋 Copied summary for WhatsApp!");
    },
    () => {
      showToast("Could not copy to clipboard");
    },
  );
});

// Settlement Modal & Actions
openSettleModalBtn.addEventListener("click", () => {
  if (!currentSummaryData) return;

  const { start, end, grandTotal, people } = currentSummaryData;
  modalDateRange.textContent = `${start} to ${end}`;
  modalTotalAmount.textContent = `₹${grandTotal.toLocaleString("en-IN")}`;

  modalSplitPreview.innerHTML = "";
  for (const p of people) {
    const item = document.createElement("div");
    item.className = "modal-split-item";
    item.innerHTML = `<span>${p.name}</span><strong>₹${p.total}</strong>`;
    modalSplitPreview.appendChild(item);
  }

  settleNotesInput.value = "";
  settledByInput.value = "";
  settleModal.classList.remove("hidden");
});

function closeSettleModal() {
  settleModal.classList.add("hidden");
}

closeModalBtn.addEventListener("click", closeSettleModal);
cancelSettleBtn.addEventListener("click", closeSettleModal);
settleModal.addEventListener("click", (e) => {
  if (e.target === settleModal) closeSettleModal();
});

confirmSettleBtn.addEventListener("click", async () => {
  if (!currentSummaryData) return;

  confirmSettleBtn.disabled = true;
  confirmSettleBtn.textContent = "Clearing Bill…";

  try {
    const res = await fetch(`/api/meals?action=settle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startDate: currentSummaryData.start,
        endDate: currentSummaryData.end,
        notes: settleNotesInput.value.trim() || undefined,
        settledBy: settledByInput.value.trim() || undefined,
      }),
    });

    if (res.ok) {
      showToast("🎉 Bill cleared & recorded successfully!");
      closeSettleModal();
      await loadSummary();
      // If today is inside the cleared range, refresh today's view too
      if (dayPicker.value >= currentSummaryData.start && dayPicker.value <= currentSummaryData.end) {
        await refreshDay();
      }
    } else {
      showToast("Failed to record settlement");
    }
  } catch (err) {
    console.error(err);
    showToast("Error clearing bill");
  } finally {
    confirmSettleBtn.disabled = false;
    confirmSettleBtn.textContent = "Confirm & Clear Bill";
  }
});

// History Toggle
historyToggleBtn.addEventListener("click", async () => {
  const isHidden = historyContent.classList.toggle("hidden");
  historyArrow.textContent = isHidden ? "▼" : "▲";

  if (!isHidden) {
    historyList.innerHTML = `<div style="text-align:center; padding: 12px; color: var(--ink-secondary);">Loading history…</div>`;
    try {
      const res = await fetch(`/api/meals?action=settlements`);
      const { settlements } = await res.json();
      renderHistory(settlements);
    } catch (err) {
      console.error(err);
      historyList.innerHTML = `<div style="color: var(--danger); font-size: 0.8rem;">Failed to load history</div>`;
    }
  }
});

function renderHistory(settlements) {
  if (!settlements || settlements.length === 0) {
    historyList.innerHTML = `<div style="color: var(--ink-secondary); font-size: 0.8rem; padding: 8px 0;">No past clearances found.</div>`;
    return;
  }

  historyList.innerHTML = "";
  for (const s of settlements) {
    const el = document.createElement("div");
    el.className = "history-item";
    const dateStr = s.settledAt ? new Date(s.settledAt).toLocaleDateString() : "";
    const items = s.items || [];
    const splitsText = items.map((it) => `${it.personName}: ₹${it.amount}`).join(" · ");

    el.innerHTML = `
      <div class="history-item-header">
        <span>${s.startDate} – ${s.endDate}</span>
        <strong style="color: var(--success);">₹${s.totalAmount.toLocaleString("en-IN")}</strong>
      </div>
      <div class="history-item-sub">
        Cleared on ${dateStr}${s.notes ? ` · Note: ${s.notes}` : ""}
      </div>
      <div class="history-item-sub" style="margin-top: 2px;">
        ${splitsText}
      </div>
    `;
    historyList.appendChild(el);
  }
}

// Tab Switching
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => {
      b.classList.remove("active");
      b.setAttribute("aria-selected", "false");
    });
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));

    btn.classList.add("active");
    btn.setAttribute("aria-selected", "true");
    const tabName = btn.dataset.tab;
    document.getElementById(`tab-${tabName}`).classList.add("active");

    if (tabName === "summary") {
      loadSummary();
    } else if (tabName === "sheet") {
      loadDailySheet();
    }
  });
});

// =======================================
// DAILY SHEET (SUMMARY WITH INITIALS) LOGIC
// =======================================

// Preset filter buttons for Daily Sheet
document.querySelectorAll(".sheet-preset-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".sheet-preset-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const preset = btn.dataset.preset;

    if (preset === "this-month") {
      sheetCustomDateRow.classList.add("hidden");
      const [s, e] = getMonthRange(0);
      sheetRangeStart.value = s;
      sheetRangeEnd.value = e;
      sheetPeriodLabel.textContent = "This Month";
      loadDailySheet();
    } else if (preset === "last-month") {
      sheetCustomDateRow.classList.add("hidden");
      const [s, e] = getMonthRange(-1);
      sheetRangeStart.value = s;
      sheetRangeEnd.value = e;
      sheetPeriodLabel.textContent = "Last Month";
      loadDailySheet();
    } else if (preset === "this-week") {
      sheetCustomDateRow.classList.add("hidden");
      const [s, e] = getWeekRange();
      sheetRangeStart.value = s;
      sheetRangeEnd.value = e;
      sheetPeriodLabel.textContent = "This Week";
      loadDailySheet();
    } else if (preset === "custom") {
      sheetCustomDateRow.classList.remove("hidden");
      sheetPeriodLabel.textContent = "Custom Range";
    }
  });
});

sheetApplyRangeBtn.addEventListener("click", () => {
  if (sheetRangeStart.value && sheetRangeEnd.value) {
    sheetPeriodLabel.textContent = `${sheetRangeStart.value} to ${sheetRangeEnd.value}`;
    loadDailySheet();
  }
});

// Roommate filter pills
sheetRoommateFilterGroup.querySelectorAll(".roommate-filter-pill").forEach((pill) => {
  pill.addEventListener("click", () => {
    sheetRoommateFilterGroup.querySelectorAll(".roommate-filter-pill").forEach((p) => p.classList.remove("active"));
    pill.classList.add("active");
    activeRoommateFilter = pill.dataset.filter;
    applyRoommateFilter();
  });
});

function applyRoommateFilter() {
  const cards = dailySheetList.querySelectorAll(".sheet-day-card");
  let visibleCount = 0;

  cards.forEach((card) => {
    const attendeesStr = card.dataset.attendees || "";
    const attendees = attendeesStr.split(",").filter(Boolean);

    if (activeRoommateFilter === "all") {
      card.classList.remove("filtered-out");
      visibleCount++;
      card.querySelectorAll(".initial-badge").forEach((b) => {
        b.classList.remove("dimmed", "highlighted");
      });
    } else {
      const hasRoommate = attendees.includes(activeRoommateFilter);
      if (hasRoommate) {
        card.classList.remove("filtered-out");
        visibleCount++;
        card.querySelectorAll(".initial-badge").forEach((b) => {
          if (b.classList.contains(activeRoommateFilter)) {
            b.classList.remove("dimmed");
            b.classList.add("highlighted");
          } else {
            b.classList.add("dimmed");
            b.classList.remove("highlighted");
          }
        });
      } else {
        card.classList.add("filtered-out");
      }
    }
  });

  sheetDaysBadge.textContent = activeRoommateFilter === "all"
    ? `${visibleCount} days recorded`
    : `${visibleCount} days attended by ${activeRoommateFilter.charAt(0).toUpperCase() + activeRoommateFilter.slice(1)}`;
}

async function loadDailySheet() {
  dailySheetList.innerHTML = `<div style="text-align:center; padding: 24px; color: var(--ink-secondary);">Loading daily attendance…</div>`;

  try {
    const res = await fetch(`/api/meals?action=summary&start=${sheetRangeStart.value}&end=${sheetRangeEnd.value}`);
    const data = await res.json();
    currentSheetData = data;
    renderDailySheet(data);
  } catch (err) {
    console.error(err);
    showToast("Failed to load daily sheet");
    dailySheetList.innerHTML = `<div style="text-align:center; padding: 16px; color: var(--danger);">Failed to load daily attendance data</div>`;
  }
}

function renderDailySheet(data) {
  const { days = [], grandTotal = 0, totalMealsCount = 0, mealCost = { bf: 70, lunch: 100, dinner: 70 } } = data;

  // 1. Update Metrics Banner
  sheetDaysCount.textContent = `${days.length} Days`;
  sheetTotalMealsStat.textContent = totalMealsCount || 0;
  sheetTotalCostStat.textContent = `₹${grandTotal.toLocaleString("en-IN")}`;
  sheetDaysBadge.textContent = `${days.length} days recorded`;

  // 2. Empty state check
  if (!days || days.length === 0) {
    dailySheetList.innerHTML = `
      <div class="sheet-empty-state">
        <span class="empty-icon">📭</span>
        <strong style="color: var(--ink-primary); font-size: 0.95rem;">No Recorded Meals in this Range</strong>
        <p>There are no saved meal entries between ${sheetRangeStart.value} and ${sheetRangeEnd.value}.</p>
      </div>
    `;
    return;
  }

  // 3. Render Daily Cards
  dailySheetList.innerHTML = "";

  for (const day of days) {
    const card = document.createElement("div");
    card.className = "sheet-day-card";

    // Gather unique attendees for filtering
    const dayAttendees = new Set();
    for (const m of MEAL_TYPES) {
      const attendees = (day.meals && day.meals[m]) || [];
      for (const a of attendees) {
        const meta = getPersonMeta(a.name);
        dayAttendees.add(meta.key);
      }
    }
    card.dataset.attendees = Array.from(dayAttendees).join(",");

    const prettyDate = formatDatePretty(day.date);

    function renderMealInitialBadges(mealType) {
      const attendees = (day.meals && day.meals[mealType]) || [];
      if (attendees.length === 0) {
        return `<span class="sheet-empty-attendees">—</span>`;
      }
      return attendees
        .map((a) => {
          const meta = getPersonMeta(a.name);
          return `<span class="initial-badge ${meta.colorClass}" title="${a.name} (${MEAL_LABELS[mealType]})">${meta.initial}</span>`;
        })
        .join("");
    }

    card.innerHTML = `
      <div class="sheet-day-header">
        <div class="sheet-day-date-group">
          <span class="sheet-day-date">${prettyDate}</span>
          <span class="sheet-day-status ${day.closed ? "locked" : "open"}">${day.closed ? "🔒 Closed" : "🟢 Open"}</span>
        </div>
        <div class="sheet-day-right">
          <span class="sheet-day-total">₹${(day.dayTotal || 0).toLocaleString("en-IN")}</span>
        </div>
      </div>

      <div class="sheet-day-meals-row">
        <div class="sheet-meal-box">
          <div class="sheet-meal-label">
            <span>🌅 Bf</span>
            <span>₹${mealCost.bf}</span>
          </div>
          <div class="sheet-meal-initials">
            ${renderMealInitialBadges("bf")}
          </div>
        </div>

        <div class="sheet-meal-box">
          <div class="sheet-meal-label">
            <span>☀️ Lunch</span>
            <span>₹${mealCost.lunch}</span>
          </div>
          <div class="sheet-meal-initials">
            ${renderMealInitialBadges("lunch")}
          </div>
        </div>

        <div class="sheet-meal-box">
          <div class="sheet-meal-label">
            <span>🌙 Dinner</span>
            <span>₹${mealCost.dinner}</span>
          </div>
          <div class="sheet-meal-initials">
            ${renderMealInitialBadges("dinner")}
          </div>
        </div>
      </div>

      <div class="sheet-day-footer">
        <span class="sheet-day-meal-count">${day.totalMeals || 0} meals attended</span>
        <button class="sheet-jump-btn" data-date="${day.date}" title="Open this day in Day Log">
          <span>View / Edit</span> <span>›</span>
        </button>
      </div>
    `;

    dailySheetList.appendChild(card);
  }

  // Attach Jump button listeners
  dailySheetList.querySelectorAll(".sheet-jump-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetDate = btn.dataset.date;
      if (!targetDate) return;

      // Switch tab to 'today'
      document.querySelectorAll(".tab-btn").forEach((b) => {
        const isTodayTab = b.dataset.tab === "today";
        b.classList.toggle("active", isTodayTab);
        b.setAttribute("aria-selected", isTodayTab ? "true" : "false");
      });
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
      document.getElementById("tab-today").classList.add("active");

      // Load that specific date
      updateDateDisplay(targetDate);
      loadDay(targetDate);
      window.scrollTo({ top: 0, behavior: "smooth" });
      showToast(`Navigated to ${targetDate}`);
    });
  });

  // Apply active roommate filter
  applyRoommateFilter();
}

// App Initialization
(function init() {
  initTheme();
  const t = todayStr();
  updateDateDisplay(t);
  const [s, e] = getMonthRange(0);
  rangeStart.value = s;
  rangeEnd.value = e;
  sheetRangeStart.value = s;
  sheetRangeEnd.value = e;
  refreshDay();
})();
