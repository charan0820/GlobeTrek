import React, { useEffect, useRef, useState } from "react";
import {
  Home,
  Scan,
  Plus,
  Minus,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  RotateCw,
} from "lucide-react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { dayColor, markerId } from "./presentation.js";
import { terrainPoint } from "./relief-layout.js";
const controlIcons = {
  reset: Home,
  fit: Scan,
  in: Plus,
  out: Minus,
  left: ArrowLeft,
  right: ArrowRight,
  up: ArrowUp,
  down: ArrowDown,
  "rotate-left": RotateCcw,
  "rotate-right": RotateCw,
};
export default function CountryModel({
  country,
  items = [],
  selected,
  onSelect,
  connect = false,
  cameraState,
  children,
}) {
  const host = useRef(),
    engine = useRef(),
    latest = useRef({ items, selected, onSelect, connect }),
    buttons = useRef(new Map());
  const [status, setStatus] = useState("loading"),
    [metadata, setMetadata] = useState(null),
    [overlap, setOverlap] = useState(null);
  const [dark, setDark] = useState(
    () => document.documentElement.dataset.theme === "dark",
  );
  const selectedItem = items.find((item) => markerId(item) === selected),
    selectedLat = selectedItem?.lat,
    selectedLng = selectedItem?.lng;
  latest.current = { items, selected, onSelect, connect };
  useEffect(() => {
    const controller = new AbortController();
    let disposed = false,
      renderer,
      controls,
      resize,
      observer,
      frame,
      model;
    const scene = new THREE.Scene(),
      camera = new THREE.PerspectiveCamera(38, 1, 0.1, 2000),
      routes = new THREE.Group();
    scene.add(routes);
    const positions = new Map();
    function theme() {
      const dark = document.documentElement.dataset.theme === "dark";
      setDark(dark);
      scene.background = null;
      scene.traverse((object) => {
        if (object.isMesh) {
          object.material.color.set(dark ? "#b7c6b0" : "#ffffff");
        }
        if (object.isLine && object.userData.day != null)
          object.material.color.set(dayColor(object.userData.day, dark));
      });
      invalidate();
    }
    function render() {
      frame = null;
      if (disposed || !renderer || !host.current) return;
      controls.update();
      camera.updateMatrixWorld();
      renderer.render(scene, camera);
      host.current.dataset.renderFrames = String(
        Number(host.current.dataset.renderFrames || 0) + 1,
      );
      host.current.dataset.renderTriangles = String(
        renderer.info.render.triangles,
      );
      const box = host.current.getBoundingClientRect();
      positions.clear();
      for (const item of latest.current.items) {
        if (
          !Number.isFinite(item.lat) ||
          !Number.isFinite(item.lng) ||
          !engine.current?.metadata
        )
          continue;
        const p = terrainPoint(engine.current.metadata, item.lng, item.lat),
          world = new THREE.Vector3(p.x, p.y + 1, p.z),
          screen = world.clone().project(camera),
          element = buttons.current.get(markerId(item));
        const visible =
          screen.z > -1 &&
          screen.z < 1 &&
          Math.abs(screen.x) < 0.96 &&
          Math.abs(screen.y) < 0.94;
        if (element) {
          element.hidden = !visible;
          element.style.left = `${((screen.x + 1) / 2) * box.width}px`;
          element.style.top = `${((1 - screen.y) / 2) * box.height}px`;
        }
        if (visible)
          positions.set(markerId(item), {
            x: (screen.x * box.width) / 2,
            y: (screen.y * box.height) / 2,
            item,
          });
      }
      const consumed = new Set();
      for (const [key, point] of positions) {
        if (consumed.has(key)) continue;
        const group = [...positions].filter(
          ([, other]) => Math.hypot(other.x - point.x, other.y - point.y) < 32,
        );
        const representative =
          group.find(([id]) => id === latest.current.selected) || group[0];
        for (const [id, value] of group) {
          consumed.add(id);
          const element = buttons.current.get(id);
          if (!element) continue;
          element.hidden = id !== representative[0];
          if (id === representative[0]) {
            element.textContent =
              group.length > 1
                ? String(group.length)
                : value.item.dayIndex != null
                  ? `D${value.item.dayIndex + 1}·${value.item.stopIndex + 1}`
                  : String(latest.current.items.indexOf(value.item) + 1);
            element.setAttribute(
              "aria-label",
              group.length > 1
                ? `${group.length} places near ${value.item.name}. Choose a place`
                : `${value.item.dayIndex != null ? `Day ${value.item.dayIndex + 1}, stop ${value.item.stopIndex + 1}: ` : ""}${value.item.name}`,
            );
          }
        }
      }
      for (const region of engine.current?.metadata?.regions || []) {
        const label = host.current.querySelector(
          `[data-region="${region.id}"]`,
        );
        if (!label) continue;
        const p = new THREE.Vector3(
          region.offset[0],
          0,
          region.offset[1] + 18,
        ).project(camera);
        label.hidden = p.z > 1 || Math.abs(p.x) > 1.05 || Math.abs(p.y) > 1.05;
        label.style.left = `${Math.max(label.offsetWidth / 2 + 6, Math.min(box.width - label.offsetWidth / 2 - 6, ((p.x + 1) / 2) * box.width))}px`;
        label.style.top = `${Math.max(6, Math.min(box.height - label.offsetHeight - 6, ((1 - p.y) / 2) * box.height))}px`;
      }
    }
    function invalidate() {
      if (!frame && !disposed) frame = requestAnimationFrame(render);
    }
    function framingDistance(bounds, direction, aspect) {
      const center = bounds.getCenter(new THREE.Vector3()),
        right = new THREE.Vector3()
          .crossVectors(new THREE.Vector3(0, 1, 0), direction)
          .normalize(),
        up = new THREE.Vector3().crossVectors(direction, right),
        tan = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
      let distance = 25;
      for (const x of [bounds.min.x, bounds.max.x])
        for (const y of [bounds.min.y, bounds.max.y])
          for (const z of [bounds.min.z, bounds.max.z]) {
            const relative = new THREE.Vector3(x, y, z).sub(center),
              depth = relative.dot(direction);
            distance = Math.max(
              distance,
              depth + Math.abs(relative.dot(right)) / (tan * aspect * 0.8),
              depth + Math.abs(relative.dot(up)) / (tan * 0.8),
            );
          }
      return distance;
    }
    function adaptFraming(bounds, previousAspect, nextAspect) {
      const direction = camera.position.clone().sub(controls.target),
        oldDistance = direction.length();
      direction.normalize();
      const ratio =
        framingDistance(bounds, direction, nextAspect) /
        framingDistance(bounds, direction, previousAspect);
      camera.position
        .copy(controls.target)
        .addScaledVector(direction, oldDistance * ratio);
      controls.update();
    }
    function fit(points) {
      const bounds = new THREE.Box3();
      for (const p of points)
        bounds.expandByPoint(new THREE.Vector3(p.x, p.y || 0, p.z));
      if (bounds.isEmpty()) return;
      const center = bounds.getCenter(new THREE.Vector3()),
        direction = new THREE.Vector3(0, 1, 0.65).normalize(),
        up = new THREE.Vector3(0, direction.z, -direction.y),
        tan = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
      let distance = 25;
      for (const x of [bounds.min.x, bounds.max.x])
        for (const y of [bounds.min.y, bounds.max.y])
          for (const z of [bounds.min.z, bounds.max.z]) {
            const relative = new THREE.Vector3(x, y, z).sub(center),
              depth = relative.dot(direction);
            distance = Math.max(
              distance,
              depth + Math.abs(relative.x) / (tan * camera.aspect * 0.8),
              depth + Math.abs(relative.dot(up)) / (tan * 0.8),
            );
          }
      controls.target.copy(center);
      camera.position.copy(center).add(direction.multiplyScalar(distance));
      controls.update();
      invalidate();
    }
    async function load() {
      try {
        const response = await fetch("/relief/manifest.json", {
          signal: controller.signal,
        });
        if (!response.ok) throw Error("Manifest unavailable");
        const manifest = await response.json(),
          entry = manifest.countries.find((c) => c.code === country);
        if (!entry) throw Error("Model unavailable");
        const [metaResponse, modelResponse] = await Promise.all([
          fetch(entry.metadata.file, { signal: controller.signal }),
          fetch(
            (matchMedia("(max-width:759px)").matches
              ? entry.mobile
              : entry.desktop
            ).file,
            { signal: controller.signal },
          ),
        ]);
        if (!metaResponse.ok || !modelResponse.ok)
          throw Error("Terrain unavailable");
        const meta = await metaResponse.json(),
          bytes = await modelResponse.arrayBuffer();
        const gltf = await new GLTFLoader().parseAsync(bytes, "");
        model = gltf.scene;
        if (disposed || !host.current) {
          model.traverse((o) => {
            o.geometry?.dispose();
            o.material?.dispose();
          });
          return;
        }
        renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: true,
          powerPreference: "low-power",
        });
        renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
        renderer.setClearColor(0, 0);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        host.current.prepend(renderer.domElement);
        renderer.domElement.setAttribute(
          "aria-label",
          "Country relief. Drag to rotate; use buttons to zoom or pan.",
        );
        controls = new OrbitControls(camera, renderer.domElement);
        controls.maxPolarAngle = Math.PI / 2 - 0.12;
        controls.minPolarAngle = 0.12;
        controls.minDistance = 10;
        controls.maxDistance = 800;
        controls.enableDamping = false;
        renderer.domElement.style.touchAction = "pan-y";
        const wheel = (event) => {
          if (!event.ctrlKey && !event.metaKey)
            event.stopImmediatePropagation();
        };
        renderer.domElement.addEventListener("wheel", wheel, { capture: true });
        scene.add(model, new THREE.HemisphereLight("#fff8e7", "#64776e", 0.9));
        const sun = new THREE.DirectionalLight("#ffffff", 1.8);
        sun.position.set(-50, 90, 60);
        scene.add(sun);
        engine.current = {
          camera,
          controls,
          metadata: meta,
          invalidate,
          positions,
          fit,
          scene,
          routes,
        };
        setMetadata(meta);
        const bounds = new THREE.Box3().setFromObject(model);
        resize = new ResizeObserver(([entry]) => {
          if (entry.contentRect.width <= 0 || entry.contentRect.height <= 0)
            return;
          const nextAspect = entry.contentRect.width / entry.contentRect.height;
          if (Math.abs(nextAspect - camera.aspect) > 0.001)
            adaptFraming(bounds, camera.aspect, nextAspect);
          camera.aspect = nextAspect;
          camera.updateProjectionMatrix();
          renderer.setSize(entry.contentRect.width, entry.contentRect.height);
          invalidate();
        });
        resize.observe(host.current);
        camera.aspect = host.current.clientWidth / host.current.clientHeight;
        camera.updateProjectionMatrix();
        if (cameraState?.current) {
          camera.position.fromArray(cameraState.current.position);
          controls.target.fromArray(cameraState.current.target);
          controls.update();
          if (cameraState.current.aspect)
            adaptFraming(bounds, cameraState.current.aspect, camera.aspect);
        } else fit([bounds.min, bounds.max]);
        controls.addEventListener("change", invalidate);
        observer = new MutationObserver(theme);
        observer.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ["data-theme"],
        });
        theme();
        setStatus("ready");
      } catch (error) {
        if (!disposed && error.name !== "AbortError") setStatus("error");
      }
    }
    load();
    return () => {
      disposed = true;
      controller.abort();
      cancelAnimationFrame(frame);
      resize?.disconnect();
      observer?.disconnect();
      if (cameraState && controls)
        cameraState.current = {
          position: camera.position.toArray(),
          target: controls.target.toArray(),
          aspect: camera.aspect,
        };
      controls?.dispose();
      scene.traverse((o) => {
        o.geometry?.dispose();
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
        else o.material?.dispose();
      });
      renderer?.dispose();
      renderer?.domElement.remove();
      engine.current = null;
    };
  }, [country, cameraState]);
  useEffect(() => {
    const e = engine.current;
    if (!e) return;
    while (e.routes.children.length) {
      const child = e.routes.children[0];
      e.routes.remove(child);
      child.geometry.dispose();
      child.material.dispose();
    }
    if (connect) {
      const days = new Map();
      for (const item of items) {
        if (!Number.isFinite(item.lng) || !Number.isFinite(item.lat)) continue;
        const day = item.dayIndex ?? 0;
        if (!days.has(day)) days.set(day, []);
        days.get(day).push(terrainPoint(e.metadata, item.lng, item.lat));
      }
      for (const [day, points] of days)
        for (let i = 1; i < points.length; i++) {
          const a = points[i - 1],
            b = points[i];
          if (a.region !== b.region) continue;
          const line = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
              new THREE.Vector3(a.x, a.y + 0.65, a.z),
              new THREE.Vector3(b.x, b.y + 0.65, b.z),
            ]),
            new THREE.LineBasicMaterial({
              color: dayColor(
                day,
                document.documentElement.dataset.theme === "dark",
              ),
              depthTest: false,
            }),
          );
          line.renderOrder = 3;
          line.userData.day = day;
          e.routes.add(line);
        }
    }
    e.invalidate();
  }, [items, connect, status]);
  useEffect(() => {
    const e = engine.current,
      lat = selectedLat,
      lng = selectedLng;
    if (!e || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const p = terrainPoint(e.metadata, lng, lat),
      screen = new THREE.Vector3(p.x, p.y, p.z).project(e.camera),
      delta = new THREE.Vector3(p.x, 0, p.z).sub(e.controls.target);
    if (Math.abs(screen.x) < 0.8 && Math.abs(screen.y) < 0.7) return;
    e.camera.position.add(delta);
    e.controls.target.add(delta);
    e.controls.update();
    e.invalidate();
  }, [selected, selectedLat, selectedLng, status]);
  function operate(action) {
    const e = engine.current;
    if (!e) return;
    if (action === "fit") {
      e.fit(
        items
          .filter((i) => Number.isFinite(i.lat))
          .map((i) => terrainPoint(e.metadata, i.lng, i.lat)),
      );
      return;
    }
    if (action === "reset") {
      const box = new THREE.Box3().setFromObject(e.scene.children[1]);
      e.fit([box.min, box.max]);
      return;
    }
    if (action === "in" || action === "out") {
      e.camera.position
        .sub(e.controls.target)
        .multiplyScalar(action === "in" ? 0.8 : 1.25)
        .clampLength(10, 800)
        .add(e.controls.target);
    } else if (action === "rotate-left" || action === "rotate-right") {
      e.camera.position
        .sub(e.controls.target)
        .applyAxisAngle(
          new THREE.Vector3(0, 1, 0),
          action === "rotate-left" ? 0.2 : -0.2,
        )
        .add(e.controls.target);
    } else {
      const delta = new THREE.Vector3(
        action === "left" ? -8 : action === "right" ? 8 : 0,
        0,
        action === "up" ? -8 : action === "down" ? 8 : 0,
      );
      e.camera.position.add(delta);
      e.controls.target.add(delta);
    }
    e.controls.update();
    e.invalidate();
  }
  const regionalConnections = [];
  if (connect && metadata) {
    const previousByDay = new Map();
    for (const item of items) {
      if (!Number.isFinite(item.lat) || !Number.isFinite(item.lng)) continue;
      const day = item.dayIndex ?? 0,
        point = terrainPoint(metadata, item.lng, item.lat),
        previous = previousByDay.get(day);
      if (previous && previous.region !== point.region)
        regionalConnections.push(
          `Day ${day + 1}: ${previous.name} → ${item.name}`,
        );
      previousByDay.set(day, { region: point.region, name: item.name });
    }
  }
  return (
    <div className="relief-view">
      {status === "ready" && (
        <>
          <div className="terrain-controls" aria-label="Relief controls">
            {[
              [
                "Frame",
                [
                  ["reset", "Reset view"],
                  ["fit", "Fit places"],
                ],
              ],
              [
                "Zoom",
                [
                  ["in", "Zoom in"],
                  ["out", "Zoom out"],
                ],
              ],
              [
                "Pan",
                [
                  ["left", "Pan left"],
                  ["right", "Pan right"],
                  ["up", "Pan north"],
                  ["down", "Pan south"],
                ],
              ],
              [
                "Rotate",
                [
                  ["rotate-left", "Rotate left"],
                  ["rotate-right", "Rotate right"],
                ],
              ],
            ].map(([group, actions]) => (
              <div
                className="terrain-control-group"
                role="group"
                aria-label={group}
                key={group}
              >
                {actions.map(([action, label]) => {
                  const Icon = controlIcons[action];
                  return (
                    <button
                      className="terrain-icon-control"
                      key={action}
                      aria-label={label}
                      title={label}
                      onClick={() => operate(action)}
                    >
                      <Icon size={19} aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </>
      )}
      <div className="country-model" ref={host} data-model-state={status}>
        {status === "loading" && (
          <p className="terrain-status" role="status">
            Loading geographic relief… The list is ready.
          </p>
        )}
        {status === "error" && (
          <p className="terrain-status" role="status">
            Relief could not load. Choose Detailed map or List to continue.
          </p>
        )}
        {status === "ready" && (
          <>
            <div className="relief-pins">
              {items
                .filter((i) => Number.isFinite(i.lat) && Number.isFinite(i.lng))
                .map((item, index) => (
                  <button
                    hidden
                    key={markerId(item)}
                    ref={(el) => {
                      if (el) buttons.current.set(markerId(item), el);
                      else buttons.current.delete(markerId(item));
                    }}
                    className={`relief-pin${selected === markerId(item) ? " selected" : ""}`}
                    style={{
                      "--pin-color":
                        item.dayIndex != null
                          ? dayColor(item.dayIndex, dark)
                          : undefined,
                    }}
                    aria-label={`${item.dayIndex != null ? `Day ${item.dayIndex + 1}, stop ${item.stopIndex + 1}: ` : ""}${item.name}`}
                    onClick={(event) => {
                      const e = engine.current,
                        p = e?.positions.get(markerId(item));
                      const group = p
                        ? [...e.positions.values()]
                            .filter(
                              (v) => Math.hypot(v.x - p.x, v.y - p.y) < 32,
                            )
                            .map((v) => v.item)
                        : [item];
                      if (group.length > 1) setOverlap(group);
                      else onSelect?.(item, event.currentTarget);
                    }}
                  >
                    {item.dayIndex != null
                      ? `D${item.dayIndex + 1}·${item.stopIndex + 1}`
                      : index + 1}
                  </button>
                ))}
            </div>
            {metadata?.regions
              .filter((r) => r.inset)
              .map((r) => (
                <span key={r.id} data-region={r.id} className="inset-label">
                  {r.label} · inset
                </span>
              ))}
            {overlap && (
              <div
                className="relief-overlap"
                aria-label="Choose an overlapping stop"
              >
                <h3>Choose a place</h3>
                {overlap.map((item) => (
                  <button
                    key={markerId(item)}
                    onClick={(event) => {
                      setOverlap(null);
                      onSelect?.(item, event.currentTarget);
                    }}
                  >
                    {item.dayIndex != null
                      ? `D${item.dayIndex + 1} · ${item.stopIndex + 1} `
                      : ""}
                    {item.name}
                  </button>
                ))}
                <button onClick={() => setOverlap(null)}>Close choices</button>
              </div>
            )}
          </>
        )}
      </div>
      {status === "ready" && (
        <>
          <div className="region-shortcuts" aria-label="Regions">
            {metadata?.regions.map((r) => (
              <button
                key={r.id}
                onClick={() =>
                  engine.current.fit([
                    { x: r.offset[0] - 18, z: r.offset[1] - 18 },
                    { x: r.offset[0] + 18, z: r.offset[1] + 18 },
                  ])
                }
              >
                {r.label}
              </button>
            ))}
          </div>
          {regionalConnections.length > 0 && (
            <p className="terrain-note">
              Between inset regions: {regionalConnections.join("; ")}. These
              segments are listed, not drawn to scale.
            </p>
          )}
          <p className="terrain-note">
            Real geographic relief · heights exaggerated ×
            {metadata?.heightExaggeration} · Ctrl/⌘ + wheel to zoom. Insets are
            not distance-scaled.{" "}
            <a
              href="/relief/TERRAIN-ATTRIBUTION.md"
              target="_blank"
              rel="noreferrer"
            >
              Elevation sources
            </a>{" "}
            · Natural Earth
          </p>
        </>
      )}
      {children}
    </div>
  );
}
