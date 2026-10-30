# Measured travel performance

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
