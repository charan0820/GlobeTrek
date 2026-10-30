export const DAY = 86400000;
export const POLICY = Object.freeze({
  maxDays: 30,
  maxTravelers: 12,
  horizon: 365,
  quoteMinutes: 10,
  holdMinutes: 10,
  feePercent: 12,
});
export const CURRENCIES = Object.freeze({
  INR: 2,
  JPY: 0,
  THB: 2,
  IDR: 2,
  EUR: 2,
  TRY: 2,
  USD: 2,
});
export const dateKey = (value) => new Date(value).toISOString().slice(0, 10);
export function calendarDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || ""))
    throw new Error("Use YYYY-MM-DD dates.");
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(+date) || dateKey(date) !== value)
    throw new Error("Enter a valid calendar date.");
  return date;
}
export const addDays = (value, days) =>
  dateKey(+calendarDate(value) + days * DAY);
export function dayKeys(start, end, inclusive = false) {
  const length =
    (+calendarDate(end) - calendarDate(start)) / DAY + Number(inclusive);
  if (length < 1 || length > POLICY.maxDays)
    throw new Error("Choose between 1 and 30 days.");
  return Array.from({ length }, (_, i) => addDays(start, i));
}
export function formatMoney(amount, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: CURRENCIES[currency] ?? 2,
  }).format(amount / 10 ** CURRENCIES[currency]);
}
