# GlobeTrek API contract

The authentication and legacy hotel endpoints below remain supported. The expanded discovery, trip, quote and multi-item reservation contract is documented in [TRAVEL-API.md](TRAVEL-API.md). New UI bookings use quotes and holds; legacy date/room limits apply only to the old hotel-only API.

Base path `/api`. Successful responses use `{ "success": true, "data": ... }` with optional `meta`. Errors use `{ "success": false, "error": { "code", "message", "details"?, "requestId"? } }`. `X-Request-Id` is returned on every response. No passwords, tokens, or request payloads are logged.

JSON mutation requests must include `Content-Type: application/json` and `Origin` equal to `APP_ORIGIN`. Browser fetch supplies Origin automatically. Login sets an HTTP-only, SameSite=Lax cookie, Secure in production. Sessions expire after two hours. Logout invalidates all current tokens for that user. Private responses are `Cache-Control: no-store`.

## Authentication

| Endpoint              | Body                    | Response and common errors                                                               |
| --------------------- | ----------------------- | ---------------------------------------------------------------------------------------- |
| `POST /auth/register` | `{name,email,password}` | 201 `{id,name,email}` and cookie; 400 invalid fields; 409 email in use; 429 rate limited |
| `POST /auth/login`    | `{email,password}`      | 200 public user and cookie; 401 invalid credentials; 400 validation; 429 rate limited    |
| `GET /auth/me`        | None                    | 200 public user; 401 absent, expired, or invalidated session                             |
| `POST /auth/logout`   | None; login required    | 200 `{loggedOut:true}`; 401 invalid session; clears cookie and invalidates all sessions  |

Name: 2–60 trimmed characters. Email: valid, max 254 characters, lowercased. Password: 10–72 characters and at most 72 UTF-8 bytes, enforced before bcrypt. No unknown body fields accepted. Authentication limit: 20 attempts per IP per 15 minutes, shared across login/register. General API limit: 300 requests per IP per minute. Both are per process.

## Hotels

`GET /hotels?city=Jaipur&q=house&sort=price_asc&page=1&limit=6`

- `city`: Jaipur, Udaipur, Kochi; optional.
- `q`: literal case-insensitive name substring, max 60 characters. Regex syntax is escaped. This deliberately small demo uses substring matching rather than a search engine.
- `sort`: `name` (default), `price_asc`, `price_desc`.
- `minCapacity`: optional integer 1–12. Match hotels with at least one room type whose per-room guest capacity is at least this value. For example, `GET /hotels?city=Udaipur&minCapacity=4`. This does not sum capacity across rooms, check date availability, or remove other room types from the returned hotel. Catalog `minPrice` still means the lowest price across all of the hotel's room types; the selected room's actual quote comes from the availability endpoint. Missing parameter preserves existing behavior; invalid values return 400.
- `page`: 1–1000, default 1. `limit`: 1–20, default 6.
- 200: hotel array and `meta: {page,limit,total,pages}`. No matches returns an empty array. Invalid query or unknown parameter returns 400.
- A hotel includes `_id`, slug, name, city, neighborhood, description, amenities, image, imageCredit, minPrice and `roomTypes: [{_id,name,capacity,basePrice,totalInventory,amenities}]`. All money is integer paise.
- Public response cache: 60 seconds, at most 100 entries per process. `X-Cache`: HIT, MISS, or DISABLED. HTTP cache headers also allow 60 seconds.

`GET /hotels/:id` returns one hotel; 400 malformed ID, 404 unknown hotel.

`GET /hotels/:id/availability?roomTypeId=...&checkIn=2026-11-01&checkOut=2026-11-03&rooms=1&guests=2`

- Every query field shown is required. Dates are `YYYY-MM-DD`, 1–14 nights, checkout exclusive, within the current UTC 90-day horizon. Rooms: integer 1–3. Guests: integer 1–12, at most capacity × rooms.
- 200: `{available,remaining,price:{subtotal,tax,total,currency,nights},paymentMode:"simulated"}`. `remaining` is the minimum remaining room count across nights. Missing inventory means unavailable.
- Errors: 400 invalid dates/fields/capacity; 404 hotel or room missing. No cache.
- `tax` is a compatibility field for the demo's flat 12% service fee; it does not implement actual GST rules.

## Reservations

All routes below require login; otherwise 401. Unknown or another user's reservation returns 404 to avoid disclosing ownership.

`POST /bookings` requires `Idempotency-Key`: 16–100 ASCII letters, numbers, hyphens, or underscores.

```json
{
  "hotelId": "replace-with-hotel-object-id",
  "roomTypeId": "replace-with-room-object-id",
  "checkIn": "2026-11-01",
  "checkOut": "2026-11-03",
  "rooms": 1,
  "guests": 2
}
```

Use current dates within the rolling horizon; dates above are illustrative. The body accepts these fields only. The server computes the entire price. A booking contains `_id`, user, hotel, roomTypeId, hotelName, city, roomName, dates, rooms, guests, price, status, retry metadata, and timestamps.

- 201: confirmed booking, `meta.replayed:false`.
- 200: existing booking for an identical retry, `meta.replayed:true`, including if it has since been cancelled.
- 400: validation, missing/invalid key, dates, capacity.
- 409 `SOLD_OUT`: one or more nights cannot be reserved; no partial reservation persists.
- 409 `IDEMPOTENCY_CONFLICT`: same user's key has a different normalized payload.

Use the same key after a timeout or network failure. Generate a fresh key for a genuinely new booking. Keys are scoped to the user. The browser stores pending keys in sessionStorage until a successful response; no auth token is stored there.

`GET /users/me/bookings`: newest first, up to 100; `meta.limit=100`. `GET /bookings/:id`: one owned booking. `DELETE /bookings/:id`: transactionally cancel and release every night; returns the cancelled booking. Repeated cancellation returns the same state without releasing inventory twice. Demo cancellation is allowed even for past stays; no refund is processed.

## Operational errors

`GET /health`: 200 when MongoDB is connected, 503 otherwise; this is a readiness check, not a full inventory audit. General errors: 403 invalid Origin; 413 request over 16 KB; 429 request limit; 500 unexpected internal failure with a support request ID. Error responses never include internal stack traces or database messages.
