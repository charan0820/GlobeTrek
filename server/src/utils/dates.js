import { AppError } from "./errors.js";
export const DAY = 86400000;
export const utcToday = () => new Date(new Date().toISOString().slice(0, 10));
export function parseDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || ""))
    throw new AppError(400, "INVALID_DATES", "Use dates in YYYY-MM-DD format.");
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(+date) || date.toISOString().slice(0, 10) !== value)
    throw new AppError(400, "INVALID_DATES", "Enter a valid calendar date.");
  return date;
}
export function stayDates(checkIn, checkOut, today = utcToday()) {
  const start = parseDate(checkIn),
    end = parseDate(checkOut);
  const nights = (end - start) / DAY;
  if (
    nights < 1 ||
    nights > 14 ||
    start < today ||
    end > new Date(+today + 90 * DAY)
  ) {
    throw new AppError(
      400,
      "INVALID_DATES",
      "Choose 1–14 nights within the next 90 days. Checkout is exclusive.",
    );
  }
  return Array.from(
    { length: nights },
    (_, index) => new Date(+start + index * DAY),
  );
}
