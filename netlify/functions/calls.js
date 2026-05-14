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


function shiftDateKey(date, time) {
  const m = String(time || "").trim().match(/^([0-9]{1,2}):([0-9]{2})/);
  const minutes = m ? Number(m[1]) * 60 + Number(m[2]) : -1;
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
      time: dt[2],
      type: incidentType,
      address: [primeStreet, crossStreet].filter(Boolean).join(" / "),
      alarmLevel: alarmLevel,
      area: area,
      units: units
    });
  }

  if (!calls.length) {
    const text = clean(html);
    const dateTimeRegex = /(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2})(?::\d{2})?/g;
    const matches = Array.from(text.matchAll(dateTimeRegex));

    for (let i = 0; i < matches.length; i++) {
      const current = matches[i];
      const next = matches[i + 1];
      const start = current.index;
      const end = next ? next.index : text.length;
      const chunk = text.slice(start, end);

      const units = parseUnits(chunk);
      const typeMatch = chunk.match(/\b(MEDICAL|FIRE ALARM|UNWANTED FIRE ALARM|ODOR|ODOUR|RESCUE|HAZARD|ALARM|FIRE|INVESTIGATION|ASSISTANCE|ELEVATOR|WATER|MARINE)[A-Z\s\/()\-]*/i);
      const incidentType = typeMatch ? typeMatch[0].trim() : "Call";

      calls.push({
        date: current[1],
        time: current[2],
        type: incidentType,
        address: "",
        alarmLevel: "",
        area: "",
        units: units.length ? units : [String(truck || "").toUpperCase()]
      });
    }
  }

  return calls;
}

exports.handler = async function(event) {
  const params = event.queryStringParameters || {};
  const truck = String(params.truck || "p334").toLowerCase().replace(/[^a-z0-9]/g, "");
  const days = Math.min(Number(params.days || 3), 14);
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

    calls = calls.map(function(call) {
      call.shiftDate = shiftDateKey(call.date, call.time);
      return call;
    }).filter(function(call) {
      return !call.shiftDate || allowed.has(call.shiftDate) || allowed.has(call.date);
    }).slice(0, 250);

    return {
      statusCode: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store"
      },
      body: JSON.stringify({
        source: "live",
        truck: truck.toUpperCase(),
        days: days,
        calls: calls
      })
    };
  } catch (error) {
    return {
      statusCode: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store"
      },
      body: JSON.stringify({
        source: "error",
        note: String(error && error.message ? error.message : error),
        calls: []
      })
    };
  }
};
