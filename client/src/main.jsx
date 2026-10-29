import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Link,
  NavLink,
  Route,
  Routes,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowUpRight,
  ArrowLeft,
  ArrowRight,
  MapPin,
  Compass,
  Check,
  Search,
  Users,
  BedDouble,
  CalendarDays,
} from "lucide-react";
import { api, money, dateLabel, dateOffset } from "./api.js";
import "./styles.css";

const AuthContext = createContext(null);
function ErrorMessage({ error }) {
  if (!error) return null;
  return (
    <div className="alert" role="alert">
      <p>{error.message || String(error)}</p>
      {error.details?.map((d, i) => (
        <p key={i}>
          {d.field}: {d.message}
        </p>
      ))}
      {error.requestId && <small>Support reference: {error.requestId}</small>}
    </div>
  );
}
function Loading({ children = "Finding your next stay…" }) {
  return (
    <p className="loading" role="status">
      {children}
    </p>
  );
}
function App() {
  const [user, setUser] = useState(null),
    [checking, setChecking] = useState(true),
    [authError, setAuthError] = useState(null);
  const [sessionError, setSessionError] = useState(null);
  const navigate = useNavigate();
  async function checkSession() {
    setChecking(true);
    setSessionError(null);
    try {
      setUser((await api("/auth/me")).data);
    } catch (err) {
      if (err.status === 401) setUser(null);
      else setSessionError(err);
    } finally {
      setChecking(false);
    }
  }
  useEffect(() => {
    checkSession();
  }, []);
  async function logout() {
    setAuthError(null);
    try {
      await api("/auth/logout", { method: "POST" });
      setUser(null);
      navigate("/");
    } catch (err) {
      setAuthError(err);
    }
  }
  return (
    <AuthContext.Provider
      value={{ user, setUser, checking, sessionError, checkSession }}
    >
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="demo-bar">
        A MERN learning project · Fictional stays · No real payments
      </div>
      <header className="header wrap">
        <Link className="brand" to="/" aria-label="GlobeTrek home">
          <Compass size={29} strokeWidth={1.5} />
          <span>
            GlobeTrek<span className="brand-dot">.</span>
          </span>
        </Link>
        <nav aria-label="Main navigation">
          <NavLink to="/" end>
            Explore stays
          </NavLink>
          <NavLink to="/bookings">My bookings</NavLink>
          {user ? (
            <button className="nav-button" onClick={logout}>
              Log out<span className="sr-only"> {user.name}</span>
            </button>
          ) : (
            <NavLink className="nav-login" to="/login">
              Log in <ArrowUpRight size={16} />
            </NavLink>
          )}
        </nav>
      </header>
      <main id="main" className="wrap">
        <ErrorMessage error={authError} />
        <Routes>
          <Route path="/" element={<Hotels />} />
          <Route path="/hotels/:id" element={<HotelDetail />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/register" element={<AuthPage register />} />
          <Route path="/bookings" element={<Bookings />} />
          <Route
            path="*"
            element={
              <section className="empty">
                <h1>A little off the map.</h1>
                <p>This page does not exist.</p>
                <Link className="button" to="/">
                  Explore stays
                </Link>
              </section>
            }
          />
        </Routes>
      </main>
      <footer className="footer wrap">
        <Link className="brand" to="/">
          GlobeTrek.
        </Link>
        <p>Made for the journey. Built to learn.</p>
        <span>Demo collection · India</span>
      </footer>
    </AuthContext.Provider>
  );
}
function Hotels() {
  const [params, setParams] = useSearchParams();
  const [draft, setDraft] = useState(params.get("q") || "");
  const [result, setResult] = useState(null),
    [error, setError] = useState(null),
    [busy, setBusy] = useState(true),
    [retry, setRetry] = useState(0);
  const query = params.toString();
  useEffect(() => {
    let active = true;
    setBusy(true);
    setError(null);
    api(`/hotels?${query}`)
      .then((data) => {
        if (active) setResult(data);
      })
      .catch((err) => {
        if (active) setError(err);
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [query, retry]);
  function filter(key, value) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    setParams(next);
  }
  return (
    <>
      <section className="hero">
        <div>
          <h1>
            A little further
            <br />
            from <em>ordinary.</em>
          </h1>
          <p>
            Courtyard mornings. Coastal afternoons.
            <br />
            Find a stay that feels like part of the journey.
          </p>
          <a className="text-link" href="#collection">
            Explore the collection <ArrowRight size={18} />
          </a>
        </div>
        <div
          className="hero-art"
          aria-label="Typographic travel artwork for India"
        >
          <span className="art-top">THE GLOBETREK COLLECTION</span>
          <span className="art-india">India</span>
          <div className="art-bottom">
            <span>
              Jaipur
              <br />
              Udaipur
              <br />
              Kochi
            </span>
            <Compass size={72} strokeWidth={0.75} />
          </div>
        </div>
      </section>
      <section id="collection" className="collection">
        <div className="section-heading">
          <div>
            <h2>Somewhere worth staying.</h2>
            <p>Six imagined hotels. Three places to begin.</p>
          </div>
          <span className="collection-count">The India collection</span>
        </div>
        <form
          className="filters"
          onSubmit={(e) => {
            e.preventDefault();
            filter("q", draft.trim());
          }}
        >
          <label className="search-field">
            <span>Find a hotel</span>
            <span className="input-icon">
              <Search size={18} />
              <input
                type="search"
                placeholder="Search by hotel name"
                maxLength={60}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
            </span>
          </label>
          <label>
            <span>Destination</span>
            <select
              value={params.get("city") || ""}
              onChange={(e) => filter("city", e.target.value)}
            >
              <option value="">All destinations</option>
              {["Jaipur", "Udaipur", "Kochi"].map((city) => (
                <option key={city}>{city}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Sort by</span>
            <select
              value={params.get("sort") || "name"}
              onChange={(e) => filter("sort", e.target.value)}
            >
              <option value="name">Hotel name</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
            </select>
          </label>
          <button className="button" type="submit">
            Search stays <ArrowRight size={17} />
          </button>
        </form>
        {busy ? (
          <Loading />
        ) : error ? (
          <>
            <ErrorMessage error={error} />
            <button
              className="button secondary"
              onClick={() => setRetry(retry + 1)}
            >
              Try again
            </button>
          </>
        ) : (
          <>
            <p className="result-count" role="status">
              {result.meta.total} {result.meta.total === 1 ? "stay" : "stays"}{" "}
              in the collection{" "}
              <span>All properties are fictional demo listings</span>
            </p>
            <div className="hotel-grid">
              {result.data.map((hotel) => (
                <article className="hotel-card" key={hotel._id}>
                  <Link
                    className="card-image"
                    to={`/hotels/${hotel._id}`}
                    tabIndex={-1}
                    aria-hidden="true"
                  >
                    <img src={hotel.image} alt="" />
                    <span className="image-tag">Demo stay</span>
                    <ArrowUpRight className="card-arrow" size={24} />
                  </Link>
                  <div className="card-content">
                    <p className="location">
                      <MapPin size={14} />
                      {hotel.neighborhood}, {hotel.city}
                    </p>
                    <h3>
                      <Link to={`/hotels/${hotel._id}`}>{hotel.name}</Link>
                    </h3>
                    <p className="amenities">{hotel.amenities.join(" · ")}</p>
                    <div className="card-bottom">
                      <p>
                        <strong>{money(hotel.minPrice)}</strong>
                        <span> / room / night</span>
                      </p>
                      <Link to={`/hotels/${hotel._id}`} className="text-link">
                        View stay <ArrowRight size={16} />
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            {result.data.length === 0 && (
              <div className="empty">
                <h3>No stays found.</h3>
                <p>Try a different hotel name or destination.</p>
                <button
                  className="button secondary"
                  onClick={() => {
                    setDraft("");
                    setParams({});
                  }}
                >
                  Clear filters
                </button>
              </div>
            )}
            {result.meta.pages > 1 && (
              <div className="pagination">
                <button
                  disabled={result.meta.page === 1}
                  onClick={() => {
                    const next = new URLSearchParams(params);
                    next.set("page", result.meta.page - 1);
                    setParams(next);
                  }}
                >
                  Previous
                </button>
                <span>
                  Page {result.meta.page} of {result.meta.pages}
                </span>
                <button
                  disabled={result.meta.page >= result.meta.pages}
                  onClick={() => {
                    const next = new URLSearchParams(params);
                    next.set("page", result.meta.page + 1);
                    setParams(next);
                  }}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </section>
      <section className="closing-note">
        <Compass size={30} strokeWidth={1.2} />
        <p>Good journeys start with a place to pause.</p>
        <span>Explore slowly. Stay thoughtfully.</span>
      </section>
    </>
  );
}
function HotelDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, checking, sessionError } = useContext(AuthContext);
  const [hotel, setHotel] = useState(null),
    [error, setError] = useState(null),
    [quote, setQuote] = useState(null),
    [busy, setBusy] = useState(false);
  const [input, setInput] = useState({
    roomTypeId: "",
    checkIn: dateOffset(1),
    checkOut: dateOffset(3),
    rooms: 1,
    guests: 2,
  });
  const selectedNights = 
    (Date.parse(input.checkOut) - Date.parse(input.checkIn)) / 86400000;
    
  const hasValidNightCount =
    Number.isInteger(selectedNights) &&
    selectedNights >= 1 &&
    selectedNights <= 14;
  
  const fingerprint = JSON.stringify(input),
    current = useRef(fingerprint);
  current.current = fingerprint;
  useEffect(() => {
    let active = true;
    api(`/hotels/${id}`)
      .then(({ data }) => {
        if (active) {
          setHotel(data);
          setInput((old) => ({ ...old, roomTypeId: data.roomTypes[0]._id }));
        }
      })
      .catch((err) => {
        if (active) setError(err);
      });
    return () => {
      active = false;
    };
  }, [id]);
  function change(key, value) {
    setInput((old) => ({ ...old, [key]: value }));
    setError(null);
  }
  async function check(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { data } = await api(
        `/hotels/${id}/availability?${new URLSearchParams(input)}`,
      );
      if (current.current === fingerprint) setQuote({ fingerprint, data });
    } catch (err) {
      if (current.current === fingerprint) {
        setQuote(null);
        setError(err);
      }
    } finally {
      setBusy(false);
    }
  }
  async function book() {
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(`/hotels/${id}`)}`);
      return;
    }
    setBusy(true);
    setError(null);
    const payload = {
      ...input,
      hotelId: id,
      rooms: Number(input.rooms),
      guests: Number(input.guests),
    };
    const storageKey = `globetrek-retry:${user.id}:${JSON.stringify(payload)}`;
    try {
      let key = sessionStorage.getItem(storageKey);
      if (!key) {
        key = crypto.randomUUID();
        sessionStorage.setItem(storageKey, key);
      }
      const { data } = await api("/bookings", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Idempotency-Key": key },
      });
      sessionStorage.removeItem(storageKey);
      navigate(`/bookings?confirmed=${data._id}`);
    } catch (err) {
      setError(err);
      if (err.code === "SOLD_OUT") setQuote(null);
    } finally {
      setBusy(false);
    }
  }
  if (!hotel)
    return error ? (
      <>
        <ErrorMessage error={error} />
        <Link className="text-link" to="/">
          Back to stays
        </Link>
      </>
    ) : (
      <Loading />
    );
  const validQuote = quote?.fingerprint === fingerprint ? quote.data : null;
  const room = hotel.roomTypes.find((r) => r._id === input.roomTypeId);
  return (
    <section className="detail-page">
      <Link className="back-link" to="/">
        <ArrowLeft size={16} /> All stays
      </Link>
      <div className="detail-heading">
        <div>
          <p className="location">
            <MapPin size={15} />
            {hotel.neighborhood}, {hotel.city}
          </p>
          <h1>{hotel.name}</h1>
        </div>
        <span className="tag">Fictional demo property</span>
      </div>
      <div className="detail-layout">
        <div>
          <img
            className="detail-image"
            src={hotel.image}
            alt={`Original typographic artwork for ${hotel.city}; not a property photograph`}
          />
          <h2>A place to slow down.</h2>
          <p className="description">{hotel.description}</p>
          <div className="feature-list">
            {hotel.amenities.map((a) => (
              <span key={a}>
                <Check size={17} />
                {a}
              </span>
            ))}
          </div>
          <h2>Your room, your rhythm.</h2>
          <div className="room-list">
            {hotel.roomTypes.map((r) => (
              <div key={r._id}>
                <BedDouble size={24} />
                <div>
                  <h3>{r.name}</h3>
                  <p>
                    {r.amenities.join(" · ")}
                    <br />
                    Up to {r.capacity} guests per room
                  </p>
                </div>
                <strong>
                  {money(r.basePrice)}
                  <small>per night</small>
                </strong>
              </div>
            ))}
          </div>
          <p className="fine-print">
            Artwork: original GlobeTrek destination typography, CC0. All hotels
            and amenities are fictional.
          </p>
        </div>
        <aside className="booking-panel">
          <h2>Make room for a getaway.</h2>
          <p className="panel-price">
            From <strong>{money(hotel.minPrice)}</strong> / night
          </p>
          <form onSubmit={check}>
            <fieldset disabled={busy}>
              <label>
                Room type
                <select
                  value={input.roomTypeId}
                  onChange={(e) => change("roomTypeId", e.target.value)}
                >
                  {hotel.roomTypes.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="form-row">
                <label>
                  Check in
                  <input
                    type="date"
                    required
                    min={dateOffset(0)}
                    max={dateOffset(89)}
                    value={input.checkIn}
                    onChange={(e) => change("checkIn", e.target.value)}
                  />
                </label>
                <label>
                  Check out
                  <input
                    type="date"
                    required
                    min={dateOffset(1)}
                    max={dateOffset(90)}
                    value={input.checkOut}
                    onChange={(e) => change("checkOut", e.target.value)}
                  />
                </label>
              </div>
              <div className="form-row">
                <label>
                  Rooms
                  <select
                    value={input.rooms}
                    onChange={(e) => change("rooms", Number(e.target.value))}
                  >
                    {[1, 2, 3].map((n) => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? "room" : "rooms"}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Guests
                  <input
                    type="number"
                    required
                    min="1"
                    max={room.capacity * input.rooms}
                    value={input.guests}
                    onChange={(e) => change("guests", Number(e.target.value))}
                  />
                </label>
              </div>
              <p className="fine-print" aria-live="polite">
                {hasValidNightCount
                  ? `${selectedNights} ${selectedNights === 1 ? "night" : "nights"} selected` : "Choose a stay of 1-14 nights."}
              </p>
                
              <button className="button full" type="submit">
                {busy ? "Working…" : "Check availability"}{" "}
                <ArrowRight size={17} />
              </button>
            </fieldset>
          </form>
          <ErrorMessage error={error} />
          <ErrorMessage error={sessionError} />
          {validQuote && (
            <div className="quote" aria-live="polite">
              {validQuote.available ? (
                <>
                  <p className="availability">
                    <Check size={17} /> Available for your stay
                  </p>
                  <dl>
                    <div>
                      <dt>
                        {validQuote.price.nights} nights × {input.rooms}{" "}
                        {input.rooms === 1 ? "room" : "rooms"}
                      </dt>
                      <dd>{money(validQuote.price.subtotal)}</dd>
                    </div>
                    <div>
                      <dt>Demo service fee (12%)</dt>
                      <dd>{money(validQuote.price.tax)}</dd>
                    </div>
                    <div className="total">
                      <dt>Total</dt>
                      <dd>{money(validQuote.price.total)}</dd>
                    </div>
                  </dl>
                  <button
                    className="button full"
                    disabled={busy || checking || !!sessionError}
                    onClick={book}
                  >
                    {busy
                      ? "Reserving…"
                      : user
                        ? "Confirm demo reservation"
                        : "Log in to reserve"}
                  </button>
                </>
              ) : (
                <p>
                  No rooms available for these dates. Try another room type or
                  date range.
                </p>
              )}
            </div>
          )}
          <p className="fine-print">
            Simulated payment. No card required. Free cancellation. Availability
            is checked again when you reserve. Dates use UTC.
          </p>
        </aside>
      </div>
    </section>
  );
}
function AuthPage({ register = false }) {
  const { setUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = useState(null),
    [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const result = await api(register ? "/auth/register" : "/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
      });
      setUser(result.data);
      const next = params.get("next");
      navigate(next?.startsWith("/hotels/") ? next : "/bookings");
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="auth-page">
      <div className="auth-story">
        <Compass size={42} strokeWidth={1} />
        <h1>
          {register
            ? "Every journey starts somewhere."
            : "Your next chapter starts here."}
        </h1>
        <p>Save a little space for somewhere new.</p>
        <span>Six demo stays. Endless curiosity.</span>
      </div>
      <div className="auth-form">
        <h2>{register ? "Create an account" : "Welcome back"}</h2>
        <p>
          {register
            ? "Your first stop on GlobeTrek."
            : "Log in to manage your reservations."}
        </p>
        <form key={register ? "register" : "login"} onSubmit={submit}>
          <fieldset disabled={busy}>
            {register && (
              <label>
                Your name
                <input
                  name="name"
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={60}
                />
              </label>
            )}
            <label>
              Email address
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete={register ? "new-password" : "current-password"}
                required
                minLength={10}
                maxLength={72}
              />
            </label>
            <p className="fine-print">
              10–72 characters; at most 72 UTF-8 bytes.
            </p>
            <ErrorMessage error={error} />
            <button className="button full">
              {busy ? "Please wait…" : register ? "Create account" : "Log in"}{" "}
              <ArrowRight size={17} />
            </button>
          </fieldset>
        </form>
        <p className="auth-switch">
          {register ? "Already have an account?" : "New to GlobeTrek?"}{" "}
          <Link
            to={`${register ? "/login" : "/register"}${params.toString() ? `?${params}` : ""}`}
          >
            {register ? "Log in" : "Create an account"}
          </Link>
        </p>
        <p className="fine-print">
          This is a learning demo. Use a unique demo password and avoid
          sensitive personal information.
        </p>
      </div>
    </section>
  );
}
function Bookings() {
  const { user, checking, sessionError, checkSession } =
    useContext(AuthContext);
  const [params] = useSearchParams();
  const [items, setItems] = useState(null),
    [error, setError] = useState(null),
    [busy, setBusy] = useState(null),
    [confirming, setConfirming] = useState(null),
    [reload, setReload] = useState(0);
  useEffect(() => {
    if (!user) return;
    let active = true;
    setItems(null);
    setError(null);
    api("/users/me/bookings")
      .then(({ data }) => {
        if (active) setItems(data);
      })
      .catch((err) => {
        if (active) setError(err);
      });
    return () => {
      active = false;
    };
  }, [user, reload]);
  async function cancelBooking(id) {
    setBusy(id);
    setError(null);
    try {
      const { data } = await api(`/bookings/${id}`, { method: "DELETE" });
      setItems((old) => old.map((b) => (b._id === id ? data : b)));
      setConfirming(null);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(null);
    }
  }
  if (checking) return <Loading>Checking your session…</Loading>;
  if (sessionError)
    return (
      <>
        <ErrorMessage error={sessionError} />
        <button className="button" onClick={checkSession}>
          Retry session check
        </button>
      </>
    );
  if (!user)
    return (
      <section className="empty">
        <CalendarDays size={40} strokeWidth={1} />
        <h1>Your journeys, in one place.</h1>
        <p>Log in to see and manage your reservations.</p>
        <Link className="button" to="/login">
          Log in
        </Link>
      </section>
    );
  return (
    <section className="bookings-page">
      <div className="section-heading">
        <div>
          <h1>Room for new memories.</h1>
          <p>Your bookings, {user.name}. All payments are simulated.</p>
        </div>
        <Link className="text-link" to="/">
          Find another stay <ArrowRight size={17} />
        </Link>
      </div>
      {items?.some(
        (booking) =>
          booking._id === params.get("confirmed") &&
          booking.status === "confirmed",
      ) && (
        <p className="success" role="status">
          <Check size={18} /> Your demo reservation is confirmed. No payment was
          taken.
        </p>
      )}
      <ErrorMessage error={error} />
      {error && (
        <button
          className="button secondary"
          onClick={() => setReload(reload + 1)}
        >
          Reload bookings
        </button>
      )}
      {!items && !error && <Loading>Loading your bookings…</Loading>}
      {items?.length === 0 && (
        <div className="empty">
          <BedDouble size={42} strokeWidth={1} />
          <h2>A blank page, for now.</h2>
          <p>Find a stay you like and make your first demo reservation.</p>
          <Link className="button" to="/">
            Explore stays
          </Link>
        </div>
      )}
      <div className="booking-list">
        {items?.map((b) => (
          <article key={b._id} className="booking-item">
            <div>
              <span className={`status ${b.status}`}>
                {b.status === "confirmed" ? "Confirmed" : "Cancelled"}
              </span>
              <h2>{b.hotelName}</h2>
              <p>
                {b.city} · {b.roomName}
              </p>
              <div className="booking-facts">
                <span>
                  <CalendarDays size={16} />
                  {dateLabel(b.checkIn)} – {dateLabel(b.checkOut)}
                </span>
                <span>
                  <Users size={16} />
                  {b.guests} guests · {b.rooms}{" "}
                  {b.rooms === 1 ? "room" : "rooms"}
                </span>
              </div>
              <p className="fine-print">Reference: {b._id}</p>
            </div>
            <div className="booking-actions">
              <strong>{money(b.price.total)}</strong>
              <span>Simulated total</span>
              {b.status === "confirmed" &&
                (confirming === b._id ? (
                  <div className="cancel-confirm">
                    <p>Cancel this reservation?</p>
                    <button
                      className="button danger"
                      disabled={busy === b._id}
                      onClick={() => cancelBooking(b._id)}
                    >
                      {busy === b._id ? "Cancelling…" : "Yes, cancel"}
                    </button>
                    <button
                      className="quiet-button"
                      disabled={busy === b._id}
                      onClick={() => setConfirming(null)}
                    >
                      Keep reservation
                    </button>
                  </div>
                ) : (
                  <button
                    className="quiet-button"
                    onClick={() => setConfirming(b._id)}
                  >
                    Cancel reservation
                  </button>
                ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
