# GlobeTrek travel planner learning notes

These notes extend the hotel foundation. The implementation has been written by AI and must still be walked through with the learner; passing tests does not certify personal understanding.

## Modeling a travel domain

What: distinguish an attraction, tour product, scheduled departure, template, fixed package, trip draft and reservation snapshot. Why: confusing these would allow editing a confirmed purchase or create duplicate stock. Where: server/src/models/travel.js and CONTEXT.md. Verification: exact catalog-count and package/shared-inventory tests. Interview explanation: products describe an experience; departures hold timed capacity; drafts are editable; bookings preserve what was accepted.

## Mixed inventory transactions

What: collect per-night room demands, departure seats and package capacity into a Map, aggregate by resource key, sort and conditionally increment held quantities in one transaction. Why: one unavailable item must roll back earlier increments. Where: services/reservations.js. Verification: last-room contention, package-versus-tour stock, mixed rollback and direct database assertions. Interview explanation: a transaction gives all-or-nothing behavior; conditional predicates enforce capacity; unique indexes protect identity and active-hold invariants.

## Quotes holds confirmation and expiry

What: quotes freeze a price temporarily; holds reserve capacity temporarily; confirmation changes held into booked. Why: a displayed price or quote is not a reservation. Where: createQuote, hold, transition and reconciliation. Verification: late confirmation without cleanup, duplicate sweepers, repeated confirmation/cancellation and expiry races. Interview explanation: persisted deadlines determine correctness; timers improve cleanup promptness. TTL deletion is not a business workflow and cannot release counters transactionally.

## Dates timezones and currency

What: civil dates label trip days and hotel nights; UTC instants identify scheduled tour starts. Currency amounts have explicit minor-unit precision. Why: browser timezone and universal division by 100 would corrupt dates or Japanese yen. Where: shared/travel.js and travel-policy.js. Verification: DST gaps/ambiguities, exclusive checkout, fee rounding and EUR-based conversion direction. Interview explanation: preserve the business meaning of a value instead of treating every date as an instant or every amount as a floating number.

## Draft state and optimistic concurrency

What: a reducer owns edits, local storage preserves guest intent and backup, server revisions reject stale autosaves. Why: multiple tabs can edit the same trip. Where: client planner and trip services. Verification: 409 stale-revision and cross-user tests plus browser guest/login/save journey. Interview explanation: each write states which version it saw; a mismatch requires user reconciliation rather than silent overwrite. Draft versions and reservation snapshots have different lifecycles.

## Geographic views and resilience

What: lazy-loaded globe and map engines display the same catalog IDs used by accessible lists. Why: visual discovery should not require WebGL or working third-party tiles. Where: geo components, country explorer and planner. Verification: responsive browser checks, keyboard alternatives, map-error/list fallback. Interview explanation: geography is a view over domain state; it is not a second source of truth. Straight route lines do not establish navigability.

## Seed safety and content provenance

What: stable keys preserve resource identities; insert-only capacity generation tracks a horizon; licensed photos retain author/source/license. Why: resetting counts or recreating missing historical rows could oversell. Where: seed/travel.js and destination attribution manifest. Verification: rerun with booked rows and deliberate inventory holes. Interview explanation: seed scripts are production data operations, not harmless fixtures; idempotency must preserve business history.

## Interview practice for the expanded project

1. Why are tours and departures separate? Discuss product metadata versus a timed stock unit.
2. How can a package and a standalone tour share the last seat? Explain common resource IDs, conditional writes, rollback and package capacity.
3. What happens when confirmation races expiry? Walk through transactional status checks and exactly-once counter movement.
4. Why do you retain idempotency keys after a network error? The server may have committed before the response disappeared.
5. Why use a revision as well as a transaction? Revision detects stale user intent; transaction protects database consistency across resources.
6. Can a map route guarantee a feasible day? No; transport, opening hours, entry and local access require separate checks.
7. What does free sleeping hosting change? Cleanup latency and cold starts; persisted-deadline enforcement still prevents late confirmation.
8. How do you distinguish your measurements from a scalability claim? Name environment, dataset, concurrency, duration, latency distributions, expected conflicts and database assertions.
9. Where would you improve next? Supplier integration, destination editorial review, cancellation policy sophistication, jobs on an approved always-on worker and richer navigation data, only with explicit product decisions.
