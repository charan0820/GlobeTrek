export const placeId = (record) => String(record.id || record._id);
export const markerId = (record) =>
  String(record.occurrenceId || placeId(record));
export function groupPlaces(records, cities = []) {
  const names = new Map(cities.map((city) => [city.id, city.name]));
  const groups = new Map();
  for (const record of records) {
    const cityIds = [...new Set(record.days?.map((day) => day.cityId) || [])];
    const name =
      cityIds.length > 1
        ? "Multi-city itineraries"
        : record.city ||
          names.get(record.cityId || cityIds[0]) ||
          "Country itineraries";
    if (!groups.has(name)) groups.set(name, []);
    groups
      .get(name)
      .push({
        ...record,
        coveredCities: cityIds.map((id) => names.get(id) || id).join(" · "),
      });
  }
  return [...groups]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, items]) => ({
      name,
      items: items.sort((a, b) => a.name.localeCompare(b.name)),
    }));
}
export function dayColor(index, dark = false) {
  const hue = Math.round((index * 137.508 + 212) % 360);
  return `hsl(${hue} ${dark ? 78 : 72}% ${dark ? 72 : 26}%)`;
}
export function dayStyle(index) {
  return {
    "--day-light": dayColor(index),
    "--day-dark": dayColor(index, true),
  };
}
export function tripPoints(days, resolve) {
  return days.flatMap((day, dayIndex) =>
    day.stops.flatMap((stop, stopIndex) => {
      const record = resolve(stop);
      return record
        ? [
            {
              ...record,
              occurrenceId: stop.id,
              dayIndex,
              stopIndex,
              date: day.date,
              stopKind: stop.kind,
            },
          ]
        : [];
    }),
  );
}
export function routeFeatures(items, dark = false) {
  const groups = new Map();
  for (const item of items) {
    if (!Number.isFinite(item.lat) || !Number.isFinite(item.lng)) continue;
    const day = item.dayIndex ?? 0;
    if (!groups.has(day)) groups.set(day, []);
    groups.get(day).push(item);
  }
  return {
    type: "FeatureCollection",
    features: [...groups]
      .filter(([, points]) => points.length > 1)
      .map(([day, points]) => ({
        type: "Feature",
        properties: { day, color: dayColor(day, dark) },
        geometry: {
          type: "LineString",
          coordinates: points.map((p) => [p.lng, p.lat]),
        },
      })),
  };
}
export function revealInContainer(container, target) {
  if (!container || !target) return;
  const box = container.getBoundingClientRect(),
    item = target.getBoundingClientRect();
  const behavior = matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "instant"
    : "smooth";
  if (getComputedStyle(container).overflowY === "visible") {
    target.scrollIntoView({ behavior, block: "center" });
    return;
  }
  if (item.top < box.top || item.bottom > box.bottom)
    container.scrollTo({
      top: container.scrollTop + item.top - box.top - 16,
      behavior,
    });
}
