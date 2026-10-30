import React, { useEffect, useMemo, useRef, useState } from "react";
import { MeshPhongMaterial } from "three";
import Globe from "react-globe.gl";
export default function WorldGlobe({ countries, selected, onSelect }) {
  const globe = useRef(),
    host = useRef();
  const oriented = useRef(false);
  const material = useMemo(
    () => new MeshPhongMaterial({ color: "#102d40", shininess: 12 }),
    [],
  );
  const [polygons, setPolygons] = useState([]),
    [size, setSize] = useState({ width: 600, height: 560 }),
    [failed, setFailed] = useState(false),
    [ready, setReady] = useState(false),
    [attempt, setAttempt] = useState(0);
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
        height: Math.min(620, Math.max(360, entry.contentRect.width)),
      }),
    );
    observer.observe(host.current);
    return () => {
      controller.abort();
      observer.disconnect();
    };
  }, [attempt]);
  useEffect(() => {
    if (!selected || !ready || !globe.current) return;
    globe.current.controls().enableZoom = false;
    globe.current.pointOfView(
      { lat: selected.lat, lng: selected.lng, altitude: 1.8 },
      !oriented.current ||
        matchMedia("(prefers-reduced-motion: reduce)").matches
        ? 0
        : 450,
    );
    oriented.current = true;
  }, [selected, ready]);
  const code = (p) => p.properties.ADM0_A3;
  const supported = (p) => countries.find((c) => c.iso3 === code(p));
  return (
    <div
      className="globe-host"
      ref={host}
      role="region"
      data-globe-state={
        failed ? "error" : ready && polygons.length ? "ready" : "loading"
      }
      aria-label="Interactive globe. Use the country list for keyboard selection."
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
          showAtmosphere
          atmosphereColor="#557fa4"
          polygonsData={polygons}
          polygonCapCurvatureResolution={2}
          polygonCapColor={(p) =>
            supported(p)?.code === selected?.code
              ? "#4c83ef"
              : supported(p)
                ? "#567e94"
                : "#233e50"
          }
          polygonSideColor={() => "#183347"}
          polygonStrokeColor={() => "#8ca6b5"}
          polygonAltitude={(p) =>
            supported(p)?.code === selected?.code ? 0.03 : 0.015
          }
          polygonLabel={(p) => supported(p)?.name || ""}
          onPolygonClick={(p) => {
            const country = supported(p);
            if (country) onSelect(country);
          }}
          onGlobeReady={() => setReady(true)}
        />
      )}
    </div>
  );
}
