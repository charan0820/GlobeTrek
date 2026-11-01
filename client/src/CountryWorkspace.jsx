import {
  TabIndicator,
  IslandContent,
  EditorialTitle,
  FloatingPanel,
} from "./atlas-presentation.jsx";
import React, { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { useApi, QueryState, storageRead, Modal } from "./ui.jsx";
import { useNarrow } from "./place-ui.jsx";
import { DestinationReveal } from "./discovery-motion.jsx";
import { useAuth } from "./auth.jsx";
import { CountryCatalog, DetailContent } from "./discovery.jsx";
import { Planner, TripSetup, SignIn } from "./planner.jsx";
const Model = lazy(() => import("./geo/CountryModel.jsx"));

export default function CountryWorkspace() {
  const { code } = useParams();
  return <Workspace key={code} />;
}
function Workspace() {
  const { code } = useParams(),
    [params, setParams] = useSearchParams(),
    cameraState = useRef(null);
  const narrow = useNarrow();
  const closeDetailsRef = useRef(null);
  const country = useApi(`/countries/${code}`),
    mode = params.get("mode") === "plan" ? "plan" : "explore";
  const guest = storageRead("globetrek.draft.v1");
  const local =
    guest?.version === 1 &&
    Date.now() - guest.savedAt < 7 * 86400000 &&
    guest.draft?.country === code
      ? "local"
      : null;
  const tripId = params.get("new") === "1" ? null : params.get("trip") || local;
  const [visitedPlan, setVisitedPlan] = useState(mode === "plan");
  const item = params.get("item"),
    kind = params.get("kind") || "attractions";
  const detail = useApi(`/catalog/${kind}/${item}`, { enabled: Boolean(item) });
  useEffect(() => {
    if (!item || narrow) return;
    const origin = document.activeElement;
    closeDetailsRef.current?.focus({ preventScroll: true });
    return () => {
      const target = document.contains(origin)
        ? origin
        : document.querySelector(
            ".country-collection .is-selected .text-button,.stop-row.is-selected .stop-title",
          );
      target?.focus({ preventScroll: true });
    };
  }, [item, narrow]);
  function changeMode(next) {
    if (next === "plan") setVisitedPlan(true);
    setParams((old) => {
      const p = new URLSearchParams(old);
      p.set("mode", next);
      return p;
    });
  }
  return (
    <QueryState query={country}>
      {(c) => (
        <DestinationReveal
          identity={code}
          className="country-workspace"
          data-country-workspace={code}
        >
          <IslandContent
            id="country"
            title={`${c.name} · ${mode === "plan" ? "Build your trip" : "Explore"}`}
          >
            <button className="button" onClick={() => changeMode("plan")}>
              Build your trip
            </button>
            <div className="view-switch">
              {[
                ["model", "Model"],
                ["map", "Detailed map"],
                ["list", "List"],
              ].map(([view, label]) => (
                <button
                  key={view}
                  aria-pressed={(params.get("view") || "model") === view}
                  onClick={() =>
                    setParams((old) => {
                      const p = new URLSearchParams(old);
                      p.set("view", view);
                      return p;
                    })
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </IslandContent>
          <header className="country-workspace-heading">
            <div>
              <Link to="/" className="back-link">
                Explore the world
              </Link>
              <EditorialTitle>{c.name}</EditorialTitle>
              <p>{c.description}</p>
            </div>
            <nav
              className="workspace-modes"
              aria-label="Country workspace mode"
            >
              <button
                aria-pressed={mode === "explore"}
                onClick={() => changeMode("explore")}
              >
                <TabIndicator
                  active={mode === "explore"}
                  group="workspace-mode"
                />
                Explore
              </button>
              <button
                aria-pressed={mode === "plan"}
                onClick={() => changeMode("plan")}
              >
                <TabIndicator active={mode === "plan"} group="workspace-mode" />
                Build your trip
              </button>
            </nav>
          </header>
          <div hidden={mode !== "explore"}>
            <CountryCatalog
              countryData={c}
              activeWorkspace={mode === "explore"}
              cameraState={cameraState}
            />
          </div>
          {(visitedPlan || mode === "plan") && (
            <div hidden={mode !== "plan"}>
              {tripId ? (
                <Planner
                  tripId={tripId}
                  workspace={{
                    active: mode === "plan",
                    country: code,
                    cameraState,
                  }}
                />
              ) : (
                <div className="workspace-setup">
                  <FloatingPanel
                    title="Trip context"
                    storageKey="planning-left"
                  >
                    <h2>Your dates, your pace.</h2>
                    <p>
                      Attractions are planning stops. Add stays and scheduled
                      tours when you are ready.
                    </p>
                  </FloatingPanel>
                  <Suspense fallback={<p>Loading relief…</p>}>
                    {mode === "plan" && (
                      <Model
                        country={code}
                        items={c.cities}
                        cameraState={cameraState}
                      />
                    )}
                  </Suspense>
                  <FloatingPanel
                    title="Dates and travelers"
                    storageKey="planning-right"
                  >
                    <TripSetup embedded countryCode={code} />
                  </FloatingPanel>
                </div>
              )}
            </div>
          )}
          {item && !narrow && (
            <aside className="workspace-product" aria-label="Product details">
              <Link
                ref={closeDetailsRef}
                className="button secondary"
                to={`/countries/${code}?${new URLSearchParams([...params].filter(([key]) => key !== "item"))}`}
              >
                Close details
              </Link>
              <QueryState query={detail}>
                {(record) => (
                  <DetailContent
                    key={item}
                    item={record}
                    kind={kind}
                    embedded
                  />
                )}
              </QueryState>
            </aside>
          )}
          {item && narrow && (
            <Modal
              open
              onOpenChange={(open) => {
                if (!open)
                  setParams((old) => {
                    const p = new URLSearchParams(old);
                    p.delete("item");
                    return p;
                  });
              }}
              variant="country-details-sheet"
              title="Place and booking details"
              description="Inspect the destination and choose dates without leaving your country workspace."
            >
              <QueryState query={detail}>
                {(record) => (
                  <DetailContent
                    key={item}
                    item={record}
                    kind={kind}
                    embedded
                  />
                )}
              </QueryState>
            </Modal>
          )}
          <p className="fine-print country-workspace-source">
            Real destinations · Demo travel products and prices ·{" "}
            <a href={c.source} target="_blank" rel="noreferrer">
              Destination guide
            </a>
          </p>
        </DestinationReveal>
      )}
    </QueryState>
  );
}
export function PlannerEntry() {
  const { user, checking } = useAuth();
  const { id } = useParams(),
    [params] = useSearchParams(),
    guest = storageRead("globetrek.draft.v1");
  const trip = useApi(`/trips/${id}`, { enabled: id !== "local" && !!user });
  if (id === "local")
    return guest?.draft?.country ? (
      <Navigate
        replace
        to={`/countries/${guest.draft.country}?${new URLSearchParams({ mode: "plan", trip: "local", ...Object.fromEntries(params) })}`}
      />
    ) : (
      <Navigate replace to="/planner/new" />
    );
  if (checking) return <p role="status">Checking your session…</p>;
  if (!user) return <SignIn next={`/planner/${id}`} />;
  return (
    <QueryState query={trip}>
      {(t) => (
        <Navigate
          replace
          to={`/countries/${t.country}?${new URLSearchParams({ mode: "plan", trip: id, ...Object.fromEntries(params) })}`}
        />
      )}
    </QueryState>
  );
}
export function SetupEntry() {
  const [params] = useSearchParams();
  const code = params.get("country") || "JP",
    next = new URLSearchParams(params);
  next.delete("country");
  next.set("mode", "plan");
  if (params.get("template")) {
    next.set("new", "1");
    next.delete("trip");
  }
  return <Navigate replace to={`/countries/${code}?${next}`} />;
}
