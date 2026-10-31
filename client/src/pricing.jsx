import React, { createContext, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "./api.js";
import { formatMoney } from "../../shared/travel.js";
const Prices = createContext({});
export function PriceCollection({
  records,
  kind,
  travelers = 2,
  from,
  to,
  roomTypeId,
  departureId,
  children,
}) {
  const selections = records
    .filter((r) => !["attractions", "templates"].includes(r.priceKind || kind))
    .map((r) => ({
      kind: r.priceKind || kind,
      id: String(r.id || r._id),
      ...(roomTypeId && { roomTypeId }),
      ...(departureId && { departureId }),
      ...(r.roomTypes && from && to && { checkIn: from, checkOut: to }),
    }));
  const payload = { travelers, selections };
  const query = useQuery({
    queryKey: ["estimates", payload],
    enabled: selections.length > 0,
    queryFn: async ({ signal }) => {
      const rows = [];
      for (let i = 0; i < selections.length; i += 20) {
        const response = await fetch("/api/estimates", {
          method: "POST",
          credentials: "same-origin",
          signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            travelers,
            selections: selections.slice(i, i + 20),
          }),
        });
        const body = await response.json();
        if (!response.ok)
          throw Error(body.error?.message || "Estimates unavailable");
        rows.push(...body.data);
      }
      return Object.fromEntries(
        rows.map((row) => [`${row.kind}:${row.id}`, row]),
      );
    },
    staleTime: 0,
    retry: false,
  });
  return (
    <Prices.Provider
      value={{
        rows: query.data || {},
        loading: query.isFetching,
        error: query.error,
      }}
    >
      {query.error && (
        <div className="estimate-feedback" role="alert">
          <p>Unit rates remain visible. Selection estimates could not load.</p>
          <button
            type="button"
            className="button secondary"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
          >
            Retry estimates
          </button>
        </div>
      )}
      {query.isFetching && (
        <p className="fine-print" role="status">
          Updating selection estimates…
        </p>
      )}
      {children}
    </Prices.Provider>
  );
}
export function useTripEstimate(draft) {
  const payload = {
    ...draft,
    name: "Planning estimate",
    days: draft.days.map((day) => ({
      ...day,
      stops: day.stops.filter((stop) => stop.kind === "tour"),
    })),
  };
  const enabled =
    payload.stays.length > 0 ||
    payload.days.some((day) => day.stops.length > 0);
  const query = useQuery({
    queryKey: ["trip-estimate", payload],
    queryFn: ({ signal }) =>
      api("/estimates/trip", {
        method: "POST",
        body: JSON.stringify(payload),
        signal,
      }).then((r) => r.data),
    enabled,
    retry: false,
    staleTime: 0,
  });
  return { ...query, enabled };
}
export function Price({ record, kind, summary }) {
  const context = useContext(Prices),
    estimate = summary || context.rows?.[`${kind}:${record.id || record._id}`];
  if (kind === "attractions")
    return <span className="product-price">Tickets not sold here</span>;
  if (kind === "templates")
    return <span className="product-price">Free to copy · bookings extra</span>;
  const unit =
      estimate?.unitPrice ??
      (kind === "stays" ? record.minPrice : record.price),
    currency = estimate?.currency || record.currency;
  return (
    <span className="product-price">
      {unit != null && currency && (
        <strong>
          {kind === "stays" ? "From " : ""}
          {formatMoney(unit, currency)} /{" "}
          {kind === "stays" ? "room / night" : "traveler"}
        </strong>
      )}
      {estimate?.total != null && (
        <span>
          {kind === "packages" ? "From " : ""}Estimated{" "}
          {formatMoney(estimate.total, estimate.currency)}
          {estimate.assumptions?.travelers
            ? ` for ${estimate.assumptions.travelers} travelers`
            : ""}{" "}
          · includes demo service fee
        </span>
      )}
      {estimate?.assumptions?.date && (
        <small>Departure assumption: {estimate.assumptions.date}</small>
      )}
      {estimate?.assumptions?.rooms && (
        <small>
          {estimate.assumptions.rooms} {estimate.assumptions.roomName} room(s)
          {estimate.assumptions.nights
            ? ` · ${estimate.assumptions.nights} nights`
            : ""}
        </small>
      )}
      {estimate?.missing && <small>{estimate.missing}</small>}
      {estimate?.incomplete && (
        <small>
          Incomplete selections · only selected bookable items are estimated.
        </small>
      )}
      {context.loading && <small>Updating selection estimate…</small>}
      {context.error && (
        <small>
          Selection estimate unavailable. Use Retry estimates or review for a
          server quote.
        </small>
      )}
      {!estimate && !context.loading && unit == null && (
        <small>
          {context.error
            ? "Estimate unavailable. Retry or review for current prices."
            : "Choose selections to see a price estimate."}
        </small>
      )}
      {estimate?.inrEstimate && (
        <small>
          ≈ {formatMoney(estimate.inrEstimate.amount, "INR")} · reference{" "}
          {estimate.inrEstimate.date}
          {estimate.inrEstimate.stale ? " (stale)" : ""}
        </small>
      )}
    </span>
  );
}
