# GlobeTrek demonstration and resume evidence

## Six minute walkthrough

1. Explain the product truth: real destinations, fictional stays/operators/inventory, simulated payment. Rotate the globe, choose Japan and open its country explorer. Show city/category filtering, source links and the map/list alternatives.
2. Start a trip or copy an itinerary, set four days and two travelers, move a stop, add a scheduled tour and select lodging. Show unbooked nights, schedule checks and the informational native-currency planning estimate. Route connections do not provide road navigation.
3. Sign in from the guest planner and save the same draft. Explain the local backup, server revision and conflict/copy recovery. This is distinct from the immutable reservation snapshot.
4. Review the server quote, destination currency, demo fee and dated INR estimate when available. Request a ten-minute hold, confirm without any real payment, show the reservation reference, then cancel the whole reservation before its earliest start.
5. Open a fixed package separately and explain its inclusions and exclusions. Its room/tour demands compete with custom and standalone reservations; package capacity is an additional limit.
6. Show the tests and measured report. Explain conditional writes versus transactions, the lost-response retry test, expiry without an always-on worker and each 20-request contention run's one winner. Name the limits of the local benchmark.

## Evidence to show

- Unit/integration report: docs/evidence/travel/tests.json.
- Browser and axe reports: docs/evidence/travel/browser-smoke.json, accessibility.json and browser-recovery.json.
- Actual k6 profiles and environment: docs/evidence/travel, summarized in PERFORMANCE.md.
- Current source contracts: CONTEXT.md, UX-CONTRACT.md, DESIGN.md and TRAVEL-API.md.
- Learning journal and expanded interview questions. A passing test does not replace a code walkthrough or teach-back.

Use demo data and avoid exposing cookie/token values, credentials or unrelated account details in screenshots or recordings. Select final images from passing browser captures; historical hotel screenshots remain separate.

## Evidence-based resume bullets

- Built a MERN travel-planning demo spanning ten countries, with geographic discovery, editable dated itineraries, scheduled tours and fixed packages backed by shared inventory.
- Implemented transactional multi-item holds, idempotent retries and exactly-once inventory release; verified single-winner outcomes in 20-way room, tour-seat and package-versus-standalone contention tests with direct MongoDB assertions.
- Added revision-checked autosave and browser backup recovery, and tested offline edits, stale tabs and lost reservation responses through automated browser journeys.
- Measured a bounded catalog cache in a five-VU local benchmark: p95 fell from 4.96 ms uncached to 1.42 ms cached, with raw latency, throughput and Node CPU/RSS evidence retained.

Adjust wording to reflect your own reviewed contribution. Do not claim real supplier/payment integration, hosted capacity, independent authorship of unreviewed AI code or a production deployment that has not occurred.

## Rehearsal priorities

Trace one request through the actual modules. Explain why a quote does not hold stock, why a transaction also needs conditional predicates, why an idempotency key survives a lost response, why a revision protects intent, and why a background timer cannot establish correctness on a sleeping host. Be prepared to explain one failed test/browser check and the code change that fixed it.
