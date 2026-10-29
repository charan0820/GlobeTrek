# GlobeTrek learning journal

This journal connects the implementation to the concepts needed to explain GlobeTrek in an interview. Code being present does not mean a topic has been learned: complete each teach-back and small exercise before marking it understood. The project is a MERN demo with fictional hotels and simulated payment.

## Following one request through MERN

React runs in the browser and renders components from state. A user submits the availability form; the browser calls Express using fetch. Express middleware checks the request, the controller validates its shape, and a service queries MongoDB through Mongoose. JSON comes back and React updates state to render the quote.

The app/server split lets Supertest call Express without starting the deployed listening process. Controllers translate HTTP; services express business rules. This keeps transaction behavior testable and avoids copying booking logic into several routes.

Where to read: client/src/api.js, client/src/main.jsx, server/src/app.js, server/src/controllers/hotels.js, server/src/services/booking.js.

Teach back: Trace the exact path from clicking Check availability to seeing the total. Which parts execute in the browser, in Node, and in MongoDB? Exercise: add a visible label using existing hotel data without changing the API contract.

## React state and asynchronous work

Components describe the UI for the current state; setters request another render. Controlled inputs store their values in React state. Effects synchronize with an external system such as the API. The catalog effect ignores stale responses after its query changes or the component unmounts. It does not guarantee the old HTTP request was cancelled.

Hotel quotes carry a fingerprint of their input. If dates or rooms change, the old quote is no longer displayed as current. The final server booking calculation remains authoritative even if a client displays an old value. Loading, empty, failure, and success are explicit states rather than assumptions about network speed.

Where to read: Hotels, HotelDetail, AuthPage, and Bookings in client/src/main.jsx. Shared API formatting is in client/src/api.js. React Context carries the signed-in user's public information; the actual token stays in a cookie.

Teach back: Why does changing a normal local variable not reliably update the screen? Why can effects run more than once in development? Exercise: deliberately change the catalog filter quickly and explain why an older response cannot replace the newer result.

## MongoDB modeling and data structures

An ObjectId identifies a document. References connect independently growing entities such as bookings and users. Embedded room types are bounded and usually read with a hotel. Booking names and price breakdowns are snapshots so later catalog changes cannot silently rewrite history.

Room inventory uses a unique compound index on roomTypeId and date. This provides one authoritative counter per night and supports targeted updates. The user/idempotencyKey index protects retry identity. Indexes improve selected reads but consume storage and add work to writes; an explain execution plan is evidence, not an assumption that every query is fast.

The code uses arrays for bounded room types and stay nights, objects for parsed requests, and a Map for the cache. Generating N nights takes O(N) time and space, bounded at 14. Map operations are average O(1). Database index complexity and transaction costs should be discussed separately from JavaScript array complexity. Name substring search may scan; six demo records do not justify a search service.

Teach back: Why not embed every booking inside its user? Why is a unique compound index more useful than only a JavaScript duplicate check? Exercise: identify which fields a city/price query can use from the existing index and inspect its explain output.

## Authentication and authorization

Authentication identifies the user; authorization decides which resources that user can access. Bcrypt hashes a password with a salt and adjustable work factor. Hashing is one-way; it is not encryption. The app checks UTF-8 byte length before bcrypt because bcrypt's input limit is measured in bytes.

A signed JWT contains a subject, version, issuer, audience, and expiry. It is signed rather than encrypted, so it contains no password. An HTTP-only cookie keeps JavaScript from reading it; Secure limits production transmission to HTTPS. SameSite=Lax and exact Origin validation protect browser mutations against CSRF. They do not eliminate XSS, so React escaping and a Content Security Policy still matter.

Each authenticated request loads its user and compares a token version. Logout increments that version, invalidating all old sessions for that user. Every booking lookup includes the authenticated owner; an ID supplied by the browser never establishes ownership. Missing or another user's booking returns 404. Auth rate limiting is per process and is not a distributed defense.

Teach back: Why is hiding a button insufficient authorization? What does HTTP-only prevent, and what does it leave possible? Exercise: request another user's booking with the first user's cookie and explain the expected response and database state.

## Dates money and validation

Bookings use UTC calendar dates and half-open intervals: check-in is included, checkout is excluded. A stay from November 1 to November 3 reserves two nights. Date parsing rejects normalized invalid dates such as February 30. Business validation enforces horizon, night count, room count, and guest capacity.

Money is integer paise. Subtotal is nightly price times nights times rooms. The educational 12% service fee is rounded once to integer paise. It is explicitly simulated and is not an implementation of real hotel tax rules. The client submits no trusted price.

Zod validates types, allowed fields, IDs, and bounds at the HTTP boundary. Database schema validation is another layer, but direct MongoDB updates do not automatically implement every business invariant. Therefore conditional writes and transaction checks are required as well.

Teach back: Why use integer money? Why is validating the browser form insufficient? Exercise: submit a forged price, a zero-night stay, and too many guests; explain the rejected layer for each.

## Transactions concurrency and retry safety

Reading available=1 and later writing a booking is unsafe: two requests can both read 1. GlobeTrek changes the counter only when booked plus requested is at most total. MongoDB atomically evaluates that condition on the document. The transaction combines every night's change and the booking insert, so a failure on the last night rolls back the earlier nights too.

Transactions require a replica set. Majority write concern and the driver transaction helper support reliable commits and transient conflict retries. The callback performs sequential database writes, because parallel operations in a transaction are unsupported. No email or external payment side effect belongs inside a callback that may run again.

An idempotency key means retrying the same intended operation returns the same booking. A payload hash rejects accidental reuse for different details. The unique user/key index is the final defense against concurrent duplicate inserts. The browser retains the pending key through uncertain network failures and removes it after receiving success. Cancellation changes booking state and releases inventory atomically, so a retry cannot release it twice.

