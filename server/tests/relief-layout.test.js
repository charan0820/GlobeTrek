import { describe, it, expect } from "vitest";
import {
  projectRegion,
  terrainPoint,
  locateRegion,
  unwrapLongitude,
} from "../../client/src/geo/relief-layout.js";
const region = (id, center, bounds, offset = [0, 0]) => ({
  id,
  center,
  bounds,
  offset,
  scale: 1,
  grid: 1,
  heightUnitMeters: 2,
  heights: Buffer.from(new Uint16Array([0, 100, 200, 300]).buffer).toString(
    "base64",
  ),
});
describe("geographic relief transforms", () => {
  it("uses the same regional projection for models and pins, preserving offshore coordinates", () => {
    const r = region("main", [0, 0], [-111.195, -111.195, 111.195, 111.195]);
    const p = projectRegion(r, 1, 1);
    expect(p.x).toBeCloseTo(111.195);
    expect(p.z).toBeCloseTo(-111.195);
    const offshore = projectRegion(r, 2, 0);
    expect(offshore.u).toBeGreaterThan(1);
    expect(offshore.x).toBeGreaterThan(p.x);
  });
  it("samples elevation bilinearly and applies declared exaggeration", () => {
    const r = region("main", [0, 0], [-1, -1, 1, 1]);
    expect(
      terrainPoint({ regions: [r], heightExaggeration: 8 }, 0, 0).y,
    ).toBeCloseTo(2.4);
  });
  it("anchors Hawaii and dateline regions independently from mainland inset spacing", () => {
    const main = region("main", [-98, 39], [-2500, -2000, 2500, 2000]),
      hawaii = region("hawaii", [-157, 21], [-300, -300, 300, 300], [65, 0]);
    expect(locateRegion([main, hawaii], -157.8, 21.3).id).toBe("hawaii");
    expect(unwrapLongitude(-179, -154)).toBe(-179);
    expect(unwrapLongitude(179, -154)).toBe(-181);
  });
});
