# GlobeTrek

GlobeTrek is being developed as a tourism discovery and trip-planning application built with MongoDB, Express, React, and Node.js: globe to country map to attractions, hotels, tours, itineraries, and reservations. See the [restored product roadmap](docs/ROADMAP.md).

The currently runnable Phase 0 is the hotel booking foundation: explore six fictional hotels across Jaipur, Udaipur, and Kochi, check dates, and reserve rooms with simulated payment. The globe, maps, attractions, tours, itineraries, holds, and expiry are planned features, not yet implemented.

The central engineering exercise is preventing overselling: each night is conditionally reserved in the same transaction as the booking record. Retry keys and transactional cancellation protect inventory from duplicate requests.

Verified locally: 30 automated tests pass, including minimum room-capacity filtering and cache separation. The desktop/mobile browser flow was verified, and 20 concurrent last-room requests produced one committed reservation with no overselling. [Measured results and limitations](docs/PERFORMANCE.md).

[Desktop catalog](docs/images/desktop.png) · [Mobile catalog](docs/images/mobile.png) · [Availability quote](docs/images/quote.png) · [Booking history](docs/images/bookings.png)

## Run the local demo

Requires Node.js 22.12+ (developed with 24.14), npm, and permission to download the MongoDB test binary on first use.

```sh
npm ci
npm run build
npm run demo
```

Open http://localhost:3000. Register a demo account with a unique password. The demo uses a temporary MongoDB replica set and a random session secret. **All demo data disappears when stopped.** This mode is for local development only.

## Run with a persistent database

1. Create a local MongoDB replica set or, with your approval, an Atlas cluster. Standalone MongoDB does not support this booking transaction.
2. Copy `.env.example` to `.env` at the repository root. Set `MONGODB_URI`, a random `JWT_SECRET` (at least 32 characters), and `APP_ORIGIN`.
3. Run `npm run seed`, then `npm run dev`. Open http://localhost:5173; Vite proxies `/api` to Express on port 3000. Use the exact hostname configured in `APP_ORIGIN`.
4. For a single-server build, run `npm run build`, set `APP_ORIGIN=http://localhost:3000`, then `npm start`.

Seeding is additive: reruns preserve room IDs, existing properties, and booked counts. It inserts missing inventory for the next 90 days. Run it daily for a continuously rolling horizon; no automatic hosted scheduler is provisioned. Catalog changes require an explicit migration instead of reseeding over booked data.

## Verify

```sh
npm run lint
npm test
npm run build
node scripts/loadtest.mjs
```

The final command requires k6 in PATH or `K6_BIN` pointing to its executable. It starts its own disposable database and API on port 3001; never point it at a deployed database. Raw results are stored under ignored `artifacts/loadtests`. CI runs lint, integration tests, and the client build. No workflow has been pushed or run remotely yet.

## Understand the code

- `server/src/services/booking.js`: pricing, availability, reservation transactions, cancellation.
- `server/src/models/index.js`: embedded room types, inventory and booking indexes.
- `server/src/controllers`: HTTP concerns; `middleware` handles login and origin validation.
- `client/src`: React state, routing, forms, API calls, and responsive styling.
- [API contract](docs/API.md), [architecture](docs/ARCHITECTURE.md), [learning journal](docs/LEARNING.md), [interview sheet](docs/INTERVIEW.md), [service register](docs/SERVICES.md), [progress](docs/PROGRESS.md), [deployment](docs/DEPLOYMENT.md).

## Honest limits

This is a production-minded educational MVP, not a live travel marketplace. Hotels are fictional; payments and the flat 12% service fee are simulated. There is no refund processing, email verification, password reset, staff support system, or real hotel integration. Caching and rate limiting are process-local. The booking history returns the latest 100 records. Availability is advisory until the booking transaction commits. Free hosting can cold-start. Load results from one development computer do not establish public production capacity.

No access approval, Git commit, push, account connection, or publication is implied by this repository. The intended GitHub owner is `charan0820`; a repository has not been created.
