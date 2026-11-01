import {
  FloatingPanel,
  IslandContent,
  EditorialTitle,
} from "./atlas-presentation.jsx";
import React, { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  Link,
  Navigate,
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
import {
  DestinationReveal,
  CountryScrollProgress,
  CountryEntryStatus,
} from "./discovery-motion.jsx";
import DestinationPhoto from "./DestinationPhoto.jsx";
import { PlacePhoto } from "./place-ui.jsx";
import GeoBoundary from "./geo/GeoBoundary.jsx";
import { addDays, formatMoney } from "../../shared/travel.js";
import { Price, PriceCollection } from "./pricing.jsx";
const WorldGlobe = lazy(() => import("./geo/Globe.jsx"));
const TravelMap = lazy(() => import("./geo/Map.jsx"));
export const recordId = (r) => r.id || r._id;
export function Discovery() {
  const navigate = useNavigate();
  const [entry, setEntry] = useState(null);
  const sequence = useRef(0);
  const countryList = useRef(null);
  function enter(country, event) {
    if (
      event &&
      (event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey)
    )
      return;
    const ready = document.querySelector('[data-globe-state="ready"]');
    if (!ready || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      if (!event) navigate(`/countries/${country.code}`);
      return;
    }
    event?.preventDefault();
    if (entry?.country.code === country.code) return;
    setSelected(country);
    setEntry({ country, token: ++sequence.current });
  }
  useEffect(() => {
    if (!entry) return;
    const controller = new AbortController(),
      code = entry.country.code;
    fetch(`/api/countries/${code}`, { signal: controller.signal }).catch(
      () => {},
    );
    fetch("/relief/manifest.json", { signal: controller.signal })
      .then((r) => r.json())
      .then((manifest) => {
        const model = manifest.countries.find((c) => c.code === code);
        if (model)
          return fetch(
            (matchMedia("(max-width:759px)").matches
              ? model.mobile
              : model.desktop
            ).file,
            { signal: controller.signal },
          );
      })
      .catch(() => {});
    const timer = setTimeout(() => navigate(`/countries/${code}`), 600);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [entry, navigate]);
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
          <section className="atlas-discovery" aria-label="Explore the world">
            <div className="atlas-world">
              <div className="atlas-title">
                <EditorialTitle>GlobeTrek.</EditorialTitle>
                <h2>A world to explore.</h2>
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
                      onEnter={enter}
                      entry={entry}
                    />
                  </Suspense>
                </GeoBoundary>
              </div>
              <p className="atlas-guidance">
                Drag to explore. Click to preview; double-click to enter.
              </p>
            </div>
            <FloatingPanel
              title="Destinations"
              storageKey="discovery-right"
              className="atlas-countries"
              aria-label="Choose your destination"
            >
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
              <div
                ref={countryList}
                className="country-picks"
                role="group"
                aria-label="Available countries"
              >
                {[...countries]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .filter((c) =>
                    c.name.toLowerCase().includes(search.toLowerCase()),
                  )
                  .map((c) => (
                    <Link
                      key={c.code}
                      to={`/countries/${c.code}`}
                      onClick={(event) => enter(c, event)}
                      data-selected={active?.code === c.code}
                    >
                      {c.name}
                      <ArrowRight size={15} aria-hidden="true" />
                    </Link>
                  ))}
                {!countries.some((c) =>
                  c.name.toLowerCase().includes(search.toLowerCase()),
                ) && (
                  <p>
                    No match in our ten-country collection. Clear your search to
                    explore.
                  </p>
                )}
              </div>
              <CountryScrollProgress container={countryList} filter={search} />
              <CountryEntryStatus country={entry?.country.name} />
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
              {committed.length >= 2 && suggestions.isFetching && (
                <p role="status" className="fine-print">
                  Finding matching places…
                </p>
              )}
              {committed.length >= 2 && suggestions.error && (
                <ErrorMessage error={suggestions.error} />
              )}
              {committed.length >= 2 && suggestions.data?.length === 0 && (
                <p role="status" className="fine-print">
                  No matching places or experiences.
                </p>
              )}
              {active && (
                <DestinationReveal
                  identity={active.code}
                  className="country-dossier"
                  aria-label="Selected country"
                >
                  <DestinationPhoto country={active.code} />
                  <div>
                    <h2>{active.name}</h2>
                    <p>{active.description}</p>
                  </div>
                  <Link
                    className="atlas-explore"
                    to={`/countries/${active.code}`}
                    onClick={(event) => enter(active, event)}
                  >
                    Explore {active.name}
                    <ArrowRight size={18} />
                  </Link>
                </DestinationReveal>
              )}
            </FloatingPanel>
            {active && (
              <IslandContent id="discovery" title={active.name}>
                <p>{active.description}</p>
                <Link
                  className="button"
                  to={`/countries/${active.code}`}
                  onClick={(event) => enter(active, event)}
                >
                  Explore {active.name}
                </Link>
              </IslandContent>
            )}
          </section>
        );
      }}
    </QueryState>
  );
}
export { default as CountryCatalog } from "./CountryCatalog.jsx";
export function ProductDetail({ fixedKind }) {
  const { kind: routeKind, id } = useParams(),
    kind = fixedKind || routeKind;
  const query = useApi(`/catalog/${kind}/${id}`);
  return (
    <QueryState query={query}>
      {(item) => (
        <Navigate
          replace
          to={`/countries/${item.country}?${new URLSearchParams({ kind, item: id })}`}
        />
      )}
    </QueryState>
  );
}
export function DetailContent({ item, kind, embedded = false }) {
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
          {!embedded &&
            (Number.isFinite(item.lat) ? (
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
            ))}
          <h1>{item.name}</h1>
          <PriceCollection
            records={[item]}
            kind={kind}
            travelers={travelers}
            roomTypeId={roomTypeId}
            departureId={departureId}
            from={from}
            to={to}
          >
            <Price record={item} kind={kind} />
          </PriceCollection>
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
