export const unwrapLongitude = (lng, center) =>
  center + ((lng - center + 540) % 360) - 180;
export function projectRegion(region, lng, lat) {
  const [cx, cy] = region.center;
  const x =
      (unwrapLongitude(lng, cx) - cx) *
      111.195 *
      Math.cos((cy * Math.PI) / 180),
    z = -(lat - cy) * 111.195;
  const [a, b, c, d] = region.bounds;
  return {
    x: (x - (a + c) / 2) * region.scale + region.offset[0],
    z: (z - (b + d) / 2) * region.scale + region.offset[1],
    u: (x - a) / (c - a),
    v: (z - b) / (d - b),
  };
}
export function locateRegion(regions, lng, lat) {
  return [...regions].sort((a, b) => {
    const distance = (r) => {
      const p = projectRegion(r, lng, lat);
      return Math.hypot(Math.max(0, -p.u, p.u - 1), Math.max(0, -p.v, p.v - 1));
    };
    return distance(a) - distance(b);
  })[0];
}
export function terrainPoint(metadata, lng, lat) {
  const region = locateRegion(metadata.regions, lng, lat),
    p = projectRegion(region, lng, lat),
    n = region.grid;
  const values =
    region.heightValues ||
    (region.heightValues = Uint16Array.from(
      atob(region.heights).match(/[\s\S]{2}/g),
      (pair) => pair.charCodeAt(0) + pair.charCodeAt(1) * 256,
    ));
  const x = Math.max(0, Math.min(n, p.u * n)),
    z = Math.max(0, Math.min(n, p.v * n)),
    i = Math.min(n - 1, Math.floor(x)),
    j = Math.min(n - 1, Math.floor(z)),
    u = x - i,
    v = z - j;
  const h =
    (values[j * (n + 1) + i] * (1 - u) + values[j * (n + 1) + i + 1] * u) *
      (1 - v) +
    (values[(j + 1) * (n + 1) + i] * (1 - u) +
      values[(j + 1) * (n + 1) + i + 1] * u) *
      v;
  return {
    ...p,
    y:
      ((h * region.heightUnitMeters) / 1000) *
      region.scale *
      metadata.heightExaggeration,
    region: region.id,
  };
}
