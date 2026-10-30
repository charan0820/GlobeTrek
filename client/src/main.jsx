import React, { Component, lazy, Suspense, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Compass, Moon, Sun, ArrowRight, Eye, EyeOff } from "lucide-react";
import { AuthProvider, useAuth } from "./auth.jsx";
import useSoftScroll from "./useSoftScroll.js";
const lazyExport = (file, name) =>
  lazy(() => file().then((m) => ({ default: m[name] })));
const Discovery = lazyExport(() => import("./discovery.jsx"), "Discovery"),
  CountryExplorer = lazyExport(
    () => import("./discovery.jsx"),
    "CountryExplorer",
  ),
  ProductDetail = lazyExport(() => import("./discovery.jsx"), "ProductDetail"),
  ResumeIntent = lazyExport(() => import("./discovery.jsx"), "ResumeIntent");
const TripSetup = lazyExport(() => import("./planner.jsx"), "TripSetup"),
  Planner = lazyExport(() => import("./planner.jsx"), "Planner"),
  MyTrips = lazyExport(() => import("./planner.jsx"), "MyTrips");
const Review = lazyExport(() => import("./reservations.jsx"), "Review"),
  Reservations = lazyExport(() => import("./reservations.jsx"), "Reservations"),
  ReservationDetail = lazyExport(
    () => import("./reservations.jsx"),
    "ReservationDetail",
  );
