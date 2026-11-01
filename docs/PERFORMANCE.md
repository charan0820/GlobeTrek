# Measured travel performance

## Country workspace client observations — 31 October 2026

New observations use the production build, headless Edge, Node v24.14.0 and the same Windows i5-13420H developer machine. Each viewport used a fresh browser context; OS/server caches were warm. No CPU or network throttling was applied. Mobile width is not mobile hardware. Historical API load results below retain their original scope and date.

| India workspace viewport | Model ready from navigation | GLB bytes fetched | Loaded JavaScript bytes | Median control-to-next-frame | p95 (10 samples) | Frames added while idle for 500ms |
|---|---:|---:|---:|---:|---:|---:|
| 1440 × 1000 | 689.3ms | 865,524 | 1,192,545 | 5.15ms | 5.8ms | 0 |
| 390 × 844 | 558.3ms | 263,124 | 1,192,545 | 5.0ms | 8.3ms | 0 |

Control measurements run from in-page rotation-button activation to the next instrumented rendered frame. Ten samples are a small observation, not sustained FPS, input-to-display latency or field performance. The smaller viewport used the mobile GLB; its faster local load is not a general mobile-performance claim. The script also checks keyboard and touch-button activation, absence of a hidden map/globe, and engine disposal in List. Reproduce with `BASE_URL=http://localhost:3003 node scripts/browser-country-performance.mjs` (set `$env:BASE_URL` first on PowerShell).

Current raw lazy chunks: country model 57,087 bytes; shared Three.js/OrbitControls 668,947 bytes; globe 1,318,490 bytes; detailed map 1,083,149 bytes plus its 517,225-byte worker. The observed country entry did not fetch the globe or map chunks. The current reachable build graph is recorded separately from retained historical local chunks. Vite's large-chunk warning remains; no hosted loading or real-device budget is certified.

All twenty GLBs meet the per-country targets. France is the largest desktop asset (77,359 triangles, 2,444,372 bytes); US is the largest mobile asset (24,220 triangles, 893,860 bytes). India adds 76,197 bytes of elevation metadata plus a 35,708-byte shared source/model manifest. Metadata is measured separately from GLBs. Sources and mobile variants are local, versioned assets; no runtime terrain-provider API is used.

Raw evidence: `docs/evidence/country-workspace/client-performance.json` and `models.json`. These observations make no backend throughput, scalability, hosted SLA or cold-start claim.

## Historical travel API load test — 29 October 2026

Measured 2026-10-29T13:34:57.772Z with v24.14.0, MongoDB 7.0.14 and k6 2.3.0. Windows x64; 13th Gen Intel(R) Core(TM) i5-13420H; 12 logical CPUs; 15.65 GiB RAM. API, replica set and generator ran on one developer machine; concurrent browser/renderer activity may affect comparisons. This is an isolated database/service fixture, not a dedicated hardware benchmark or hosted SLA.

The fixture contains all ten countries and full catalog counts, with 30 days of inventory. Browsing alternates India/Japan attractions. Browse/quote/recovery profiles use five looping VUs for 15 seconds. Rate limits are raised only in the isolated harness. Browser HTTP caching is not simulated.

| Profile | Requests | Requests/s | Avg ms | p95 ms | p99 ms | Peak Node RSS MiB | Node CPU % of one core |
|---|---:|---:|---:|---:|---:|---:|---:|
| catalog-uncached | 26334 | 1755.34 | 2.78 | 4.96 | 6.96 | 356.59 | 107.0 |
| catalog-cached | 100057 | 6670.01 | 0.69 | 1.42 | 2.20 | 343.07 | 98.0 |
| quotes | 3920 | 261.15 | 19.01 | 27.27 | 31.48 | 355.00 | 99.3 |
| room | 20 | 171.72 | 99.17 | 104.08 | 104.08 | 341.94 | 18.6 |
| tour | 20 | 197.39 | 86.29 | 88.38 | 88.41 | 342.95 | 15.9 |
| package-shared | 20 | 113.36 | 94.49 | 160.14 | 162.71 | 343.70 | 24.2 |
| expired-recovery | 17727 | 1181.58 | 4.15 | 6.58 | 8.00 | 357.41 | 99.4 |

All profiles recorded zero unexpected failures. Each contention profile issued 20 parallel requests with distinct users/keys: one pending hold succeeded and 19 expected SOLD_OUT responses occurred. Those short contention percentiles include expected failures and do not establish sustainable booking throughput. The harness checked the database directly: exactly one winner, capacity never exceeded, and cancellation released its demands. Package and standalone requests competed for the same tour seats.

Expired recovery created ten already-due holds, then called availability; no pending holds or held room quantities remained afterward. This complements integration tests for late confirmation and racing cleanup workers.

CPU is the Node harness process user+system CPU divided by profile wall time; it excludes MongoDB, k6 and browser process CPU and can exceed 100% when multiple threads run. RSS is sampled every 250 ms plus final sample. Profiles are short local measurements, affected by warm-up and workstation activity. MongoDB query profiling, long-duration soak tests, multi-instance behavior and hosted cold-start measurements were not performed.

Raw metrics and machine details are in evidence/travel. Reproduce using scripts/travel-loadtest.mjs with a local k6 executable, never a customer database. The earlier hotel-only results are preserved in [PERFORMANCE-FOUNDATION.md](PERFORMANCE-FOUNDATION.md).

## Client observation

The final local headless browser capture recorded an observed LCP of 628 ms, CLS of 0.0508 and navigation duration of 372.7 ms. This was an unthrottled synthetic developer-machine run, not mobile field data or a Core Web Vitals guarantee. The LCP observer ends at the first interaction. Raw values are in evidence/travel/client-performance.json. Globe and detailed map engines are lazy-loaded; the production build still reports large geographic chunks, so representative throttled-device measurements remain useful before making loading-performance claims.

## Fluid atlas local measurements - 31 October 2026

1440px: ready 581.8ms, median control-to-frame 5.45ms, idle added frames 0; 390px: ready 495.5ms, median control-to-frame 5.60ms, idle added frames 0.

Raw evidence: docs/evidence/fluid-atlas/performance.json. These are local headless observations, not device FPS or hosted throughput. Shared Motion shifts approximately 47kB gzip into the initial bundle while reducing the lazy discovery chunk; large geographic chunks remain.
