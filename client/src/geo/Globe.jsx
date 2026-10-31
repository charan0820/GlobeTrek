import React, { useEffect, useMemo, useRef, useState } from "react";
import { MeshPhongMaterial, Vector2, Vector3, Raycaster, Sphere } from "three";
import Globe from "react-globe.gl";
import {
  countryHeight,
  containsCountryPoint,
  fitGlobeAltitude,
  layoutGlobeLabels,
} from "./globe-layout.js";
export default function WorldGlobe({
  countries,
  selected,
  onSelect,
  onEnter,
  entry,
}) {
  const globe = useRef(),
    host = useRef();
  const oriented = useRef(false);
  const labels = useRef(new Map());
  const pointer = useRef(null),
    nativeClicks = useRef(0),
    tapFrame = useRef(0);
  const clickTimer = useRef(),
    lastClick = useRef(null);
  useEffect(() => () => clearTimeout(clickTimer.current), []);
  function activate(country) {
    if (!onEnter) {
      onSelect(country);
      return;
    }
    const now = performance.now(),
      previous = lastClick.current;
    clearTimeout(clickTimer.current);
    if (previous?.code === country.code && now - previous.at < 320) {
      lastClick.current = null;
      onEnter(country);
    } else {
      lastClick.current = { code: country.code, at: now };
      clickTimer.current = setTimeout(() => onSelect(country), 320);
    }
  }
  useEffect(() => () => cancelAnimationFrame(tapFrame.current), []);
  const material = useMemo(
    () => new MeshPhongMaterial({ color: "#a9c4c4", shininess: 2 }),
    [],
  );
  const [polygons, setPolygons] = useState([]),
    [size, setSize] = useState({ width: 600, height: 560 }),
    [failed, setFailed] = useState(false),
    [ready, setReady] = useState(false),
    [attempt, setAttempt] = useState(0),
    [hovered, setHovered] = useState(null),
    [reduced, setReduced] = useState(
      () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
  const dimensions = useRef(size);
  useEffect(() => {
    if (!entry || !ready || !globe.current) return;
    clearTimeout(clickTimer.current);
    globe.current.pointOfView(
      { lat: entry.country.lat, lng: entry.country.lng, altitude: 0.38 },
      reduced ? 0 : 600,
    );
  }, [entry, ready, reduced]);
  useEffect(() => {
    dimensions.current = size;
  }, [size]);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const [dark, setDark] = useState(
    () => document.documentElement.dataset.theme === "dark",
  );
  useEffect(() => {
    const observer = new MutationObserver(() =>
      setDark(document.documentElement.dataset.theme === "dark"),
    );
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    material.color.set(dark ? "#416569" : "#a9c4c4");
  }, [material, dark]);
  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      for (let retry = 0; retry < 3; retry++) {
        try {
          if (retry)
            await new Promise((resolve) => setTimeout(resolve, retry * 500));
          if (controller.signal.aborted) return;
          const response = await fetch("/countries.geojson", {
            signal: controller.signal,
            cache: "no-cache",
          });
          if (!response.ok) throw Error("Country boundaries unavailable");
          const data = await response.json();
          if (
            data.type !== "FeatureCollection" ||
            !Array.isArray(data.features) ||
            !data.features.length
          )
            throw Error("Invalid country boundaries");
          if (!controller.signal.aborted) setPolygons(data.features);
          return;
        } catch (error) {
          if (controller.signal.aborted || error.name === "AbortError") return;
          if (retry === 2) setFailed(true);
        }
      }
    }
    load();
    const observer = new ResizeObserver(([entry]) =>
      setSize({
        width: Math.round(entry.contentRect.width),
        height: Math.max(1, Math.round(entry.contentRect.height)),
      }),
    );
    observer.observe(host.current);
    return () => {
      controller.abort();
      observer.disconnect();
    };
  }, [attempt]);
  useEffect(() => {
    if (!selected || !ready || !globe.current || entry) return;
    globe.current.controls().enableZoom = false;
    globe.current.pointOfView(
      {
        lat: selected.lat,
        lng: selected.lng,
        altitude: fitGlobeAltitude(
          dimensions.current.width,
          dimensions.current.height,
          globe.current.camera().fov,
        ),
      },
      !oriented.current ||
        matchMedia("(prefers-reduced-motion: reduce)").matches
        ? 0
        : 450,
    );
    oriented.current = true;
  }, [selected, ready, entry]);
  useEffect(() => {
    if (ready && globe.current)
      globe.current.pointOfView(
        {
          altitude: fitGlobeAltitude(
            size.width,
            size.height,
            globe.current.camera().fov,
          ),
        },
        0,
      );
  }, [ready, size.width, size.height]);
  useEffect(() => {
    if (!ready || !globe.current) return;
    const instance = globe.current,
      controls = instance.controls();
    let frame = 0,
      active = true;
    function positionLabels() {
      frame = 0;
      if (!active || !host.current) return;
      const camera = instance.camera(),
        direction = camera.position.clone().normalize();
      // OrbitControls emits before the renderer updates the camera matrices.
      // Project against this frame's camera, including a just-resized aspect.
      camera.aspect = size.width / size.height;
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
      const horizon =
        instance.getGlobeRadius() / camera.position.length() + 0.025;
      const candidates = [];
      for (const country of countries) {
        const element = labels.current.get(country.code);
        if (!element) continue;
        const altitude =
          countryHeight(country.code, selected?.code, hovered) + 0.018;
        const coords = instance.getCoords(country.lat, country.lng, altitude);
        const visible =
          new Vector3(coords.x, coords.y, coords.z).normalize().dot(direction) >
          horizon;
        const point = instance.getScreenCoords(
          country.lat,
          country.lng,
          altitude,
        );
        const surface = instance.getScreenCoords(
          country.lat,
          country.lng,
          countryHeight(country.code, selected?.code, hovered),
        );
        element.dataset.pointX = surface.x;
        element.dataset.pointY = surface.y;
        element.dataset.front = String(visible);
        element.dataset.altitude = countryHeight(
          country.code,
          selected?.code,
          hovered,
        );
        element.hidden = !visible;
        if (visible)
          candidates.push({
            code: country.code,
            x: point.x,
            y: point.y,
            width: element.offsetWidth,
            height: element.offsetHeight,
            priority:
              country.code === selected?.code
                ? 2
                : country.code === hovered
                  ? 1
                  : 0,
          });
      }
      for (const item of layoutGlobeLabels(
        candidates,
        size.width,
        size.height,
      )) {
        const element = labels.current.get(item.code);
        element.hidden = !item.visible;
        if (item.visible)
          element.style.transform = `translate(${item.left}px, ${item.top}px)`;
      }
      host.current.dataset.camera = JSON.stringify(instance.pointOfView());
    }
    function schedule() {
      if (!frame) frame = requestAnimationFrame(positionLabels);
    }
    controls.addEventListener("change", schedule);
    schedule();
    document.fonts.ready.then(() => {
      if (active) schedule();
    });
    return () => {
      active = false;
      cancelAnimationFrame(frame);
      controls.removeEventListener("change", schedule);
    };
  }, [ready, countries, selected, hovered, size]);
  const code = (p) => p.properties.ADM0_A3;
  const supported = (p) => countries.find((c) => c.iso3 === code(p));
  function finishPointer(event) {
    const start = pointer.current;
    pointer.current = null;
    if (!start || start.moved || event.button !== 0 || !globe.current) return;
    const { clientX, clientY } = event;
    const serial = nativeClicks.current;
    // The renderer's native click uses its previous hover hit. Reconcile a fast
    // tap only when that native callback did not run; never turn dragging into a click.
    cancelAnimationFrame(tapFrame.current);
    tapFrame.current = requestAnimationFrame(() => {
      tapFrame.current = requestAnimationFrame(() => {
        if (nativeClicks.current !== serial || !globe.current || !host.current)
          return;
        const rect = host.current.getBoundingClientRect();
        globe.current.camera().updateMatrixWorld();
        const raycaster = new Raycaster();
        raycaster.setFromCamera(
          new Vector2(
            ((clientX - rect.left) / rect.width) * 2 - 1,
            1 - ((clientY - rect.top) / rect.height) * 2,
          ),
          globe.current.camera(),
        );
        const intersection = raycaster.ray.intersectSphere(
          new Sphere(new Vector3(), globe.current.getGlobeRadius()),
          new Vector3(),
        );
        if (!intersection) return;
        const point = globe.current.toGeoCoords(intersection);
        const feature = polygons.find(
          (polygon) =>
            supported(polygon) &&
            containsCountryPoint(polygon.geometry, point.lat, point.lng),
        );
        if (feature) activate(supported(feature));
      });
    });
  }
  return (
    <div
      className="globe-host"
      ref={host}
      onPointerDownCapture={(event) => {
        pointer.current = { x: event.clientX, y: event.clientY, moved: false };
      }}
      onPointerMoveCapture={(event) => {
        if (
          pointer.current &&
          Math.hypot(
            event.clientX - pointer.current.x,
            event.clientY - pointer.current.y,
          ) > 5
        )
          pointer.current.moved = true;
      }}
      onPointerUpCapture={finishPointer}
      onPointerLeave={() => {
        setHovered(null);
        pointer.current = null;
      }}
      onPointerCancel={() => {
        setHovered(null);
        pointer.current = null;
        cancelAnimationFrame(tapFrame.current);
      }}
      role="region"
      data-globe-state={
        failed ? "error" : ready && polygons.length ? "ready" : "loading"
      }
      data-selected-country={selected?.code}
      data-globe-theme={dark ? "dark" : "light"}
      data-hovered-country={hovered || ""}
      aria-label="Interactive globe. Use the country list to open destinations with the keyboard."
    >
      {failed ? (
        <div className="globe-loading" role="status">
          <p>
            The globe's country data could not load. Choose a country from the
            list, or try again.
          </p>
          <button
            className="button secondary"
            onClick={() => {
              setFailed(false);
              setReady(false);
              oriented.current = false;
              setAttempt((value) => value + 1);
            }}
          >
            Retry globe
          </button>
        </div>
      ) : (
        <Globe
          ref={globe}
          {...size}
          backgroundColor="rgba(0,0,0,0)"
          globeMaterial={material}
          showAtmosphere={false}
          showGraticules
          polygonsData={polygons}
          polygonCapCurvatureResolution={2}
          polygonCapColor={(p) =>
            supported(p)?.code === selected?.code
              ? dark
                ? "#e4ab79"
                : "#a34b12"
              : supported(p)
                ? dark
                  ? "#b9b99b"
                  : "#e2d2af"
                : dark
                  ? "#829080"
                  : "#ded8c7"
          }
          polygonSideColor={(p) =>
            supported(p)?.code === selected?.code
              ? dark
                ? "#966c43"
                : "#70370f"
              : dark
                ? "#526355"
                : "#b7a17b"
          }
          polygonStrokeColor={(p) =>
            supported(p)?.code === selected?.code
              ? dark
                ? "#fff0d5"
                : "#65300e"
              : supported(p)
                ? dark
                  ? "#eee9dd"
                  : "#745832"
                : dark
                  ? "#536357"
                  : "#9d9e8e"
          }
          polygonAltitude={(p) =>
            countryHeight(supported(p)?.code, selected?.code, hovered)
          }
          polygonsTransitionDuration={reduced ? 0 : 300}
          onPolygonHover={(p) =>
            setHovered(p ? supported(p)?.code || null : null)
          }
          onPolygonClick={(p) => {
            nativeClicks.current++;
            const country = supported(p);
            if (country) activate(country);
          }}
          onGlobeReady={() => setReady(true)}
        />
      )}
      {!failed && (
        <div className="globe-labels" aria-hidden="true">
          {countries.map((country) => (
            <span
              key={country.code}
              hidden
              className={`globe-country-label${country.code === selected?.code ? " selected" : ""}`}
              data-country={country.code}
              ref={(element) => {
                if (element) labels.current.set(country.code, element);
                else labels.current.delete(country.code);
              }}
            >
              {country.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
