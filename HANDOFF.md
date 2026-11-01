# GlobeTrek handoff

Updated **1 November 2026**. This is the current resume entry point. `AGENTS.md` holds durable coding/permission rules; `DESIGN.md` and `UX-CONTRACT.md` hold visual and interaction contracts. Older checkpoint files remain historical.

## Latest refinement: Sticky discovery panels

1 November 2026: desktop side panels follow page scrolling at a 24px viewport offset with internal overflow; mobile remains in normal flow. Build/lint and focused browser scroll checks passed.

## Previous refinement: Discovery scale and central brand

1 November 2026: central GlobeTrek h1, secondary A world to explore heading, 200px desktop navigation and enlarged responsive globe space. Five viewport checks, globe-entry regression, lint/build passed.

## Previous fix: Planner List layout

1 November 2026: separated the List toolbar and collection into explicit grid rows to prevent overlap. Lint/build and bounds checks at 390/1440/1920px passed, including Model/List switching.

## Previous refinement: Single day selector and icon controls

1 November 2026: removed duplicate map day buttons; dated Trip days tabs remain. Relief controls now use labelled Lucide icons. Lint/build and focused three-width browser checks passed.

## Previous refinement: Planner controls and panel height

1 November 2026: labelled View/Show route toolbar, grouped camera controls, and near-full-height sticky planner side panels. Lint/build and focused desktop/mobile browser checks passed; see docs/PROGRESS.md. Existing Word-rendering limitation below remains.

## Previous delivery: Fluid atlas layouts and contextual islands

31 October 2026: shared panels/island and cinematic-discovery presentation implemented. See docs/PROGRESS.md and docs/evidence/fluid-atlas for the passing seven-width, complete booking, recovery, accessibility, scroll/focus and rendering checks. All 81 tests, lint, build, catalog/models and strict premium audit passed. No new dependencies were needed. Existing working-tree changes were preserved; no commit or publication.

The workspace Word journal was appended, but its layout is **not yet verified**: LibreOffice was unavailable and hidden Word rendering stalled and was cancelled. Markdown notes are complete. Parent-folder access was not used.

## Previous slice: Motion destination selection

31 October 2026: added exact `motion@14.9.0` (MIT). Shared preview/workspace reveals and entry text swap adapt free Transitions.dev patterns. Country-list progress is actual scrolling, not loading. Japan selection-to-workspace is verified first; no backend changes. Lint/build/asset check and browser-discovery-motion plus browser-country-entry passed. See docs/PROGRESS.md for scope, sizes and evidence; docs/SCROLLING-LEARNING.md for notes. Word journal is unchanged for this slice.

## Product and implementation state

GlobeTrek is a JavaScript MERN modular monolith: React/Vite client, Express API, MongoDB replica set through Mongoose. Express serves the production client on the same origin. Payments, properties, operators, inventory and prices are demonstration data; sourced attractions are real places.

Ten countries: India, Japan, Thailand, Indonesia, France, Italy, Spain, Greece, Turkey and United States. Catalog: 30 cities, 120 attractions, 60 stays, 60 tours, 20 editable templates and 20 fixed packages.

Completed locally:

- Living-atlas light/dark identity, self-hosted type, centred raised-country globe, labels, country links, coordinated single/double clicks and country-entry zoom.
- Canonical `/countries/:code` Explore/Plan workspace; Model/Detailed map/List, shared details/photo previews, city grouping, connected pins and compatibility planner/product/hotel entries.
- Real local relief for all ten countries, desktop/mobile assets, explicit distant-region insets, shared transforms, bounded controls, overlap choices and geographic failure alternatives.
- Guest drafts, saved owned trips, revision-aware autosave/conflict copies, auth return, ordered stops, scheduled tours, stays, templates and separate package checkout.
- Visible published unit rates, read-only selection/trip estimates, native currency and optional dated INR, explicit missing/loading/error/retry states and stale-response protection.
- Transactional shared-inventory holds, confirmation, expiry/reconciliation, cancellation, ownership and retained idempotency. The original hotel booking adapter/history remains supported.
- Corrected responsive model framing, inset captions, hidden estimate failures and desktop List previews. Workspace presentation now derives from the URL rather than stale legacy local state.

