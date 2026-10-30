# GlobeTrek: Revised Project Context and 10-Week Plan

*Paste this document at the start of any new chat. The original feature scope is restored as of 29 October 2026; see docs/ROADMAP.md for the current sequence and docs/PROGRESS.md for completed work. The hotel-only implementation is Phase 0, not the final GlobeTrek product. The ten-week schedule below is historical planning, not a new delivery promise.*

## 1. How to use this document

This document preserves earlier planning for GlobeTrek, a MERN tourism discovery and booking platform. The accepted ten-country contract in docs/IMPLEMENTATION.md takes precedence over historical scope, schedules and implementation instructions below. Read docs/PROGRESS.md for the latest verified state and remaining work; do not restart from the historical day-by-day plan.

## 2. Working rules for the assistant

**Implementation ownership (updated 29 October 2026).** The user authorizes significant AI acceleration across frontend and backend. The assistant may implement React components, layouts, globe/maps, state, routing, APIs, tests, and supporting data in working increments. Explain important architecture and correctness decisions after each milestone; retain focused hands-on exercises without requiring the student to type every routine file. This replaces the earlier student-only frontend boundary. Never approve access requirements, account connections, Git commits/pushes, infrastructure, or publication without user permission.

**Assistant roles:** database engineer, backend engineer, API architect, booking-system engineer, testing assistant, performance/reliability engineer, technical documentation assistant.

**How to work:**

1. Work incrementally; never dump the whole project.
2. For each task: explain the goal, why it matters, files to create or modify, the implementation, how to test it, the expected result, and the next logical task.
3. If a task depends on something not yet built, say so instead of assuming it exists.
4. Point out architectural problems before writing code. If several approaches are reasonable, compare briefly and recommend one.
5. For every backend endpoint, state: endpoint, method, request params, request body, response structure, possible errors.

**Code quality:** focused modules, meaningful names, validate all input, handle errors, no duplicated business logic, business logic in services (not route handlers), organized database access, comments only where they add understanding, no unnecessary abstraction.

**Do not overbuild.** No microservices, Kubernetes, Kafka, Elasticsearch, GraphQL, multiple databases, or event-driven architecture. Every technology needs a concrete reason.

**Honesty rule.** Never invent performance numbers. Every reported number must come from an actual test run.

**Interview rule.** The student must be able to explain every transaction, index, and test. Build the booking engine in small steps and explain each one. The student should type or at least fully walk through the critical code (inventory, transactions, pricing).

## 3. Project summary

Homepage with an interactive 3D globe. Users rotate and zoom, hover countries (border highlight plus brochure panel), click a country to open a country map with tourism hotspots, then explore attractions, hotels, tours, and predefined plans. Users can also search traditionally, pick dates and travelers, check availability, see a server-calculated price, and book. The core resume story is: **a concurrency-safe booking engine that provably never oversells, backed by real k6 measurements.**

