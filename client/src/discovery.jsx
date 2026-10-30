import React, { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { ArrowRight, MapPin, ArrowUpRight } from "lucide-react";
import {
  useApi,
  QueryState,
  SearchField,
  Field,
  DateField,
  ErrorMessage,
  send,
} from "./ui.jsx";
import { useAuth } from "./auth.jsx";
import { dateOffset } from "./api.js";
import DestinationPhoto from "./DestinationPhoto.jsx";
import { PlacePhoto, PlacePreview, Duration, useNarrow } from "./place-ui.jsx";
import { groupPlaces, revealInContainer } from "./geo/presentation.js";
import GeoBoundary from "./geo/GeoBoundary.jsx";
import { addDays, formatMoney } from "../../shared/travel.js";
const WorldGlobe = lazy(() => import("./geo/Globe.jsx"));
const TravelMap = lazy(() => import("./geo/Map.jsx"));
const kinds = [
  ["attractions", "Places"],
  ["stays", "Stays"],
  ["tours", "Tours"],
  ["templates", "Itineraries"],
  ["packages", "Packages"],
];
export const recordId = (r) => r.id || r._id;
export function Discovery() {
  const query = useApi("/countries");
  const [selected, setSelected] = useState(null),
    [search, setSearch] = useState("");
  const [committed, setCommitted] = useState(""),
    [composing, setComposing] = useState(false);
  useEffect(() => {
    if (composing) return;
    const timer = setTimeout(() => setCommitted(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search, composing]);
  const suggestions = useApi(`/search?q=${encodeURIComponent(committed)}`, {
    enabled: committed.length >= 2,
  });
  return (
    <QueryState query={query}>
      {(countries) => {
        const active = selected || countries.find((c) => c.code === "JP");
        return (
          <>
            <section className="discovery-hero">
              <div className="discovery-copy">
                <h1>
                  A world to explore.
                  <br />
                  <span>A journey of your own.</span>
                </h1>
                <p>
                  Find the places that move you. Bring them together into a trip
                  that feels like yours.
                </p>
                <SearchField
                  value={search}
                  onChange={(value) => {
                    setSearch(value);
                    if (!value) setCommitted("");
                  }}
                  label="Find your country"
                  placeholder="Where are you curious about?"
                  onCompositionChange={setComposing}
                />
                <div className="country-picks">
                  {countries
                    .filter((c) =>
                      c.name.toLowerCase().includes(search.toLowerCase()),
                    )
                    .map((c) => (
                      <button
                        key={c.code}
                        aria-pressed={active?.code === c.code}
                        onClick={() => setSelected(c)}
                      >
                        {c.name}
                        <ArrowUpRight size={15} />
                      </button>
                    ))}
                  {!countries.some((c) =>
                    c.name.toLowerCase().includes(search.toLowerCase()),
                  ) && (
                    <p>
                      No match in our ten-country collection. Clear your search
                      to explore.
                    </p>
                  )}
                </div>
                {committed.length >= 2 && suggestions.data?.length > 0 && (
                  <div
                    className="search-suggestions"
                    role="region"
                    aria-label="Matching destinations and experiences"
                  >
                    {suggestions.data.map((s) => (
                      <Link
                        key={`${s.kind}-${s.id}`}
                        to={`/discover/${s.kind}/${s.id}`}
                      >
                        {s.name}
                        <small>
                          {s.kind} · {s.country}
                        </small>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
              <div className="globe-stage">
                <GeoBoundary>
                  <Suspense
                    fallback={
                      <p className="globe-loading">
                        Loading the world. Country selection is ready.
                      </p>
                    }
                  >
                    <WorldGlobe
                      countries={countries}
                      selected={active}
                      onSelect={setSelected}
                    />
                  </Suspense>
                </GeoBoundary>
                {active && (
                  <div className="country-dossier">
                    <div>
                      <h2>{active.name}</h2>
                      <p>{active.description}</p>
                    </div>
                    <Link className="button" to={`/countries/${active.code}`}>
                      Explore {active.name}
                      <ArrowRight size={18} />
                    </Link>
                  </div>
                )}
              </div>
            </section>
            <section className="discovery-note">
              <h2>
                Start with curiosity.
                <br />
                Leave with a plan.
              </h2>
              <p>
                Explore real places across ten countries, arrange your days on a
                map, and try reserving demo stays and guided tours. Your
                itinerary stays yours to shape.
              </p>
              <Link to="/planner/new">
                Build a trip from scratch <ArrowRight size={17} />
              </Link>
            </section>
          </>
        );
      }}
    </QueryState>
  );
}
export function CountryExplorer() {
  const { code } = useParams();
  const [params, setParams] = useSearchParams();
  const kind = kinds.some(([k]) => k === params.get("kind"))
    ? params.get("kind")
    : "attractions";
  const country = useApi(`/countries/${code}`);
  const [composing, setComposing] = useState(false);
  const [search, setSearch] = useState(params.get("q") || ""),
    [selected, setSelected] = useState(null),
    [preview, setPreview] = useState(false);
  const narrow = useNarrow(),
    listRef = useRef(null),
    previewOrigin = useRef(null);
  const preferredView = ["list", "map", "split"].includes(params.get("view"))
    ? params.get("view")
    : "split";
  const view = narrow && preferredView === "split" ? "list" : preferredView;
  function setView(value) {
    setParams((old) => {
      const next = new URLSearchParams(old);
      next.set("view", value);
      return next;
    });
  }
  const q = params.get("q") || "",
    cityId = params.get("cityId") || "";
  useEffect(() => setSearch(q), [q]);
  useEffect(() => {
    if (search === q || composing) return;
    const timer = setTimeout(
      () =>
        setParams(
          (old) => {
            const next = new URLSearchParams(old);
            if (search) next.set("q", search);
            else next.delete("q");
            return next;
          },
          { replace: true },
        ),
      300,
    );
    return () => clearTimeout(timer);
  }, [search, q, setParams, composing]);
  const path = `/catalog?${new URLSearchParams({ country: code, kind, limit: "50", ...(q && { q }), ...(cityId && { cityId }) })}`;
  const catalog = useApi(path);
  const active = groupPlaces(catalog.data || [], country.data?.cities)
    .flatMap((group) => group.items)
    .find((item) => recordId(item) === selected);
  useEffect(() => {
    if (
      catalog.data &&
      !catalog.data.some((item) => recordId(item) === selected)
    ) {
      setSelected(null);
      setPreview(false);
    }
  }, [catalog.data, selected]);
  useEffect(() => {
    if (view !== "map" && selected)
      revealInContainer(
        listRef.current,
        listRef.current?.querySelector(`[data-place-id="${selected}"]`),
      );
  }, [view, selected]);
  function select(item, trigger = document.activeElement) {
    previewOrigin.current = trigger;
    setSelected(recordId(item));
    setPreview(true);
  }
  function showList() {
    setPreview(false);
    setView(narrow ? "list" : "split");
    requestAnimationFrame(() =>
      revealInContainer(
        listRef.current,
        listRef.current?.querySelector(`[data-place-id="${selected}"]`),
      ),
    );
  }
  function filter(key, value) {
    setSelected(null);
    setParams((old) => {
      const next = new URLSearchParams(old);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    });
  }
  return (
    <QueryState query={country}>
      {(c) => (
        <>
          <div className="country-heading">
            <div>
              <Link className="back-link" to="/">
                Explore the world
              </Link>
              <h1>{c.name}</h1>
              <p>{c.description}</p>
            </div>
            <Link className="button" to={`/planner/new?country=${c.code}`}>
              Plan a trip <ArrowRight size={18} />
            </Link>
            <DestinationPhoto country={c.code} />
          </div>
          <nav className="tabs" aria-label="Explore categories">
            {kinds.map(([k, label]) => (
              <button
                key={k}
                aria-current={kind === k ? "page" : undefined}
                onClick={() => filter("kind", k)}
              >
                {label}
              </button>
            ))}
          </nav>
          <div className="explorer-controls">
            <SearchField
              value={search}
              onChange={setSearch}
              label="Search this collection"
              onCompositionChange={setComposing}
              placeholder="Search by name"
            />
            <Field label="City">
              {(id) => (
                <select
                  id={id}
                  value={cityId}
                  onChange={(e) => filter("cityId", e.target.value)}
                >
                  <option value="">All cities</option>
                  {c.cities.map((city) => (
                    <option key={city.id} value={city.id}>
                      {city.name}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <div className="view-switch">
              <button
                aria-pressed={view === "list"}
                onClick={() => setView("list")}
              >
                List
              </button>
              <button
                aria-pressed={view === "map"}
                onClick={() => setView("map")}
              >
                Map
              </button>
              {!narrow && (
                <button
                  aria-pressed={view === "split"}
                  onClick={() => setView("split")}
                >
                  Split
                </button>
              )}
            </div>
          </div>
          <QueryState query={catalog}>
            {(records) => (
              <div className={`explorer-layout view-${view}`}>
                <div
                  className="place-list"
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
                        {group.name}{" "}
                        <small>
                          {group.items.length}{" "}
                          {group.items.length === 1 ? "result" : "results"}
                        </small>
                      </h2>
                      {group.items.map((r) => (
                        <PlaceCard
                          key={recordId(r)}
                          record={r}
                          kind={kind}
                          selected={selected === recordId(r)}
                          onSelect={() => select(r)}
                        />
                      ))}
                    </section>
                  ))}
                </div>
                <div className="explorer-map">
                  <GeoBoundary>
                    <Suspense
                      fallback={<p>Loading map. The place list is ready.</p>}
                    >
                      <TravelMap
                        items={records.map((record) => {
                          const city = c.cities.find(
                            (candidate) =>
                              candidate.id === record.days?.[0]?.cityId,
                          );
                          return !Number.isFinite(record.lat) && city
                            ? { ...record, lat: city.lat, lng: city.lng }
                            : record;
                        })}
                        selected={selected}
                        onSelect={select}
                        center={c.cities[0]}
                      >
                        {view !== "list" && preview && active && (
                          <PlacePreview
                            trigger={previewOrigin.current}
                            record={active}
                            kind={kind}
                            onClose={() => setPreview(false)}
                            onShowList={showList}
                          />
                        )}
                      </TravelMap>
                    </Suspense>
                  </GeoBoundary>
                </div>
                {view === "list" && preview && active && (
                  <PlacePreview
                    trigger={previewOrigin.current}
                    record={active}
                    kind={kind}
                    onClose={() => setPreview(false)}
                  />
                )}
              </div>
            )}
          </QueryState>
          <p className="fine-print">
            Real destination information · Fictional stays, tours, packages and
            prices ·{" "}
            <a href={c.source} target="_blank" rel="noreferrer">
              Official destination guide
            </a>
          </p>
        </>
      )}
    </QueryState>
  );
}
function PlaceCard({ record: r, kind, selected, onSelect }) {
  return (
    <article
      data-place-id={recordId(r)}
      className={`place-row ${selected ? "is-selected" : ""}`}
    >
      <button
        className="photo-select"
        onClick={onSelect}
        aria-label={`Preview ${r.name}`}
      >
        <PlacePhoto record={r} compact />
      </button>
      <div className="place-copy">
        <span className="place-city">
          {r.city ||
            (kind === "templates"
              ? "Editable itinerary"
              : kind === "packages"
                ? "Fixed demo package"
                : "")}
        </span>
        <h2>
          <button className="text-button" onClick={onSelect}>
            {r.name}
          </button>
        </h2>
        <p>{r.description}</p>
        <div className="place-meta">
          {r.durationMinutes && <Duration record={r} kind={kind} />}
          {(r.minPrice || r.price) && (
            <span>
              {formatMoney(r.minPrice ?? r.price, r.currency)}{" "}
              {kind === "stays" ? "/ room / night" : "/ traveler"}
            </span>
          )}
          {r.demo && <span className="demo-label">Demo</span>}
        </div>
      </div>
      {Number.isFinite(r.lat) && (
        <button
          className="icon-button"
          aria-label={`Show ${r.name} on map`}
          onClick={onSelect}
        >
          <MapPin size={19} />
        </button>
      )}
    </article>
  );
}
export function ProductDetail({ fixedKind }) {
  const { kind: routeKind, id } = useParams(),
    kind = fixedKind || routeKind;
  const query = useApi(`/catalog/${kind}/${id}`);
  return (
    <QueryState query={query}>
      {(item) => <DetailContent key={id} item={item} kind={kind} />}
    </QueryState>
  );
}
function DetailContent({ item, kind }) {
  const navigate = useNavigate(),
    { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [error, setError] = useState(null),
    [busy, setBusy] = useState(false);
  const travelers = Number(params.get("travelers") || 2);
  const from = params.get("from") || dateOffset(1),
    to = params.get("to") || dateOffset(3);
  const roomTypeId = params.get("room") || item.roomTypes?.[0]?._id;
  const departureId = params.get("departure") || "";
  const schedulable = ["tours", "packages"].includes(kind);
  const departures = useApi(
    `/catalog/${kind}/${item._id}/departures?from=${from}&to=${safeAdd(from, 29)}`,
    { enabled: schedulable && /^\d{4}-\d{2}-\d{2}$/.test(from) },
  );
  const update = (key, value) =>
    setParams(
      (old) => {
        const p = new URLSearchParams(old);
        p.set(key, String(value));
        return p;
      },
      { replace: true },
    );
  async function review(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const source =
      kind === "stays"
        ? {
            kind: "stay",
            hotelId: item._id,
            roomTypeId,
            checkIn: from,
            checkOut: to,
            travelers,
          }
        : {
            kind: kind === "tours" ? "tour" : "package",
            departureId,
            travelers,
          };
    try {
      if (!user) {
        sessionStorage.setItem("gt.intent", JSON.stringify(source));
        navigate(`/login?next=${encodeURIComponent("/resume")}`);
        return;
      }
      const quote = await send("/quotes", source);
      navigate(`/review/${quote.data._id}`);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Link
        className="back-link"
        to={`/countries/${item.country}?kind=${kind}`}
      >
        Back to {kind}
      </Link>
      <div className="detail-layout">
        <section>
          <PlacePhoto record={item} />
          {Number.isFinite(item.lat) ? (
            <GeoBoundary>
              <Suspense
                fallback={
                  <p className="status">Loading the destination map…</p>
                }
              >
                <TravelMap items={[item]} center={item} />
              </Suspense>
            </GeoBoundary>
          ) : (
            <div className="destination-visual">
              <MapPin size={70} strokeWidth={1} />
              <span>{item.city || item.country}</span>
            </div>
          )}
          <h1>{item.name}</h1>
          <p className="lead">{item.description}</p>
          {item.demo && (
            <p className="notice">
              Fictional demo product. No real supplier or payment.
            </p>
          )}
          {item.source && (
            <p>
              <a href={item.source} target="_blank" rel="noreferrer">
                Official destination information <ArrowUpRight size={15} />
              </a>
            </p>
          )}
          {item.coordinateAccuracy && (
            <p className="fine-print">{item.coordinateAccuracy}</p>
          )}
          {item.amenities && <p>{item.amenities.join(" · ")}</p>}
          {item.days && (
            <ol className="itinerary-preview">
              {item.days.map((day, i) => (
                <li key={i}>
                  <h3>Day {i + 1}</h3>
                  <p>
                    {day.attractionIds
                      .map((id) =>
                        id.replace(/^[a-z]{2}-/, "").replaceAll("-", " "),
                      )
                      .join(" → ")}
                  </p>
                </li>
              ))}
            </ol>
          )}
          <p className="fine-print">
            Attraction admission and intercity transport are not included.
            Routes connect stops for planning and do not provide navigation.
          </p>
        </section>
        <aside className="booking-panel">
          {kind === "templates" ? (
            <>
              <h2>Make this journey yours.</h2>
              <p>
                Copy this four-day itinerary, then change its days and add your
                stays and tours.
              </p>
              <Link
                className="button full"
                to={`/planner/new?country=${item.country}&template=${item.id}`}
              >
                Use this itinerary
              </Link>
            </>
          ) : kind === "attractions" ? (
            <>
              <h2>Give it a place in your trip.</h2>
              <p>
                Suggested visit: {item.durationMinutes} minutes. Check current
                access independently.
              </p>
              <Link
                className="button full"
                to={`/planner/new?country=${item.country}&add=${item.id}`}
              >
                Plan a trip here
              </Link>
            </>
          ) : (
            <form noValidate onSubmit={review}>
              <h2>
                {kind === "packages"
                  ? "Choose your departure"
                  : "Plan your visit"}
              </h2>
              <DateField
                label={kind === "stays" ? "Check-in" : "Departures from"}
                value={from}
                onChange={(v) => update("from", v)}
              />
              {kind === "stays" && (
                <>
                  <DateField
                    label="Checkout"
                    value={to}
                    onChange={(v) => update("to", v)}
                  />
                  <Field label="Room type">
                    {(id) => (
                      <select
                        id={id}
                        value={roomTypeId}
                        onChange={(e) => update("room", e.target.value)}
                      >
                        {item.roomTypes.map((r) => (
                          <option key={r._id} value={r._id}>
                            {r.name} · sleeps {r.capacity} ·{" "}
                            {formatMoney(r.basePrice, item.currency)}
                          </option>
                        ))}
                      </select>
                    )}
                  </Field>
                </>
              )}
              {schedulable && (
                <QueryState query={departures}>
                  {(rows) =>
                    rows.length ? (
                      <Field label="Departure">
                        {(id) => (
                          <select
                            id={id}
                            value={departureId}
                            onChange={(e) =>
                              update("departure", e.target.value)
                            }
                          >
                            <option value="">Choose a departure</option>
                            {rows.map((r) => (
                              <option key={r._id} value={r._id}>
                                {r.date} · {r.remaining} places left
                              </option>
                            ))}
                          </select>
                        )}
                      </Field>
                    ) : (
                      <p>
                        No departures in this date range. Choose another start
                        date.
                      </p>
                    )
                  }
                </QueryState>
              )}
              <Field
                label="Travelers"
                type="number"
                value={travelers}
                min={1}
                max={12}
                onChange={(e) => update("travelers", e.target.value)}
              />
              <ErrorMessage error={error} />
              <button
                className="button full"
                disabled={busy || (schedulable && !departureId)}
              >
                {busy ? "Checking…" : "Review availability and price"}
                <ArrowRight size={17} />
              </button>
              <p className="fine-print">
                Server-calculated destination price. Availability is reserved
                only after you request a hold.
              </p>
            </form>
          )}
        </aside>
      </div>
    </>
  );
}
function safeAdd(date, n) {
  try {
    return addDays(date, n);
  } catch {
    return dateOffset(30);
  }
}
export function ResumeIntent() {
  const { user, checking } = useAuth(),
    navigate = useNavigate();
  const [error, setError] = useState(null);
  useEffect(() => {
    if (checking) return;
    if (!user) {
      navigate("/login?next=/resume", { replace: true });
      return;
    }
    let active = true;
    let source;
    try {
      source = JSON.parse(sessionStorage.getItem("gt.intent"));
    } catch {
      /* Invalid intent is recoverable. */
    }
    if (!source) {
      navigate("/trips", { replace: true });
      return;
    }
    send("/quotes", source)
      .then((r) => {
        if (active) {
          sessionStorage.removeItem("gt.intent");
          navigate(`/review/${r.data._id}`, { replace: true });
        }
      })
      .catch((e) => {
        if (active) setError(e);
      });
    return () => {
      active = false;
    };
  }, [user, checking, navigate]);
  return (
    <>
      <h1>Review your selection</h1>
      {error ? (
        <>
          <ErrorMessage error={error} />
          <Link to="/">Return to discovery</Link>
        </>
      ) : (
        <p role="status">Checking your saved selection…</p>
      )}
    </>
  );
}
