// Insets retain geographic coordinates; only their display transform changes.
export const countries = {
  IN: {
    name: "India",
    regions: [
      ["Mainland", 79, 23],
      ["Andaman and Nicobar", 93, 10],
      ["Lakshadweep", 72, 11],
    ],
    classify: ([x, y]) => (y < 15 && x > 90 ? 1 : y < 14 && x < 74 ? 2 : 0),
  },
  JP: {
    name: "Japan",
    regions: [
      ["Main islands", 138, 37],
      ["Southern islands", 128, 26],
      ["Pacific islands", 142, 26],
    ],
    classify: ([x, y]) => (y < 30 ? (x < 133 ? 1 : 2) : 0),
  },
  TH: { name: "Thailand", regions: [["Thailand", 101, 14]], classify: () => 0 },
  ID: {
    name: "Indonesia",
    regions: [["Indonesian archipelago", 118, -3]],
    classify: () => 0,
  },
  FR: {
    name: "France",
    regions: [
      ["Metropolitan France", 3, 47],
      ["French Guiana", -53, 4],
      ["Caribbean", -62, 16],
      ["Réunion", 55.5, -21],
      ["Mayotte", 45, -13],
    ],
    classify: ([x, y]) =>
      x < -50 ? (y < 10 ? 1 : 2) : y < 0 ? (x > 50 ? 3 : 4) : 0,
  },
  IT: { name: "Italy", regions: [["Italy", 12, 42]], classify: () => 0 },
  ES: {
    name: "Spain",
    regions: [
      ["Mainland and Balearic Islands", -3, 40],
      ["Canary Islands", -16, 28],
    ],
    classify: ([, y]) => (y < 32 ? 1 : 0),
  },
  GR: {
    name: "Greece",
    regions: [["Greece and islands", 24, 38]],
    classify: () => 0,
  },
  TR: { name: "Turkey", regions: [["Turkey", 35, 39]], classify: () => 0 },
  US: {
    name: "United States of America",
    regions: [
      ["Contiguous United States", -98, 39],
      ["Alaska", -154, 64],
      ["Hawaii", -157, 21],
      ["Northwestern Hawaiian Islands", -174, 27],
    ],
    classify: ([x, y]) =>
      y > 50 ? 1 : x < -130 || x > 170 ? (x < -162 || x > 170 ? 3 : 2) : 0,
  },
};
export const tileZoom = 5;
export function tileXY(lng, lat, zoom = tileZoom) {
  const n = 2 ** zoom;
  return [
    (((lng + 180) / 360) * n + n) % n,
    ((1 - Math.asinh(Math.tan((lat * Math.PI) / 180)) / Math.PI) / 2) * n,
  ];
}
export function unwrap(lng, center) {
  return center + ((lng - center + 540) % 360) - 180;
}
