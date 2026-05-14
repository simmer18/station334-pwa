const state = {
  units: ["P334", "FB334"],
  selected: "P334",
  calls: [],
};

const tabs = document.getElementById("tabs");
const daysEl = document.getElementById("days");
const statusEl = document.getElementById("status");
const unitStat = document.getElementById("unitStat");
const todayStat = document.getElementById("todayStat");
const weekStat = document.getElementById("weekStat");
const unitInput = document.getElementById("unitInput");
const daysSelect = document.getElementById("daysSelect");

function normalizeUnit(u){ return String(u||"").trim().toUpperCase(); }

function renderTabs(){
  tabs.innerHTML = "";
  state.units.forEach(unit => {
    const b = document.createElement("button");
    b.className = "tab" + (unit === state.selected ? " active" : "");
    b.textContent = unit;
    b.onclick = () => { state.selected = unit; loadCalls(); renderTabs(); };
    tabs.appendChild(b);
  });
}

function dateKey(d){ return d.toISOString().slice(0,10); }

function timeToMinutes(time){
  const m = String(time || "").match(/^(\\d{1,2}):(\\d{2})/);
  if (!m) return -1;
  return Number(m[1]) * 60 + Number(m[2]);
}

function shiftDateKey(date, time){
  const key = date || dateKey(new Date());
  const minutes = timeToMinutes(time);
  const d = new Date(key + "T12:00:00");
  if (minutes >= 0 && minutes < 7 * 60) d.setDate(d.getDate() - 1);
  return dateKey(d);
}

function currentShiftKey(){
  const now = new Date();
  if (now.getHours() < 7) now.setDate(now.getDate() - 1);
  return dateKey(now);
}

function niceDate(key){
  const d = new Date(key + "T12:00:00");
  return d.toLocaleDateString(undefined,{month:"long",day:"numeric",year:"numeric"}) + (key === currentShiftKey() ? " (Current Shift)" : "");
}

function groupByDate(calls){
  const groups = {};
  calls.forEach(c => {
    const k = shiftDateKey(c.date, c.time);
    groups[k] ??= [];
    groups[k].push(c);
  });
  return groups;
}

function render(){
  unitStat.textContent = state.selected;
  const today = currentShiftKey();
  todayStat.textContent = state.calls.filter(c => shiftDateKey(c.date, c.time) === today).length;
  weekStat.textContent = state.calls.length;

  const days = Number(daysSelect.value || 3);
  const keys = Array.from({length:days},(_,i)=>{
    const d = new Date(today + "T12:00:00"); d.setDate(d.getDate()-i); return dateKey(d);
  });
  const groups = groupByDate(state.calls);
  daysEl.innerHTML = "";

  keys.forEach(key => {
    const list = groups[key] || [];
    const box = document.createElement("section");
    box.className = "day";
    box.innerHTML = `<div class="dayhead"><span>▣ ${niceDate(key)}</span><span class="badge">${list.length}</span></div>`;
    if (!list.length) {
      box.innerHTML += `<div class="empty">No calls for this day.</div>`;
    } else {
      list.forEach(c => {
        const row = document.createElement("div");
        row.className = "call";
        row.innerHTML = `
          <div class="time">${c.time || ""}</div>
          <div>
            <div class="type">${c.type || "Call"}</div>
            <div class="addr">${c.address || c.location || ""}</div>
          </div>
          <div class="units">${(c.units || [state.selected]).map(u=>`<span class="unitpill">${u}</span>`).join("")}</div>
        `;
        box.appendChild(row);
      });
    }
    daysEl.appendChild(box);
  });
}

async function loadCalls(){
  statusEl.textContent = `Loading ${state.selected}...`;
  try {
    const days = daysSelect.value || 3;
    const res = await fetch(`/api/calls?truck=${encodeURIComponent(state.selected.toLowerCase())}&days=${days}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    state.calls = Array.isArray(data.calls) ? data.calls : [];
    statusEl.textContent = data.source === "live" 
      ? `Live data loaded. Last updated ${new Date().toLocaleTimeString()}.`
      : `Loaded demo/parsed data. ${data.note || ""}`;
  } catch (e) {
    state.calls = [];
    statusEl.textContent = "Could not load live data. The proxy returned an error on this deploy.";
  }
  render();
}

document.getElementById("addBtn").onclick = () => {
  const u = normalizeUnit(unitInput.value);
  if (!u) return;
  if (!state.units.includes(u)) state.units.push(u);
  state.selected = u;
  unitInput.value = "";
  renderTabs();
  loadCalls();
};
document.getElementById("refreshBtn").onclick = loadCalls;
daysSelect.onchange = loadCalls;

if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(()=>{});
renderTabs();
loadCalls();
