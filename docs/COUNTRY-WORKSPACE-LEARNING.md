# Country relief workspace and read only pricing

This chapter explains how GlobeTrek connects geographic discovery to its existing trip editor. The important separation is between a model used for interaction, a draft used for planning, an estimate used for comparison and a reservation used to consume inventory.

## Geographic coordinates and model transforms

What it does: The importer converts longitude and latitude into regional coordinates, samples real elevation and triangulates country polygons. Labelled insets place distant regions beside the main country without changing the original coordinates.

Why we chose it: Local GLB files provide bounded downloads and predictable rendering. The same regional projection and offset are used for terrain, pins and routes, preventing independent coordinate systems from drifting apart.

Where it appears: scripts/build-relief.mjs, scripts/relief-config.mjs, client/src/geo/relief-layout.js and CountryModel.jsx. Source records and hashes are in the public relief manifest. Heights are exaggerated eight times; inset spacing is not travel distance.

How we tested it: Asset validation checks all ten countries, twenty GLBs, budgets, hashes and 120 attraction anchors. Unit tests cover elevation interpolation, longitude wrapping, Hawaii selection and offshore coordinates. Browser checks exercise actual pins, overlapping selections and rendering failure.

Interview explanation: A coordinate is domain data. A projection and inset transform are presentation data. Keeping that distinction lets us move Hawaii on screen without pretending its geographic location or distance has changed.

## Navigation and state lifetime

What it does: Country entry coordinates single and double clicks, cancels obsolete transitions and keeps links usable with a keyboard or another tab. Explore and Plan live under one route; URL state identifies public filters, view, selected item and trip reference.

Why we chose it: Planning state must outlive a presentation switch. Reusing the reducer and autosave system protects drafts while the renderer is replaced. Hidden geographic engines are unmounted to avoid paying for two WebGL render loops.

Where it appears: Discovery, Globe, CountryWorkspace, CountryCatalog and the embedded TripEditor. Compatibility entries preserve older planner, product and hotel links. Guest replacement uses the shared confirmation dialog.

How we tested it: Browser journeys cover marker selection, details and Back, inline trip creation, mode switches, guest recovery and the existing authentication/save/reservation flow. Tests retain revision conflicts and booking ownership checks.

Interview explanation: The URL owns shareable navigation, the editor owns mutable draft state and the renderer owns disposable graphics resources. These lifetimes are deliberately different. A view change should not recreate the user's work.

## Read only estimates and final quotes

What it does: A bounded server endpoint calculates unit prices and estimated party totals without reserving stock. Saved-trip summaries use the same service. Stays use nights times enough rooms for the party; tours use one seat per traveler. Packages resolve fixed components.

Why we chose it: React should display prices, not invent a parallel package or fee calculation. Shared server arithmetic keeps estimates aligned with checkout while preserving the quote and hold lifecycle. An independent rate limiter prevents browsing estimates from exhausting booking attempts.

Where it appears: server/src/services/estimates.js and travel-policy.js, POST /api/estimates, POST /api/estimates/trip and client/src/pricing.jsx. Native currency is authoritative; optional INR values carry their reference date. Attraction tickets are not sold, and free template copying does not mean free travel.

How we tested it: Integration tests compare stays and packages with actual server quotes, inspect inventory before and after estimation, check missing dates and invalid batches, preserve legitimate zero JPY values and verify saved-trip isolation. Query identities include relevant selections so stale results cannot replace current estimates.

Interview explanation: An estimate answers what a selection would cost under stated assumptions. A quote snapshots current validated terms. A hold consumes capacity transactionally. Combining these responsibilities would make ordinary browsing compete for inventory.

## Interview follow up questions

Why not fetch terrain continuously? Offline processing makes source provenance, mobile detail and download budgets reviewable; the browser renders local bounded assets.

Why are pins not moved inland? That would change the meaning of the place. Offshore coordinates are preserved even when sampled terrain is at sea level.

Why keep zero and missing prices different? Zero is a legitimate numeric value; missing is an unresolved selection or unavailable data. Truthiness would hide valid zero values and could encourage misleading fallback totals.

Why does an estimate not promise availability? Another transaction can consume shared room or tour inventory after estimation. Only the transactional hold conditionally reserves all selected resources together.
