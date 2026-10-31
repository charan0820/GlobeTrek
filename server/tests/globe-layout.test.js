import { describe, it, expect } from "vitest";
import {
  countryHeight,
  containsCountryPoint,
  fitGlobeAltitude,
  layoutGlobeLabels,
} from "../../client/src/geo/globe-layout.js";
describe("interactive globe layout", () => {
  it("reconciles polygon and island taps while excluding holes and open ocean", () => {
    const ring = [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
        [0, 0],
      ],
      hole = [
        [4, 4],
        [6, 4],
        [6, 6],
        [4, 6],
        [4, 4],
      ];
    expect(
      containsCountryPoint(
        { type: "Polygon", coordinates: [ring, hole] },
        2,
        2,
      ),
    ).toBe(true);
    expect(
      containsCountryPoint(
        { type: "Polygon", coordinates: [ring, hole] },
        5,
        5,
      ),
    ).toBe(false);
    expect(
      containsCountryPoint(
        { type: "MultiPolygon", coordinates: [[ring]] },
        2,
        2,
      ),
    ).toBe(true);
    expect(
      containsCountryPoint(
        { type: "MultiPolygon", coordinates: [[ring]] },
        20,
        20,
      ),
    ).toBe(false);
  });
  it("prioritises persistent selection over hover and keeps unsupported geography flat", () => {
    expect(countryHeight("JP", "JP", "JP")).toBe(0.055);
    expect(countryHeight("IN", "JP", "IN")).toBe(0.025);
    expect(countryHeight("FR", "JP", "IN")).toBe(0.001);
    expect(countryHeight(undefined, undefined, null)).toBe(0.001);
  });
  it("fits the raised silhouette to 90 percent of the smaller camera dimension", () => {
    for (const [width, height] of [
      [476, 750],
      [816, 700],
      [350, 332],
      [1296, 400],
    ]) {
      const distance = fitGlobeAltitude(width, height, 50) + 1;
      const angularTangent = Math.tan(Math.asin(1.055 / distance));
      const projectedRadius =
        ((height / 2) * angularTangent) / Math.tan((25 * Math.PI) / 180);
      expect(projectedRadius * 2).toBeCloseTo(Math.min(width, height) * 0.9);
    }
  });
  it("keeps selected and hovered labels readable before hiding crowded ordinary labels", () => {
    const result = layoutGlobeLabels(
      [
        { code: "FR", x: 100, y: 100, width: 70, height: 22, priority: 0 },
        { code: "IT", x: 100, y: 100, width: 70, height: 22, priority: 1 },
        { code: "GR", x: 100, y: 100, width: 70, height: 22, priority: 2 },
      ],
      300,
      200,
    );
    expect(result.find((x) => x.code === "GR").visible).toBe(true);
    expect(result.find((x) => x.code === "IT").visible).toBe(true);
    expect(result.find((x) => x.code === "FR").visible).toBe(false);
  });
});
