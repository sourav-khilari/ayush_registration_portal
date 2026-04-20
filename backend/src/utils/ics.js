function pad2(n) {
  return String(n).padStart(2, "0");
}

function toICSDateUTC(d) {
  const dt = new Date(d);
  return (
    dt.getUTCFullYear() +
    pad2(dt.getUTCMonth() + 1) +
    pad2(dt.getUTCDate()) +
    "T" +
    pad2(dt.getUTCHours()) +
    pad2(dt.getUTCMinutes()) +
    pad2(dt.getUTCSeconds()) +
    "Z"
  );
}

function esc(s) {
  return String(s || "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export function buildICSInvite({
  uid,
  start,
  end,
  summary,
  description,
  organizerEmail,
  organizerName,
  attendees = [], // [{ email, name }]
  location,
}) {
  const lines = [];
  lines.push("BEGIN:VCALENDAR");
  lines.push("VERSION:2.0");
  lines.push("PRODID:-//AYUSH Portal//Meeting//EN");
  lines.push("CALSCALE:GREGORIAN");
  lines.push("METHOD:REQUEST");
  lines.push("BEGIN:VEVENT");
  lines.push(`UID:${esc(uid)}`);
  lines.push(`DTSTAMP:${toICSDateUTC(new Date())}`);
  lines.push(`DTSTART:${toICSDateUTC(start)}`);
  lines.push(`DTEND:${toICSDateUTC(end)}`);
  lines.push(`SUMMARY:${esc(summary)}`);
  if (description) lines.push(`DESCRIPTION:${esc(description)}`);
  if (location) lines.push(`LOCATION:${esc(location)}`);
  if (organizerEmail) {
    const cn = organizerName ? `;CN=${esc(organizerName)}` : "";
    lines.push(`ORGANIZER${cn}:MAILTO:${esc(organizerEmail)}`);
  }
  for (const a of attendees) {
    if (!a?.email) continue;
    const cn = a.name ? `;CN=${esc(a.name)}` : "";
    lines.push(`ATTENDEE${cn};RSVP=TRUE:MAILTO:${esc(a.email)}`);
  }
  lines.push("END:VEVENT");
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

