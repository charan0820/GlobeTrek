# GlobeTrek interaction contract

The approved ten-country plan is authoritative. Discovery is immersive; planning and reservations prioritize task clarity. English, en-IN formatting, destination-local schedules, WCAG 2.2 AA.

## Canonical UI Map

| Capability     | Canonical owner               | Source of truth               | Allowed variants                         | Verification                          |
| -------------- | ----------------------------- | ----------------------------- | ---------------------------------------- | ------------------------------------- |
| Select/Listbox | Native select                 | This contract                 | OS-owned finite choices                  | Browser popup and keyboard checks     |
| Date           | ui.jsx DateField              | This contract                 | Authored English calendar and ISO typing | Browser dialog, date validation tests |
| Form           | ui.jsx Field                  | This contract and API schemas | Login, setup, selection                  | Server validation and browser flow    |
| Scrollbar      | travel.css                    | DESIGN.md                     | Global baseline                          | Narrow viewport and computed style    |
| CRUD           | Trip and reservation services | API contract                  | Draft editing, fixed snapshot lifecycle  | Integration and browser journey       |

| Capability           | Canonical owner                             | Behavior                                                                          |
| -------------------- | ------------------------------------------- | --------------------------------------------------------------------------------- |
| Theme and scrollbars | travel.css tokens                           | System preference initially; explicit light/dark saved locally.                   |
| Form fields          | ui.jsx Field                                | Persistent labels, linked errors, no native validation bubbles; preserve inputs.  |
| Date                 | ui.jsx DateField                            | Authored English calendar with typed ISO date alternative.                        |
| Select/Listbox       | Native select                               | OS popup accepted for short finite choices.                                       |
| Dialog               | Radix Dialog wrapper                        | Accessible title, trapped focus, Escape, focus restoration.                       |
| Notifications        | Shared Status/Error components              | Inline errors remain visible; polite save status.                                 |
| Server state         | TanStack Query                              | Abortable reads, explicit invalidation, private data not persisted.               |
| Draft                | Planner reducer and versioned local storage | One owner; keyboard reorder equivalent to drag; server expectedRevision conflict. |
| CRUD                 | API/services                                | Owned private resources; 404 for others; immutable reservation snapshots.         |
| Navigation           | Shell route effect                          | Page title/focus/scroll; URL public filters; personal draft stays out of URL.     |

Login preserves return intent and guest draft. Failed autosave retains local state. Conflict offers reload or save a copy. Pending reservation refresh reuses the same idempotency key. Hold deadlines use server time. Map/list switches preserve selection. Cancellation names the whole reservation and uses a dialog.

## Connected geographic exploration

The canonical country workspace uses URL-backed Explore/Plan mode and Model/Detailed map/List presentation; Model defaults on every viewport. Only the active geographic engine mounts. Selection is shared by the collection, geographic pins and preview. Filtering out the selected item clears it. Closing a preview retains selection. Public filters, selected product, presentation, selected day and local/owned trip reference belong in the URL; draft contents do not. Existing planner/product/hotel routes resolve to this workspace.

The visible Plan action is labeled Build your trip. Omitted or unrecognized presentation values resolve to Model; Split is no longer a presentation. List mounts no geographic engine. A visited editor remains mounted across mode changes while its hidden engine unmounts. The shared relief camera stores position, target and aspect; restoring or resizing it adjusts framing for the new aspect while retaining orientation and relative zoom.

The planner derives preview presentation from the workspace URL. Show in list followed by returning to Model or Detailed map must keep previews usable. List supports the same shared preview on desktop and mobile without mounting geography; desktop places it in normal flow within the planner presentation region, while mobile retains the shared dialog behavior.

Desktop result lists and the planner day rail own bounded scrolling; mobile uses document scrolling with the model before its collection/day panel and an explicit List alternative. Deliberate list reveals respect reduced motion. Discrete vertical mouse-wheel steps use the shared useSoftScroll owner and frame-rate-independent damping. Fine trackpad deltas, touch, keyboard, browser zoom, horizontal input, form controls and geographic gestures keep native behavior. Direction reversal discards queued movement; pointer/key input, route changes and reduced motion cancel pending easing. Detailed maps resize with their containers and use cooperative gestures. Relief zoom requires Ctrl/Command plus wheel; reset, fit, pan, zoom and region buttons provide alternatives. Camera restoration and resizing preserve orientation and deliberate zoom relative to responsive framing.

City headings group attractions, stays and tours alphabetically. Multi-city products appear once under Multi-city itineraries with covered cities. Place previews use shared place-ui.jsx content, a non-modal desktop map card and the existing Radix dialog owner styled as a mobile bottom sheet. Escape restores focus to a visible initiating control or selected item. Show in list closes the sheet, switches view and reveals the highlighted entry.

Planner selection uses stop occurrence IDs. Selected-day and All days map scopes preserve the draft; routes never connect separate days. Day colours are stable across tabs, badges, markers and route features, with explicit day/stop numbers. Nearby/overlapping markers expose every underlying place or occurrence through selectable choices. Fit places restores the complete visible collection.

Explore/Plan switching keeps the visited editor mounted, preserving reducer state, selected day and in-flight revision-based autosaves while unmounting hidden geographic engines. A local draft belongs to one country and is never silently replaced; new setup requires a confirmation before replacement. Owned trips stay independent. Templates create editable copies and packages keep separate fixed-product checkout.

