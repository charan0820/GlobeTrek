# API and service usage register

| Service | Purpose | Credentials and approval | Costs limits and observed usage |
|---|---|---|---|
| GlobeTrek /api | Auth, discovery, trips, quotes and reservations | Session cookie for owned resources; same-origin mutations | No per-call fee. Structured logs record request ID, route template, status and duration. Isolated k6 reports exact profile request totals. |
| OpenFreeMap | Public country/planner map styles and tiles | No key or account; browser network access | Public free instance, no application SLA. Attribution remains visible. Browser recovery evidence counts provider responses; failed tiles leave lists usable. |
| Natural Earth | Local country polygons | Approved one-time download | Public-domain snapshot, source and SHA-256 pinned in countries.meta.json. No runtime geographic-boundary API calls. |
| Wikimedia Commons | Ten country photos and 119 attraction photographs | Approved build-time imports; no token | Per-image source/creator/license retained. Metadata calls use eight-second pacing with retry pauses; resumed imports preserve files. Final variants are served locally. The first interrupted import and research calls were not fully instrumented. |
| Flickr static image host | One verified Nea Chora beachfront harbour photo | Explicitly approved download; no account/key | CC BY-NC-SA 2.0, noncommercial use only. Source and restriction remain in the UI and local attribution README. No runtime Flickr calls. |
| Fontsource packages | Self-hosted Sora and Source Sans 3 | npm download approval | Local font files, OFL notices served in public/fonts. No Google Fonts runtime calls. |
| ECB | Optional dated INR display estimates | Public feed, no key; enable only with approved network use | Cached six hours with one in-flight refresh. Failure backoff begins at one minute and caps at one hour. Native checkout works without rates. Stored dates/fetchedAt identify successful refreshes. No transactional exchange-rate guarantee. |
| npm registry | Dependencies and advisories | Approved downloads; no account token | Package manager retries/transitive downloads are not counted as a fabricated exact total. Last dependency audit is recorded in verification evidence. |
| MongoDB distribution | Temporary test/demo replica set | Approved cached executable | MongoDB 7.0.14; isolated local fixtures. Not a hosted application API. |
| Grafana k6 distribution | Local load generator | Approved cached executable | k6 2.3.0. Tests use their own temporary database and localhost:3020. Raw metrics exclude external supplier traffic. |
| Document Foundation | Word-journal layout renderer | Explicit download/extraction approval | Free signed renderer extracted to ignored cache; no ordinary system installation. See progress for actual rendering result. |
| MongoDB Atlas / Render | Prepared persistent DB and web hosting | Not connected/provisioned/published by assistant; explicit approval required | Intended free demo setup; verify current quotas and cold-start limits at approval time. No hosted usage measured. |
| GitHub | User-created repository and prepared CI | No assistant commit/push/account connection | No remote CI run initiated. Username charan0820 grants no additional authorization. |

Never record passwords, JWTs, cookies, email addresses, full query strings or mutation bodies in application request logs. Browser measurement fixtures record service response counts without credentials. Exact runtime application counts can be computed from structured logs; long-term retention and a production metrics service are not configured.

No live travel supplier, paid API, payment processor or in-app AI model is integrated.

Connected-map import evidence: docs/evidence/connected-maps/media.json records **289 instrumented HTTP responses** (154 Commons metadata, 130 thumbnail-host, 4 upload-host and 1 Flickr-host responses). HTTP 200 includes provider-busy JSON responses; it does not prove every lookup succeeded. The earlier stopped import and browser/web research are excluded from that total. Delivered attraction variants total 14,403,178 bytes across 240 local files. Final subject review and file/hash checks cover all 120 mappings.
