import React, { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { MapPin } from "lucide-react";
import { useApi, QueryState, SearchField, Field } from "./ui.jsx";
import { PlacePhoto, PlacePreview, Duration } from "./place-ui.jsx";
import { Price, PriceCollection } from "./pricing.jsx";
import { groupPlaces, revealInContainer } from "./geo/presentation.js";
import GeoBoundary from "./geo/GeoBoundary.jsx";
const Model = lazy(() => import("./geo/CountryModel.jsx")),
  Map = lazy(() => import("./geo/Map.jsx"));
const kinds = [
  ["attractions", "Places"],
  ["stays", "Stays"],
  ["tours", "Tours"],
  ["templates", "Itineraries"],
  ["packages", "Packages"],
];
const id = (r) => String(r.id || r._id);
export default function CountryCatalog({
  countryData: c,
  activeWorkspace,
  cameraState,
}) {
  const { code } = useParams(),
    [params, setParams] = useSearchParams(),
    listRef = useRef(),
    origin = useRef();
  const kind = kinds.some(([k]) => k === params.get("kind"))
      ? params.get("kind")
      : "attractions",
    q = params.get("q") || "",
    cityId = params.get("cityId") || "",
    selected = params.get("place");
  const view = ["model", "map", "list"].includes(params.get("view"))
    ? params.get("view")
    : "model";
  const [search, setSearch] = useState(q),
    [composing, setComposing] = useState(false),
    [closed, setClosed] = useState(null);
  const detailId = params.get("item"),
    hadDetails = useRef(false);
  useEffect(() => {
    if (detailId) {
      hadDetails.current = true;
      setClosed(selected);
    } else if (hadDetails.current) {
      hadDetails.current = false;
      setClosed(null);
    }
  }, [detailId, selected]);
  const catalog = useApi(
    `/catalog?${new URLSearchParams({ country: code, kind, limit: "50", ...(q && { q }), ...(cityId && { cityId }) })}`,
  );
  function update(key, value, replace = false) {
    setParams(
      (old) => {
        const next = new URLSearchParams(old);
        if (value) next.set(key, value);
        else next.delete(key);
        if (["q", "cityId", "kind"].includes(key)) next.delete("place");
        return next;
      },
      { replace },
    );
  }
  useEffect(() => setSearch(q), [q]);
  useEffect(() => {
    if (composing || search === q) return;
    const timer = setTimeout(
      () =>
        setParams(
          (old) => {
            const next = new URLSearchParams(old);
            if (search) next.set("q", search);
            else next.delete("q");
            next.delete("place");
            return next;
          },
          { replace: true },
        ),
      300,
    );
    return () => clearTimeout(timer);
  }, [search, q, composing, setParams]);
  useEffect(() => {
    if (
      selected &&
      catalog.data &&
      !catalog.data.some((r) => id(r) === selected)
    )
      setParams(
        (old) => {
          const next = new URLSearchParams(old);
          next.delete("place");
          return next;
        },
        { replace: true },
      );
  }, [selected, catalog.data, setParams]);
  useEffect(() => {
    if (selected)
      revealInContainer(
        listRef.current,
        listRef.current?.querySelector(`[data-place-id="${selected}"]`),
      );
  }, [selected, view]);
  const active = catalog.data?.find((r) => id(r) === selected);
  function select(record, trigger = document.activeElement) {
    origin.current = trigger;
    setClosed(null);
    update("place", id(record));
  }
  const Engine = view === "model" ? Model : Map;
  return (
    <>
      <div className="workspace-explore-tools">
        <nav className="tabs" aria-label="Explore categories">
          {kinds.map(([key, label]) => (
            <button
              key={key}
              aria-current={kind === key ? "page" : undefined}
              onClick={() => update("kind", key)}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="view-switch" aria-label="Presentation">
          {[
            ["model", "Model"],
            ["map", "Detailed map"],
            ["list", "List"],
          ].map(([key, label]) => (
            <button
              key={key}
              aria-pressed={view === key}
              onClick={() => update("view", key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <QueryState query={catalog}>
        {(records) => (
          <PriceCollection records={records} kind={kind}>
            <div className={`country-explore-layout view-${view}`}>
              <aside className="country-context">
                <h2>Follow your curiosity.</h2>
                <p>
                  Choose places to inspect, then build a dated trip beside this
                  same country model.
                </p>
                <SearchField
                  value={search}
                  onChange={setSearch}
                  onCompositionChange={setComposing}
                  label="Search this collection"
                  placeholder="Search by name"
                />
                <Field label="City">
                  {(fieldId) => (
                    <select
                      id={fieldId}
                      value={cityId}
                      onChange={(e) => update("cityId", e.target.value)}
                    >
                      <option value="">All cities</option>
                      {[...c.cities]
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((city) => (
                          <option key={city.id} value={city.id}>
                            {city.name}
                          </option>
                        ))}
                    </select>
                  )}
                </Field>
                <p className="fine-print">
                  {records.length} results · Select a pin or a name for
                  photographs and information.
                </p>
              </aside>
              {view !== "list" && (
                <div className="country-geography">
                  <GeoBoundary>
                    {activeWorkspace && (
                      <Suspense
                        fallback={
                          <p role="status">
                            Loading geography. The collection is ready.
                          </p>
                        }
                      >
                        <Engine
                          country={code}
                          cameraState={cameraState}
                          items={records.map((r) => {
                            const city = c.cities.find(
                              (city) => city.id === r.days?.[0]?.cityId,
                            );
                            return !Number.isFinite(r.lat) && city
                              ? { ...r, lat: city.lat, lng: city.lng }
                              : r;
                          })}
                          selected={selected}
                          onSelect={select}
                          center={c.cities[0]}
                        />
                      </Suspense>
                    )}
                  </GeoBoundary>
                </div>
              )}
              <div
                className="place-list country-collection"
                ref={listRef}
                tabIndex={0}
                aria-label="Places grouped by city"
              >
                {!records.length && (
                  <div className="empty">
                    <h2>No places match yet.</h2>
                    <p>Try another city or clear your search.</p>
                  </div>
                )}
                {groupPlaces(records, c.cities).map((group) => (
                  <section className="city-group" key={group.name}>
                    <h2>
                      {group.name} <small>{group.items.length} results</small>
                    </h2>
                    {group.items.map((r) => (
                      <article
                        key={id(r)}
                        data-place-id={id(r)}
                        className={`place-row ${selected === id(r) ? "is-selected" : ""}`}
                      >
                        <button
                          className="photo-select"
                          aria-label={`Preview ${r.name}`}
                          onClick={(e) => select(r, e.currentTarget)}
                        >
                          <PlacePhoto record={r} compact />
                        </button>
                        <div className="place-copy">
                          <h3>
                            <button
                              className="text-button"
                              onClick={(e) => select(r, e.currentTarget)}
                            >
                              {r.name}
                            </button>
                          </h3>
                          <p className="place-city">
                            {r.city || r.coveredCities}
                            {r.demo ? " · Demo" : ""}
                          </p>
                          <Duration record={r} kind={kind} />
                          <Price record={r} kind={kind} />
                        </div>
                        <button
                          className="icon-button"
                          aria-label={`Show ${r.name} on model`}
                          onClick={(e) => select(r, e.currentTarget)}
                        >
                          <MapPin size={18} />
                        </button>
                      </article>
                    ))}
                  </section>
                ))}
              </div>
              {active && closed !== selected && activeWorkspace && (
                <PlacePreview
                  trigger={origin.current}
                  record={active}
                  kind={kind}
                  onAdd={
                    ["attractions", "stays", "tours"].includes(kind)
                      ? () => {
                          setParams((old) => {
                            const p = new URLSearchParams(old);
                            p.set("mode", "plan");
                            p.set(
                              kind === "attractions"
                                ? "add"
                                : kind === "tours"
                                  ? "addTour"
                                  : "addStay",
                              id(active),
                            );
                            return p;
                          });
                          setClosed(selected);
                        }
                      : undefined
                  }
                  addLabel="Add to your trip"
                  onClose={() => setClosed(selected)}
                  onShowList={() => {
                    update("view", "list");
                    setClosed(selected);
                  }}
                />
              )}
            </div>
          </PriceCollection>
        )}
      </QueryState>
    </>
  );
}
