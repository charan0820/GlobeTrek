import { describe, it, expect } from "vitest";
import { planningIssues, planningBudget } from "../../client/src/planning.js";
const records = [
  { _id: "tour-a", name: "Morning walk", durationMinutes: 120, city: "Tokyo" },
  { _id: "tour-b", name: "Museum tour", durationMinutes: 120, city: "Tokyo" },
  { id: "place", name: "Garden", durationMinutes: 120, city: "Kyoto" },
];
const base = () => ({
  startDate: "2026-12-01",
  endDate: "2026-12-03",
  days: [{ date: "2026-12-01", stops: [] }],
  stays: [],
});
describe("planner guidance", () => {
  it("estimates enough whole rooms for the party and excludes informational stops", () => {
    const draft = base();
    draft.travelers = 5;
    draft.stays = [
      {
        hotelId: "hotel",
        roomTypeId: "room",
        checkIn: "2026-12-01",
        checkOut: "2026-12-03",
      },
    ];
    draft.days[0].stops = [
      { kind: "tour", refId: "tour" },
      { kind: "attraction", refId: "place" },
    ];
    expect(
      planningBudget(
        draft,
        [
          {
            _id: "hotel",
            currency: "JPY",
            roomTypes: [{ _id: "room", basePrice: 10000, capacity: 2 }],
          },
        ],
        [{ _id: "tour", currency: "JPY", price: 5000 }],
      ),
    ).toEqual({ subtotal: 85000, fee: 10200, total: 95200, currency: "JPY" });
  });
  it("distinguishes unresolved tours, timed overlaps and informational stops", () => {
    const draft = base();
    draft.days[0].stops = [
      { kind: "tour", refId: "tour-a", departureId: "a" },
      { kind: "tour", refId: "tour-b", departureId: "b" },
      { kind: "tour", refId: "tour-a" },
    ];
    const departures = [
      {
        _id: "a",
        tour: "tour-a",
        date: "2026-12-01",
        startAt: "2026-12-01T00:00Z",
        endAt: "2026-12-01T02:00Z",
      },
      {
        _id: "b",
        tour: "tour-b",
        date: "2026-12-01",
        startAt: "2026-12-01T01:00Z",
        endAt: "2026-12-01T03:00Z",
      },
    ];
    expect(
      planningIssues(draft, records, departures).map((i) => i.code),
    ).toEqual(expect.arrayContaining(["UNRESOLVED_TOUR", "TOUR_OVERLAP"]));
    departures[1].startAt = "2026-12-01T02:00Z";
    expect(
      planningIssues(draft, records, departures).some(
        (i) => i.code === "TOUR_OVERLAP",
      ),
    ).toBe(false);
  });
  it("flags stay conflicts and out-of-trip nights while allowing lodging gaps", () => {
    const draft = base();
    expect(planningIssues(draft, records, [])).toEqual([]);
    draft.stays = [
      { checkIn: "2026-12-01", checkOut: "2026-12-03" },
      { checkIn: "2026-12-02", checkOut: "2026-12-04" },
    ];
    expect(planningIssues(draft, records, []).map((i) => i.code)).toEqual(
      expect.arrayContaining(["STAY_DATES", "STAY_OVERLAP"]),
    );
  });
  it("warns about long days and multiple cities without claiming routing feasibility", () => {
    const draft = base();
    draft.days[0].stops = Array.from({ length: 5 }, () => ({
      kind: "attraction",
      refId: "place",
    }));
    draft.days[0].stops.push({ kind: "attraction", refId: "tour-a" });
    const result = planningIssues(draft, records, []);
    expect(result.map((i) => i.code)).toEqual(
      expect.arrayContaining(["LONG_DAY", "MULTIPLE_CITIES"]),
    );
    expect(result.every((i) => i.severity === "warning")).toBe(true);
  });
});
