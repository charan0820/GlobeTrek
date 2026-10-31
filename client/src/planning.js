import { dayKeys } from "../../shared/travel.js";

// These checks explain the draft. The reservation service remains authoritative.
export function planningIssues(draft, records, departures) {
  const issues = [],
    lookup = new Map(records.map((r) => [String(r.id || r._id), r]));
  for (const day of draft.days) {
    const scheduled = [];
    let minutes = 0;
    for (const stop of day.stops) {
      const record = lookup.get(stop.refId);
      minutes += record?.durationMinutes || 0;
      if (stop.kind !== "tour") continue;
      if (!stop.departureId) {
        issues.push({
          code: "UNRESOLVED_TOUR",
          severity: "error",
          message: `${record?.name || "A tour"} on ${day.date} needs a departure.`,
        });
        continue;
      }
      if (departures) {
        const departure = departures.find((d) => d._id === stop.departureId);
        if (
          !departure ||
          departure.date !== day.date ||
          String(departure.tour) !== stop.refId
        )
          issues.push({
            code: "INVALID_DEPARTURE",
            severity: "error",
            message: `Choose a valid departure for ${record?.name || "the tour"} on ${day.date}.`,
          });
        else scheduled.push({ ...departure, name: record?.name || "Tour" });
      }
    }
    scheduled.sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt));
    for (let i = 1; i < scheduled.length; i++)
      if (Date.parse(scheduled[i].startAt) < Date.parse(scheduled[i - 1].endAt))
        issues.push({
          code: "TOUR_OVERLAP",
          severity: "error",
          message: `${scheduled[i - 1].name} and ${scheduled[i].name} overlap on ${day.date}.`,
        });
    if (minutes > 480)
      issues.push({
        code: "LONG_DAY",
        severity: "warning",
        message: `${day.date} includes about ${Math.round((minutes / 60) * 10) / 10} hours of visits before travel or breaks. Consider moving some stops.`,
      });
    if (
      new Set(day.stops.map((s) => lookup.get(s.refId)?.city).filter(Boolean))
        .size > 1
    )
      issues.push({
        code: "MULTIPLE_CITIES",
        severity: "warning",
        message: `${day.date} includes multiple cities. Check transport independently; the route does not establish feasibility.`,
      });
  }
  draft.stays.forEach((stay, index) => {
    try {
      dayKeys(stay.checkIn, stay.checkOut);
      if (stay.checkIn < draft.startDate || stay.checkOut > draft.endDate)
        throw Error();
    } catch {
      issues.push({
        code: "STAY_DATES",
        severity: "error",
        message: `Stay ${index + 1} needs valid nights within your trip dates.`,
      });
    }
    if (
      draft.stays
        .slice(0, index)
        .some((s) => stay.checkIn < s.checkOut && stay.checkOut > s.checkIn)
    )
      issues.push({
        code: "STAY_OVERLAP",
        severity: "error",
        message: `Stay ${index + 1} overlaps another selected stay. Select one property for each night.`,
      });
  });
  return issues;
}
