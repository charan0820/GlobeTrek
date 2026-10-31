# Globe interaction refinement review

Reviewed 30 October 2026 against the requested refinement, current DESIGN.md and UX-CONTRACT.md. This records the refinement after the historical [Atlas review](ATLAS-REVIEW.md); it does not replace that earlier review.

## Implemented scope

- Cormorant Garamond headings have stronger scale: shared desktop/mobile headings are 72/42px, Explore is 76/44px, and h2 is 34px. Navigation and text actions share a 200ms sliding/fading hover and focus treatment with reduced-motion handling. The top-right theme control belongs to the utility header and scrolls with the document.
- The viewport-centred globe fits 90% of the smaller available dimension, leaving clearance for raised geography. Supported polygons use resting altitude .001, hover .025 and persistent selection .055, with a 300ms transition and contrasting side faces.
- Country-list links navigate directly to the country. Globe clicks retain selection and show a preview with an explicit Explore link. Supported country names project through the current camera matrices; selected and hovered names take collision priority, rear-facing names hide, and labels remain pointer-transparent.
- A native click/fast-tap fallback runs only when the renderer misses the click. It uses public Three.js ray/sphere intersection followed by checks against the ten supported Natural Earth polygons, including holes. Drag and cancelled gestures are excluded.
- Existing geography and dependencies remain in use. No API/database contracts, dependencies or downloads changed in this refinement.

## Evidence and disposition

The independent finish reviewer returned **SHIP for the changed UI**, with no material fixes requested. Thirteen valid captures covered the following surfaces:

| Evidence                                                        | Surface                                          |
| --------------------------------------------------------------- | ------------------------------------------------ |
| `artifacts/atlas/light-1440.png`, `dark-1440.png`               | Desktop discovery in both themes                 |
| `artifacts/atlas/light-1920.png`, `dark-1920.png`               | Wide discovery and globe centring                |
| `artifacts/atlas/light-390.png`, `dark-390.png`                 | Mobile discovery in both themes                  |
| `artifacts/atlas/dark-short-desktop.png`                        | Short desktop viewport, 650px high               |
| `artifacts/atlas/country-dark-mobile.png`                       | Mobile country page                              |
| `artifacts/atlas/font-fallback-mobile.png`                      | Font-failure fallback                            |
| `artifacts/globe/hover-raised.png`, `restored.png`              | Raised hover and restored globe                  |
| `artifacts/globe/oblique-raised.png`, `dark-oblique-raised.png` | Raised geometry at oblique angles in both themes |

The reviewer inspected code and browser evidence for motion; static captures alone were not treated as motion verification. This documentation pass inspected the saved JSON evidence and records the independent review disposition without claiming another visual review or rerun.

`artifacts/atlas/browser.json` passes both themes at 320, 390, 768, 1024, 1100, 1440 and 1920px. It covers real country links and Back, selection-preserving filtering, hover treatment, touch selection, pointer/keyboard disclosure, reduced motion, authentication navigation and font failure. Four selected axe scans report zero violations. The accompanying implementation checks cover focus behavior. `artifacts/globe/result.json` passes actual hover entry/exit, persistent click selection, oblique drag, camera/selection preservation across theme changes and bounded failure/recovery paths.

Implementation verification reports **70 tests passed**; lint, catalog validation, production build and built-asset verification passed. The strict premium audit reports zero findings. Full travel smoke and recovery passed after the shared changes. The final connected-map interaction rerun passed all six groups: List/Map/Split, five viewport widths, occurrences/routes, thirty-day drafts, reduced motion/focus and image fallback.

## Limits and journal

The Impeccable engine/detector and an approved composition were unavailable. Review used the requested brief, existing design/UX context, code, captures and browser evidence. The separate premium audit is not an Impeccable detector result. SHIP is scoped to the changed UI; selected accessibility checks do not certify the whole application, and no new performance certification follows from these results.

The workspace Word journal now has an interactive-geography chapter and 26 pages. All 206 prior nonempty paragraphs are preserved, the original 25 pages are pixel-identical, and new page 26 was visually verified (`artifacts/atlas/globe-journal-qa.json`). The parent journal remains untouched. No staging, commit, push, deployment or account access was performed.

The final matrix also explicitly passed country-link activation with keyboard Enter and a reduced-motion hover transition-duration assertion. Saved JSON snapshots for this checkpoint are in docs/evidence/globe-interaction.
