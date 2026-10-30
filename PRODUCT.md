# GlobeTrek

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

User approved JavaScript, React with Vite, Express, and MongoDB with Mongoose.

## Users and purpose

A tourism discovery and trip-planning application: explore an interactive globe, select a country, discover cities and attractions on a map, compare hotels and tours, inspect itineraries, and make demo reservations. The developer is learning MERN fundamentals and needs to explain critical design decisions in an interview.

## Capabilities and constraints

Implemented locally: ten-country globe/map discovery, sourced attractions, demo stays and scheduled tours, editable trips and templates, fixed packages, authentication, revision-aware persistence, server pricing, transactional shared-inventory holds and reservations, retries, expiry and cancellation. The original six-hotel booking foundation remains compatible. Current verification and remaining delivery steps are recorded in docs/PROGRESS.md; there is no hosted deployment.

Approved implementation scope on 29 October 2026: interactive globe, country maps, attractions, stays, scheduled tours, manually editable dated trips, copyable templates, separate fixed packages, discovery search, geographic queries, ten-minute quotes and holds, atomic multi-item reservations, expiry and reliability evidence. Ten countries: India, Japan, Thailand, Indonesia, France, Italy, Spain, Greece, Turkey and the United States. Each has 3 cities, 12 attractions, 6 demo stays, 6 demo tours, 2 templates and 2 packages. Manual customization is core. Reviews, cuisines, admin, transport sales and in-app AI remain future work. The approved contract in docs/IMPLEMENTATION.md supersedes earlier five-country and hotel-only targets.

GlobeTrek is the overall product. The existing hotel application is its Phase 0 booking foundation, not the final product. The original feature brief remains in Context-GlobeTrek.md; docs/ROADMAP.md records the current milestone sequence. Payments remain simulated. Actual external provider integration or paid services require a separate decision.

## Working rules

The user authorizes significantly accelerated AI implementation, including frontend work. The assistant may implement routine modules end to end and explain the important architecture, data flow, and correctness decisions after each working milestone. Keep small hands-on exercises for critical concepts without making every line a manual typing exercise. Ask before access approvals, account connections, commits, pushes, infrastructure changes, or publication. Maintain the learning journal in the approved parent-folder location through the required filesystem permission flow. Report measured results only. Do not reduce the restored feature scope without discussing the tradeoff explicitly with the user.

## Evidence

Hotel and tour records are fictional demo data. Real-world destinations and attractions have source links; images and map data retain licenses/attribution. Demo inventory and prices must stay clearly labeled. Do not invent reviews, ratings, operator partnerships, or performance figures. Current travel tests, browser checks and isolated k6 evidence are recorded separately from the historical hotel foundation measurements in docs/evidence/travel and docs/PERFORMANCE.md.
