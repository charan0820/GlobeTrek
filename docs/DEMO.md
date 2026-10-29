# Demo and resume evidence

## Five minute walkthrough

1. State that the hotels are fictional and payments are simulated. Show filtering and sorting in the catalog.
2. Open a hotel, select a room and dates, and explain checkout-exclusive nights and server-generated prices.
3. Register a demo account, check availability, and make a reservation. Show its reference and booking history.
4. Cancel the reservation, check availability again, and explain exactly-once inventory release.
5. Show the integration contention test and actual load-test/database-verification report. Explain why a transaction and conditional write are both necessary.

## Screenshots and recording

Capture desktop catalog, mobile catalog, available-room quote, confirmation/history, and cancellation. Use demo data only; no secrets or personal information. A video should show the working browser flow rather than only slides. Store local captures under `artifacts/screenshots` until selecting final publication assets.

## Resume claims

Use only claims supported by completed evidence. A safe implementation statement is: “Built a MERN hotel reservation demo with per-night MongoDB inventory, transactional reservations, idempotent retries, and ownership-based access control.”

After actual verification, add the measured concurrency count and database result. After load testing, include a latency/throughput comparison only with environment, workload, and raw results retained. Do not generalize local temporary-database measurements into production capacity. Do not describe simulated payments as a payment integration.
