# Atlas redesign review

Reviewed 30 October 2026. The user-approved living-atlas brief, DESIGN.md and UX-CONTRACT.md govern this review. Discovery is an Experience surface; planning and reservations retain their task-focused behavior.

## Implemented scope

- Site-wide ivory/rust light and charcoal-green/copper dark tokens replace the previous brand palette. Allura is reserved for the wordmark, Cormorant Garamond for editorial headings, and Source Sans 3 for navigation, forms and operational data. Sora was removed.
- At 1100px and wider, Explore places navigation in a left rail and country search, list and preview on the right. Equal 312px side reservations keep the globe centred in the viewport. Narrow screens stack navigation, globe and country collection in document flow; secondary navigation uses native details disclosure.
- Country choices update shared selection without navigation; Explore [country] remains an explicit link. Search preserves selection, and Japan is the initial choice. Theme switching retains the globe instance and selection. Existing react-globe.gl and Natural Earth geography remain in use.
- Fonts are self-hosted. Allura and Cormorant Garamond use fontTools subsets of Google Fonts OFL TTF sources; Source Sans 3 retains its existing local package. Source URLs, subset ranges, sizes and notices are recorded in `client/public/fonts/README.md`. The four source downloads were explicitly approved. No API or database contract changed.

## Evidence and disposition

The independent finish reviewer initially requested one fix: reduce the selected-country row's 3px left border to the approved 1px rule. After that fix, all eight captures were refreshed. The reviewer returned **SHIP for that fix**, scoring it resolved with no visible regression attributable to the change. The initial review accepted the supplied composition, typography, palettes and font fallback. This disposition is scoped to the reviewed work and does not certify the whole application.

This documentation pass inspected the eight saved captures below and the JSON evidence; it did not rerun the implementation checks.

| Capture                                    | Reviewed surface                                                     |
| ------------------------------------------ | -------------------------------------------------------------------- |
| `artifacts/atlas/light-1440.png`           | Light desktop discovery and selected row                             |
| `artifacts/atlas/dark-1440.png`            | Dark desktop discovery and selected row                              |
| `artifacts/atlas/light-1920.png`           | Wide light composition and globe centring                            |
| `artifacts/atlas/dark-1920.png`            | Wide dark composition and globe centring                             |
| `artifacts/atlas/light-390.png`            | Light mobile document flow and country collection                    |
| `artifacts/atlas/dark-390.png`             | Dark mobile document flow and country collection                     |
| `artifacts/atlas/country-dark-mobile.png`  | Narrow country page with operational typography                      |
| `artifacts/atlas/font-fallback-mobile.png` | Readable navigation, headings and country actions after font failure |

`artifacts/atlas/browser.json` reports a pass with no errors. Its checks cover all ten list selections, filtering/empty/clear behavior, both themes at 320, 390, 768, 1024, 1440 and 1920px, desktop globe centring, pointer/keyboard mobile disclosure, country navigation and Back, reduced motion, Login/Account navigation and font failure. Four selected axe scans report no violations. `artifacts/atlas/premium-audit.json` reports zero findings in strict mode.

Implementation verification reported **66 passing tests**, lint, catalog validation, production build and built-asset verification. The latest saved travel smoke, travel recovery and connected-map browser results all report passes. The final globe rerun also passed rendering, connected selection, bounded retries and explicit recovery (`artifacts/globe/result.json`). The travel smoke result records aborted map-tile requests alongside its pass and empty error list; it is not evidence that every external tile request completed.

## Limits and remaining work

The Impeccable context engine was unavailable; no Impeccable detector or approved composition was available. Review used the supplied design brief, project context, implementation evidence and captures. The separate strict premium audit is not an Impeccable detector result. Selected accessibility checks are not comprehensive accessibility certification. No load or performance claim follows from these checks.

The local demo was initially stopped. A temporary port-3002 Mongo demo was started with user-approved process access for verification. The workspace Word journal has an Atlas learning chapter. Rendering QA reports 25 pages: the original 24 pages are pixel-identical to the prior verified render, all 193 original nonempty paragraphs are preserved, and new page 25 was visually inspected (`artifacts/atlas/journal-qa.json`). The parent journal remains untouched. No staging, commit, push, deployment or account access was performed.