Latest delivery: [review](docs/COUNTRY-WORKSPACE-REVIEW.md), [engineering](docs/COUNTRY-WORKSPACE-IMPLEMENTATION.md), [progress](docs/PROGRESS.md), [API](docs/TRAVEL-API.md). Selected raw results/screenshots: `docs/evidence/country-workspace/`.

## Framework and dependency snapshot

Node requirement: **>=22.12.0**; development/test runtime **24.14.0**; CI selects Node **24**. Demo/test MongoDB binary: **7.0.14**, replica set required. MongoDB is not supplied by `npm ci`; the test/demo harness may need an approved first binary download.

Exact installed direct versions below were verified with `npm ls --depth=0 --json` on this date. Package manifests contain ranges; `package-lock.json` is the reproducible version authority. This task did not upgrade/install packages.

| Client dependency | Exact version |
|---|---|
| react / react-dom | 19.3.1 / 19.3.1 |
| vite / @vitejs/plugin-react | 7.3.7 / 5.2.0 |
| react-router-dom | 7.18.5 |
| @tanstack/react-query | 5.105.0 |
| three / react-globe.gl / maplibre-gl | 0.186.1 / 2.38.0 / 6.16.0 |
| @radix-ui/react-dialog / react-day-picker | 1.3.1 / 10.0.2 |
| @dnd-kit/core / sortable / utilities | 6.3.1 / 10.0.0 / 3.2.2 |
| lucide-react / @fontsource/source-sans-3 | 0.468.0 / 5.3.1 |

| Server dependency | Exact version |
|---|---|
| express / mongoose | 5.3.0 / 8.24.7 |
| zod / decimal.js / @js-temporal/polyfill | 4.6.7 / 10.6.0 / 0.5.1 |
| bcryptjs / jsonwebtoken / cookie-parser | 3.0.3 / 9.0.3 / 1.4.7 |
| helmet / express-rate-limit | 8.3.0 / 8.7.1 |
| dotenv / pino | 17.4.2 / 9.14.0 |

| Root development/build dependency | Exact version |
|---|---|
| vitest / supertest / mongodb-memory-server | 5.0.5 / 7.3.1 / 10.4.3 |
| playwright / @axe-core/playwright | 1.64.1 / 4.14.0 |
| eslint / @eslint/js / eslint-plugin-react-hooks | 9.39.5 / 9.39.5 / 7.1.1 |
| globals / prettier / concurrently | 16.5.0 / 3.6.2 / 9.2.5 |
| polygon-clipping / earcut / pngjs | 0.15.7 / 3.2.4 / 7.0.0 |

## Run and build

Run from the repository root. Dependency or binary downloads still follow the user's approval rules.

```sh
npm ci
npm run build
npm run demo
```

The default built demo is `http://localhost:3000`. It creates/seeds a temporary MongoDB replica set and a random session secret; **stopping it removes its accounts, drafts and reservations**. It is not the persistent production database. During the latest verification a separate demo used port **3003**; inspect processes/health before assuming it is still running or restarting it. Never hard-code that review port into the application.

PowerShell custom demo port:

```powershell
$env:PORT='3003'
$env:LOG_LEVEL='silent'
npm run demo
```

Persistent local setup: copy `.env.example` to **`server/.env`** (the server config resolves this directory), set a real replica-set URI and a random JWT secret of at least 32 characters. Never commit this file. `npm run seed` changes the configured database, so verify its target first.

