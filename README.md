# GlobeTrek

A MERN travel planner: explore a globe, discover destinations on a map, arrange a dated itinerary, and reserve selected demo stays and scheduled tours together.

The launch collection covers India, Japan, Thailand, Indonesia, France, Italy, Spain, Greece, Turkey and the United States: **30 cities, 120 attractions, 60 stays, 60 tours, 20 editable itineraries and 20 fixed packages**. Real place information links to destination guides; properties, operators, inventory, prices and payments are fictional demonstration data.

## Run locally

Requires Node.js 22.12+ (developed with 24.14), npm, and a MongoDB binary download on the first test/demo run.

```sh
npm ci
npm run build
npm run demo
```

Open [the local application](http://localhost:3000). Initial seeding creates a year of inventory and can take a few minutes. The demo uses a temporary MongoDB replica set and a random session secret: **stopping it removes its database**. Source files and documentation remain saved.

For a persistent local replica set, copy `.env.example` to `server/.env`, supply your own database URI and session secret, and set `APP_ORIGIN=http://localhost:3000` for the built app. Verify the database target before running `npm run seed`, then run `npm start`. Never commit `.env`. For Vite development, use `APP_ORIGIN=http://localhost:5173` and `npm run dev` instead.

## Product behavior

- Explore the globe or search; open a country and filter places, stays, tours, itineraries and packages.
- Build a guest trip locally or copy an itinerary. Sign in to save it across devices.
- Plan one country, 1–30 inclusive days, and 1–12 travelers. Selected stays use exclusive checkout dates. Lodging gaps are allowed and identified.
- Reorder stops, select scheduled tours, choose stay dates and review planning checks. Map connections do not provide road routing or transport times.
- Enter a country through the globe approach transition, then switch between Explore and Build your trip in one workspace. Model, Detailed map and List are presentation choices; only the active geographic engine runs. City-grouped results, pins and photo previews stay connected.
- All ten countries have local geographic relief, explicit distant-region insets, reset/fit/rotation controls and list alternatives. Heights are exaggerated eight times; inset spacing and stop connections do not represent travel distances. Ctrl/Command + wheel zooms the model while ordinary scrolling moves the page.
- Unit prices appear beside products. Read-only selection estimates include the demo service fee, explain missing selections and can be retried without losing the draft. Only the final quote and hold check current availability.
- Review the server-calculated destination-currency price. Optional ECB-based INR estimates are dated and informational; enable the public feed with `FX_REFRESH_ENABLED=true` only when network use is approved.
- Request a ten-minute hold, then confirm a simulated reservation. Every selected item reserves together or the transaction rolls back.
- Book fixed packages separately. They consume the same hotel/tour stock as other reservations.
- Cancel the whole reservation before its earliest item starts. Draft edits never change a confirmed snapshot.

## Engineering evidence

The core exercise is preventing overselling across multiple stock types. Conditional writes account for held and booked quantities; MongoDB transactions protect the entire selection. Idempotency keys survive ambiguous responses. Revision checks protect saved drafts from stale tabs. Persisted deadlines protect confirmation even when a free host sleeps.

```sh
npm run lint
npm run verify:catalog
npm run verify:models
npm test
npm run build
```

Browser checks use a running demo on port 3002 by default (`BASE_URL` can override it):

```sh
node scripts/browser-travel-smoke.mjs
node scripts/browser-travel-recovery.mjs
node scripts/browser-map-interactions.mjs
BASE_URL=http://localhost:3002 node scripts/browser-country-workspace.mjs
BASE_URL=http://localhost:3002 node scripts/browser-country-entry.mjs
BASE_URL=http://localhost:3002 node scripts/browser-estimates.mjs
```

Windows uses installed Edge; Linux uses Playwright Chromium (`npx playwright install --with-deps chromium`). k6 evidence comes from `scripts/travel-loadtest.mjs` against its own temporary database and localhost:3020; provide `K6_BIN` if k6 is not on PATH. Never run load fixtures against a persistent customer database.

The three country/estimate scripts default to port 3003. On PowerShell set `$env:BASE_URL='http://localhost:3002'` before running them against a demo on port 3002. Ordinary builds copy the versioned relief assets and need no terrain-provider requests. Offline regeneration requires the separately approved source cache; see [country workspace engineering](docs/COUNTRY-WORKSPACE-IMPLEMENTATION.md).

See [performance evidence](docs/PERFORMANCE.md), [progress](docs/PROGRESS.md), [architecture](docs/ARCHITECTURE.md), [travel API](docs/TRAVEL-API.md), [authentication and legacy API](docs/API.md), [service register](docs/SERVICES.md), [learning notes](docs/TRAVEL-LEARNING.md), and [deployment preparation](docs/DEPLOYMENT.md).

This is a production-minded demo with automated local checks. No hosted deployment has been performed. Commits, pushes, account connections, infrastructure and publication require the owner's permission. The original hotel foundation and measurements are historical evidence, not a substitute for travel-flow verification.

Photograph credits are in `client/public/destinations/README.md` and its manifests. The Nea Chora harbour photograph has a **CC BY-NC-SA 2.0 noncommercial license**; other images retain their individual recorded licenses. New learning notes are in [CONNECTED-MAPS-LEARNING.md](docs/CONNECTED-MAPS-LEARNING.md).
