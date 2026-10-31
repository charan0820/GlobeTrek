import { describe, expect, it } from "vitest";
import {
  dayColor,
  groupPlaces,
  markerId,
  routeFeatures,
  tripPoints,
} from "../../client/src/geo/presentation.js";
import { adaptMapStyle } from "../../client/src/geo/map-style.js";
describe("connected map presentation", () => {
  it("groups cities alphabetically without duplicating multi-city itineraries", () => {
    const groups = groupPlaces(
      [
        { name: "Z", city: "Tokyo" },
        { name: "A", city: "Kyoto" },
        { name: "Trip", days: [{ cityId: "k" }, { cityId: "t" }] },
      ],
      [
        { id: "k", name: "Kyoto" },
        { id: "t", name: "Tokyo" },
      ],
    );
    expect(groups.map((g) => g.name)).toEqual([
      "Kyoto",
      "Multi-city itineraries",
      "Tokyo",
    ]);
    expect(groups[1].items).toHaveLength(1);
    expect(groups[1].items[0].coveredCities).toBe("Kyoto · Tokyo");
  });
  it("keeps repeated places identifiable by their stop occurrence", () => {
    const points = tripPoints(
      [
        { date: "2026-11-01", stops: [{ id: "first" }] },
        { date: "2026-11-02", stops: [{ id: "again" }] },
      ],
      () => ({ id: "same-place", lat: 1, lng: 2 }),
    );
    expect(points.map(markerId)).toEqual(["first", "again"]);
    expect(points.map((p) => p.dayIndex)).toEqual([0, 1]);
  });
  it("never connects one day to the following day", () => {
    const points = [
      { lat: 1, lng: 1, dayIndex: 0 },
      { lat: 2, lng: 2, dayIndex: 0 },
      { lat: 3, lng: 3, dayIndex: 1 },
      { lat: 4, lng: 4, dayIndex: 1 },
    ];
    const routes = routeFeatures(points).features;
    expect(routes).toHaveLength(2);
    expect(routes.map((r) => r.geometry.coordinates)).toEqual([
      [
        [1, 1],
        [2, 2],
      ],
      [
        [3, 3],
        [4, 4],
      ],
    ]);
  });
  it("uses stable, distinct day colours across the supported thirty-day trip", () => {
    expect(
      new Set(Array.from({ length: 30 }, (_, i) => dayColor(i))).size,
    ).toBe(30);
    expect(dayColor(2)).not.toBe(dayColor(2, true));
    expect(
      routeFeatures(
        [
          { lat: 1, lng: 1 },
          { lat: 2, lng: 2 },
        ],
        true,
      ).features[0].properties.color,
    ).toBe(dayColor(0, true));
  });
  it("adapts geographic and label colours without altering provider style input", () => {
    const style = {
      layers: [
        { id: "water", type: "fill", paint: { "fill-color": "#fff" } },
        {
          id: "city-label",
          type: "symbol",
          layout: { "text-field": "{name}" },
        },
      ],
    };
    const adapted = adaptMapStyle(style, true);
    expect(adapted.layers[0].paint["fill-color"]).toBe("#294749");
    expect(adapted.layers[1].paint["text-color"]).toBe("#eee9dd");
    expect(adaptMapStyle(style, false).layers[0].paint["fill-color"]).toBe(
      "#b9d1cf",
    );
    expect(style.layers[0].paint["fill-color"]).toBe("#fff");
  });
});