| Mode | Commands / configuration |
|---|---|
| Vite development | `npm run dev`; client normally `http://localhost:5173`, API port 3000; `APP_ORIGIN=http://localhost:5173` |
| Built persistent local app | `npm run build`, `npm run seed`, `npm start`; `APP_ORIGIN=http://localhost:3000`, `PORT=3000` |
| Hosted production | Prepared only; `NODE_ENV=production`, HTTPS `APP_ORIGIN`, persistent replica set and approved hosting required |

`FX_REFRESH_ENABLED=false` avoids optional ECB network requests by default; missing INR conversion does not block native-currency checkout. `CACHE_ENABLED` controls the bounded public-catalog cache. No card processor, supplier API or in-app LLM is integrated.

Vite retains prior `client/dist` chunks during local rebuilds so already-open tabs do not lose imported assets. Do not count every retained file as the current bundle graph; use the current entry/reachable graph or measured requests.

## Verification commands and last results

```sh
npm run lint
npm test
npm run verify:catalog
npm run verify:models
npm run build
```

Latest implementation verification: **81 tests / eight files passed**, lint/catalog/model checks passed, production build and asset verification passed. Strict premium static audit reported zero findings. Independent reviewers scored the listed camera/pricing/contracts and List-preview fixes resolved; these were scoped verdicts, not whole-application certification.

With a separate running demo, PowerShell browser commands:

```powershell
$env:BASE_URL='http://localhost:3003'
node scripts/browser-country-workspace.mjs
node scripts/browser-country-entry.mjs
node scripts/browser-estimates.mjs
node scripts/browser-travel-smoke.mjs
node scripts/browser-travel-recovery.mjs
node scripts/browser-map-interactions.mjs
node scripts/browser-globe.mjs
node scripts/browser-atlas.mjs
node scripts/browser-country-performance.mjs
```

All listed suites passed in the latest implementation review. They exercise temporary test users and simulated reservations; never point them at a customer database. Windows uses installed Edge; Linux uses Playwright Chromium (its installation requires approved download access). The first three and performance script default to 3003; older scripts default to 3002, so set `BASE_URL` consistently. Run suites sequentially to avoid shared limits/fixtures. CI is configured locally but has not been run remotely.

The 81-test/build/browser results are prior implementation evidence, not a claim of rerunning all checks for this documentation-only handoff update.

## Asset map and performance constraints

| Location | Meaning / license authority |
|---|---|
| `client/public/fonts/`, `client/public/fonts.css` | Allura and Cormorant TTF subsets, OFL notices and font provenance README; Source Sans 3 also bundles via Fontsource |
| `client/public/destinations/{CODE}.jpg` | Country photography; `attribution.json` and README preserve individual licenses |
| `client/public/destinations/places/`, `places.json` | 120 attraction mappings / 240 WebPs, dimensions, alt text, source, creator and license; 14,403,178 bytes total |
| `client/public/countries.geojson`, `countries.meta.json` | Natural Earth 110m globe boundaries, public domain, recorded source/hash |
| `client/public/relief/` | Twenty GLBs, ten elevation/transform metadata files, source/output manifest and provider-specific `TERRAIN-ATTRIBUTION.md` |
| `.cache/relief/` (ignored) | Approved Natural Earth 10m/Mapzen source cache; not needed for ordinary builds |
| `scripts/{download-relief-sources,download-relief-tiles,build-relief,validate-relief}.mjs`, `relief-config.mjs` | Offline import/build/validation and explicit inset configuration; new network imports require permission |
| `docs/evidence/country-workspace/`, `docs/PERFORMANCE.md` | Captures, actual asset sizes and scoped local observations; earlier API k6 measurements remain historical |

**License limitation:** Nea Chora photo is CC BY-NC-SA 2.0. Current demo is noncommercial; commercial use requires resolving that restriction. Other assets retain their own notices, including share-alike conditions where applicable. Fictional stay/tour photography must remain labelled representative destination imagery. Do not treat a public S3 dataset as license-free; preserve every terrain provider notice.

