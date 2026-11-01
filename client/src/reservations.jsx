import { EditorialTitle, IslandContent } from "./atlas-presentation.jsx";
import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Clock, ArrowRight, XCircle } from "lucide-react";
import { useAuth } from "./auth.jsx";
import { SignIn } from "./planner.jsx";
import {
  useApi,
  QueryState,
  ErrorMessage,
  Status,
  Modal,
  send,
} from "./ui.jsx";
import { api } from "./api.js";
import { formatMoney } from "../../shared/travel.js";
import DestinationPhoto from "./DestinationPhoto.jsx";
import {
  reservationSummary,
  bookingTime,
  itemDates,
  formatReservationDates,
} from "./reservation-summary.js";
function Price({ price }) {
  return (
    <dl className="price-breakdown">
      <div>
        <dt>Selected items</dt>
        <dd>{formatMoney(price.subtotal, price.currency)}</dd>
      </div>
      <div>
        <dt>{price.feeLabel || "Demo service fee"}</dt>
        <dd>{formatMoney(price.fee ?? price.tax, price.currency)}</dd>
      </div>
      <div className="price-total">
        <dt>Total</dt>
        <dd>{formatMoney(price.total, price.currency)}</dd>
      </div>
      {price.inrEstimate && (
        <div>
          <dt>
            INR estimate · {price.inrEstimate.date}
            {price.inrEstimate.stale ? " · older rate" : ""}
          </dt>
          <dd>≈ {formatMoney(price.inrEstimate.amount, "INR")}</dd>
        </div>
      )}
    </dl>
  );
}
function Items({ items }) {
  return (
    <div className="reservation-items">
      {items.map((item, i) => (
        <article className="reservation-item" key={i}>
          <span className="stop-number">{i + 1}</span>
          <div>
            <h3>{item.name}</h3>
            {item.kind === "stay" ? (
              <p>
                {item.checkIn} → {item.checkOut} · {item.quantity}{" "}
                {item.roomName} · {item.nights} nights
              </p>
            ) : (
              <p>
                {new Intl.DateTimeFormat("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: item.timezone,
                }).format(new Date(item.startAt))}{" "}
                · {item.timezone} · {item.quantity} travelers
              </p>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
function useServerClock(serverTime) {
  const [now, setNow] = useState(Date.now());
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    if (serverTime) setOffset(Date.parse(serverTime) - Date.now());
  }, [serverTime]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now + offset;
}
export function Review() {
  const { id } = useParams(),
    { user, checking } = useAuth(),
    navigate = useNavigate();
  const query = useApi(`/quotes/${id}`, { enabled: !!user });
  const [error, setError] = useState(null),
    [busy, setBusy] = useState(false);
  // One key survives network retries and refreshes for this exact quote.
  const [key] = useState(() => {
    const name = `gt.hold.${id}`;
    let value = sessionStorage.getItem(name);
    if (!value) {
      value = crypto.randomUUID();
      sessionStorage.setItem(name, value);
    }
    return value;
  });
  const now = useServerClock(query.data?.serverTime);
  async function reserve() {
    setBusy(true);
    setError(null);
    try {
      const result = await send("/reservations", { quoteId: id }, "POST", {
        "Idempotency-Key": key,
      });
      navigate(`/reservations/${result.data._id}`);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }
  if (checking) return <Status>Checking your session…</Status>;
  if (!user) return <SignIn next={`/review/${id}`} />;
  return (
    <QueryState query={query}>
      {(quote) => (
        <>
          <div className="page-heading">
            <div>
              <EditorialTitle>Your journey, together.</EditorialTitle>
              <p>
                Review exactly what you are reserving. Payment is simulated.
              </p>
            </div>
            {quote.trip && (
              <Link to={`/planner/${quote.trip}`}>Back to your trip</Link>
            )}
          </div>
          <div className="detail-layout">
            <section>
              <Items items={quote.items} />
              <p className="notice">
                Attraction admission, transport, meals and unselected lodging
                are excluded. All selected items will be held together or none
                will be held.
              </p>
            </section>
            <aside className="booking-panel">
              <h2>Reservation summary</h2>
              <p>
                {quote.travelers} travelers · {quote.country}
              </p>
              <Price price={quote.price} />
              <p className="fine-print">
                This quote does not reserve inventory. A successful hold
                reserves it for up to ten minutes.
              </p>
              <ErrorMessage error={error} />
              {now >= Date.parse(quote.expiresAt) ? (
                <p role="status">
                  This quote expired. Return to your trip or product and review
                  current prices.
                </p>
              ) : (
                <button
                  className="button full"
                  disabled={busy}
                  onClick={reserve}
                >
                  {busy ? "Requesting hold…" : "Hold selected items"}
                  <ArrowRight size={18} />
                </button>
              )}
              {error && (
                <Link to="/reservations">
                  Check reservations before retrying
                </Link>
              )}
            </aside>
          </div>
        </>
      )}
    </QueryState>
  );
}
export function ReservationDetail() {
  const { id } = useParams(),
    { user, checking } = useAuth(),
    client = useQueryClient();
  const query = useApi(`/reservations/${id}`, {
    enabled: !!user,
    refetchInterval: (q) =>
      q.state.data?.status === "pending" ? 15000 : false,
  });
  const now = useServerClock(query.data?.serverTime),
    [error, setError] = useState(null),
    [busy, setBusy] = useState(false),
    [confirmCancel, setConfirmCancel] = useState(false);
  async function act(action) {
    setBusy(true);
    setError(null);
    try {
      const result =
        action === "confirm"
          ? await send(`/reservations/${id}/confirm`, {})
          : await api(`/reservations/${id}`, { method: "DELETE" });
      client.setQueryData([`/reservations/${id}`], result.data);
      client.invalidateQueries({ queryKey: ["/reservations"] });
      setConfirmCancel(false);
    } catch (err) {
      setError(err);
      void query.refetch();
    } finally {
      setBusy(false);
    }
  }
  if (checking) return <Status>Checking your session…</Status>;
  if (!user) return <SignIn next={`/reservations/${id}`} />;
  return (
    <QueryState query={query}>
      {(r) => {
        const seconds = Math.max(
            0,
            Math.floor((Date.parse(r.expiresAt) - now) / 1000),
          ),
          pending = r.status === "pending";
        return (
          <>
            {pending && (
              <IslandContent
                id="reservation"
                priority={20}
                title={
                  seconds > 0
                    ? `On hold · ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
                    : "Hold expired"
                }
              >
                <p>
                  {seconds > 0
                    ? "Your selected items are temporarily held. Complete the existing confirmation below."
                    : "Recheck availability before reserving again."}
                </p>
                <button
                  className="button"
                  onClick={() =>
                    document.querySelector(".booking-panel")?.scrollIntoView({
                      behavior: matchMedia("(prefers-reduced-motion: reduce)")
                        .matches
                        ? "instant"
                        : "smooth",
                    })
                  }
                >
                  Continue reservation
                </button>
              </IslandContent>
            )}
            <Link className="back-link" to="/reservations">
              All reservations
            </Link>
            <div className="page-heading reservation-heading">
              <div>
                <span className={`reservation-status ${r.status}`}>
                  {r.status === "confirmed" ? (
                    <Check size={18} />
                  ) : (
                    <Clock size={18} />
                  )}{" "}
                  {r.status}
                </span>
                <h1>
                  {pending
                    ? "Your places are on hold."
                    : r.status === "confirmed"
                      ? "A journey to look forward to."
                      : "Your reservation"}
                </h1>
                <p>
                  Reference {r._id} · {r.travelers} travelers · Demo payment
                </p>
              </div>
              <DestinationPhoto country={r.country} />
            </div>
            <div className="detail-layout">
              <section>
                <Items items={r.items} />
                {r.trip && (
                  <Link to={`/planner/${r.trip}`}>Open trip draft</Link>
                )}
                <p className="fine-print">
                  This reservation is a fixed snapshot. Changes to your trip
                  draft do not change these items.
                </p>
              </section>
              <aside className="booking-panel">
                <h2>
                  {pending ? "Finish your reservation" : "Reservation summary"}
                </h2>
                <Price price={r.price} />
                {pending && (
                  <>
                    <p
                      className="hold-clock"
                      aria-label={`${Math.ceil(seconds / 60)} minutes remaining`}
                    >
                      {Math.floor(seconds / 60)}:
                      {String(seconds % 60).padStart(2, "0")}{" "}
                      <small>remaining</small>
                    </p>
                    <p className="fine-print">
                      Server time determines expiry. No real money will be
                      charged.
                    </p>
                    <button
                      className="button full"
                      disabled={busy || !seconds}
                      onClick={() => act("confirm")}
                    >
                      {busy
                        ? "Confirming…"
                        : seconds
                          ? "Confirm demo reservation"
                          : "Hold expired — refresh status"}
                    </button>
                    {!seconds && (
                      <button
                        className="text-button"
                        onClick={() => query.refetch()}
                      >
                        Refresh reservation
                      </button>
                    )}
                  </>
                )}
                <ErrorMessage error={error} />
                {["pending", "confirmed"].includes(r.status) && (
                  <Modal
                    open={confirmCancel}
                    onOpenChange={setConfirmCancel}
                    trigger={
                      <button className="text-button danger">
                        {pending
                          ? "Release this hold"
                          : "Cancel whole reservation"}
                      </button>
                    }
                    title={
                      pending
                        ? "Release every held item?"
                        : "Cancel this whole reservation?"
                    }
                    description="All rooms and tour seats in this reservation will be released. Your editable trip is preserved."
                  >
                    <div className="actions">
                      <button
                        className="button secondary"
                        onClick={() => setConfirmCancel(false)}
                      >
                        Keep reservation
                      </button>
                      <button
                        className="button danger"
                        disabled={busy}
                        onClick={() => act("cancel")}
                      >
                        {busy ? "Releasing…" : "Release all items"}
                      </button>
                    </div>
                    <ErrorMessage error={error} />
                  </Modal>
                )}
                <p className="fine-print">
                  Free simulated cancellation before the earliest booked item
                  starts. No partial changes.
                </p>
              </aside>
            </div>
          </>
        );
      }}
    </QueryState>
  );
}
export function Reservations() {
  const { user, checking } = useAuth();
  const query = useApi("/reservations", { enabled: !!user });
  const legacy = useApi("/users/me/bookings", { enabled: !!user });
  if (checking) return <Status>Checking your session…</Status>;
  if (!user) return <SignIn next="/reservations" />;
  return (
    <>
      <div className="page-heading">
        <div>
          <EditorialTitle>Your reservations</EditorialTitle>
          <p>Compare destinations, booked dates and what’s included.</p>
        </div>
        <Link className="button secondary" to="/trips">
          My trips
        </Link>
      </div>
      <QueryState query={query}>
        {(rows) =>
          rows.length ? (
            <div className="reservation-list">
              {rows.map((r) => (
                <ReservationCard key={r._id} reservation={r} />
              ))}
            </div>
          ) : (
            <div className="empty">
              <h2>No reservations yet.</h2>
              <p>Build a trip or explore a stay, tour, or package.</p>
              <Link className="button" to="/">
                Explore the world
              </Link>
            </div>
          )
        }
      </QueryState>
      {legacy.data?.length > 0 && (
        <>
          <h2>Hotel foundation reservations</h2>
          <p className="fine-print">
            Historical hotel bookings keep their original identifiers, prices
            and cancellation behavior.
          </p>
          {legacy.data.map((r) => (
            <LegacyBooking key={r._id} booking={r} reload={legacy.refetch} />
          ))}
        </>
      )}
    </>
  );
}
function ReservationCard({ reservation: r }) {
  const summary = reservationSummary(r);
  const counts = [
    summary.stays &&
      `${summary.stays} ${summary.stays === 1 ? "stay" : "stays"}`,
    summary.tours &&
      `${summary.tours} ${summary.tours === 1 ? "tour" : "tours"}`,
    summary.nights &&
      `${summary.nights} lodging ${summary.nights === 1 ? "night" : "nights"}`,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <article
      className="reservation-card"
      aria-label={`${summary.title}, ${summary.dates}, ${r.status}, reference ${summary.reference}`}
    >
      <div className="reservation-card-top">
        <span className={`reservation-status ${r.status}`}>
          {r.status === "confirmed" ? (
            <Check size={16} />
          ) : r.status === "cancelled" ? (
            <XCircle size={16} />
          ) : (
            <Clock size={16} />
          )}
          {r.status === "pending" ? "On hold" : r.status}
        </span>
        <span className="reservation-reference" title={r._id}>
          Reference #{summary.reference}
        </span>
      </div>
      <div className="reservation-card-main">
        <div>
          <p className="reservation-kind">
            {summary.type}
            {["stay", "tour"].includes(r.source?.kind)
              ? ` · ${summary.country}`
              : ""}
          </p>
          <h2>
            <Link to={`/reservations/${r._id}`}>{summary.title}</Link>
          </h2>
          <p className="reservation-dates">Booked dates: {summary.dates}</p>
          {summary.cities.length > 0 && (
            <p>Cities: {summary.cities.join(" · ")}</p>
          )}
          <p>
            {r.travelers} {r.travelers === 1 ? "traveler" : "travelers"}
            {counts ? ` · ${counts}` : ""}
          </p>
        </div>
        <div className="reservation-card-price">
          <small>Reservation total · {r.price.currency}</small>
          <strong>{formatMoney(r.price.total, r.price.currency)}</strong>
        </div>
      </div>
      <details className="reservation-selection">
        <summary>
          See {summary.items.length} booked{" "}
          {summary.items.length === 1 ? "item" : "items"}
        </summary>
        <ul>
          {summary.items.map((item, index) => (
            <li key={index}>
              <strong>{item.name}</strong>
              <span>
                {formatReservationDates(...itemDates(item))}
                {item.kind === "stay"
                  ? ` · ${item.quantity} × ${item.roomName} · ${item.nights} ${item.nights === 1 ? "night" : "nights"}`
                  : ` · ${item.quantity} ${item.quantity === 1 ? "seat" : "seats"}`}
              </span>
            </li>
          ))}
        </ul>
        <p className="fine-print">
          Stay end dates are checkout dates. This list shows the booked
          snapshot.
        </p>
      </details>
      <div className="reservation-card-footer">
        <div>
          {bookingTime(r.createdAt) && (
            <p>Created {bookingTime(r.createdAt)}</p>
          )}
          {r.status === "confirmed" && bookingTime(r.confirmedAt) && (
            <p>Confirmed {bookingTime(r.confirmedAt)}</p>
          )}
          {r.status === "cancelled" && bookingTime(r.cancelledAt) && (
            <p>Cancelled {bookingTime(r.cancelledAt)}</p>
          )}
          {r.status === "pending" && bookingTime(r.expiresAt) && (
            <p>Hold expires {bookingTime(r.expiresAt)}</p>
          )}
        </div>
        <Link
          to={`/reservations/${r._id}`}
          aria-label={`View reservation ${summary.reference}`}
        >
          View reservation <ArrowRight size={16} />
        </Link>
      </div>
    </article>
  );
}
function LegacyBooking({ booking: r, reload }) {
  const [error, setError] = useState(null),
    [busy, setBusy] = useState(false),
    [open, setOpen] = useState(false);
  async function cancel() {
    setBusy(true);
    try {
      await api(`/bookings/${r._id}`, { method: "DELETE" });
      await reload();
      setOpen(false);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="trip-row">
      <span className="reservation-status">{r.status}</span>
      <h3>{r.hotelName}</h3>
      <p>
        {r.checkIn.slice(0, 10)} → {r.checkOut.slice(0, 10)} ·{" "}
        {formatMoney(r.price.total, r.price.currency)}
      </p>
      {r.status === "confirmed" && (
        <Modal
          open={open}
          onOpenChange={setOpen}
          trigger={
            <button className="text-button danger">Cancel hotel booking</button>
          }
          title="Cancel this hotel booking?"
          description="The rooms for every booked night will be released."
        >
          <button className="button danger" disabled={busy} onClick={cancel}>
            Cancel booking
          </button>
          <ErrorMessage error={error} />
        </Modal>
      )}
    </article>
  );
}
