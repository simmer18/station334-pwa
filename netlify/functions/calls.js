\
function clean(s){
  return String(s || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/t[dh]>/gi, "|")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function todayKey(offset=0){
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return d.toISOString().slice(0,10);
}

function parseUnits(text){
  return Array.from(new Set((String(text).match(/\b[A-Z]{1,4}\d{2,4}[A-Z]?\b/g) || [])));
}

function splitRows(html){
  const rowMatches = String(html).match(/<tr[\s\S]*?<\/tr>/gi) || [];
  return rowMatches.map(row => {
    const cellMatches = row.match(/<t[dh][^>]*>[\s\S]*?<\/t[dh]>/gi) || [];
    return cellMatches.map(clean).filter(Boolean);
  }).filter(r => r.length);
}

function parseCalls(html, truck){
  const rows = splitRows(html);
  const calls = [];

  for (const cells of rows) {
    const joined = cells.join(" | ");
    const idx = cells.findIndex(c => /^\d{4}-\d{2}-\d{2}\s+\d{1,2}:\d{2}/.test(c));
    if (idx === -1) continue;

    const dt = cells[idx].match(/(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2})/);
    if (!dt) continue;

    // ASC table appears like:
    // PrimeStreet | CrossStreet | DispatchTime | IncidentType | AlarmLevel | Area | DispatchedUnits...
    const primeStreet = cells[0] || "";
    const crossStreet = cells[1] || "";
    const type = cells[idx + 1] || "Call";
    const alarmLevel = cells[idx + 2] || "";
    const area = cells[idx + 3] || "";
    const unitsText = cells.slice(idx + 4).join(" ");
    let units = parseUnits(unitsText);
    if (!units.length) units = parseUnits(joined);
    if (!units.length) units = [truck.toUpperCase()];

    calls.push({
      date: dt[1],
      time: dt[2],
      type,
      address: [primeStreet, crossStreet].filter(Boolean).join(" / "),
      alarmLevel,
      area,
      units
    });
  }

  // Fallback: parse the entire page text around date/time stamps.
  if (!calls.length) {
    const text = clean(html);
    const parts = text.split(/(?=\d{4}-\d{2}-\d{2}\s+\d{1,2}:\d{2})/g);
    for (const part of parts) {
      const dt = part.match(/(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2})/);
      if (!dt) continue;

      const after = part.replace(dt[0], "").trim();
      const units = parseUnits(after);
      const typeMatch = after.match(/\b(MEDICAL|FIRE ALARM|UNWANTED FIRE ALARM|ODOR|ODOUR|RESCUE|HAZARD|ALARM|FIRE|INVESTIGATION|ASSISTANCE|ELEVATOR|WATER|MARINE)[A-Z\s\/()-]*/i);
      const type = typeMatch ? typeMatch[0].trim() : "Call";

      calls.push({
        date: dt[1],
        time: dt[2],
        type,
        address: "",
        alarmLevel: "",
        area: "",
        units: units.length ? units : [truck.toUpperCase()]
      });
    }
  }

  return calls;
}

exports.handler = async (event) => {
  const truck = String(event.queryStringParameters?.truck || "p334").toLowerCase().replace(/[^a-z0-9]/g,"");
  const days = Math.min(Number(event.queryStringParameters?.days || 3), 14);
  const url = `https://asc-group.org/tfs/view.php?truck=${encodeURIComponent(truck)}`;

  try {
    const response = await fetch(url, {
      headers: {
        "user-agent": "Mozilla/5.0 Station334PWA",
        "accept": "text/html,application/xhtml+xml"
      }
    });

    const html = await response.text();
    let calls = parseCalls(html, truck);

    const allowed = new Set(Array.from({length:days},(_,i)=>todayKey(i)));
    calls = calls.filter(c => !c.date || allowed.has(c.date)).slice(0,250);

    return {
      statusCode: 200,
      headers: {"content-type":"application/json","cache-control":"no-store"},
      body: JSON.stringify({source:"live", truck: truck.toUpperCase(), days, calls})
    };
  } catch (err) {
    return {
      statusCode: 200,
      headers: {"content-type":"application/json","cache-control":"no-store"},
      body: JSON.stringify({source:"error", note: String(err.message || err), calls: []})
    };
  }
};
