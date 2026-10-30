import React, { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "maplibre-gl/dist/maplibre-gl.css";
import { dayColor, dayStyle, markerId, routeFeatures } from "./presentation.js";
import { adaptMapStyle } from "./map-style.js";
maplibregl.setWorkerUrl(workerUrl);
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
export default function TravelMap({
  items,
  selected,
  onSelect,
  center,
  connect = false,
  children,
}) {
  const host = useRef(),
    map = useRef(),
    callback = useRef(onSelect),
    itemsRef = useRef(items),
    markers = useRef([]),
    lastBounds = useRef("");
  const [tileState, setTileState] = useState("loading"),
    [styleVersion, setStyleVersion] = useState(0),
    [viewportVersion, setViewportVersion] = useState(0),
    [overlap, setOverlap] = useState(null);
  const initial = useRef(center);
  const signature = JSON.stringify(
    items.map((item) => [
      markerId(item),
      item.name,
      item.lat,
      item.lng,
      item.dayIndex,
      item.stopIndex,
    ]),
  );
  useEffect(() => {
    callback.current = onSelect;
    itemsRef.current = items;
  }, [onSelect, items]);
  useEffect(() => {
    let active = true,
      timer,
      hadError = false;
    const controller = new AbortController();
    async function style() {
      setTileState("loading");
      hadError = false;
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (active && !map.current?.loaded()) setTileState("error");
      }, 15000);
      try {
        const response = await fetch(
          "https://tiles.openfreemap.org/styles/positron",
          { signal: controller.signal },
        );
        if (!response.ok) throw Error("Map style unavailable");
        const adapted = adaptMapStyle(
          await response.json(),
          document.documentElement.dataset.theme === "dark",
        );
        if (!active) return;
        if (map.current) map.current.setStyle(adapted);
        else {
          map.current = new maplibregl.Map({
            container: host.current,
            style: adapted,
            center: [initial.current?.lng ?? 0, initial.current?.lat ?? 20],
            zoom: 9,
            attributionControl: true,
            cooperativeGestures: true,
          });
          map.current.addControl(
            new maplibregl.NavigationControl(),
            "top-left",
          );
          map.current.on("zoomend", () => {
            if (active) setViewportVersion((version) => version + 1);
          });
          map.current.on("style.load", () => {
            if (active) setStyleVersion((version) => version + 1);
          });
          map.current.on("idle", () => {
            clearTimeout(timer);
            if (active && !hadError) setTileState("ready");
          });
          map.current.on("error", () => {
            hadError = true;
            if (active) setTileState("error");
          });
        }
      } catch (error) {
        if (active && error.name !== "AbortError") setTileState("error");
      }
    }
    style();
    const observer = new MutationObserver(style);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    const resize = new ResizeObserver(() => map.current?.resize());
    resize.observe(host.current);
    return () => {
      active = false;
      controller.abort();
      clearTimeout(timer);
      observer.disconnect();
      resize.disconnect();
      map.current?.remove();
      map.current = null;
    };
  }, []);
  useEffect(() => {
    if (!styleVersion || !map.current) return;
    const points = itemsRef.current.filter(
      (item) => Number.isFinite(item.lat) && Number.isFinite(item.lng),
    );
    const dark = document.documentElement.dataset.theme === "dark";
    if (points.length && lastBounds.current !== signature) {
      const bounds = new maplibregl.LngLatBounds();
      for (const item of points) bounds.extend([item.lng, item.lat]);
      map.current.fitBounds(bounds, { padding: 65, maxZoom: 12, duration: 0 });
      lastBounds.current = signature;
    }
    const groups = new Map();
    for (const item of points) {
      const position = map.current.project([item.lng, item.lat]);
      const nearby = [...groups.keys()].find((key) => {
        const [x, y] = key.split(",").map(Number);
        return Math.hypot(position.x - x, position.y - y) < 54;
      });
      const key = nearby || `${position.x},${position.y}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    }
    const created = [...groups.values()].map((group) => {
      const item = group[0],
        button = document.createElement("button");
      button.className = "map-marker";
      button.textContent =
        group.length > 1
          ? `${group.length}`
          : item.dayIndex !== undefined
            ? `D${item.dayIndex + 1}·${item.stopIndex + 1}`
            : String(points.indexOf(item) + 1);
      button.setAttribute(
        "aria-label",
        group.length > 1
          ? `${group.length} stops at ${item.name}. Choose a stop`
          : `${item.dayIndex !== undefined ? `Day ${item.dayIndex + 1}, stop ${item.stopIndex + 1}: ` : ""}${item.name}`,
      );
      if (
        item.dayIndex !== undefined &&
        group.every((point) => point.dayIndex === item.dayIndex)
      )
        button.style.setProperty(
          "--marker-color",
          dayColor(item.dayIndex, dark),
        );
      button.onclick = () => {
        if (group.length > 1) setOverlap(group);
        else {
          setOverlap(null);
          callback.current?.(item, button);
        }
      };
      const marker = new maplibregl.Marker({ element: button })
        .setLngLat([item.lng, item.lat])
        .addTo(map.current);
      return { group, marker, button };
    });
    markers.current = created;
    const geo = connect
      ? routeFeatures(points, dark)
      : { type: "FeatureCollection", features: [] };
    if (map.current.getSource("route"))
      map.current.getSource("route").setData(geo);
    else {
      map.current.addSource("route", { type: "geojson", data: geo });
      map.current.addLayer({
        id: "route-halo",
        type: "line",
        source: "route",
        paint: { "line-color": dark ? "#122c40" : "#ffffff", "line-width": 7 },
      });
      map.current.addLayer({
        id: "route",
        type: "line",
        source: "route",
        paint: {
          "line-color": ["get", "color"],
          "line-width": 3,
          "line-dasharray": [2, 2],
        },
      });
    }
    return () => {
      created.forEach(({ marker }) => marker.remove());
      markers.current = [];
    };
  }, [signature, styleVersion, connect, viewportVersion]);
  useEffect(() => {
    for (const marker of markers.current) {
      const active = marker.group.some((item) => markerId(item) === selected);
      marker.button.classList.toggle("selected", active);
      marker.button.setAttribute("aria-pressed", String(active));
    }
  }, [selected, signature, styleVersion, viewportVersion]);
  useEffect(() => {
    const item = itemsRef.current.find((point) => markerId(point) === selected);
    if (item && Number.isFinite(item.lng) && map.current)
      map.current.easeTo({
        center: [item.lng, item.lat],
        offset: matchMedia("(min-width: 760px)").matches ? [-90, -80] : [0, 0],
        duration: reduced() ? 0 : 300,
      });
  }, [selected]);
  return (
    <div className="map-panel" data-map-state={tileState}>
      <div
        ref={host}
        role="region"
        className="map-canvas"
        aria-label="Destination map. All places are also available in the list."
      />
      {tileState === "ready" && (
        <button
          className="map-fit"
          onClick={() => {
            const valid = itemsRef.current.filter(
              (item) => Number.isFinite(item.lng) && Number.isFinite(item.lat),
            );
            if (!valid.length) return;
            const bounds = new maplibregl.LngLatBounds();
            valid.forEach((item) => bounds.extend([item.lng, item.lat]));
            map.current.fitBounds(bounds, {
              padding: 65,
              maxZoom: 12,
              duration: reduced() ? 0 : 300,
            });
          }}
        >
          Fit places
        </button>
      )}
      {tileState === "loading" && (
        <p className="map-error" role="status">
          Loading the basemap. The place list is ready.
        </p>
      )}
      {tileState === "error" && (
        <p className="map-error" role="status">
          Map tiles unavailable. Continue using the place list.
        </p>
      )}
      {overlap && (
        <div className="overlap-picker">
          <strong>Choose a stop</strong>
          <button className="text-button" onClick={() => setOverlap(null)}>
            Close stop choices
          </button>
          {overlap.map((item) => (
            <button
              className={item.dayIndex !== undefined ? "day-choice" : ""}
              style={
                item.dayIndex !== undefined
                  ? dayStyle(item.dayIndex)
                  : undefined
              }
              key={markerId(item)}
              onClick={() => {
                setOverlap(null);
                const origin = markers.current.find((marker) =>
                  marker.group.some(
                    (point) => markerId(point) === markerId(item),
                  ),
                )?.button;
                origin?.focus({ preventScroll: true });
                callback.current?.(item, origin);
              }}
            >
              {item.dayIndex !== undefined
                ? `Day ${item.dayIndex + 1} · Stop ${item.stopIndex + 1} · `
                : ""}
              {item.name}
            </button>
          ))}
        </div>
      )}
      {children}
      <small className="map-caption">
        {connect
          ? "Ordered stops · straight connections, not navigation"
          : "Explore places · select a marker or list item"}
      </small>
    </div>
  );
}
