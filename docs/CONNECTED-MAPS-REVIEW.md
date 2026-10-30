# Connected maps refinement review

Reviewed 29 October 2026. The existing Cartographic explorer identity, typography, UI primitives and light/dark tokens remain authoritative. DESIGN.md records the durable additions; UX-CONTRACT.md owns interaction behavior. This review covers connected country exploration and itinerary planning.

## Durable additions

- Country List/Map/Split modes share selection and URL preference. Alphabetical city groups make attractions, stays and tours scannable; multi-city products appear once with covered cities. Country imagery stays compact: up to 420 × 240px on desktop and 180px high on mobile.
- Desktop previews use a non-modal map card; mobile uses the existing dialog owner as a bottom sheet. Desktop lists/day rails have bounded native scrolling; mobile uses document scrolling. Show in list explicitly reveals the selected entry on every activation. Escape restores a visible control, and preview dismissal preserves selection.
- Suggested visit identifies attraction planning estimates. Tour duration and destination-local schedules remain explicit. Thirty stable day colours use `round((index * 137.508 + 212) % 360)` with light HSL saturation/lightness 72%/26% and dark 78%/72%; text retains day/stop identity. Routes group by day and do not join different days. Repeated places remain separate stop occurrences.
- Dark maps adapt named geographic layer roles through `client/src/geo/map-style.js`, retaining readable roads, boundaries, water, vegetation, buildings and haloed labels. The palette is recorded in DESIGN.md and the sidecar without invented ramps. Navigation sits top left below Fit places, outside the preview area.
- Photographs are local and attributed. Credits expose source, title, creator, license and modification notes; fictional products identify representative destination photography. Nea Chora Beach uses thomas molck (tombild)'s `_MG_2189 — Nea Chora beachfront harbour`, [source](https://www.flickr.com/photos/tombild/43773819584), [CC BY-NC-SA 2.0](https://creativecommons.org/licenses/by-nc-sa/2.0/). Its noncommercial restriction is documented in the local media README and UI for this educational, simulated-reservation demo. Resized/converted; thumbnail cropped. Photo failures preserve details and actions.

## Evidence and disposition

The independent reviewer returned **SHIP for its two fixes only**: Show in list now explicitly reveals on every activation, and map navigation is no longer covered by previews. This is a scoped disposition for those fixes.

Fresh browser evidence in `artifacts/connected-maps/result.json` reports `passed: true`, no errors, and checks for desktop modes/URL Back/city grouping/bidirectional selection; mobile sheet-to-list behavior at five widths; all-days routes/repeated-place occurrences/preview additions/reload persistence/stay selection; a thirty-day guest draft; reduced motion/Escape/focus/selection; and photo failure. Four selected accessibility scans report no violations: country preview light, country preview dark, planner overview and planner mobile sheet.

The completed implementation verification reported 63 passing tests, lint, production build, catalog validation and strict premium audit. Existing travel smoke and recovery checks passed. This documentation pass inspected the saved browser result, implementation owners and the six captures below; it did not rerun the implementation checks.

| Capture | Reviewed surface |
| --- | --- |
| `artifacts/connected-maps/country-light-desktop.png` | Light country split view and preview |
| `artifacts/connected-maps/country-dark-desktop.png` | Dark country split view and geographic style |
| `artifacts/connected-maps/country-dark-390.png` | Narrow country list and compact heading image |
| `artifacts/connected-maps/planner-dark-overview.png` | Dark all-days overview, legend and preview |
| `artifacts/connected-maps/planner-light-desktop.png` | Light planner, day identity and explicit stay selection |
| `artifacts/connected-maps/planner-mobile-sheet.png` | Narrow planner with representative photo and bottom sheet |

## Scope limits

Evidence covers selected captures, journeys and checks. No detector, design engine or embed tool was available for this pass; the review uses the implementation and saved browser evidence. It is not a whole-application accessibility or design certification. There were no new load tests, deployment or commits. No performance figures are inferred from these results.
