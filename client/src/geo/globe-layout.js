export const COUNTRY_HEIGHT = {
  resting: 0.001,
  hovered: 0.025,
  selected: 0.055,
};
// Natural Earth's polygons are split at the antimeridian. Respect interior holes.
export function containsCountryPoint(geometry, lat, lng) {
  function inRing(ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [x, y] = ring[i],
        [px, py] = ring[j];
      if (y > lat !== py > lat && lng < ((px - x) * (lat - y)) / (py - y) + x)
        inside = !inside;
    }
    return inside;
  }
  const polygons =
    geometry.type === "Polygon"
      ? [geometry.coordinates]
      : geometry.type === "MultiPolygon"
        ? geometry.coordinates
        : [];
  return polygons.some(
    ([outer, ...holes]) => inRing(outer) && !holes.some(inRing),
  );
}
export function countryHeight(code, selected, hovered) {
  return code && code === selected
    ? COUNTRY_HEIGHT.selected
    : code && code === hovered
      ? COUNTRY_HEIGHT.hovered
      : COUNTRY_HEIGHT.resting;
}

// A sphere's tangent angle, rather than its centre plane, determines its silhouette.
export function fitGlobeAltitude(width, height, verticalFov, occupancy = 0.9) {
  const tangent =
    Math.tan((verticalFov * Math.PI) / 360) *
    Math.min(1, width / height) *
    occupancy;
  return (1 + COUNTRY_HEIGHT.selected) / Math.sin(Math.atan(tangent)) - 1;
}

export function layoutGlobeLabels(candidates, width, height) {
  const occupied = [];
  return [...candidates]
    .sort((a, b) => b.priority - a.priority || a.code.localeCompare(b.code))
    .map((item) => {
      const offsets =
        item.priority > 0
          ? [
              [0, 0],
              [0, -28],
              [0, 28],
              [-48, -28],
              [48, 28],
              [0, -56],
              [0, 56],
            ]
          : [[0, 0]];
      for (const [dx, dy] of offsets) {
        const x = Math.max(
          6,
          Math.min(width - item.width - 6, item.x - item.width / 2 + dx),
        );
        const y = item.y - item.height - 10 + dy;
        const box = {
          left: x,
          top: y,
          right: x + item.width,
          bottom: y + item.height,
        };
        if (y < 6 || box.bottom > height - 6) continue;
        if (
          occupied.some(
            (b) =>
              box.left < b.right + 6 &&
              box.right > b.left - 6 &&
              box.top < b.bottom + 6 &&
              box.bottom > b.top - 6,
          )
        )
          continue;
        occupied.push(box);
        return { ...item, left: x, top: y, visible: true };
      }
      return { ...item, visible: false };
    });
}
