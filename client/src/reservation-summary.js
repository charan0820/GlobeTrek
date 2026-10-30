import { calendarDate } from "../../shared/travel.js";
const dayFormat = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
export function destinationName(code) {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) || code;
  } catch {
    return code || "Destination";
  }
}
function calendarKey(value) {
  try {
    const key = value?.slice(0, 10);
    calendarDate(key);
    return key;
  } catch {
    return null;
  }
}
function localKey(value, timezone) {
  try {
    const parts = new Intl.DateTimeFormat("en", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date(value));
    const part = (name) => parts.find((entry) => entry.type === name).value;
    return `${part("year")}-${part("month")}-${part("day")}`;
  } catch {
    return null;
  }
}
export function itemDates(item) {
  return item.kind === "stay"
    ? [calendarKey(item.checkIn), calendarKey(item.checkOut)]
    : [
        localKey(item.startAt, item.timezone),
        localKey(item.endAt || item.startAt, item.timezone),
      ];
}
export function formatReservationDates(start, end) {
  if (!start || !end) return "Dates unavailable";
  const first = new Date(`${start}T12:00:00Z`),
    last = new Date(`${end}T12:00:00Z`);
  return start === end
    ? dayFormat.format(first)
    : dayFormat.formatRange(first, last);
}
export function bookingTime(value) {
  if (!value || !Number.isFinite(+new Date(value))) return null;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  }).format(new Date(value));
}
export function reservationSummary(reservation) {
  const items = reservation.items || [];
  const ordered = [...items].sort((a, b) =>
    String(itemDates(a)[0] || "").localeCompare(String(itemDates(b)[0] || "")),
  );
  const dates = items.flatMap(itemDates).filter(Boolean).sort();
  const country = destinationName(reservation.country);
  const type =
    {
      trip: "Custom trip",
      package: "Fixed package",
      stay: "Stay booking",
      tour: "Tour booking",
    }[reservation.source?.kind] || "Reservation";
  return {
    country,
    type,
    title: ["stay", "tour"].includes(reservation.source?.kind)
      ? items[0]?.name || `${country} reservation`
      : `${country} ${reservation.source?.kind === "package" ? "package" : "itinerary"}`,
    dates: formatReservationDates(dates[0], dates.at(-1)),
    cities: [...new Set(ordered.map((item) => item.city).filter(Boolean))],
    stays: items.filter((item) => item.kind === "stay").length,
    tours: items.filter((item) => item.kind === "tour").length,
    nights: items
      .filter((item) => item.kind === "stay")
      .reduce((sum, item) => sum + (item.nights || 0), 0),
    reference: String(reservation._id).slice(-8).toUpperCase(),
    items: ordered,
  };
}
