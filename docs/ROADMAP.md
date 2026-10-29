# GlobeTrek restored product roadmap

## Product agreement 29 October 2026

The user reaffirmed the original GlobeTrek tourism-discovery concept and authorized AI to accelerate implementation significantly. The hotel application is Phase 0, not a replacement product. The three-to-four-day hotel-only scope no longer defines completion of GlobeTrek. No new full-product deadline is promised here; review estimates after the first globe/data milestone.

Retain React/Vite, Express, MongoDB/Mongoose, authentication, the hotel booking engine, tests, and measured evidence. AI can implement both frontend and backend modules. Explain important decisions and update learning notes at working milestones. Access, accounts, commits, pushes, infrastructure, and publication still require user permission.

## Feature register

| Capability | Current state | Required destination |
| --- | --- | --- |
| Interactive 3D globe | Missing | Rotate/zoom, country hover and border highlight, brochure, click to country |
| Country/city content | Missing | Data-driven profiles for five initial countries, expandable by seed files |
| Maps and attractions | Missing | Country map, synchronized markers/list, filters and nearby search |
| Hotel discovery/reservations | Foundation implemented | Country/city relationships and geographic integration; retain current safety tests |
| Tours | Missing | Catalog, departures, capacity, pricing, reservations and cancellation |
| Predefined itineraries | Missing | Five multi-day plans with referenced attractions, hotels and tours; plan reservation |
| Cross-category search | Missing | Search/filter/sort/pagination and basic autocomplete across discovery entities |
| Holds and expiry | Missing | Pending to confirmed/cancelled/expired lifecycle with exactly-once inventory release |
| Reliability and delivery | Hotel baseline only | New feature tests, browser checks, measured load scenarios, docs, deployment and interview evidence |
| Original stretch backlog | Not started | Plan customization/live repricing, reviews, cuisines, admin; discuss priority explicitly |

## Implementation milestones

### 1 Globe and country discovery

- Split the growing client entry file into focused pages/components while retaining existing routes and behavior. Keep the current visual identity; add the globe as the discovery entry point and retain direct hotel browsing.
- Introduce country models, versioned seed files, and list/detail/lightweight globe APIs. Initial supported profiles: India, Japan, Italy, France, and Thailand.
- Build the actual interactive globe: world borders, supported-country highlighting, hover brochure, click navigation, and responsive/touch interactions. Provide an accessible country list and a fallback when WebGL is unavailable.
- Match boundaries to API data using normalized ISO codes, never displayed country names. Unsupported countries must not show fabricated profiles.
- Acceptance: all five supported countries resolve to the correct country page; globe rotation/zoom/selection work; existing hotel, authentication, and booking flows still pass. A decorative sphere alone does not complete this milestone.

### 2 Maps attractions and geographic relationships

- Add cities and sourced attractions with GeoJSON coordinates and appropriate 2dsphere indexes. Target three cities and six attractions per country, about thirty attractions total.
- Build country maps, marker details, synchronized attraction lists, category filters, and nearby search. Join existing Indian hotels to countries/cities through additive fields and a migration; preserve existing city-string/API behavior until callers are updated.
- Use real destination/attraction facts with sources and licensed assets. Preserve explicit fictional labels for demo lodging and tour inventory. Extend seed integrity checks to references and geographic data.
- Acceptance: globe to country to mapped attraction works; markers have correct coordinates; near queries and empty/error states are tested; rerunning seeds preserves booking inventory.

### 3 Complete discovery catalog

- Expand to fifteen to twenty clearly labeled demo hotels, fifteen tours, and five predefined multi-day itineraries, within the original target ranges.
- Add tour and read-only itinerary APIs/pages, country/category filters, pagination, cross-category search, and bounded autocomplete. Keep hotel entry and direct search available for users who do not use the globe.
- Introduce referenced itinerary days rather than one hardcoded page per country or plan. Do not add Elasticsearch, a second database, or microservices.
- Acceptance: users can explore countries, attractions, hotels, tours, and daily itineraries through one coherent navigation flow; search results resolve to the corresponding detail screens.

### 4 Complete the reservation lifecycle

- Add held inventory, pending bookings, explicit confirmation, expiry, and transactional cancellation/expiry release. Define expiry behavior before introducing the worker; expired holds must not be silently assumed released by TTL deletion.
- Extend capacity tracking to dated tour departures. Support itinerary reservations using hotel/tour items, with server pricing and all-or-nothing multi-item inventory changes.
- Migrate the current flat hotel-only booking model deliberately. Preserve existing confirmed bookings and ownership/idempotency guarantees; document any API compatibility changes before changing clients.
- Acceptance: no partial multi-item booking, no overselling, no double release under confirmation/cancellation/expiry races, and safe identical/different-payload retries. Payment remains explicitly simulated.

### 5 Original stretch features

Keep customization with repricing, reviews, cuisines, and admin functionality in the visible backlog from the original brief. Select their order with the user after core flows work. Do not claim a stretch feature is implemented through placeholder UI.

### 6 Verification deployment and portfolio packaging

- Expand integration and browser checks for geographic discovery, content relationships, search, tours, holds, and itinerary bookings. Preserve the existing thirty-test baseline; do not reuse hotel-only performance numbers as evidence for new features.
- Measure globe loading/interactions and new API scenarios; retain raw measurements, database verification, and explained optimizations. Run contention with post-run inventory checks.
- Finish architecture/API docs, learning journal, interview sheet, screenshots, and a working demo recording. Deploy only with approved Git/account/infrastructure actions; verify the actual hosted flow afterward.

## Initial technology direction

Prefer react-globe.gl over hand-building a globe interaction engine to accelerate the required country polygons and pointer interactions. It is a Three.js/WebGL React component with polygon hover/click support: https://github.com/vasturiano/react-globe.gl.

Use Natural Earth as the proposed world-boundary source, with provenance and a normalized ISO join recorded in the repository: https://www.naturalearthdata.com/about/terms-of-use/. Inspect the exact downloaded dataset/version and geometry before implementation.

Use Leaflet/React Leaflet as the proposed country-map layer, subject to checking the installed React/version compatibility at installation: https://react-leaflet.js.org/docs/start-installation/. Local GeoJSON can supply boundaries and markers; a basemap provider introduces separate attribution, usage-policy, and API/service decisions. Do not silently provision an account or start an untracked paid API dependency.

No new dependencies, maps, services, or features are installed by this document. The next implementation milestone is the country data/API foundation and interactive globe. Keep progress against this register so an intermediate release cannot be mistaken for the complete product.
