import { endOfDay, startOfDay } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

const TZ = "Europe/Copenhagen";

/** UTC instants for the start and end of the calendar day in Copenhagen. */
export function copenhagenDayRangeUTC(reference: Date = new Date()): {
  start: Date;
  end: Date;
} {
  const zoned = toZonedTime(reference, TZ);
  const startLocal = startOfDay(zoned);
  const endLocal = endOfDay(zoned);
  return {
    start: fromZonedTime(startLocal, TZ),
    end: fromZonedTime(endLocal, TZ),
  };
}