Evidence to inspect: the integration suite reserves the final room concurrently with distinct keys, then queries both bookings and inventory. A successful HTTP count alone does not prove stored state is correct.

Teach back: What does the atomic condition protect that the transaction alone does not express? What happens if the client loses the response after a successful commit? Exercise: walk through multi-night rollback and repeated cancellation line by line in server/src/services/booking.js.

## Caching errors and performance

The catalog cache stores normalized query results for 60 seconds with a maximum of 100 entries. A Map gives lookup and deterministic eviction; TTL expiry bounds staleness. It is per Node process, so multiple instances do not share contents. Availability and bookings bypass the cache because inventory must be checked against current database state.

Errors use stable machine-readable codes plus readable messages. Validation errors identify fields; unexpected failures hide internal messages and return a request ID. Structured logs record route, status, and duration without credentials. Useful logs explain a failure without becoming a copy of user input.

Load testing measures behavior under a declared workload. Throughput is requests per second, latency is time per request, and p95 means 95% of measured requests completed at or below that value. A last-room SOLD_OUT response is an expected business result, not an unexpected server failure. The load runner separates these. CPU/memory readings describe only the measured process, not the whole machine. Cache comparisons should use the same workload and environment; no measured benefit is guaranteed beforehand.

Teach back: What can be stale for one minute without selling a room twice? Why might average latency hide a bad user experience? Exercise: compare baseline and cached raw results and explain what the experiment can and cannot establish.

## Better engineering habits and delivery

Keep secrets outside source control, commit a placeholder environment example, and update .gitignore before introducing generated files. Validate at boundaries, use meaningful names, centralize business rules, document intentional limits, and test observable invariants. A small test that proves rollback is more useful than a test that simply repeats implementation details.

CI should reproduce lint, tests, and build from the lockfile. Deployment needs explicit access approval, environment secrets, a replica set, correct origin, secure cookies, readiness checks, and a browser smoke test. A deployed demo is not automatically ready for real customers: backups, recovery, monitoring, staff operations, real payment reconciliation, and security review remain separate responsibilities.

Teach back: Explain one tradeoff you deliberately accepted, one risk you tested, and one production capability you have not built. Exercise: give a five-minute demonstration without claiming simulated or unmeasured features as real integrations.

## Guided practice night count and rollback 29 October 2026

The student traced the availability flow and explained the roles of conditional updates, transactions, and idempotency. The discussion clarified that the capacity condition does not choose a winner by transaction start time, and that changing a form changes its fingerprint before a new quote exists. Availability is a snapshot rather than a reservation.

In the real rollback test, the first night's booked counter is expected to remain zero after a later night fails. The student predicted that a leaked increment would make that assertion find one. They temporarily changed the expected value to one, observed Expected 1 and Received 0 at the assertion, restored zero, and reran the focused test successfully. One test passed and nineteen were skipped by the name filter. This exercised a deliberately incorrect expectation, not deliberately broken transaction code.

The student added a derived selectedNights value to HotelDetail using the UTC date timestamp difference divided by 86400000. A conditional paragraph shows the singular or plural night count for 1–14 nights and guidance otherwise. No additional useState or useEffect was needed: existing input state causes the component to render again and recalculate the count.

Debugging identified Number.isInterger as a misspelled method name and a missing closing quotation mark in the night/nights conditional. The student corrected both. Lint and the production build then passed. A focused browser check verified 1, 3, and 14 nights, same-day and reversed ranges, more than 14 nights, and empty checkout. The display updated with zero availability requests, no uncaught browser errors, and no horizontal overflow at a 390px mobile viewport. Desktop and mobile screenshots were inspected.

The count is display guidance, not complete booking validation. It does not establish that dates are within the booking horizon or that inventory is available. The server still validates dates, checks capacity, and calculates the authoritative price. The local demo was restarted for verification; its data is ephemeral. No Git commit, push, or hosted deployment was performed.

## Guided practice capacity filter 29 October 2026

The student implemented an optional minCapacity parameter for GET /api/hotels with guided code examples. They added Zod numeric coercion, integer and 1–12 bounds, and optional handling inside the strict listing schema. An omitted filter preserves the existing listing behavior. Empty, nonnumeric, fractional, negative, zero, and above-limit inputs are rejected rather than silently ignored.

The controller reads minCapacity from req.validated and adds roomTypes.capacity with a MongoDB $gte condition when provided. This matches a hotel if any embedded room type has sufficient per-room capacity. It does not require every room type to match and does not sum capacity across rooms. Both find and countDocuments share the filter, keeping hotel results and pagination totals aligned.

The existing cache key serializes the complete validated query. It therefore automatically distinguishes minCapacity values. Regression tests request Udaipur at capacities three and four, verify different initial results and separate cache misses, then repeat both requests and verify correct cache hits. This protects against serving a result cached for a different filter.

Eight regression cases were added by the assistant to the real integration suite. The full run passed thirty tests: twenty-eight API/booking tests and two utility tests. Verified examples include six hotels without a capacity filter, five at minimum capacity four, only Old Town Courtyard for Udaipur at four, and no matches at five. Invalid input returns HTTP 400. Pagination totals and both capacity boundaries were checked. Lint also passed after formatting.

Capacity filtering is catalog discovery, not a reservation or availability check. It leaves all embedded room types in the hotel response. Catalog minPrice remains the lowest price across all room types, which might belong to a smaller room; a chosen room's authoritative price comes from the availability/booking service. No new schema, index, external service, commit, or deployment was required. A running Node demo must restart to load these backend edits, unlike a browser-only view update.
