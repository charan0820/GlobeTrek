# GlobeTrek interview practice

Use these questions to practice explanation, not memorization. A strong answer follows a concrete request, points to the implementation, cites test evidence, and names a tradeoff. Read the test/performance record before using any numerical claim.

## Project ownership and scope

1. What problem does GlobeTrek solve, and what part did you implement with assistance? Explain the actual user flow and distinguish reviewed critical code from routine generated code.
2. Why did you reduce the original globe/travel-platform scope? Discuss time, beginner learning goals, and completing one reliable vertical flow.
3. What makes this more than a CRUD project? Demonstrate contention safety, rollback, idempotency, ownership, and cancellation invariants.
4. Is it production-ready? Explain the tested educational MVP, fictional inventory, simulated payment, hosting limits, and the operational work still needed.

## React and HTTP

5. How does a form submission become a database query and then a rendered quote? Trace fetch, middleware, controller, service, Mongoose, JSON, and React state.
6. What belongs in state, context, and a ref? Discuss controlled inputs, public user context, and a ref used to ignore stale quotes.
7. What race can happen with network responses? Show how a previous query can arrive later and why the UI ignores it.
8. Why do we still handle SOLD_OUT after showing availability? The preview is not a reservation; another user may commit first.
9. How does the browser retry safely after a timeout? Reuse the pending key and identical input; a new key would express a new reservation.

## Node and security

10. What is middleware, and why does ordering matter? Request IDs/security headers precede parsing; origin and auth checks precede protected controllers; the error handler comes last.
11. What is the difference between authentication and authorization? A valid session does not grant access to someone else's reservation.
12. Why bcrypt instead of encrypting or storing passwords? Discuss one-way hashing, salt, work factor, and the 72-byte bound.
13. Why HTTP-only cookies rather than localStorage for JWTs? Explain token exposure, CSRF mitigations, Secure cookies, expiry, and remaining XSS risk.
14. How does logout invalidate a token that has not expired? Explain tokenVersion, all-device logout, and the additional database lookup.
15. What prevents injection and leaked errors? Typed allowlisted query/body validation, escaped search regex, no untrusted MongoDB operators, safe public errors, redacted logs.

## MongoDB and correctness

16. Why embed room types but reference bookings and inventory? Compare bounded data read together with growing independently queried data.
17. Which indexes are unique and why? Name room/date, user/key, email, and slug; explain that indexes enforce consistency during concurrency.
18. Show the overselling race in a naive implementation. Two requests read the last room before either writes; a guarded atomic update closes the gap.
19. Why use both conditional writes and a transaction? The condition enforces capacity per document; the transaction makes all nights and the booking succeed or fail together.
20. What if the third night is full after the first two writes? The transaction aborts and no earlier increments persist; point to the rollback test.
21. Why must MongoDB run as a replica set? Transactions need replica-set/sharded deployment support; a standalone local server is insufficient.
22. What happens when a transaction is retried? Its callback may execute again; keep external side effects out and use the driver helper.
23. Can repeated cancellation make inventory negative? State transition and guarded releases commit together; concurrent retries observe cancelled state.
24. What happens when the same retry key carries new dates? A request fingerprint mismatch returns a conflict; do not silently reuse or overwrite the booking.

## Data structures performance and judgment

25. What data structures are used here? Arrays for room types/nights, objects for validated requests, Map for cache, indexed documents for persistent inventory. Separate JavaScript operations from database I/O costs.
26. What is the time complexity of reserving N nights? O(N) date generation and N conditional writes, plus transaction/index costs; N is bounded at 14.
27. Why cache catalog data and avoid caching availability? Tolerable descriptive staleness differs from authoritative capacity. Explain TTL and bounded memory.
28. What changes with multiple API instances? MongoDB constraints still protect inventory; process-local caches/rate limits become independent and may need shared infrastructure.
29. What do p50, p95, p99, throughput, and error rate mean? Interpret actual report values and separate expected contention responses from unexpected failures.
30. How did you prove no overselling? Show the distinct-key concurrent workload and post-run database assertions; describe the tested count and environment only.
31. Did indexing or caching improve performance? Use recorded measurements and explain output; if unmeasured, say so. Do not infer gains from code existing.
32. What would you build next? Tie priorities to concrete risks: account recovery, inventory maintenance, backups/restore, monitoring, real payment lifecycle, then product expansion.

## What reviewers usually inspect

Expect scrutiny of your ability to navigate the repository, explain one complete request, reproduce tests, defend data modeling and security decisions, and distinguish implemented behavior from future plans. Common follow-ups focus on failure paths: expired login, lost responses, full nights, duplicate requests, another user's ID, multi-process deployment, and stale cache entries.

Resume metrics must be reproducible. Keep the workload, hardware/environment notes, raw output, and database verification. Be candid about using an assistant; the interview signal is whether you understand the code and can safely change it yourself.
