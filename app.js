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
function niceDate(key){
  const d = new Date(key + "T12:00:00");
  return d.toLocaleDateString(undefined,{month:"long",day:"numeric",year:"numeric"}) + (key === dateKey(new Date()) ? " (Today)" : "");
}
function groupByDate(calls){
  const groups = {};
  calls.forEach(c => {
    const k = c.date || dateKey(new Date());
    groups[k] ??= [];
    groups[k].push(c);
  });
  return groups;
}

function render(){
  unitStat.textContent = state.selected;
  const today = dateKey(new Date());
  todayStat.textContent = state.calls.filter(c => c.date === today).length;
  weekStat.textContent = state.calls.length;

  const days = Number(daysSelect.value || 3);
  const keys = Array.from({length:days},(_,i)=>{
    const d = new Date(); d.setDate(d.getDate()-i); return dateKey(d);
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
