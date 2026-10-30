import { describe, expect, it } from "vitest";
import {
  itemDates,
  reservationSummary,
} from "../../client/src/reservation-summary.js";
describe("reservation list identity", () => {
  it("describes the whole selection rather than using the first hotel as its title", () => {
    const summary = reservationSummary({
      _id: "0123456789abcdef01234567",
      country: "US",
      source: { kind: "trip" },
      items: [
        {
          kind: "stay",
          name: "Later hotel",
          city: "San Francisco",
          checkIn: "2026-11-08",
          checkOut: "2026-11-10",
          nights: 2,
        },
        {
          kind: "stay",
          name: "First hotel",
          city: "Honolulu",
          checkIn: "2026-11-05",
          checkOut: "2026-11-06",
          nights: 1,
        },
      ],
    });
    expect(summary.title).toBe("United States itinerary");
    expect(summary.cities).toEqual(["Honolulu", "San Francisco"]);
    expect(summary.stays).toBe(2);
    expect(summary.nights).toBe(3);
    expect(summary.reference).toBe("01234567");
    expect(summary.dates).toContain("2026");
    expect(summary.items[0].name).toBe("First hotel");
  });
  it("uses the tour destination calendar date, including an overnight end", () => {
    expect(
      itemDates({
        kind: "tour",
        startAt: "2026-11-06T08:30:00Z",
        endAt: "2026-11-06T11:00:00Z",
        timezone: "Pacific/Honolulu",
      }),
    ).toEqual(["2026-11-05", "2026-11-06"]);
  });
  it("keeps standalone product names and tolerates missing historical dates", () => {
    const summary = reservationSummary({
      _id: "a",
      country: "JP",
      source: { kind: "tour" },
      items: [{ kind: "tour", name: "Kyoto heritage walk", city: "Kyoto" }],
    });
    expect(summary.title).toBe("Kyoto heritage walk");
    expect(summary.type).toBe("Tour booking");
    expect(summary.dates).toBe("Dates unavailable");
    expect(summary.tours).toBe(1);
  });
});
