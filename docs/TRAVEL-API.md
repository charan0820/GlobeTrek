# Travel API

All responses use `{success:true,data,meta?}` or `{success:false,error:{code,message,details?,requestId}}`. Private routes require the existing HTTP-only session cookie. Mutations require a matching Origin. No private response is publicly cached. IDs are Mongo ObjectIds unless an editorial attraction/template slug is specified.

## Discovery

GET /api/countries → country array. GET /api/countries/:code → country and three cities. GET /api/search?q=tokyo → up to ten linked matches; 2–80 characters.

GET /api/catalog accepts country, cityId, kind (attractions/stays/tours/templates/packages), q, page (1+), limit (1–50), sort (name/price_asc/price_desc). Price sorts require country. Optional lat, lng and radius (km, 1–100) filter geographic results. Responses include total/page/limit/pages. Catalog cache lasts 60 seconds; Age prevents a hit from resetting browser freshness.

GET /api/catalog/:kind/:id → detail. Attractions/templates use editorial IDs. GET /api/catalog/tours/:id/departures?from=YYYY-MM-DD&to=YYYY-MM-DD and equivalent packages endpoint → departures, UTC instants and remaining capacity. Date window is at most 30 inclusive days. Availability is not cached.

## Trips

GET /api/tour-departures?ids=id1,id2 returns up to 180 selected departure schedules (tour/date/startAt/endAt/timezone) for planner checks. This is public schedule metadata, not cached inventory availability.

POST /api/trips (201), GET /api/trips, GET /api/trips/:id, PATCH /api/trips/:id and DELETE /api/trips/:id (200). Another owner's ID returns 404. Active reservations prevent deletion (409).

Create body:

```json
{
  "name": "Japan journey",
  "country": "JP",
  "startDate": "2026-12-01",
  "endDate": "2026-12-04",
  "travelers": 2,
  "days": [
    { "date": "2026-12-01", "stops": [] },
    { "date": "2026-12-02", "stops": [] },
    { "date": "2026-12-03", "stops": [] },
    { "date": "2026-12-04", "stops": [] }
  ],
  "stays": []
}
```

All dates must occur exactly once and in order. Stop: `{id,kind:"attraction"|"tour",refId,departureId?}`. Stay: `{hotelId,roomTypeId,checkIn,checkOut}`. PATCH sends the entire draft plus expectedRevision. A stale revision returns 409 REVISION_CONFLICT; reload or create a copy using POST. Lists are bounded at 100.

## Quotes and reservations

POST /api/quotes (201): one of `{kind:"trip",tripId,revision}`, `{kind:"stay",hotelId,roomTypeId,checkIn,checkOut,travelers}`, `{kind:"tour",departureId,travelers}`, `{kind:"package",departureId,travelers}`. GET /api/quotes/:id returns its owned item/price snapshot, expiry and server time. Quotes expire after ten minutes and hold no stock. Empty bookables return 400; unresolved/overlapping selections return 409.

POST /api/reservations with `{quoteId}` and mandatory Idempotency-Key (16–100 letters/numbers/underscores/hyphens) creates a pending hold (201; same-payload replay 200). Same key/different quote returns 409 IDEMPOTENCY_CONFLICT. SOLD_OUT rolls back every capacity increment. ACTIVE_HOLD/ACTIVE_RESERVATION blocks conflicting holds. Pending expiry is ten minutes capped by first item start.

GET /api/reservations and GET /api/reservations/:id provide owned snapshots and server time. POST /api/reservations/:id/confirm with `{}` confirms or replays confirmation (200). Expired confirmation returns 409 HOLD_EXPIRED after releasing held stock. DELETE /api/reservations/:id releases a pending hold or cancels the whole eligible confirmed reservation (200, repeat-safe). After first item starts, confirmed cancellation returns 409 CANCELLATION_CLOSED.

Monetary values are integer minor units with explicit currency. Price: subtotal, fee, total, currency, feeLabel, optional inrEstimate (amount/date/source/stale/informational). Fees and payments are demonstration data. Reservation snapshots preserve accepted amounts and quantities.

Legacy /api/auth/\*, hotel detail/availability and hotel-only booking endpoints remain available. Legacy hotel listings remain the original India collection. Legacy date and room limits and historical cancellation behavior are retained; new UI bookings use travel quotes/holds.