Relief uses local, versioned GLBs and shared regional transforms/elevation metadata for pins. Heights are explicitly exaggerated eight times. Insets state that spacing is not geographic distance; cross-region route segments are explicitly listed rather than drawn to scale. Terrain failure retains Detailed map and the full collection. Controls stay outside the canvas, and inset captions remain within visible bounds.

Shared pricing distinguishes published unit rates, selection estimates and final server quotes. Loading and failures remain visible even when a unit rate is present; Retry estimates and Retry trip estimate recover without clearing inputs. Missing/incomplete totals have explanations, never fabricated zero values. The public estimate APIs are read-only, no-store and independently rate-limited. Query identities include relevant selections; name edits and attraction-only changes do not trigger pricing work. Only the final quote and transactional hold validate and reserve inventory.

Stays label room/night rates, tours and packages label per-traveler units, templates label free copying with bookings extra, and attractions label unsold tickets. Estimates state included demo service fees and available traveler, departure, room and night assumptions. A numeric zero is valid. Collection batches contain at most twenty selections per request. New selection identities do not display a previous query's total. Retry actions refetch the current identity and disable while fetching; a failed planning estimate identifies the failure before any cached total.

Attractions show Suggested visit; tours show Tour duration and separate destination-local schedules. Photo failures preserve content/actions. Photo credits expose source, title, creator, license and modification notes. Fictional products use explicitly representative destination photography. Preview additions obey the same limits and selection rules as ordinary add controls.

## Reservation identification

Reservation list entries identify the destination and booking kind, booked date range, cities, travelers, stay/tour counts, lodging nights, currency total, lifecycle timestamps and a short reference linked to the full identifier. Dates and selections come from the immutable reservation snapshot, never a subsequently edited trip. Tours use their destination timezone; stay end dates are explicitly checkout dates. A native disclosure exposes the full booked selection with dates, room types and quantities. Similar or identical selections keep separate references and status labels; do not infer that one reservation replaced another.

## Atlas discovery shell — 30 October 2026

At 1100px and above, navigation is a left rail, the globe is viewport-centred through equal reserved side widths, and the right panel owns country search/list/preview. Country-list entries are real links to their destination pages, supporting Enter and ordinary browser new-tab behaviour. Globe click selection raises the country and updates its preview without navigation; Explore [country] remains an explicit link. Japan is the initial choice. Filtering does not change the selected country. Existing abortable discovery search remains IME-safe and exposes searching, failure and empty states.

Below 1100px, navigation precedes globe, country search/list and preview in document flow. Login/Account and Build your trip remain visible; secondary links use a native details disclosure, open on desktop and initially closed on narrow screens. System/explicit theme behaviour is unchanged. Theme changes update geographic materials without remounting the globe or changing selection/camera. Font/rendering failures preserve semantic navigation and the usable country collection.

## Raised geography and shared hover behaviour

Supported polygons rise temporarily on hover and persistently on click. Selected height takes precedence; leaving or cancelling a pointer clears only hover. Unsupported geography remains flat and inactive. Country name labels are informational, ignore pointer input, suppress rear-facing/crowded labels and prioritise selected/hovered names. Country links remain usable without WebGL or labels.

The theme control is in the top-right shared utility header, with space reserved for it; it scrolls with the header. Navigation and text actions share a 200ms sliding/fading hover background and equivalent keyboard focus treatment. Text does not move; ordinary reading copy does not animate. Reduced motion makes these effects immediate.

## Destination motion (31 October 2026)

`discovery-motion.jsx` is the shared presentation owner; Discovery retains navigation/selection and CountryWorkspace retains draft/panel ownership. Reduced motion removes travel effects. Navigation never waits for Motion completion. No exit animation retains an obsolete actionable destination. A polite entry status names the latest requested destination. Country-list progress is a non-live progressbar with explicit scroll-position label; ResizeObserver and filter changes recalculate its range. It is absent when every result is visible.

## Fluid atlas presentation ownership

The shell registry owns only which contextual island is presented. Route publishers own its contents and existing actions, with trip context taking precedence over country context. Entries are route-scoped and removed on unmount. No duplicate pricing/save/hold state is introduced. Desktop panel collapse preserves mounted contents, disables hidden focus through inert, retains track width and restores scroll. Collapse preferences are shared across Explore/Plan and stored separately for discovery/planning in sessionStorage; storage failure is harmless.

Below 1100px, one panel sheet can be open at once. Place/product dialogs supersede it; close restores focus to a connected trigger or the established route fallback. Public route/query state remains canonical. Page-entry motion does not key/remount the route tree on query updates. Primary controls are 48px; secondary/icon and model controls have at least 44px targets. The existing scroll implementation is retained.

Planner controls retain their existing state handlers and accessible names. View and route scope are separately labelled groups. Taller desktop panels remain independently scrollable; collapse returns to intrinsic height without affecting the draft or map selection.

The dated Trip days tabs are the sole day selector; map markers retain day/stop labels. Icon-only relief controls preserve existing aria-label names, title descriptions and keyboard activation.

Desktop planner List view uses distinct controls and collection rows beside the day plan. Neither panel may share the toolbar grid cell; verify non-overlapping bounds when changing geographic presentation.
