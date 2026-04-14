import ICAL from "ical.js";

export interface ParsedIcsEvent {
  externalId: string;
  title: string;
  start: Date;
  end: Date | null;
  location: string | null;
  description: string | null;
}

function toDate(val: unknown): Date | null {
  if (val == null) return null;
  if (
    typeof val === "object" &&
    val !== null &&
    "toJSDate" in val &&
    typeof (val as { toJSDate: () => Date }).toJSDate === "function"
  ) {
    return (val as ICAL.Time).toJSDate();
  }
  return null;
}

function jcalToRootComponent(parsed: unknown): ICAL.Component {
  if (Array.isArray(parsed)) {
    if (parsed.length === 0) {
      throw new Error("Tom kalenderfil.");
    }
    return new ICAL.Component(parsed[0] as string | any[]);
  }
  return new ICAL.Component(parsed as string | any[]);
}

export function parseIcsContent(icsText: string): ParsedIcsEvent[] {
  try {
    const trimmed = icsText.trim();
    if (!trimmed) {
      throw new Error("Filen er tom.");
    }

    const parsed = ICAL.parse(trimmed);
    const root = jcalToRootComponent(parsed);
    const vevents = root.getAllSubcomponents("vevent");

    const min = new Date();
    min.setDate(min.getDate() - 30);
    min.setHours(0, 0, 0, 0);

    const max = new Date();
    max.setDate(max.getDate() + 180);
    max.setHours(23, 59, 59, 999);

    const out: ParsedIcsEvent[] = [];

    for (const vevent of vevents) {
      const uidRaw = vevent.getFirstPropertyValue("uid");
      const uid = uidRaw != null ? String(uidRaw).trim() : "";
      const summaryRaw = vevent.getFirstPropertyValue("summary");
      const title = summaryRaw != null ? String(summaryRaw).trim() : "";
      if (!uid || !title) continue;

      const dtstart = toDate(vevent.getFirstPropertyValue("dtstart"));
      if (!dtstart) continue;

      const dtend = toDate(vevent.getFirstPropertyValue("dtend"));

      const locRaw = vevent.getFirstPropertyValue("location");
      const location = locRaw != null ? String(locRaw).trim() : null;

      const descRaw = vevent.getFirstPropertyValue("description");
      const description = descRaw != null ? String(descRaw).trim() : null;

      if (dtstart < min || dtstart > max) continue;

      out.push({
        externalId: uid,
        title,
        start: dtstart,
        end: dtend,
        location: location || null,
        description: description || null,
      });
    }

    return out;
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("Tom")) throw e;
    if (e instanceof Error && e.message.startsWith("Filen")) throw e;
    throw new Error(
      e instanceof Error
        ? `Ugyldig ICS-fil: ${e.message}`
        : "Ugyldig ICS-fil — kunne ikke læse indholdet.",
    );
  }
}
