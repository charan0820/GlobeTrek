// Adapt named layer roles rather than dimming the canvas or its controls.
export function adaptMapStyle(style, dark) {
  const copy = structuredClone(style);
  const colors = dark
    ? {
        background: "#303d35",
        water: "#294749",
        vegetation: "#354c3b",
        building: "#4a584d",
        land: "#38463d",
        outline: "#697769",
        waterLine: "#72969a",
        boundary: "#c5baa2",
        majorRoad: "#dfbb8e",
        road: "#95a18f",
        label: "#eee9dd",
        halo: "#1d2421",
      }
    : {
        background: "#f4f1e9",
        water: "#b9d1cf",
        vegetation: "#d4ddc5",
        building: "#e0d9ca",
        land: "#eee8db",
        outline: "#c6c4b3",
        waterLine: "#789b9d",
        boundary: "#9d8d72",
        majorRoad: "#bf966c",
        road: "#cbc0ad",
        label: "#354239",
        halo: "#fffdf7",
      };
  for (const layer of copy.layers) {
    const id = layer.id.toLowerCase();
    const paint = (layer.paint ||= {});
    if (layer.type === "background")
      paint["background-color"] = colors.background;
    if (layer.type === "fill") {
      paint["fill-color"] = /water/.test(id)
        ? colors.water
        : /park|wood|forest|landcover/.test(id)
          ? colors.vegetation
          : /building/.test(id)
            ? colors.building
            : colors.land;
      if ("fill-outline-color" in paint)
        paint["fill-outline-color"] = colors.outline;
    }
    if (layer.type === "line")
      paint["line-color"] = /water/.test(id)
        ? colors.waterLine
        : /boundary/.test(id)
          ? colors.boundary
          : /motorway|trunk|primary/.test(id)
            ? colors.majorRoad
            : colors.road;
    if (layer.type === "symbol" && layer.layout?.["text-field"])
      Object.assign(paint, {
        "text-color": colors.label,
        "text-halo-color": colors.halo,
        "text-halo-width": 1.5,
      });
  }
  return copy;
}