import {
  Field,
  ErrorMessage,
  Status,
  send,
  storageRead,
  storageWrite,
} from "./ui.jsx";
import "@fontsource/sora/latin-400.css";
import "@fontsource/sora/latin-600.css";
import "@fontsource/source-sans-3/latin-400.css";
import "@fontsource/source-sans-3/latin-600.css";
import "react-day-picker/style.css";
import "./travel.css";
const client = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 15000, refetchOnWindowFocus: false },
  },
});
class AppBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="wrap empty">
        <h1>This view could not load.</h1>
        <p>
          Your saved data has not been removed. Try reloading or returning to
          discovery.
        </p>
        <a className="button" href="/">
          Return to discovery
        </a>
      </main>
    ) : (
      this.props.children
    );
  }
}
function Shell() {
  const { user, error: authError } = useAuth(),
    location = useLocation();
  useSoftScroll(location.pathname);
  const [theme, setTheme] = useState(
    () =>
      storageRead("gt.theme") ||
      (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"),
  );
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const update = () => {
      if (!storageRead("gt.theme")) setTheme(media.matches ? "dark" : "light");
    };
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    document.title = `GlobeTrek · ${location.pathname === "/" ? "Explore your world" : location.pathname.split("/")[1]}`;
    window.scrollTo({
      top: 0,
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
    document.getElementById("main")?.focus({ preventScroll: true });
  }, [location.pathname]);
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="demo-bar">
        Real places. Demo stays, tours and reservations. No real payments.
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
            Explore
          </NavLink>
          <NavLink to="/trips">My trips</NavLink>
          <NavLink to="/reservations">Reservations</NavLink>
          <NavLink to="/account">
            {user ? user.name.split(" ")[0] : "Account"}
          </NavLink>
        </nav>
        <button
          className="icon-button theme-toggle"
          aria-label={`Use ${theme === "light" ? "dark" : "light"} theme`}
          onClick={() => {
            const next = theme === "light" ? "dark" : "light";
            setTheme(next);
            storageWrite("gt.theme", next);
          }}
        >
          {theme === "light" ? <Moon size={19} /> : <Sun size={19} />}
        </button>
      </header>
      <main id="main" tabIndex={-1} className="wrap">
        <ErrorMessage error={authError} />
        <Suspense fallback={<Status>Loading your journey…</Status>}>
          <Routes>
            <Route path="/" element={<Discovery />} />
            <Route path="/countries/:code" element={<CountryExplorer />} />
            <Route path="/discover/:kind/:id" element={<ProductDetail />} />
            <Route
              path="/hotels/:id"
              element={<ProductDetail fixedKind="stays" />}
            />
            <Route path="/planner/new" element={<TripSetup />} />
            <Route path="/planner/:id" element={<Planner />} />
            <Route path="/trips" element={<MyTrips />} />
            <Route path="/review/:id" element={<Review />} />
            <Route path="/reservations" element={<Reservations />} />
            <Route path="/bookings" element={<Reservations />} />
            <Route path="/reservations/:id" element={<ReservationDetail />} />
            <Route path="/login" element={<AuthPage />} />
            <Route path="/register" element={<AuthPage register />} />
            <Route path="/account" element={<Account />} />
            <Route path="/resume" element={<ResumeIntent />} />
            <Route
              path="*"
              element={
                <div className="empty">
                  <h1>A little off the map.</h1>
                  <p>This page does not exist.</p>
                  <Link className="button" to="/">
                    Explore the world
                  </Link>
                </div>
              }
            />
          </Routes>
        </Suspense>
      </main>
      <footer className="footer wrap">
        <Link className="brand" to="/">
          GlobeTrek.
        </Link>
        <p>Curiosity, given a direction.</p>
        <Link to="/planner/new">
          Plan your next journey <ArrowRight size={16} />
        </Link>
      </footer>
    </>
  );
}
function Account() {
  const { user, checking, logout } = useAuth(),
    navigate = useNavigate();
  const [error, setError] = useState(null),
    [busy, setBusy] = useState(false);
  if (checking) return <Status>Checking your session…</Status>;
  if (!user) return <AuthPage />;
  return (
    <section className="account panel">
      <h1>Hello, {user.name}.</h1>
      <p>{user.email}</p>
      <div className="actions">
        <Link className="button" to="/trips">
          My trips
        </Link>
        <Link className="button secondary" to="/reservations">
          Reservations
        </Link>
      </div>
      <ErrorMessage error={error} />
      <button
        className="text-button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await logout();
            navigate("/");
          } catch (e) {
            setError(e);
          } finally {
            setBusy(false);
          }
        }}
      >
        Log out
      </button>
    </section>
  );
}
function AuthPage({ register = false }) {
  const { setUser } = useAuth(),
    navigate = useNavigate(),
    [params] = useSearchParams();
  const [error, setError] = useState(null),
    [errors, setErrors] = useState({}),
    [busy, setBusy] = useState(false),
    [visible, setVisible] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setError(null);
    setErrors({});
    const form = e.currentTarget,
      data = Object.fromEntries(new FormData(form)),
      invalid = {};
    if (register && data.name.trim().length < 2)
      invalid.name = "Enter at least two characters.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
      invalid.email = "Enter a valid email address.";
    if (
      data.password.length < 10 ||
      new TextEncoder().encode(data.password).length > 72
    )
      invalid.password =
        "Use at least ten characters and at most 72 UTF-8 bytes.";
    if (Object.keys(invalid).length) {
      setErrors(invalid);
      form.elements.namedItem(Object.keys(invalid)[0])?.focus();
      return;
    }
    setBusy(true);
    try {
      const result = await send(
        register ? "/auth/register" : "/auth/login",
        data,
      );
      await setUser(result.data);
      const next = params.get("next");
      navigate(
        next?.startsWith("/") && !next.startsWith("//") ? next : "/trips",
      );
    } catch (err) {
      setError(err);
      const fields = Object.fromEntries(
        (err.details || []).map((d) => [d.field, d.message]),
      );
      setErrors(fields);
      if (Object.keys(fields).length)
        form.elements.namedItem(Object.keys(fields)[0])?.focus();
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="auth-layout">
      <div className="auth-story">
        <Compass size={56} strokeWidth={1} />
        <h1>
          {register
            ? "Make room for somewhere new."
            : "Pick up where you left off."}
        </h1>
        <p>Your destinations, your days, your journey.</p>
      </div>
      <form
        className="panel auth-form"
        noValidate
        key={register ? "register" : "login"}
        onSubmit={submit}
      >
        <h2>{register ? "Create your account" : "Welcome back"}</h2>
        <p>Your local trip stays with you when you log in.</p>
        <fieldset disabled={busy}>
          {register && (
            <Field
              label="Your name"
              name="name"
              autoComplete="name"
              maxLength={60}
              error={errors.name}
            />
          )}
          <Field
            label="Email address"
            name="email"
            type="email"
            autoComplete="email"
            maxLength={254}
            error={errors.email}
          />
          <Field label="Password" error={errors.password}>
            {(id) => (
              <div className="date-control">
                <input
                  id={id}
                  name="password"
                  type={visible ? "text" : "password"}
                  autoComplete={register ? "new-password" : "current-password"}
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? `${id}-error` : undefined}
                />
                <button
                  className="icon-button"
                  type="button"
                  aria-label={visible ? "Hide password" : "Show password"}
                  onClick={() => setVisible(!visible)}
                >
                  {visible ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            )}
          </Field>
          <p className="fine-print">
            10+ characters, up to 72 UTF-8 bytes. Use a unique demo password.
          </p>
          <ErrorMessage error={error} />
          <button className="button full">
            {busy ? "Please wait…" : register ? "Create account" : "Log in"}
            <ArrowRight size={17} />
          </button>
        </fieldset>
        <p>
          {register ? "Already have an account?" : "New to GlobeTrek?"}{" "}
          <Link to={`${register ? "/login" : "/register"}?${params}`}>
            {register ? "Log in" : "Create an account"}
          </Link>
        </p>
      </form>
    </section>
  );
}
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppBoundary>
      <QueryClientProvider client={client}>
        <BrowserRouter>
          <AuthProvider>
            <Shell />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </AppBoundary>
  </React.StrictMode>,
);