GLB budgets per country: desktop <100,000 triangles / approximately 3MB; mobile <25,000 / approximately 1MB. Largest desktop is France, 77,359 triangles / 2,444,372 bytes; largest mobile is US, 24,220 / 893,860 bytes. Metadata is separate. Real elevation is coarse zoom-5 reference data, exaggerated ×8; insets and straight route lines do not encode travel distance/time.

Only the active engine mounts. Relief caps pixel ratio at 1.5 and renders on demand. Current raw lazy chunks include Three/OrbitControls 668,947 bytes, globe 1,318,490, map 1,083,149 plus 517,225 worker. Vite's large-chunk warning remains. Observed India readiness was 689.3ms desktop / 558.3ms mobile-width on unthrottled headless desktop hardware; this is not mobile field data, an SLA or a scalability guarantee.

## Known issues and outstanding decisions

1. `.impeccable/design.json` contains stale country-specific Split/default/banner descriptions. DESIGN.md and UX-CONTRACT.md are current; do not restore old UI from the sidecar. The last documentation review deliberately reported this drift without changing it.
2. The Impeccable engine/detector/quality-bar artifact was unavailable. No engine pass, generated composition or full accessibility certification is claimed. Large geographic bundles and real-device/throttled performance remain follow-up work.
3. No hosted deployment, remote CI result, hosted cold-start measurement or production observability service exists. Render/Atlas are prepared choices, subject to explicit account/infrastructure/publication approval.
4. The demo database is ephemeral. Check whether the 3003 process survived; do not promise previous demo credentials or reservations remain.
5. Workspace `docs/GlobeTrek-Learning-Journal.docx` is 28 rendered/visually checked pages, preserving 220 prior paragraphs and 26 pages. The parent-folder copy was not updated for this feature because access is not approved. Do not append the same chapter twice.
6. The working tree contains earlier Atlas/globe work plus this feature and documentation; it is not clean. No assistant staging, commit, push or deployment has been performed. Preserve unrelated changes and ask before Git mutations.

## Next concrete task

Resolve the local Word-rendering failure and visually verify the appended journal pages; do not overwrite earlier journal sections. No installation or access change without permission. For further UI work, profile the initial shared Motion bundle before adding more effects. The implemented workflow is ready for user review at localhost:3003 while the temporary demo remains running.

### Separate documentation maintenance

**Reconcile only the stale country-workspace metadata in `.impeccable/design.json` against DESIGN.md and UX-CONTRACT.md.** Inspect its schema first; replace obsolete Split/default/banner descriptions with the implemented Explore/Plan and Model/Detailed map/List behavior while preserving incumbent palette/type tokens and unrelated surfaces. Do not change runtime UI as part of that task. Acceptance: valid JSON, no obsolete current-country contract, no token drift, and a recorded documentation diff/static audit. No engine installation/download is implied.

After that bounded cleanup, walk through India discovery → place preview → dates/party → mixed stay/tour plan → save → review with the user, then agree on the next requested feature. Review critical code together; do not invent a new scope or silently narrow the travel product.

## Resume reading order

1. `AGENTS.md`, this handoff, `PRODUCT.md`, `CONTEXT.md`.
2. `DESIGN.md`, `UX-CONTRACT.md`, `docs/COUNTRY-WORKSPACE-SURFACE.md`.
3. `docs/COUNTRY-WORKSPACE-IMPLEMENTATION.md`, relevant API/domain/service records.
4. `docs/COUNTRY-WORKSPACE-REVIEW.md`, `docs/PROGRESS.md`, measured evidence.

Shared owners: `ui.jsx` fields/dialogs/errors, `place-ui.jsx` media/previews, `pricing.jsx` display/estimate queries, `planner.jsx` reducer/editor, `geo/presentation.js` day identities, `geo/relief-layout.js` transforms, `server/src/services/estimates.js` read-only pricing and `reservations.js` inventory lifecycle. Keep those responsibilities separate.
