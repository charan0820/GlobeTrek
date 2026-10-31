import { Temporal } from "@js-temporal/polyfill";
import Decimal from "decimal.js";
import {
  POLICY,
  CURRENCIES,
  dayKeys,
  calendarDate,
  addDays,
  dateKey,
} from "../../../shared/travel.js";
import { AppError } from "../utils/errors.js";
export { POLICY, CURRENCIES, dayKeys, addDays, dateKey };
export function localInstant(date, time, timezone) {
  try {
    return new Date(
      Number(
        Temporal.PlainDate.from(date)
          .toPlainDateTime(time)
          .toZonedDateTime(timezone, { disambiguation: "reject" })
          .epochMilliseconds,
      ),
    );
  } catch {
    throw new AppError(
      400,
      "INVALID_LOCAL_TIME",
      "This destination date or time is invalid or ambiguous.",
    );
  }
}
export const localToday = (timezone, now = new Date()) =>
  Temporal.Instant.from(now.toISOString())
    .toZonedDateTimeISO(timezone)
    .toPlainDate()
    .toString();
export function range(
  start,
  end,
  { inclusive = false, timezone = "UTC", now = new Date() } = {},
) {
  try {
    const keys = dayKeys(start, end, inclusive);
    const today = localToday(timezone, now);
    if (start < today || end > addDays(today, POLICY.horizon))
      throw new Error("Choose dates within the next 365 days.");
    return keys;
  } catch (err) {
    throw new AppError(400, "INVALID_DATES", err.message);
  }
}
export function priceTotal(items, currency) {
  if (!Object.hasOwn(CURRENCIES, currency))
    throw new AppError(400, "INVALID_CURRENCY", "Unsupported currency.");
  const subtotal = items.reduce(
    (n, item) => n.plus(item.amount),
    new Decimal(0),
  );
  const fee = subtotal
    .times(POLICY.feePercent)
    .div(100)
    .toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
  const total = subtotal.plus(fee);
  if (
    ![subtotal, fee, total].every(
      (n) => n.isInteger() && n.lte(Number.MAX_SAFE_INTEGER) && n.gte(0),
    )
  )
    throw new AppError(
      400,
      "PRICE_OVERFLOW",
      "This selection exceeds supported pricing.",
    );
  return {
    subtotal: subtotal.toNumber(),
    fee: fee.toNumber(),
    total: total.toNumber(),
    currency,
    feeLabel: "Demo service fee (12%)",
  };
}
export const stayAmount = (unitPrice, nights, travelers, capacity) =>
  unitPrice * nights * Math.ceil(travelers / capacity);
export const tourAmount = (unitPrice, travelers) => unitPrice * travelers;
export function estimateINR(amount, currency, snapshot, now = new Date()) {
  if (
    !snapshot ||
    !snapshot.rates.INR ||
    (currency !== "EUR" && !snapshot.rates[currency])
  )
    return null;
  const value = new Decimal(amount)
    .div(10 ** CURRENCIES[currency])
    .times(snapshot.rates.INR)
    .div(currency === "EUR" ? 1 : snapshot.rates[currency])
    .times(100)
    .toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
  if (!value.isFinite() || value.gt(Number.MAX_SAFE_INTEGER)) return null;
  return {
    amount: value.toNumber(),
    currency: "INR",
    date: snapshot.date,
    source: snapshot.source,
    stale: +now - +calendarDate(snapshot.date) > 4 * 86400000,
    informational: true,
  };
}
