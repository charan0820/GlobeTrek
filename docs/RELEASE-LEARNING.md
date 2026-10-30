# Release hardening and recovery

The travel planner now has working end-to-end journeys and automated failure checks. These notes explain the important fixes; the learner still needs to walk through critical code and explain the decisions in their own words.

## Authentication and cached identities

What: login cancels pending queries, removes other cached data and updates the existing observed session query. Why: clearing the entire cache first replaced the query observed by the authentication provider, so the planner could still appear signed out after successful registration. Where: client/src/auth.jsx. Tested: the browser creates a guest trip, registers, saves it and completes a reservation. Interview explanation: authentication success must update the client state that the interface actually observes; private caches must also be isolated between identities.

## Recoverable drafts and conflicting tabs

What: local backups preserve edits through reload; saved trips use revision-checked autosaves and explicit restore/copy choices. Why: network failure is not proof of a successful save, and two tabs can edit the same document. Where: planner and trip services. Tested: aborted PATCH, reload, restore, retry, a separate tab's accepted update and saving conflicted edits as a new trip. Interview explanation: optimistic concurrency protects user intent while backups protect unsent edits; neither silently overwrites another version.

## Ambiguous reservation responses

What: one key remains attached to the same quote after refresh or network failure. Why: the server may commit a hold before the response disappears. Where: reservation review and hold service. Tested: the browser lets the server complete the POST, discards its response, then retries and verifies only one reservation exists. Interview explanation: delivery and execution are different; safe retries require durable operation identity rather than a new request key.

## Time boundaries and transaction retries

What: confirmation checks the persisted deadline on each retried transaction; cancellation closes at the earliest item start. Why: a driver retry can happen later than the initial HTTP request. Where: reservation transition service. Tested: exact expiry/cancellation boundaries, late confirmation without cleanup, repeated cancellation and racing sweepers. Interview explanation: the driver retries database work, so time-sensitive business predicates must remain valid on the retried attempt.

## Planning guidance and authority

What: the UI explains unresolved departures, overlapping tours/stays, long visit days and multiple cities, and estimates selected stay/tour costs. Why: users should discover mistakes before checkout. The estimate uses whole rooms sufficient for the party and is explicitly informational; the authoritative quote is calculated again on the server. Where: client/src/planning.js and shared planner controls. Tested: scenario tests plus browser template/tour journeys. Interview explanation: client guidance improves usability; the server independently enforces availability, schedule, ownership and price invariants.

## External data failure and usage

What: dated ECB snapshots support INR estimates, with single-flight refresh, six-hour caching and failure backoff capped at one hour. Why: an informational provider must not become a checkout dependency or an uncontrolled retry loop. Where: exchange-rate service and service register. Tested: malformed/partial XML, mocked provider failure, no immediate second fetch and successful native-currency quote creation without rates. Interview explanation: define authoritative data separately from enhancements and bound every external retry policy.

## Evidence and project claims

What: isolated k6 profiles report latency distributions, throughput, expected conflicts and Node CPU/RSS, followed by direct database assertions. Why: a fast HTTP response alone does not establish correct inventory or hosted capacity. Where: load harness and performance report. Tested: room, tour and package/shared-stock races each produced exactly one winner among 20 requests. Interview explanation: state the environment and workload, distinguish expected sold-out outcomes from defects, and cite measured figures rather than extrapolated user counts.

## Expanded interview sheet

1. Explain the complete globe-to-reservation flow, including which state is local, remote, cached or immutable.
2. Why separate trip drafts, quotes, holds and confirmed snapshots? What changes can affect each?
3. Which race does a unique index prevent, and which race needs a conditional inventory predicate?
4. Why does a transaction not make every read trustworthy forever? Explain stale quotes and draft revisions.
5. How does deleting a trip race with creating a hold, and why does the transaction write a trip fence?
6. What happens if only the final item in a package is sold out? Point to rollback evidence.
7. How would multiple server instances change the in-memory cache, rate limiter, expiry worker and observability choices?
8. How do local calendar dates differ from tour instants at DST boundaries? Why is Japanese yen different from integer paise?
9. What does a p99 latency describe? Why are 20-request contention percentiles not a long-running throughput benchmark?
10. How are offline edits recovered without accepting silent last-write-wins behavior?
11. Which provider calls does the application actually make, which files are self-hosted, and what happens when each provider fails?
12. Which production concerns remain before taking real payments or customers? Discuss supplier contracts, policy, refunds, tax, monitoring, backups and hosting guarantees.

Interviewers are likely to focus on ownership of the decisions, correctness under failure, security boundaries, concrete tests, measured claims and the ability to identify limitations. Use the code and evidence during rehearsal; do not claim independent authorship of AI-written modules you have not reviewed.
