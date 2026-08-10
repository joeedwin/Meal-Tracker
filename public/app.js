const MEAL_LABELS = { bf: "Breakfast", lunch: "Lunch", dinner: "Dinner" };

const dayPicker = document.getElementById("dayPicker");
const gridEl = document.getElementById("grid");
const dayTotalEl = document.getElementById("dayTotal");
const toastEl = document.getElementById("toast");

function todayStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  setTimeout(() => toastEl.classList.remove("show"), 1600);
}

function shiftDate(dateStr, delta) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

let saveTimer = null;

async function loadDay(dateStr) {
  gridEl.innerHTML = "Loading…";
  const res = await fetch(`/api/meals?action=day&date=${dateStr}`);
  const data = await res.json();
  renderGrid(data);
}

function renderGrid(data) {
  const { mealCost, grid } = data;
  const mealTypes = ["bf", "lunch", "dinner"];

  gridEl.innerHTML = "";
  for (const mealType of mealTypes) {
    const block = document.createElement("div");
    block.className = "meal-block";

    const title = document.createElement("div");
    title.className = "meal-title";
    title.innerHTML = `<h3>${MEAL_LABELS[mealType]}</h3><span>₹${mealCost[mealType]} / person</span>`;
    block.appendChild(title);

    for (const row of grid) {
      const label = document.createElement("label");
      label.className = "person-row";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = !!row.meals[mealType];
      checkbox.dataset.personId = row.personId;
      checkbox.dataset.mealType = mealType;
      checkbox.addEventListener("change", onToggle);

      const name = document.createElement("span");
      name.textContent = row.name;

      label.appendChild(checkbox);
      label.appendChild(name);
      block.appendChild(label);
    }

    gridEl.appendChild(block);
  }

  updateDayTotal(data);
}

function currentGridState(data) {
  const checkboxes = gridEl.querySelectorAll("input[type=checkbox]");
  const byPerson = new Map();
  for (const row of data.grid) {
    byPerson.set(row.personId, { personId: row.personId, meals: { ...row.meals } });
  }
  checkboxes.forEach((cb) => {
    const personId = Number(cb.dataset.personId);
    const mealType = cb.dataset.mealType;
    byPerson.get(personId).meals[mealType] = cb.checked;
  });
  return [...byPerson.values()];
}

function updateDayTotal(data) {
  const grid = currentGridState(data);
  let total = 0;
  for (const row of grid) {
    for (const mealType of Object.keys(row.meals)) {
      if (row.meals[mealType]) total += data.mealCost[mealType];
    }
  }
  dayTotalEl.textContent = `₹${total}`;
}

let lastData = null;

async function onToggle() {
  lastData.grid = currentGridState(lastData);
  updateDayTotal(lastData);

  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    const date = dayPicker.value;
    const res = await fetch(`/api/meals?action=day`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, grid: lastData.grid }),
    });
    if (res.ok) {
      lastData = await res.json();
      showToast("Saved & synced");
    } else {
      showToast("Save failed, retrying…");
    }
  }, 400);
}

async function refreshDay() {
  const dateStr = dayPicker.value;
  gridEl.innerHTML = "Loading…";
  const res = await fetch(`/api/meals?action=day&date=${dateStr}`);
  lastData = await res.json();
  renderGrid(lastData);
}

document.getElementById("prevDay").addEventListener("click", () => {
  dayPicker.value = shiftDate(dayPicker.value, -1);
  refreshDay();
});
document.getElementById("nextDay").addEventListener("click", () => {
  dayPicker.value = shiftDate(dayPicker.value, 1);
  refreshDay();
});
document.getElementById("todayBtn").addEventListener("click", () => {
  dayPicker.value = todayStr();
  refreshDay();
});
dayPicker.addEventListener("change", refreshDay);

// Tabs
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");
    if (btn.dataset.tab === "summary") loadSummary();
  });
});

// Summary tab
const rangeStart = document.getElementById("rangeStart");
const rangeEnd = document.getElementById("rangeEnd");
const summaryCard = document.getElementById("summaryCard");

function monthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return [start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)];
}

async function loadSummary() {
  summaryCard.innerHTML = "Loading…";
  const res = await fetch(`/api/meals?action=summary&start=${rangeStart.value}&end=${rangeEnd.value}`);
  const data = await res.json();
  renderSummary(data);
}

function renderSummary(data) {
  summaryCard.innerHTML = "";
  for (const p of data.people) {
    const row = document.createElement("div");
    row.className = "summary-row";
    const c = p.counts || {};
    row.innerHTML = `
      <div>
        <div class="summary-name">${p.name}</div>
        <div class="summary-meta">bf ${c.bf || 0} · lunch ${c.lunch || 0} · dinner ${c.dinner || 0}</div>
      </div>
      <div class="summary-amount">₹${p.total}</div>
    `;
    summaryCard.appendChild(row);
  }
  const totalRow = document.createElement("div");
  totalRow.className = "summary-total";
  totalRow.innerHTML = `<span>Room total</span><span>₹${data.grandTotal}</span>`;
  summaryCard.appendChild(totalRow);
}

document.getElementById("thisMonthBtn").addEventListener("click", () => {
  const [s, e] = monthRange();
  rangeStart.value = s;
  rangeEnd.value = e;
  loadSummary();
});

// Init
(function init() {
  const t = todayStr();
  dayPicker.value = t;
  const [s, e] = monthRange();
  rangeStart.value = s;
  rangeEnd.value = e;
  refreshDay();
})();
