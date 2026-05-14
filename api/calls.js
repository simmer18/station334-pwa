
function clean(value) {
  return String(value || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/t[dh]>/gi, "|")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function todayKey(offset) {
  const d = new Date();
  d.setDate(d.getDate() - (offset || 0));
  return d.toISOString().slice(0, 10);
}

function getShiftDate(date, time) {
  const match = String(time || "").trim().match(/^([0-9]{1,2}):([0-9]{2})/);
  const minutes = match ? Number(match[1]) * 60 + Number(match[2]) : -1;
  const d = new Date(String(date || todayKey(0)) + "T12:00:00");
  if (minutes >= 0 && minutes < 420) d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function parseUnits(text) {
  const matches = String(text || "").match(/\b[A-Z]{1,4}\d{2,4}[A-Z]?\b/g) || [];
  return Array.from(new Set(matches));
}

function splitRows(html) {
  const rowMatches = String(html || "").match(/<tr[\s\S]*?<\/tr>/gi) || [];
  return rowMatches
    .map(function(row) {
      const cellMatches = row.match(/<t[dh][^>]*>[\s\S]*?<\/t[dh]>/gi) || [];
      return cellMatches.map(clean).filter(Boolean);
    })
    .filter(function(row) {
      return row.length > 0;
    });
}

function parseCalls(html, truck) {
  const rows = splitRows(html);
  const calls = [];

  for (const cells of rows) {
    const joined = cells.join(" | ");
    const dispatchIndex = cells.findIndex(function(cell) {
      return /^\d{4}-\d{2}-\d{2}\s+\d{1,2}:\d{2}/.test(cell);
    });

    if (dispatchIndex === -1) continue;

    const dt = cells[dispatchIndex].match(/(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2})/);
    if (!dt) continue;

    const primeStreet = cells[0] || "";
    const crossStreet = cells[1] || "";
    const incidentType = cells[dispatchIndex + 1] || "Call";
    const alarmLevel = cells[dispatchIndex + 2] || "";
    const area = cells[dispatchIndex + 3] || "";
    const unitsText = cells.slice(dispatchIndex + 4).join(" ");

    let units = parseUnits(unitsText);
    if (!units.length) units = parseUnits(joined);
    if (!units.length) units = [String(truck || "").toUpperCase()];

    calls.push({
      date: dt[1],
      rawDate: dt[1],
      shiftDate: getShiftDate(dt[1], dt[2]),
      time: dt[2],
      type: incidentType,
      address: [primeStreet, crossStreet].filter(Boolean).join(" / "),
      alarmLevel: alarmLevel,
      area: area,
      units: units
    });
  }

  return calls.map(function(call) {
    call.rawDate = call.date;
    call.shiftDate = getShiftDate(call.date, call.time);
    call.date = call.shiftDate;
    return call;
  });
}

module.exports = async function handler(req, res) {
  const truck = String((req.query && req.query.truck) || "p334").toLowerCase().replace(/[^a-z0-9]/g, "");
  const days = Math.min(Number((req.query && req.query.days) || 3), 14);
  const url = "https://asc-group.org/tfs/view.php?truck=" + encodeURIComponent(truck);

  try {
    const response = await fetch(url, {
      headers: {
        "user-agent": "Mozilla/5.0 Station334PWA",
        "accept": "text/html,application/xhtml+xml"
      }
    });

    const html = await response.text();
    let calls = parseCalls(html, truck);

    const allowed = new Set(
      Array.from({ length: days }, function(_, index) {
        return todayKey(index);
      })
    );

    calls = calls.filter(function(call) {
      return !call.date || allowed.has(call.date) || allowed.has(call.rawDate);
    }).slice(0, 250);

    res.setHeader("cache-control", "no-store");
    res.status(200).json({
      source: "live",
      platform: "vercel",
      truck: truck.toUpperCase(),
      days: days,
      calls: calls
    });
  } catch (error) {
    res.setHeader("cache-control", "no-store");
    res.status(200).json({
      source: "error",
      platform: "vercel",
      note: String(error && error.message ? error.message : error),
      calls: []
    });
  }
};
