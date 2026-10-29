import { describe, it, expect } from "vitest";
import { TtlCache } from "../src/utils/cache.js";
import { calculatePrice } from "../src/services/booking.js";
import { parseDate, stayDates } from "../src/utils/dates.js";
describe("small pure functions", () => {
  it("expires and bounds the cache without extending TTL on reads", () => {
    let time = 0;
    const cache = new TtlCache({ ttl: 60, maximum: 2, now: () => time });
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);
    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBe(2);
    time = 60;
    expect(cache.get("b")).toBeUndefined();
  });
  it("handles UTC leap days, adjacent checkout and integer money", () => {
    expect(parseDate("2028-02-29").toISOString()).toBe(
      "2028-02-29T00:00:00.000Z",
    );
    expect(() => parseDate("2027-02-29")).toThrow();
    expect(
      stayDates("2028-02-28", "2028-03-01", new Date("2028-02-01")).length,
    ).toBe(2);
    expect(calculatePrice(999, 3, 2)).toEqual({
      subtotal: 5994,
      tax: 719,
      total: 6713,
      currency: "INR",
      nights: 3,
    });
  });
});
