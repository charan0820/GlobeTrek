// Adapt named layer roles rather than dimming the canvas or its controls.
export function adaptMapStyle(style, dark) {
  const copy = structuredClone(style);
  if (!dark) return copy;
  for (const layer of copy.layers) {
    const id = layer.id.toLowerCase();
    const paint = (layer.paint ||= {});
    if (layer.type === "background") paint["background-color"] = "#233b49";
    if (layer.type === "fill") {
      paint["fill-color"] = /water/.test(id)
        ? "#122c40"
        : /park|wood|forest|landcover/.test(id)
          ? "#2e514c"
          : /building/.test(id)
            ? "#3b5360"
            : "#293f4c";
      if ("fill-outline-color" in paint)
        paint["fill-outline-color"] = "#58717d";
    }
    if (layer.type === "line")
      paint["line-color"] = /water/.test(id)
        ? "#56879b"
        : /boundary/.test(id)
          ? "#a7bac6"
          : /motorway|trunk|primary/.test(id)
            ? "#c4ad7a"
            : "#718c9a";
    if (layer.type === "symbol" && layer.layout?.["text-field"])
      Object.assign(paint, {
        "text-color": "#edf5f7",
        "text-halo-color": "#172b38",
        "text-halo-width": 1.5,
      });
  }
  return copy;
}
