# Measured local performance

Measured on 28 October 2026 using k6 2.3.0, Node 24.14.0, and MongoDB 7.0.14 in a temporary single-node replica set. Host: Windows 10.0.26200, Intel Core i5-13420H, 12 logical processors, about 15.65 GiB RAM. API, database, and load generator ran on the same computer. These are local demo measurements, not hosted capacity claims.

## Workload and results

Browsing used five looping virtual users for ten seconds, querying the same Jaipur listing sorted by price. Baseline disabled the server catalog cache; the second run enabled it. k6 does not simulate a browser HTTP response cache. Both runs used the same application/data; process-local API rate limiting was raised to 100000 requests/minute for the isolated harness only. Application defaults remain 300/minute.

| Scenario                     | Requests | Requests per second | Average ms | p50 ms | p95 ms | p99 ms | Unexpected errors |
| ---------------------------- | -------: | ------------------: | ---------: | -----: | -----: | -----: | ----------------: |
| Browse without catalog cache |     1960 |              195.78 |      25.15 |  19.78 |  64.90 | 135.27 |                0% |
| Browse with catalog cache    |     6814 |              677.59 |       6.99 |   4.78 |  13.84 |  70.47 |                0% |
| Last-room contention         |       20 |               18.72 |     850.35 | 829.34 | 972.04 | 975.65 |                0% |

The cached run handled more requests and had lower median/p95 latency in this experiment. It avoids repeated MongoDB list/count calls and returns an existing result object. This is one short sequential comparison, with no controlled warm-up, confidence interval, or isolated host. Its large p99 relative to median suggests scheduling/GC/shared-host effects may matter, but no profiler was run to identify a cause. Do not claim a universal speedup or extrapolate to many users.

## Contention proof

Twenty virtual users each submitted one request for the same two-night stay using distinct retry keys. Each night had one room total. Results: one HTTP 201 confirmation, nineteen HTTP 409 SOLD_OUT responses, zero unexpected responses. SOLD_OUT is an expected business outcome and is separately counted rather than treated as an infrastructure error.

After the requests completed, the harness queried MongoDB: exactly one confirmed booking existed, and both nights had total=1 and booked=1. This verifies the stored inventory invariant for this workload. It is evidence for the tested implementation and scenario, not a mathematical proof for every possible execution. The integration suite additionally tests identical-key races, multi-night rollback, repeated cancellation, and ownership.

## Database and process observations

The inventory lookup execution plan used the unique `roomTypeId_1_date_1` index (IXSCAN followed by FETCH), examining one key and one document for one returned record. The measured execution time was 0 ms at MongoDB's resolution. No before/after index speedup is claimed; indexes were already present in both runs.

The process sampler recorded 48 observations over 25.06 seconds across setup and the three scenarios. Node API/harness CPU usage was 14.297 user CPU seconds plus 3.187 system CPU seconds; maximum sampled resident memory was 264896512 bytes (252.63 MiB). These exclude MongoDB and k6 child processes, are aggregate rather than per-scenario measurements, and do not represent whole-machine utilization. Sampling can miss peaks.

Next useful experiment: longer repeated runs with warm-up, per-scenario process sampling, isolated database resources, varying query distributions/cache hit rates, and profiling. No extra technology is justified solely by this small run.

## Reproduce and inspect

With the official k6 executable in PATH (or K6_BIN set), run `node scripts/loadtest.mjs`. It creates a disposable database, runs both browsing scenarios and contention, verifies MongoDB, and cleans up. It never uses the persistent application URI. Credentials for its test user are generated for local requests and are not saved in the report.

Raw snapshots from this run are retained in `docs/evidence`: browse-baseline.json, browse-cached.json, contention.json, database-verification.json, and process.json. Later runs write new results to ignored `artifacts/loadtests`; update this report only after inspecting the new outputs. Browser smoke-test evidence and representative screenshots are retained separately.
