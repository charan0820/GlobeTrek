# GlobeTrek release roadmap

The approved ten-country contract is in IMPLEMENTATION.md. The hotel-only and five-country plans are superseded. No fixed delivery date is used to drop correctness checks.

| Milestone | Working implementation | Verification |
|---|---|---|
| Foundation | Preserved auth, legacy booking IDs, tests, logs and transactional inventory; modular React routes; shared date/currency rules | Integration suite, lint and build |
| Discovery | Globe, ten countries, country dossiers, city/category/search filters and map/list views | Catalog integrity, responsive browser checks, WebGL/provider fallback |
| Destination content | 30 cities, 120 attractions, 60 stays/tours; source links, local photos and attribution; scheduled departures | Count/reference/timezone/provenance checks and seed safety tests |
| Trip workspace | Guest draft, ordered days, keyboard/drag moves, stays, tours, revisioned autosave, backup/conflict recovery | Browser recovery scenarios and ownership/revision tests |
| Curated journeys | 20 editable templates; 20 separate fixed packages | Template independence and package booking journey |
| Reservations | Quotes, holds, shared capacity, confirmation, cancellation, expiry and immutable item snapshots | Rollback/contention/expiry/idempotency/cancellation tests and isolated k6 |
| Delivery | Documentation, learning journal, interview sheet, CI and deployment configuration | Current results in PROGRESS.md; hosted smoke requires publication approval |

The one-country vertical slice expanded through validated imports to all ten countries. Content and inventory remain demo data; current destination access details must be checked through source guides.

## Explicit future work

Live suppliers/payments, multi-country trips, road routing/transport sales, attraction tickets, automatic route optimization, in-app AI, reviews, cuisines, public sharing and an admin interface. These remain future capabilities rather than implicit promises of this release.

Before accepting real customers, revisit supplier contracts, payments/refunds, taxes, policies, inventory ownership, monitoring, backups and hosting guarantees. The present simulated policies do not establish those commercial requirements.
