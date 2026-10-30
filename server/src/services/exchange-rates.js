import Decimal from "decimal.js";
import { ExchangeRateSnapshot } from "../models/travel.js";
import { CURRENCIES, calendarDate } from "../../../shared/travel.js";
export const ECB_SOURCE =
  "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml";
export function parseRates(xml) {
  const date = xml.match(/time=['"](\d{4}-\d{2}-\d{2})['"]/)?.[1];
  calendarDate(date);
  const rates = { EUR: "1" };
  for (const [, currency, rate] of xml.matchAll(
    /currency=['"]([A-Z]{3})['"]\s+rate=['"]([\d.]+)['"]/g,
  )) {
    if (currency in CURRENCIES && new Decimal(rate).gt(0))
      rates[currency] = rate;
  }
  if (Object.keys(CURRENCIES).some((c) => !rates[c]))
    throw Error("ECB response is missing a supported currency.");
  return { date, rates, source: ECB_SOURCE, fetchedAt: new Date() };
}
let inflight;
let nextAttemptAt = 0,
  failures = 0;
export function refreshRates() {
  if (inflight) return inflight;
  inflight = (async () => {
    const previous = await ExchangeRateSnapshot.findOne().sort({
      fetchedAt: -1,
    });
    if (previous && Date.now() - +previous.fetchedAt < 6 * 3600000)
      return previous;
    if (Date.now() < nextAttemptAt) return previous;
    try {
      const response = await fetch(ECB_SOURCE, {
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok)
        throw Error(
          "ECB is unavailable; the last dated estimate remains usable.",
        );
      const snapshot = parseRates(await response.text());
      const result = await ExchangeRateSnapshot.findOneAndUpdate(
        { date: snapshot.date },
        { $set: snapshot },
        { upsert: true, new: true },
      );
      failures = 0;
      nextAttemptAt = 0;
      return result;
    } catch (error) {
      nextAttemptAt =
        Date.now() + Math.min(3600000, 60000 * 2 ** Math.min(failures++, 6));
      throw error;
    }
  })().finally(() => {
    inflight = null;
  });
  return inflight;
}
