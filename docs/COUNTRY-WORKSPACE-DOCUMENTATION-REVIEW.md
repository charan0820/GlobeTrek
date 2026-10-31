# Country workspace documentation review

Reviewed on 31 October 2026 as an ordinary extension of the approved living-atlas system. This is a bounded merge into existing documentation, not a visual identity replacement. The parent task explicitly authorized reconciling DESIGN.md and UX-CONTRACT.md; their incumbent vocabulary and frontmatter tokens are preserved.

## Evidence inspected

- Impeccable `reference/document.md`; approved `docs/COUNTRY-WORKSPACE-SURFACE.md` and `docs/COUNTRY-WORKSPACE-IMPLEMENTATION.md`; root `PRODUCT.md`, `CONTEXT.md`, `DESIGN.md` and `UX-CONTRACT.md`.
- `client/src/CountryWorkspace.jsx`: shared country route, Explore/Build your trip controls, retained visited Plan editor, shared camera reference, desktop product panel and narrow dialog, compatibility entry routes.
- `client/src/CountryCatalog.jsx`: Model default and invalid-value fallback, Model/Detailed map/List controls, active-workspace engine gating, grouping, selection and shared PriceCollection owner.
- `client/src/planner.jsx`: Model default in embedded workspace, single active engine gating, reducer and replacement dialog, parameterized collection pricing, trip estimate failure/retry and authoritative-quote copy.
- `client/src/geo/CountryModel.jsx`: local manifest/metadata/GLB loading, mobile asset selection, aspect-aware fit/resize/restore, camera disposal snapshot, orbit bounds, modifier-wheel handling, numbered/overlapping pins, separate day routes, explicit cross-inset connections, source link and declared exaggeration.
- `client/src/pricing.jsx`: query identities, batches of twenty, legitimate zero handling, unit/selection distinctions, assumptions, loading/error feedback and retry actions, fixed planning-estimate name and attraction-stop filtering.
- `client/src/workspace.css` and incumbent `client/src/travel.css`: inherited light/dark palette and typography, pressed controls, desktop columns and bounded scrolling, narrow model-first ordering, controls outside the canvas, inset label layout and reduced motion.
- `client/public/relief/manifest.json`: listed desktop/mobile assets for IN, JP, TH, ID, FR, IT, ES, GR, TR and US, regional projection and height exaggeration. `client/public/relief/TERRAIN-ATTRIBUTION.md` supplies provider attribution. No relief README exists at this review.
- Read the opening metadata of `.impeccable/design.json` to identify existing drift; it was not rewritten.

## Durable differences recorded

Existing root documents already described most of the approved extension. DESIGN.md now makes relief ownership/provenance, current workspace control vocabulary and shared price presentation explicit without adding or changing primitive tokens. UX-CONTRACT.md now records the removed Split option, invalid-view fallback, zero-engine List behavior, camera snapshot fields and relative framing, plus unit bases, assumptions and retry/query behavior. These are observed implementation rules, not a new aesthetic direction. Booking lifecycle rules remain unchanged.

## Pre-existing drift preserved

`.impeccable/design.json` still describes List/Map/Split, a desktop Split default, a narrow Split-to-List behavior and a country heading photograph. Those extension records are stale for the implemented country workspace. The explicit task boundary requires preserving the sidecar, so DESIGN.md and UX-CONTRACT.md should be used for this extension until a separately authorized sidecar refresh. Its SHA-256 at review is `AED60EDD6F05287EA63ED287908ECFAE133B497CB2BBA398DD2F3C41AD0D3B36`.

DESIGN.md also retains its pre-existing extra Interactive globe refinement heading and historical native-wheel sentence immediately superseded by its momentum paragraph. Neither is repaired in this bounded country-workspace merge. No unrelated design-system normalization was performed.

## Verification limits and outcome

Final correction rechecked: `planner.jsx` now derives workspace preview presentation from URL-backed `geoView`, retaining `legacyView` only outside the workspace. The active List presentation mounts shared PlacePreview on desktop and mobile without geography; `workspace.css` positions the desktop List preview relatively inside planner-map. UX-CONTRACT.md now records preview continuity after Show in list and returning to geography. This is a functional reconciliation with no new design tokens. The parent implementation reviewer reports that the full connected-map regression passed; this documenter rechecked the source delta and did not independently rerun that browser suite.

Static documentation/source reconciliation completed. This pass did not run browsers, tests, asset hash/budget verification or a new accessibility audit; it does not independently certify visual finish, all-country geographic correctness, pricing parity or booking correctness. Those remain the implementation/finish review's evidence. No new raster was created, and existing photography licensing remains as documented, including the noncommercial Nea Chora exception. No network, downloads, Git, account changes, publication or parent-folder writes were used.

Only `DESIGN.md`, `UX-CONTRACT.md` and this review file were changed by the documenter. Runtime files and `.impeccable/design.json` were preserved. Documentation outcome: reconciled within the authorized boundary, with sidecar drift explicitly outstanding.
