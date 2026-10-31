import React, {
  lazy,
  Suspense,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import {
  Link,
  useNavigate,
  useLocation,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowDown,
  ArrowUp,
  GripVertical,
  Plus,
  Trash2,
  MapPin,
} from "lucide-react";
import { useAuth } from "./auth.jsx";
import {
  useApi,
  QueryState,
  Field,
  DateField,
  ErrorMessage,
  Status,
  send,
  storageRead,
  storageWrite,
  Modal,
} from "./ui.jsx";
import { useQueryClient } from "@tanstack/react-query";
import { planningIssues } from "./planning.js";
import { Price, PriceCollection, useTripEstimate } from "./pricing.jsx";
import {
  dayKeys,
  addDays,
  calendarDate,
  POLICY,
  formatMoney,
} from "../../shared/travel.js";
import { dateOffset } from "./api.js";
import GeoBoundary from "./geo/GeoBoundary.jsx";
import DestinationPhoto from "./DestinationPhoto.jsx";
import { PlacePhoto, PlacePreview, Duration, useNarrow } from "./place-ui.jsx";
import {
  dayStyle,
  groupPlaces,
  markerId,
  tripPoints,
  revealInContainer,
} from "./geo/presentation.js";
const TravelMap = lazy(() => import("./geo/Map.jsx"));
const CountryModel = lazy(() => import("./geo/CountryModel.jsx"));
const GUEST_KEY = "globetrek.draft.v1";
const strip = ({
  name,
  country,
  startDate,
  endDate,
  travelers,
  days,
  stays,
}) => ({ name, country, startDate, endDate, travelers, days, stays });
function guestDraft() {
  const saved = storageRead(GUEST_KEY);
  return saved?.version === 1 && Date.now() - saved.savedAt < 7 * 86400000
    ? saved.draft
    : null;
}
export function tripReducer(state, action) {
  const draft = structuredClone(state.draft);
  const day = draft.days.find((d) => d.date === action.date);
  if (action.type === "name") draft.name = action.value;
  if (action.type === "settings") {
    draft.startDate = action.startDate;
    draft.endDate = action.endDate;
    draft.travelers = action.travelers;
    draft.days = dayKeys(action.startDate, action.endDate, true).map(
      (date) =>
        draft.days.find((day) => day.date === date) || { date, stops: [] },
    );
  }
  if (action.type === "add") day.stops.push(action.stop);
  if (action.type === "departure")
    day.stops.find((s) => s.id === action.id).departureId = action.departureId;
  if (action.type === "remove")
    day.stops = day.stops.filter((s) => s.id !== action.id);
  if (action.type === "move") {
    const from = day.stops.findIndex((s) => s.id === action.id),
      to = Math.max(0, Math.min(day.stops.length - 1, action.to));
    day.stops.splice(to, 0, ...day.stops.splice(from, 1));
  }
  if (action.type === "day") {
    const stop = day.stops.find((s) => s.id === action.id);
    // Moving a scheduled tour clears its old departure; the user must choose again.
    if (stop.kind === "tour") delete stop.departureId;
    day.stops = day.stops.filter((s) => s.id !== action.id);
    draft.days.find((d) => d.date === action.target).stops.push(stop);
  }
  if (action.type === "addStay") draft.stays.push(action.stay);
  if (action.type === "removeStay") draft.stays.splice(action.index, 1);
  if (action.type === "stay")
    draft.stays[action.index][action.key] = action.value;
  return { draft, generation: state.generation + 1 };
}
export function TripSetup({ embedded = false, countryCode }) {
  const [params] = useSearchParams(),
    navigate = useNavigate();
  const countries = useApi("/countries");
  const [country, setCountry] = useState(
      countryCode || params.get("country") || "IN",
    ),
    [startDate, setStart] = useState(dateOffset(7)),
    [endDate, setEnd] = useState(dateOffset(10)),
    [travelers, setTravelers] = useState(2),
    [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const template = useApi(`/catalog/templates/${params.get("template")}`, {
    enabled: !!params.get("template"),
  });
  const previous = guestDraft();
  const [replacement, setReplacement] = useState(null);
  function persist(draft) {
    if (!storageWrite(GUEST_KEY, { version: 1, savedAt: Date.now(), draft }))
      throw Error(
        "Local storage is unavailable. Enable it to preserve your guest trip.",
      );
    navigate(`/countries/${draft.country}?mode=plan&trip=local`);
  }
  function create(e) {
    e.preventDefault();
    setError(null);
    const problems = {};
    for (const [key, value] of Object.entries({ startDate, endDate })) {
      try {
        calendarDate(value);
      } catch (err) {
        problems[key] = err.message;
      }
    }
    if (!problems.startDate && startDate < dateOffset(0))
      problems.startDate = "Choose today or a future date.";
    if (!problems.endDate && endDate > dateOffset(POLICY.horizon))
      problems.endDate = "Choose a date within the next 365 days.";
    if (
      !Number.isInteger(travelers) ||
      travelers < 1 ||
      travelers > POLICY.maxTravelers
    )
      problems.travelers = "Choose between 1 and 12 travelers.";
    if (!problems.startDate && !problems.endDate) {
      try {
        dayKeys(startDate, endDate, true);
      } catch (err) {
        problems.endDate = err.message;
      }
    }
    setFieldErrors(problems);
    if (Object.keys(problems).length) {
      e.currentTarget.elements.namedItem(Object.keys(problems)[0])?.focus();
      return;
    }
    try {
      const keys = dayKeys(startDate, endDate, true);
      if (
        startDate < dateOffset(0) ||
        endDate > dateOffset(365) ||
        travelers < 1 ||
        travelers > 12 ||
        !Number.isInteger(travelers)
      )
        throw Error("Choose future dates within 365 days and 1–12 travelers.");
      if (
        params.get("template") &&
        (!template.data || keys.length < template.data.days.length)
      )
        throw Error("This template needs at least four trip days.");
      const draft = {
        name: `${countries.data.find((c) => c.code === country)?.name || country} journey`,
        country,
        startDate,
        endDate,
        travelers,
        days: keys.map((date, index) => ({
          date,
          stops: (template.data?.country === country
            ? template.data.days[index]?.attractionIds || []
            : []
          ).map((refId) => ({
            id: crypto.randomUUID(),
            kind: "attraction",
            refId,
          })),
        })),
        stays: [],
      };
      if (params.get("add"))
        draft.days[0].stops.push({
          id: crypto.randomUUID(),
          kind: "attraction",
          refId: params.get("add"),
        });
      if (previous) {
        setReplacement(draft);
        return;
      }
      persist(draft);
    } catch (err) {
      setError(err);
    }
  }
  return (
    <div className={`setup-layout${embedded ? " inline-trip-setup" : ""}`}>
      <Modal
        open={Boolean(replacement)}
        onOpenChange={(open) => {
          if (!open) setReplacement(null);
        }}
        title="Replace your local draft?"
        description={`Starting this trip replaces ${previous?.name || "your current browser draft"}. Saved account trips are preserved.`}
      >
        <div className="actions">
          <button
            className="button secondary"
            onClick={() => setReplacement(null)}
          >
            Keep current draft
          </button>
          <button
            className="button danger"
            onClick={() => {
              try {
                persist(replacement);
                setReplacement(null);
              } catch (err) {
                setError(err);
                setReplacement(null);
              }
            }}
          >
            Replace local draft
          </button>
        </div>
      </Modal>
      <section>
        <h1>
          A journey,
          <br />
          on your terms.
        </h1>
        <p className="lead">
          Choose your country, dates and company. The rest is yours to arrange.
        </p>
        {previous && (
          <div className="notice">
            <p>
              You have a local draft: <strong>{previous.name}</strong>. Starting
              a new trip replaces that local draft.
            </p>
            <Link to="/planner/local">Continue your draft</Link>
          </div>
        )}
      </section>
      <form className="panel" noValidate onSubmit={create}>
        <h2>Start your trip</h2>
        <QueryState query={countries}>
          {(rows) => (
            <Field label="Country">
              {(id) => (
                <select
                  id={id}
                  value={country}
                  onChange={(e) => {
                    setCountry(e.target.value);
                    if (embedded)
                      navigate(`/countries/${e.target.value}?mode=plan&new=1`);
                  }}
                >
                  {rows.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          )}
        </QueryState>
        <div className="field-pair">
          <DateField
            label="First day"
            name="startDate"
            error={fieldErrors.startDate}
            value={startDate}
            onChange={setStart}
          />
          <DateField
            label="Last day"
            name="endDate"
            error={fieldErrors.endDate}
            value={endDate}
            onChange={setEnd}
          />
        </div>
        <Field
          label="Travelers"
          name="travelers"
          error={fieldErrors.travelers}
          type="number"
          min={1}
          max={12}
          value={travelers}
          onChange={(e) => setTravelers(Number(e.target.value))}
        />
        {params.get("template") && (
          <QueryState query={template}>
            {(t) => (
              <p>
                Starting from <strong>{t.name}</strong>. You can edit every
                stop.
              </p>
            )}
          </QueryState>
        )}
        <ErrorMessage error={error} />
        <button
          className="button full"
          disabled={
            !countries.data || (params.get("template") && !template.data)
          }
        >
          Create my trip
        </button>
        <p className="fine-print">
          1–30 days · One country · Up to 12 travelers · Guest drafts stay on
          this browser for seven days.
        </p>
      </form>
    </div>
  );
}
export function Planner({ tripId: requestedId, workspace }) {
  const route = useParams(),
    id = requestedId || route.id,
    { user, checking } = useAuth();
  const query = useApi(`/trips/${id}`, { enabled: id !== "local" && !!user });
  const [recovery, setRecovery] = useState(null);
  if (id === "local") {
    const draft = guestDraft();
    return draft ? (
      draft.country !== workspace?.country && workspace ? (
        <p className="notice">
          Your local draft belongs to {draft.country}.{" "}
          <Link to={`/countries/${draft.country}?mode=plan&trip=local`}>
            Continue that trip
          </Link>{" "}
          or start a new one explicitly.
        </p>
      ) : (
        <TripEditor key="local" initial={draft} workspace={workspace} />
      )
    ) : (
      <div className="empty">
        <h1>Your next journey starts here.</h1>
        <p>No local draft is available.</p>
        <Link className="button" to="/planner/new">
          Create a trip
        </Link>
      </div>
    );
  }
  if (checking) return <Status>Checking your session…</Status>;
  if (!user) return <SignIn next={`/planner/${id}`} />;
  return (
    <QueryState query={query}>
      {(trip) => {
        if (workspace && trip.country !== workspace.country)
          return (
            <p className="notice">
              This trip belongs to {trip.country}.{" "}
              <Link to={`/countries/${trip.country}?mode=plan&trip=${id}`}>
                Open its country workspace
              </Link>
            </p>
          );
        const backup = storageRead(`globetrek.backup.${id}`);
        const differs =
          backup?.version === 1 &&
          Date.now() - backup.savedAt < 7 * 86400000 &&
          JSON.stringify(backup.draft) !== JSON.stringify(strip(trip));
        if (differs && !recovery)
          return (
            <section className="panel">
              <h1>Recover your browser edits?</h1>
              <p>
                This browser has a different draft of {trip.name}. Restore it to
                retry saving, or continue with the saved server version. A
                revision conflict will never overwrite another tab.
              </p>
              <div className="actions">
                <button
                  className="button"
                  onClick={() => setRecovery("restore")}
                >
                  Restore browser edits
                </button>
                <button
                  className="button secondary"
                  onClick={() => setRecovery("server")}
                >
                  Keep server version
                </button>
              </div>
            </section>
          );
        return (
          <TripEditor
            workspace={workspace}
            key={`${id}:${query.dataUpdatedAt}`}
            initial={
              differs && recovery === "restore" ? backup.draft : strip(trip)
            }
            tripId={id}
            initialRevision={
              differs && recovery === "restore"
                ? backup.baseRevision || trip.revision
                : trip.revision
            }
            initialDirty={differs && recovery === "restore"}
          />
        );
      }}
    </QueryState>
  );
}
export function SignIn({ next = "/trips" }) {
  return (
    <div className="empty">
      <h1>Keep your journey close.</h1>
      <p>Log in to save trips across devices and manage reservations.</p>
      <Link className="button" to={`/login?next=${encodeURIComponent(next)}`}>
        Log in to continue
      </Link>
    </div>
  );
}
function TripEditor({
  initial,
  tripId,
  initialRevision = 0,
  initialDirty = false,
  workspace,
}) {
  const [workspaceParams, setWorkspaceParams] = useSearchParams();
  const geoView = ["model", "map", "list"].includes(workspaceParams.get("view"))
    ? workspaceParams.get("view")
    : "model";
  const GeographicEngine =
    workspace && geoView === "model" ? CountryModel : TravelMap;
  const [state, dispatch] = useReducer(tripReducer, {
      draft: initial,
      generation: initialDirty ? 1 : 0,
    }),
    { draft, generation } = state;
  const { user } = useAuth(),
    navigate = useNavigate(),
    location = useLocation();
  const [revision, setRevision] = useState(initialRevision),
    [savedGeneration, setSavedGeneration] = useState(0),
    [saveStatus, setSaveStatus] = useState(
      tripId ? "Saved" : "Saved on this browser",
    ),
    [error, setError] = useState(null),
    [busy, setBusy] = useState(false),
    [conflict, setConflict] = useState(false);
  const saving = useRef(false);
  const [date, setDateState] = useState(
      draft.days.some((d) => d.date === workspaceParams.get("day"))
        ? workspaceParams.get("day")
        : draft.startDate,
    ),
    [kind, setKind] = useState("attractions"),
    [selected, setSelected] = useState(null),
    [legacyView, setView] = useState("list"),
    [tour, setTour] = useState(null);
  // The canonical workspace URL owns presentation; legacy local state must not
  // hide previews after returning from Show in list to a geographic view.
  const view = workspace ? (geoView === "list" ? "list" : "map") : legacyView;
  function setDate(value) {
    setDateState(value);
    if (workspace)
      setWorkspaceParams((old) => {
        const p = new URLSearchParams(old);
        p.set("day", value);
        return p;
      });
  }
  const urlDay = workspaceParams.get("day");
  useEffect(() => {
    if (workspace && draft.days.some((d) => d.date === urlDay))
      setDateState(urlDay);
  }, [urlDay, workspace, draft.days]);
  const [settings, setSettings] = useState({
      startDate: draft.startDate,
      endDate: draft.endDate,
      travelers: draft.travelers,
    }),
    [settingsErrors, setSettingsErrors] = useState({});
  function updateSettings(event) {
    event.preventDefault();
    const errors = {};
    let keys;
    try {
      keys = dayKeys(settings.startDate, settings.endDate, true);
      if (
        settings.startDate < dateOffset(0) ||
        settings.endDate > dateOffset(365)
      )
        throw Error("Choose dates within the next 365 days.");
    } catch (err) {
      errors.endDate = err.message;
    }
    if (
      !Number.isInteger(settings.travelers) ||
      settings.travelers < 1 ||
      settings.travelers > 12
    )
      errors.travelers = "Choose 1–12 travelers.";
    if (
      keys &&
      (draft.days.some((day) => !keys.includes(day.date) && day.stops.length) ||
        draft.stays.some(
          (stay) =>
            stay.checkIn < settings.startDate ||
            stay.checkOut > settings.endDate,
        ))
    )
      errors.endDate =
        "Move or remove selections outside the new dates first. Your plan has been kept.";
    setSettingsErrors(errors);
    if (Object.keys(errors).length) {
      event.currentTarget.elements.namedItem(Object.keys(errors)[0])?.focus();
      return;
    }
    dispatch({ type: "settings", ...settings });
    if (!keys.includes(date)) setDate(settings.startDate);
  }
  const [mapScope, setMapScope] = useState("day"),
    [previewRecord, setPreviewRecord] = useState(null),
    [previewOpen, setPreviewOpen] = useState(false),
    [stayCandidate, setStayCandidate] = useState(null);
  const dayPanel = useRef(null),
    previewOrigin = useRef(null),
    narrow = useNarrow();
  const countryInfo = useApi(`/countries/${draft.country}`);
  const [editingStop, setEditingStop] = useState(null);
  const attractions = useApi(
      `/catalog?country=${draft.country}&kind=attractions&limit=50`,
    ),
    tours = useApi(`/catalog?country=${draft.country}&kind=tours&limit=50`),
    stays = useApi(`/catalog?country=${draft.country}&kind=stays&limit=50`);
  const departures = useApi(
    `/catalog/tours/${tour?._id}/departures?from=${date}&to=${date}`,
    { enabled: !!tour },
  );
  const catalog =
    kind === "attractions" ? attractions : kind === "tours" ? tours : stays;
  const day = draft.days.find((d) => d.date === date) || draft.days[0];
  const records = [...(attractions.data || []), ...(tours.data || [])];
  const pendingAdd = workspaceParams.get("add"),
    pendingTour = workspaceParams.get("addTour"),
    pendingStay = workspaceParams.get("addStay");
  useEffect(() => {
    if (!workspace?.active || !(pendingAdd || pendingTour || pendingStay))
      return;
    const record = pendingAdd
      ? attractions.data?.find((r) => r.id === pendingAdd)
      : pendingTour
        ? tours.data?.find((r) => r._id === pendingTour)
        : stays.data?.find((r) => r._id === pendingStay);
    if (!record) return;
    if (pendingAdd) {
      const existing = day.stops.find(
        (s) => s.kind === "attraction" && s.refId === pendingAdd,
      );
      if (existing) setSelected(existing.id);
      else if (day.stops.length < 12)
        dispatch({
          type: "add",
          date: day.date,
          stop: {
            id: crypto.randomUUID(),
            kind: "attraction",
            refId: pendingAdd,
          },
        });
    } else if (pendingTour) {
      setKind("tours");
      setTour(record);
    } else setStayCandidate(record);
    setWorkspaceParams(
      (old) => {
        const p = new URLSearchParams(old);
        p.delete("add");
        p.delete("addTour");
        p.delete("addStay");
        return p;
      },
      { replace: true },
    );
  }, [
    pendingAdd,
    pendingTour,
    pendingStay,
    workspace?.active,
    attractions.data,
    tours.data,
    stays.data,
    day,
    setWorkspaceParams,
  ]);
  const resolve = (stop) =>
    records.find((r) => String(r.id || r._id) === stop.refId);
  const allPoints = tripPoints(draft.days, resolve);
  const points =
    mapScope === "all"
      ? allPoints
      : allPoints.filter((point) => point.date === date);
  const activePoint = allPoints.find((point) => markerId(point) === selected);
  const previewItem = previewRecord || activePoint;
  function selectPoint(point, trigger = document.activeElement) {
    if (!point) return;
    previewOrigin.current = trigger;
    setDate(point.date);
    setSelected(markerId(point));
    setPreviewRecord(null);
    setPreviewOpen(true);
  }
  function showPlannerList() {
    setPreviewOpen(false);
    setView("list");
    if (workspace)
      setWorkspaceParams((old) => {
        const p = new URLSearchParams(old);
        p.set("view", "list");
        return p;
      });
    requestAnimationFrame(() =>
      revealInContainer(
        dayPanel.current,
        dayPanel.current?.querySelector(`[data-stop-id="${selected}"]`),
      ),
    );
  }
  useEffect(() => {
    if (selected && (!narrow || view === "list"))
      revealInContainer(
        dayPanel.current,
        dayPanel.current?.querySelector(`[data-stop-id="${selected}"]`),
      );
  }, [selected, date, view, narrow]);
  const departureIds = [
    ...new Set(
      draft.days.flatMap((d) =>
        d.stops
          .filter((s) => s.kind === "tour" && s.departureId)
          .map((s) => s.departureId),
      ),
    ),
  ].sort();
  const schedule = useApi(`/tour-departures?ids=${departureIds.join(",")}`, {
    enabled: departureIds.length > 0,
    staleTime: 60000,
  });
  const issues = planningIssues(draft, records, schedule.data);
  const estimated = useTripEstimate(draft),
    budget = estimated.data;
  const priceRecords = [
    ...(attractions.data || []).map((r) => ({
      ...r,
      priceKind: "attractions",
    })),
    ...(tours.data || []).map((r) => ({ ...r, priceKind: "tours" })),
    ...(stays.data || []).map((r) => ({ ...r, priceKind: "stays" })),
  ];
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  useEffect(() => {
    if (
      !storageWrite(tripId ? `globetrek.backup.${tripId}` : GUEST_KEY, {
        version: 1,
        savedAt: Date.now(),
        baseRevision: revision,
        draft,
      })
    )
      setSaveStatus("Browser backup unavailable");
  }, [draft, tripId, revision]);
  useEffect(() => {
    if (!tripId || generation === savedGeneration || conflict || saving.current)
      return;
    setSaveStatus("Unsaved changes");
    const timer = setTimeout(async () => {
      saving.current = true;
      setBusy(true);
      setSaveStatus("Saving…");
      try {
        const result = await send(
          `/trips/${tripId}`,
          { ...draft, expectedRevision: revision },
          "PATCH",
        );
        setRevision(result.data.revision);
        setSavedGeneration(generation);
        setSaveStatus("Saved");
        setError(null);
      } catch (err) {
        setError(err);
        setSaveStatus("Not saved — your edits remain here");
        if (err.code === "REVISION_CONFLICT") setConflict(true);
      } finally {
        saving.current = false;
        setBusy(false);
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [draft, tripId, generation, savedGeneration, revision, conflict]);
  async function saveCopy() {
    setBusy(true);
    setError(null);
    try {
      const result = await send("/trips", draft);
      if (workspace) {
        const next = new URLSearchParams(workspaceParams);
        next.set("trip", result.data._id);
        next.set("mode", "plan");
        next.delete("new");
        navigate(`/countries/${draft.country}?${next}`);
      } else navigate(`/planner/${result.data._id}`);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }
  async function review() {
    setBusy(true);
    setError(null);
    try {
      const result = await send("/quotes", { kind: "trip", tripId, revision });
      navigate(`/review/${result.data._id}`);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }
  function add(record, departureId, sourceKind = kind) {
    if (editingStop && departureId) {
      dispatch({ type: "departure", date, id: editingStop, departureId });
      setEditingStop(null);
      setTour(null);
      return;
    }
    dispatch({
      type: "add",
      date,
      stop: {
        id: crypto.randomUUID(),
        kind: sourceKind === "tours" ? "tour" : "attraction",
        refId: String(record.id || record._id),
        ...(departureId && { departureId }),
      },
    });
    setTour(null);
  }
  const canAddPreview =
    !!previewRecord &&
    (previewRecord.previewKind === "stays"
      ? date < draft.endDate && draft.stays.length < 30
      : day.stops.length < 12);
  function addFromPreview() {
    if (!canAddPreview) return;
    setPreviewOpen(false);
    setEditingStop(null);
    if (previewRecord.previewKind === "tours") {
      setKind("tours");
      setTour(previewRecord);
      setView("list");
    } else if (previewRecord.previewKind === "stays")
      setStayCandidate(previewRecord);
    else add(previewRecord, undefined, "attractions");
  }
  const covered = new Set(
    draft.stays.flatMap((s) => {
      try {
        return dayKeys(s.checkIn, s.checkOut);
      } catch {
        return [];
      }
    }),
  );
  const gaps = draft.days
    .slice(0, -1)
    .filter((d) => !covered.has(d.date)).length;
  const heading = (
    <div className="planner-heading">
      <div>
        <Link className="back-link" to={`/countries/${draft.country}`}>
          Explore {draft.country}
        </Link>
        <Field
          label="Trip name"
          value={draft.name}
          maxLength={100}
          onChange={(e) => dispatch({ type: "name", value: e.target.value })}
        />
        <form className="trip-settings" noValidate onSubmit={updateSettings}>
          <DateField
            name="startDate"
            label="Trip starts"
            value={settings.startDate}
            error={settingsErrors.startDate}
            onChange={(value) =>
              setSettings((s) => ({ ...s, startDate: value }))
            }
          />
          <DateField
            name="endDate"
            label="Trip ends"
            value={settings.endDate}
            error={settingsErrors.endDate}
            onChange={(value) => setSettings((s) => ({ ...s, endDate: value }))}
          />
          <Field
            name="travelers"
            label="Travelers"
            type="number"
            min="1"
            max="12"
            value={settings.travelers}
            error={settingsErrors.travelers}
            onChange={(event) =>
              setSettings((s) => ({
                ...s,
                travelers: Number(event.target.value),
              }))
            }
          />
          <button className="button secondary">Update dates and party</button>
        </form>
        <p>
          {draft.startDate} — {draft.endDate} · {draft.travelers} travelers{" "}
          <span className="save-status" role="status">
            {saveStatus}
          </span>
        </p>
      </div>
      <div className="actions">
        {!user ? (
          <Link
            className="button"
            to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`}
          >
            Log in to save
          </Link>
        ) : !tripId ? (
          <button className="button" disabled={busy} onClick={saveCopy}>
            Save trip to account
          </button>
        ) : (
          <button
            className="button"
            disabled={
              busy ||
              generation !== savedGeneration ||
              conflict ||
              issues.some((i) => i.severity === "error")
            }
            onClick={review}
          >
            Review selected bookings
          </button>
        )}
      </div>
    </div>
  );
  return (
    <PriceCollection
      records={priceRecords}
      travelers={draft.travelers}
      from={date}
      to={date < draft.endDate ? addDays(date, 1) : undefined}
    >
      <div className={workspace ? "embedded-planner" : ""}>
        <h1 className="sr-only">Trip planner</h1>
        {!workspace && heading}
        <ErrorMessage error={error} />
        {estimated.enabled ? (
          <section className="planning-budget" aria-label="Planning estimate">
            <div>
              <h2>Planning estimate</h2>
              <p>
                Selected stays and tours · includes the demo 12% service fee
              </p>
            </div>
            <strong>
              {estimated.error
                ? "Estimate unavailable"
                : budget?.total != null
                  ? formatMoney(budget.total, budget.currency)
                  : estimated.isFetching
                    ? "Updating estimate…"
                    : "Estimate incomplete"}
            </strong>
            {estimated.error && (
              <div>
                <ErrorMessage error={estimated.error} />
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => estimated.refetch()}
                  disabled={estimated.isFetching}
                >
                  Retry trip estimate
                </button>
              </div>
            )}
            {budget?.missing && <p>{budget.missing}</p>}
            <p className="fine-print">
              {budget?.incomplete ? "Some selections remain incomplete. " : ""}
              Based on current catalog prices. Review for the authoritative
              server quote and availability. Attraction tickets, transport,
              meals and unselected lodging are excluded.
            </p>
          </section>
        ) : (
          <p className="fine-print">
            Add a stay or scheduled tour for a booking estimate. Attraction
            tickets and transport are not sold here.
          </p>
        )}
        {issues.length > 0 && (
          <section
            className="notice planning-checks"
            aria-label="Planning checks"
          >
            <h2>Before you reserve</h2>
            <ul>
              {issues.map((issue, i) => (
                <li key={`${issue.code}-${i}`}>{issue.message}</li>
              ))}
            </ul>
            <p className="fine-print">
              Warnings guide planning. Final prices, capacity and booking rules
              are checked by the server.
            </p>
          </section>
        )}
        {schedule.error && (
          <p className="notice">
            Scheduled times could not load. Your draft is preserved; review will
            recheck them on the server.
          </p>
        )}
        {conflict && (
          <div className="actions">
            <button
              className="button secondary"
              onClick={() => window.location.reload()}
            >
              Reload server version
            </button>
            <button className="button" onClick={saveCopy}>
              Save my edits as a copy
            </button>
          </div>
        )}
        {saveStatus.startsWith("Not saved") && !conflict && (
          <button
            className="button secondary"
            onClick={() => dispatch({ type: "name", value: draft.name })}
          >
            Retry saving
          </button>
        )}
        <div className="day-tabs" aria-label="Trip days">
          {draft.days.map((d, i) => (
            <button
              key={d.date}
              style={dayStyle(i)}
              aria-pressed={date === d.date}
              onClick={() => {
                setDate(d.date);
                setTour(null);
                setEditingStop(null);
                setPreviewOpen(false);
              }}
            >
              Day {i + 1}
              <small>{d.date.slice(5)}</small>
            </button>
          ))}
        </div>
        <div className="view-switch mobile-view">
          <button
            aria-pressed={view === "list"}
            onClick={() => setView("list")}
          >
            Day plan
          </button>
          <button aria-pressed={view === "map"} onClick={() => setView("map")}>
            Map
          </button>
        </div>
        <div className={`planner-workspace view-${view}`}>
          <section
            className="day-panel"
            ref={dayPanel}
            tabIndex={0}
            aria-label="Day plan and places to add"
          >
            {workspace && heading}
            <h2>Your day, in order.</h2>
            <p className="fine-print">
              Reorder stops or move them to another day. Connections do not
              include transport.
            </p>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={({ active, over }) => {
                if (over && active.id !== over.id)
                  dispatch({
                    type: "move",
                    date,
                    id: active.id,
                    to: day.stops.findIndex((s) => s.id === over.id),
                  });
              }}
            >
              <SortableContext
                items={day.stops.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                {day.stops.map((stop, index) => (
                  <SortableStop
                    key={stop.id}
                    stop={stop}
                    record={resolve(stop)}
                    index={index}
                    count={day.stops.length}
                    days={draft.days}
                    date={date}
                    selected={selected === stop.id}
                    dayIndex={draft.days.findIndex((d) => d.date === date)}
                    onSelect={() =>
                      selectPoint(
                        allPoints.find(
                          (point) => point.occurrenceId === stop.id,
                        ),
                      )
                    }
                    dispatch={dispatch}
                    departure={schedule.data?.find(
                      (d) => d._id === stop.departureId,
                    )}
                    onChooseDeparture={() => {
                      setKind("tours");
                      setTour(resolve(stop));
                      setEditingStop(stop.id);
                    }}
                  />
                ))}
              </SortableContext>
            </DndContext>
            {!day.stops.length && (
              <div className="empty compact">
                <MapPin size={28} />
                <h3>Leave room for discovery.</h3>
                <p>Add a place or a tour below to begin this day.</p>
              </div>
            )}
          </section>
          <aside className="planner-collection">
            <h3>Add to this day</h3>
            <div className="tabs compact-tabs">
              {[
                ["attractions", "Places"],
                ["tours", "Tours"],
                ["stays", "Stays"],
              ].map(([k, label]) => (
                <button
                  key={k}
                  aria-pressed={kind === k}
                  onClick={() => {
                    setKind(k);
                    setTour(null);
                    setEditingStop(null);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            {tour ? (
              <div className="departure-picker">
                <h4>{tour.name}</h4>
                <Price record={tour} kind="tours" />
                <QueryState query={departures}>
                  {(rows) =>
                    rows.length ? (
                      rows.map((r) => (
                        <button
                          className="button secondary full"
                          key={r._id}
                          disabled={r.remaining < draft.travelers}
                          onClick={() => add(tour, r._id)}
                        >
                          Add{" "}
                          {new Intl.DateTimeFormat("en-IN", {
                            timeZone: r.timezone,
                            hour: "numeric",
                            minute: "2-digit",
                          }).format(new Date(r.startAt))}{" "}
                          · {r.remaining} seats
                        </button>
                      ))
                    ) : (
                      <p>No departures on this day. Choose another day.</p>
                    )
                  }
                </QueryState>
                <button
                  className="text-button"
                  onClick={() => {
                    setTour(null);
                    setEditingStop(null);
                  }}
                >
                  Back to tours
                </button>
              </div>
            ) : (
              <QueryState query={catalog}>
                {(rows) => (
                  <div className="add-list">
                    {groupPlaces(rows, countryInfo.data?.cities).map(
                      (group) => (
                        <section className="city-group" key={group.name}>
                          <h4>
                            {group.name}{" "}
                            <small>{group.items.length} results</small>
                          </h4>
                          {group.items.map((r) => (
                            <div key={r.id || r._id}>
                              <button
                                className="add-place-preview"
                                onClick={(event) => {
                                  previewOrigin.current = event.currentTarget;
                                  setPreviewRecord({ ...r, previewKind: kind });
                                  setPreviewOpen(true);
                                }}
                              >
                                <PlacePhoto record={r} compact />
                                <span>
                                  <strong>{r.name}</strong>
                                  <Price record={r} kind={kind} />
                                  <small>
                                    {r.city}
                                    {r.demo ? " · Demo" : ""}
                                  </small>
                                  <small>
                                    <Duration record={r} kind={kind} />
                                  </small>
                                </span>
                              </button>
                              <button
                                className="icon-button"
                                aria-label={`Add ${r.name}`}
                                disabled={
                                  kind === "stays"
                                    ? date >= draft.endDate ||
                                      draft.stays.length >= 30
                                    : day.stops.length >= 12
                                }
                                onClick={() => {
                                  if (kind === "tours") setTour(r);
                                  else if (kind === "stays")
                                    setStayCandidate(r);
                                  else add(r);
                                }}
                              >
                                <Plus size={18} />
                              </button>
                            </div>
                          ))}
                        </section>
                      ),
                    )}
                  </div>
                )}
              </QueryState>
            )}
          </aside>
          <section className="planner-map">
            {workspace && (
              <div className="view-switch" aria-label="Presentation">
                {[
                  ["model", "Model"],
                  ["map", "Detailed map"],
                  ["list", "List"],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    aria-pressed={geoView === key}
                    onClick={() =>
                      setWorkspaceParams((old) => {
                        const p = new URLSearchParams(old);
                        p.set("view", key);
                        return p;
                      })
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
            <div className="map-scope">
              <button
                aria-pressed={mapScope === "day"}
                onClick={() => setMapScope("day")}
              >
                Selected day
              </button>
              <button
                aria-pressed={mapScope === "all"}
                onClick={() => setMapScope("all")}
              >
                All days
              </button>
            </div>
            <div className="day-legend" aria-label="Map day colours">
              {draft.days.map((d, index) => (
                <button
                  key={d.date}
                  style={dayStyle(index)}
                  aria-pressed={date === d.date}
                  onClick={() => {
                    setDate(d.date);
                    setPreviewOpen(false);
                  }}
                >
                  Day {index + 1}
                </button>
              ))}
            </div>
            <GeoBoundary>
              {(!workspace || (workspace.active && geoView !== "list")) && (
                <Suspense
                  fallback={<p>Loading geography… The day list is ready.</p>}
                >
                  <GeographicEngine
                    country={draft.country}
                    cameraState={workspace?.cameraState}
                    connect
                    items={points}
                    selected={selected}
                    onSelect={selectPoint}
                    center={points[0] || attractions.data?.[0]}
                  >
                    {previewOpen &&
                      previewItem &&
                      (!narrow || view === "map") && (
                        <PlacePreview
                          trigger={previewOrigin.current}
                          record={previewItem}
                          kind={
                            previewItem.previewKind ||
                            (previewItem.stopKind === "tour"
                              ? "tours"
                              : "attractions")
                          }
                          onClose={() => setPreviewOpen(false)}
                          onShowList={showPlannerList}
                          onAdd={previewRecord ? addFromPreview : undefined}
                          addDisabled={!canAddPreview}
                          addLabel={`Add to Day ${draft.days.findIndex((d) => d.date === date) + 1}`}
                        />
                      )}
                  </GeographicEngine>
                </Suspense>
              )}
            </GeoBoundary>
            {workspace?.active &&
              geoView === "list" &&
              previewOpen &&
              previewItem && (
                <PlacePreview
                  trigger={previewOrigin.current}
                  record={previewItem}
                  kind={
                    previewItem.previewKind ||
                    (previewItem.stopKind === "tour" ? "tours" : "attractions")
                  }
                  onClose={() => setPreviewOpen(false)}
                  onAdd={previewRecord ? addFromPreview : undefined}
                  addDisabled={!canAddPreview}
                  addLabel={`Add to Day ${draft.days.findIndex((d) => d.date === date) + 1}`}
                />
              )}
            <p className="fine-print">
              Daily duration is a planning estimate. Check transport, opening
              hours, entry requirements, and access independently.
            </p>
          </section>
        </div>
        {!workspace &&
          narrow &&
          view === "list" &&
          previewOpen &&
          previewItem && (
            <PlacePreview
              trigger={previewOrigin.current}
              record={previewItem}
              kind={
                previewItem.previewKind ||
                (previewItem.stopKind === "tour" ? "tours" : "attractions")
              }
              onClose={() => setPreviewOpen(false)}
              onAdd={previewRecord ? addFromPreview : undefined}
              addDisabled={!canAddPreview}
              addLabel={`Add to Day ${draft.days.findIndex((d) => d.date === date) + 1}`}
            />
          )}
        {stayCandidate && (
          <StayPicker
            hotel={stayCandidate}
            date={date}
            draft={draft}
            onClose={() => setStayCandidate(null)}
            onAdd={(stay) => {
              dispatch({ type: "addStay", stay });
              setStayCandidate(null);
            }}
          />
        )}
        <section className="stay-section">
          <h2>Where you’ll stay</h2>
          {draft.stays.map((stay, index) => {
            const hotel = stays.data?.find((h) => h._id === stay.hotelId);
            return (
              <div className="stay-edit" key={`${index}-${stay.hotelId}`}>
                <strong>{hotel?.name || "Stay"}</strong>
                {hotel && (
                  <PriceCollection
                    records={[hotel]}
                    kind="stays"
                    travelers={draft.travelers}
                    from={stay.checkIn}
                    to={stay.checkOut}
                    roomTypeId={stay.roomTypeId}
                  >
                    <Price record={hotel} kind="stays" />
                  </PriceCollection>
                )}
                <DateField
                  label="Check-in"
                  value={stay.checkIn}
                  onChange={(v) =>
                    dispatch({ type: "stay", index, key: "checkIn", value: v })
                  }
                />
                <DateField
                  label="Checkout"
                  value={stay.checkOut}
                  onChange={(v) =>
                    dispatch({ type: "stay", index, key: "checkOut", value: v })
                  }
                />
                <Field label="Room type">
                  {(id) => (
                    <select
                      id={id}
                      value={stay.roomTypeId}
                      onChange={(e) =>
                        dispatch({
                          type: "stay",
                          index,
                          key: "roomTypeId",
                          value: e.target.value,
                        })
                      }
                    >
                      {hotel?.roomTypes.map((r) => (
                        <option value={r._id} key={r._id}>
                          {r.name} · sleeps {r.capacity}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>
                <button
                  className="icon-button danger"
                  aria-label={`Remove ${hotel?.name || "stay"}`}
                  onClick={() => dispatch({ type: "removeStay", index })}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            );
          })}
          <p className="notice">
            {gaps
              ? `${gaps} night${gaps === 1 ? "" : "s"} without selected lodging. These costs are excluded.`
              : "All trip nights have selected lodging."}{" "}
            Only selected stays and tours will be reserved. Prices and
            availability are calculated at review.
          </p>
        </section>
      </div>
    </PriceCollection>
  );
}
function StayPicker({ hotel, date, draft, onClose, onAdd }) {
  const [checkIn, setCheckIn] = useState(date),
    [checkOut, setCheckOut] = useState(addDays(date, 1)),
    [roomTypeId, setRoomTypeId] = useState(hotel.roomTypes[0]._id),
    [error, setError] = useState(null);
  return (
    <Modal
      open
      title={`Add ${hotel.name}`}
      description="Choose the nights and room type for your trip."
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <PlacePhoto record={hotel} />
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          try {
            calendarDate(checkIn);
            calendarDate(checkOut);
            if (
              checkIn < draft.startDate ||
              checkOut > draft.endDate ||
              checkOut <= checkIn
            )
              throw Error("Choose at least one night within the trip dates.");
            onAdd({ hotelId: hotel._id, roomTypeId, checkIn, checkOut });
          } catch (err) {
            setError(err);
          }
        }}
      >
        <ErrorMessage error={error} />
        <DateField
          label="Check-in"
          value={checkIn}
          onChange={setCheckIn}
          min={draft.startDate}
          max={draft.endDate}
        />
        <DateField
          label="Checkout"
          value={checkOut}
          onChange={setCheckOut}
          min={checkIn}
          max={draft.endDate}
        />
        <Field label="Room type">
          {(id) => (
            <select
              id={id}
              value={roomTypeId}
              onChange={(event) => setRoomTypeId(event.target.value)}
            >
              {hotel.roomTypes.map((room) => (
                <option key={room._id} value={room._id}>
                  {room.name} · sleeps {room.capacity}
                </option>
              ))}
            </select>
          )}
        </Field>
        <PriceCollection
          records={[hotel]}
          kind="stays"
          travelers={draft.travelers}
          from={checkIn}
          to={checkOut}
          roomTypeId={roomTypeId}
        >
          <Price record={hotel} kind="stays" />
        </PriceCollection>
        <button className="button" type="submit">
          Add stay
        </button>
      </form>
    </Modal>
  );
}
function SortableStop({
  stop,
  record,
  index,
  count,
  days,
  date,
  dispatch,
  selected,
  onSelect,
  departure,
  onChooseDeparture,
  dayIndex,
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: stop.id });
  const act = (type, extra) => dispatch({ type, date, id: stop.id, ...extra });
  return (
    <article
      ref={setNodeRef}
      data-stop-id={stop.id}
      style={{
        ...dayStyle(dayIndex),
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`stop-row ${selected ? "is-selected" : ""}`}
    >
      <div className="stop-main">
        <button
          className="drag-handle icon-button"
          onClick={onSelect}
          aria-label={`Drag ${record?.name || "stop"}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical size={18} />
        </button>
        <span className="stop-number">
          D{dayIndex + 1} · {index + 1}
        </span>
        <button className="stop-title text-button" onClick={onSelect}>
          {record && <PlacePhoto record={record} compact />}
          {record?.name || stop.refId}
          {record && (
            <Price
              record={record}
              kind={stop.kind === "tour" ? "tours" : "attractions"}
            />
          )}
          <small>
            {stop.kind === "tour"
              ? stop.departureId
                ? "Scheduled demo tour"
                : "Departure required — remove and add a departure"
              : `${record?.durationMinutes || "—"} min suggested visit`}
          </small>
          {departure && (
            <small>
              {new Intl.DateTimeFormat("en-IN", {
                hour: "numeric",
                minute: "2-digit",
                timeZone: departure.timezone,
              }).format(new Date(departure.startAt))}{" "}
              · {departure.timezone}
            </small>
          )}
        </button>
        <button
          className="icon-button"
          aria-label={`Remove ${record?.name || "stop"}`}
          onClick={() => act("remove")}
        >
          <Trash2 size={16} />
        </button>
      </div>
      <div className="stop-actions">
        {stop.kind === "tour" && !stop.departureId && (
          <button className="text-button" onClick={onChooseDeparture}>
            Choose departure
          </button>
        )}
        <button
          className="icon-button"
          disabled={index === 0}
          aria-label="Move earlier"
          onClick={() => act("move", { to: index - 1 })}
        >
          <ArrowUp size={15} />
        </button>
        <button
          className="icon-button"
          disabled={index === count - 1}
          aria-label="Move later"
          onClick={() => act("move", { to: index + 1 })}
        >
          <ArrowDown size={15} />
        </button>
        <select
          aria-label={`Move ${record?.name || "stop"} to day`}
          value={date}
          onChange={(e) => act("day", { target: e.target.value })}
        >
          {days.map((d, i) => (
            <option key={d.date} value={d.date}>
              Day {i + 1}
            </option>
          ))}
        </select>
      </div>
    </article>
  );
}
export function MyTrips() {
  const { user, checking } = useAuth();
  const query = useApi("/trips", { enabled: !!user });
  if (checking) return <Status>Checking your session…</Status>;
  if (!user) return <SignIn />;
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Your journeys</h1>
          <p>A little structure. Plenty of possibility.</p>
        </div>
        <Link className="button" to="/planner/new">
          Create a trip <Plus size={17} />
        </Link>
      </div>
      {guestDraft() && (
        <p className="notice">
          <Link to="/planner/local">
            Continue your local draft and save it to your account.
          </Link>
        </p>
      )}
      <QueryState query={query}>
        {(trips) =>
          trips.length ? (
            <div className="trip-list">
              {trips.map((t) => (
                <SavedTripRow key={t._id} trip={t} />
              ))}
            </div>
          ) : (
            <div className="empty">
              <h2>Your map is still open.</h2>
              <p>Create a trip or save your guest draft to see it here.</p>
            </div>
          )
        }
      </QueryState>
    </>
  );
}
function SavedTripRow({ trip }) {
  const client = useQueryClient(),
    navigate = useNavigate();
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(null);
  async function act(kind) {
    setBusy(true);
    setError(null);
    try {
      if (kind === "copy") {
        const r = await send("/trips", {
          ...strip(trip),
          name: `${trip.name} copy`.slice(0, 100),
        });
        navigate(`/planner/${r.data._id}`);
      } else {
        await send(`/trips/${trip._id}`, undefined, "DELETE");
        setOpen(false);
        await client.invalidateQueries({ queryKey: ["/trips"] });
      }
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="trip-row">
      <DestinationPhoto country={trip.country} />
      <h2>
        <Link to={`/planner/${trip._id}`}>{trip.name}</Link>
      </h2>
      <Price record={trip} kind="trip" summary={trip.pricingSummary} />
      <p>
        {trip.country} · {trip.startDate} — {trip.endDate} · {trip.travelers}{" "}
        travelers
      </p>
      <div className="actions">
        <Link className="button secondary" to={`/planner/${trip._id}`}>
          Open planner
        </Link>
        <button
          className="text-button"
          disabled={busy}
          onClick={() => act("copy")}
        >
          Copy trip
        </button>
        <Modal
          open={open}
          onOpenChange={setOpen}
          trigger={
            <button className="text-button danger" disabled={busy}>
              Delete draft
            </button>
          }
          title={`Delete ${trip.name}?`}
          description="This removes the saved draft. Active reservations must be cancelled or released first. Other trips and reservation history are preserved."
        >
          <div className="actions">
            <button className="button secondary" onClick={() => setOpen(false)}>
              Keep draft
            </button>
            <button
              className="button danger"
              disabled={busy}
              onClick={() => act("delete")}
            >
              Delete draft
            </button>
          </div>
          <ErrorMessage error={error} />
        </Modal>
      </div>
      <ErrorMessage error={!open && error} />
    </article>
  );
}