**Stack:** React + Vite (JS or TS, decide Day 1), Node.js + Express, MongoDB + Mongoose. Frontend extras (student's choice): Three.js / R3F, MapLibre or Leaflet, Framer Motion, Axios.

## 4. Scope (changes from the original brief)

**MVP (must ship):**

- 5 to 8 countries done well, with real data and licensed or self-hosted images
- About 30 to 40 tourist spots, 15 to 20 hotels with room types, 15 tours, 5 predefined plans
- Data-driven country rendering (no per-country pages)
- Authentication (moved early, because bookings need a user)
- Search, filter, sort, pagination, basic autocomplete using MongoDB text and regex indexes
- Availability endpoint, pricing service, booking, cancellation, booking history
- Per-night inventory model with transactions, idempotency, and holds
- Tests, k6 load tests, contention proof, performance report

**Stretch (only if ahead of schedule):**

- Plan customization with live repricing (swap hotel, add or remove spot)
- Reviews
- Cuisines collection
- Admin APIs
- Redis-free caching beyond simple in-memory caching

**Cut / read-only:** predefined plans are read-only at first. Payment is simulated and documented as such. The 30 to 50 country dataset is a later growth goal; the seed system must be built so adding a country is just adding a data file.

## 5. Locked technical decisions

These are decided up front because the schema depends on them.

1. **Inventory model: per-night inventory documents.** Collection `roomInventory` with one document per (hotelId, roomTypeId, date) holding `totalInventory`, `booked`, and `held`. Unique compound index on (roomTypeId, date). Reserving is an atomic conditional update (`$inc` where `booked + held + requested <= total`) applied to every night of the stay inside a single MongoDB transaction. If any night fails, the transaction aborts and nothing is reserved. This, not overlap checking, is what prevents overselling.
2. **Date overlap is a validation layer.** Rule: stays are `[checkIn, checkOut)`, check-out exclusive. Two stays overlap when `startA < endB AND startB < endA`. Used to validate input and to detect a user's conflicting bookings, never as the sole safety mechanism.
3. **Dates:** stored as UTC midnight. API accepts ISO `YYYY-MM-DD`. Nights = number of dates in `[checkIn, checkOut)`. Minimum 1 night, maximum stay and maximum advance window defined in config.
4. **Money:** stored as integer minor units (cents/paise) with a currency code. Pricing computed server-side only.
5. **Booking status flow:** `pending` (inventory held, expires after N minutes) then `confirmed`, or `cancelled`, or `expired`. An expiry job releases held inventory.
6. **Idempotency:** `POST /api/bookings` requires an `Idempotency-Key` header. A unique index on (userId, idempotencyKey) makes retries and double-clicks safe.
7. **Replica set from Day 4:** MongoDB transactions require a replica set. Use a local single-node replica set (Docker or `mongod --replSet`) or MongoDB Atlas free tier.
8. **Auth:** JWT (access token) with bcrypt password hashing; role field (`user`, `admin`). Moved to Week 3.
9. **Search:** MongoDB text indexes plus prefix regex for autocomplete. No Elasticsearch.
10. **Geo:** `2dsphere` indexes on GeoJSON `location` for spots and hotels (needed for "near a city").
11. **Response envelope:** `{ "success": true, "data": ..., "meta": { page, limit, total } }` and errors `{ "success": false, "error": { code, message, details } }`.
12. **Repo layout:** monorepo with `/client` (student) and `/server` (assistant-assisted). Server folders: `config`, `models`, `routes`, `controllers`, `services`, `middleware`, `validators`, `utils`, `seed`, `tests`, `loadtests`.

## 6. Data model (starting point, refined in Week 1)

- **users:** name, email (unique), passwordHash, role, createdAt
- **countries:** name, slug, isoCode (unique), continent, capital, currency, languages, description, centroid (GeoJSON), flag, images, bestTimeToVisit
- **regions / cities:** name, country ref, location (GeoJSON). Cities are needed for "spots near a city"
- **touristSpots:** name, country ref, city ref, description, category (enum), location (2dsphere), images, rating, ratingCount, entryFee, estimatedVisitDuration, bestTimeToVisit, popularityScore
- **hotels:** name, country ref, city ref, location (2dsphere), description, images, rating, amenities. Room types are **embedded** in the hotel (small, bounded, always read together): name, capacity, basePrice, amenities, totalInventory
- **roomInventory:** hotel, roomTypeId, date, total, booked, held (unique on roomTypeId + date)
- **tours:** name, country, city, description, category, duration, price, capacityPerDeparture, images, rating
- **travelPlans:** title, country, durationDays, days\[\] (each referencing cities, spots, hotel, tours), estimatedPrice, images. Read-only at first
- **bookings:** user, status, items\[\] (embedded booking items: hotel stay or tour), dates, guests, price breakdown (integer), idempotencyKey, holdExpiresAt, timestamps
- **cuisines, reviews:** stretch

Embedding vs referencing rule: embed small bounded data read together (room types, booking items, plan days); reference anything that grows or is queried independently (spots, hotels, bookings, inventory).

## 7. API roadmap (build in this order)

| Phase | Endpoints |
| --- | --- |
| Week 2 | `GET /api/countries`, `GET /api/countries/:id`, `GET /api/countries/geo` (lightweight list for the globe) |
| Week 3 | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` |
| Week 3 to 4 | `GET /api/countries/:id/spots` (filters: category, minRating, sort, page), `GET /api/spots/near?lat&lng&radius`, `GET /api/spots/popular` |
| Week 5 | `GET /api/hotels`, `GET /api/hotels/:id`, `GET /api/tours`, `GET /api/tours/:id`, `GET /api/plans`, `GET /api/plans/:id`, `GET /api/search?q=`, `GET /api/search/autocomplete?q=` |
| Week 6 | `GET /api/hotels/:id/availability`, pricing service |
| Week 7 | `POST /api/bookings`, `GET /api/bookings/:id`, `DELETE /api/bookings/:id`, `GET /api/users/me/bookings` |
| Stretch | plan customization, reviews, admin |

## 8. Seed system requirements

- Data lives in versioned JSON files per country (for example `seed/data/japan.json`), not generated randomly.
- One seed script loads countries, cities, spots, hotels (with room types), tours, plans, and generates `roomInventory` for a rolling date window (for example the next 365 days).
- Idempotent: running it twice does not duplicate data (upsert by slug).
- Referential integrity check at the end of seeding (every spot has a valid country and city; every plan item resolves).
- Image policy: use only images you have rights to (Unsplash/Wikimedia with attribution recorded in the data, or your own). Record `imageCredit` per image.
- First countries (suggested): Japan, Italy, France, India, Thailand, plus 1 to 3 more. Each needs 3 cities, about 6 spots, 2 to 3 hotels, 2 to 3 tours.

## 9. Testing and load-testing requirements

**Automated tests (Jest or Vitest + Supertest + mongodb-memory-server replica set):**

- Database: schema validation, relationships, indexes exist
- Booking: valid booking, invalid dates, overlapping dates, fully booked, concurrent booking, cancellation, expiry, idempotent retry
- API: success, invalid input, unauthorized, forbidden, missing resource

**k6 scenarios:** browse, search/filter/sort/availability, booking flow, and **contention** (many virtual users book the last room). The contention test must prove `successful bookings <= available inventory`, verified by querying the database afterward, not by trusting HTTP responses alone.

**Report must include (measured only):** concurrent users, requests/sec, average, p50, p95, p99 latency, error rate, CPU and memory (recorded during the run), database performance (slow queries, `explain()` before/after indexes), and the contention result. Explain bottlenecks and what changed after each optimization, with before/after numbers.

## 10. Day-by-day plan (10 weeks)

Why 10 weeks instead of 8: the original plan under-budgeted the globe, the maps, and the data work. Two tracks run in parallel: **Backend track** (assistant helps) and **Frontend track** (student only; assistant gives contracts and guidance if asked). Weeks 6 to 10 are protected for the booking engine and reliability work. If you must stay at 8 weeks, drop Weeks 8's stretch items and compress Week 4 into Week 3.

### Week 1: Foundation and decisions

| Day | Backend track | Frontend track |
| --- | --- | --- |
| 1 | Finalize requirements; confirm this document; decide JS vs TS; define MVP and out-of-scope list | Choose JS vs TS; sketch homepage, country panel, search, booking flow on paper |
| 2 | Define entities and relationships; draw the ER diagram; finalize embed vs reference per entity | Learn the globe approach: compare react-globe.gl vs raw R3F; pick one with reasons |
| 3 | Create monorepo, init `/server` (Express, ESLint, dotenv, folder structure); init `/client` with Vite | Scaffold Vite app, routing skeleton, folder structure |
| 4 | Set up MongoDB **replica set** (Docker or Atlas); connect with Mongoose; health-check endpoint; verify a transaction runs | Render a blank 3D scene (Canvas, camera, light) |
| 5 | Write core schemas: User, Country, City, TouristSpot (with validation and indexes) | Render a sphere with a texture; basic rotation |
| 6 | Express structure: app/server split, error-handling middleware, response envelope, validation middleware, logger | Add zoom controls; set up Axios client and environment variable for API base URL |
| 7 | Architecture review; write down the inventory model decision with a short comparison; update progress tracker | Review what works; list globe tasks for Week 2 |

### Week 2: Country data and globe support

| Day | Backend track | Frontend track |
| --- | --- | --- |
| 1 | Seed system skeleton: loader, upsert by slug, per-country JSON format; seed 2 countries | Obtain country GeoJSON (Natural Earth); learn the format |
| 2 | `GET /api/countries` with pagination and projection; slug and ISO lookups | Render country polygons on the globe |
| 3 | `GET /api/countries/geo`: lightweight payload (id, name, isoCode, centroid) for the globe; document the ISO-code join with GeoJSON | Map GeoJSON features to API countries by ISO code |
| 4 | `GET /api/countries/:id` with full detail; 404 and invalid-ID handling | Hover detection (raycasting) and border highlight |
| 5 | Seed 5 countries fully (country-level data, cities); referential integrity check | Brochure panel on hover (fed by API data) |
| 6 | Tests for countries API; response caching headers (`Cache-Control`) for static country data | Click-to-select country; camera fly-to animation |
| 7 | Buffer day and review; document the API contract for the student | Performance check (FPS), cleanup |

### Week 3: Auth and tourist spots

| Day | Backend track | Frontend track |
| --- | --- | --- |
| 1 | User model finalization, password hashing, `POST /api/auth/register` with validation | Country page route (data-driven by slug); loading and error states |
| 2 | `POST /api/auth/login`, JWT issuing, `GET /api/auth/me`, auth middleware, role guard | Login/register forms and auth state |
| 3 | Auth tests (duplicate email, wrong password, expired or missing token) | Protected routes; token storage decision (and its trade-offs) |
| 4 | TouristSpot indexes (2dsphere, category, rating); seed about 30 spots | Choose map library (MapLibre vs Leaflet); render a country map |
| 5 | `GET /api/countries/:id/spots` with category, minRating, sort, pagination | Place spot markers from the API |
| 6 | `GET /api/spots/near` ($geoNear / $near), `GET /api/spots/popular` | Marker hover cards (mini brochure) |
| 7 | Spot API tests; `explain()` to confirm index usage; update the contract | Review and polish |

### Week 4: Hotels, rooms, tours, plans (schemas and seed)

| Day | Backend track | Frontend track |
| --- | --- | --- |
| 1 | Hotel schema with embedded room types; validation (capacity, price in minor units) | Country page layout: tabs for attractions, hotels, tours, plans |
| 2 | Tour schema; TravelPlan schema (read-only, days array with references) | Attractions list UI with filters |
| 3 | RoomInventory schema and unique index; script to generate inventory for a date window | Spot detail view |
| 4 | Seed hotels (15 to 20), tours (15), plans (5); keep relationships consistent by city | Map and list synchronization (hover a card, highlight a marker) |
| 5 | Seed integrity check and idempotency test; re-run seed twice | Responsive layout pass |
| 6 | Database tests: schema validation, relationships, indexes exist | Cleanup and edge cases |
| 7 | Review data model; adjust before APIs depend on it | Review |

### Week 5: Remaining read APIs and search

| Day | Backend track | Frontend track |
| --- | --- | --- |
| 1 | `GET /api/hotels` and `/api/hotels/:id` with filters (city, price range, rating, amenities) and sort | Hotels list and filter UI |
| 2 | `GET /api/tours`, `/api/tours/:id` with filters | Tours list UI |
| 3 | `GET /api/plans`, `/api/plans/:id` with populated days | Plan detail view (itinerary) |
| 4 | Text indexes; `GET /api/search?q=` across countries, cities, spots, hotels, tours, plans | Search page and results grouping |
| 5 | `GET /api/search/autocomplete?q=` (prefix match, limited results) | Search box with debounced autocomplete |
| 6 | API tests: success, invalid, missing resource; pagination edge cases | Error and empty states |
| 7 | Review; write the full API contract document for all read endpoints | Review |

### Week 6: Availability and pricing

| Day | Backend track | Frontend track |
| --- | --- | --- |
| 1 | Date utilities: parse, validate, nights calculation, UTC and check-out-exclusive convention; unit tests | Date range picker and traveler selector UI |
| 2 | Overlap detection function with exhaustive unit tests (adjacent, nested, identical, partial) | Hotel detail with room types |
| 3 | Availability service: min remaining across all nights in `roomInventory` | Call availability endpoint; display results |
| 4 | `GET /api/hotels/:id/availability` (validation, guests vs capacity, rooms requested) | Handle unavailable and error states |
| 5 | Pricing service v1: base x nights x rooms, taxes, fees; integer math; per-night price overrides optional | Price breakdown UI (preview only) |
| 6 | Pricing tests (rounding, multiple rooms, zero nights rejected) | Polish booking-widget UI |
| 7 | Review; write down the booking-engine design before coding it | Review |

### Week 7: Booking engine (protected week)

| Day | Backend track | Frontend track |
| --- | --- | --- |
| 1 | Booking schema, status flow, idempotency index; demonstrate the **naive** read-then-write bug with a test that fails | Booking form and confirmation screen shell |
| 2 | Reservation service: atomic conditional `$inc` per night inside a transaction; single-night success | Booking summary UI |
| 3 | Multi-night reservation; rollback when any night is full; transaction retry on `TransientTransactionError` | Show server-calculated final price |
| 4 | `POST /api/bookings`: auth, validation, server-side price recalculation, idempotency key | Connect booking call with idempotency key; disable double-submit |
| 5 | `GET /api/bookings/:id`, `GET /api/users/me/bookings` (ownership checks) | Booking history page |
| 6 | `DELETE /api/bookings/:id`: cancellation, inventory release, refund rule, idempotent cancel | Cancel UI and statuses |
| 7 | Hold expiry job (releases `held` inventory); review | Review |

### Week 8: Booking tests and tour bookings

| Day | Backend track | Frontend track |
| --- | --- | --- |
| 1 | Booking tests: valid, invalid dates, fully booked, overlapping own booking | Fix UX issues found in the flow |
| 2 | Concurrency test in Jest: N parallel requests for the last room; assert exactly 1 success | Error messages for sold-out races |
| 3 | Cancellation and expiry tests; inventory returns to exact original values | Responsive and accessibility pass |
| 4 | Tour booking (capacity per departure) reusing the same reservation pattern | Tour booking UI |
| 5 | Plan booking (read-only plan converts to a booking of hotel and tour items) | Plan booking UI |
| 6 | Unauthorized and forbidden API tests; edge cases | Cleanup |
| 7 | Stretch (only if ahead): plan customization or reviews; otherwise buffer | Buffer |

### Week 9: Performance and reliability

| Day | Backend track | Frontend track |
| --- | --- | --- |
| 1 | Install k6; browse scenario; record **baseline** numbers (no optimizations yet) | Frontend performance: bundle size, lazy loading |
| 2 | Search and filter scenario; record baseline; capture slow queries | Reduce globe load time |
| 3 | `explain()` analysis, add or fix indexes, measure again; keep before/after | Image optimization |
| 4 | Booking and availability scenarios under load; measure | Final responsive fixes |
| 5 | **Contention test:** many VUs book the last room; verify in the database that successes <= inventory | Bug fixing |
| 6 | Rate limiting and caching where measurement justifies it (country list, search); re-measure | Bug fixing |
| 7 | Review results; list remaining bottlenecks | Review |

### Week 10: Report, documentation, resume packaging

| Day | Backend track | Frontend track |
| --- | --- | --- |
| 1 | Capture CPU and memory during runs; run the final full load suite | Record a demo video of the flow |
| 2 | Write the performance report from real numbers only | Screenshots for README |
| 3 | API documentation (OpenAPI or Markdown) generated from the contracts | Final UI polish |
| 4 | Architecture document: ER diagram, inventory model, transaction flow, trade-offs | Prepare to explain the globe implementation |
| 5 | README, setup instructions, environment example, seed instructions, deployment (simple) | Deploy client |
| 6 | Mock interview: assistant asks the hard questions about transactions, indexes, and tests | Mock interview on the frontend |
| 7 | Final review; write resume bullets backed by measured data | Final check |

## 11. Definition of done and resume deliverables

- Working globe to country map to hotel to availability to price to booking flow
- Booking engine proven by a contention test with database verification
- Real k6 report with p50, p95, p99, error rate, and bottleneck analysis, plus before/after for each optimization
- Automated test suite passing, including the concurrency test
- README, API documentation, architecture document, demo video
- Resume bullets using only measured numbers, for example: "Built a concurrency-safe booking engine with per-night inventory and MongoDB transactions; verified zero overselling under N concurrent users in k6 contention tests" (fill in real N)

## 12. Progress tracker

| Week | Status | Notes |
| --- | --- | --- |
| 1 Foundation | Partly implemented | MERN workspace, validation, errors, logging, hotel/user/inventory/booking models exist; destination models remain. |
| 2 Country data and globe | Not started | Next restored milestone; five supported country profiles and real globe interactions. |
| 3 Auth and spots | Partly implemented | Cookie/JWT login and ownership exist; attractions and geographic queries remain. |
| 4 Hotels, tours, plans | Partly implemented | Six demo hotels and nightly inventory exist; expanded data, tours and itineraries remain. |
| 5 Read APIs and search | Partly implemented | Hotel listing/filtering/detail exist; cross-category search and autocomplete remain. |
| 6 Availability and pricing | Hotel foundation implemented | Dates, room availability and server pricing verified; tour/plan pricing remains. |
| 7 Booking engine | Partly implemented | Confirmed hotel booking, idempotency and cancellation verified; holds/expiry remain. |
| 8 Booking tests and tours | Partly implemented | Thirty tests now pass for current scope; tour and multi-item reservations remain. |
| 9 Performance | Hotel baseline measured | Browse/cache and hotel contention measured locally; new features require new measurements. |
| 10 Report and packaging | Partly implemented | Local docs, journal and interview sheet exist; full product demo/deployment remain. |

**Next task:** docs/ROADMAP.md milestone 1: country data/API foundation and the interactive globe. Preserve the working hotel foundation and its tests. No original core feature is removed by the shorter Phase 0 implementation.
