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

Country discovery uses URL-backed List/Map/Split modes; desktop defaults to Split. Below 760px, Split displays as List without changing the URL preference. Selection is shared by the list, map and preview. Filtering out the selected item clears it. Closing a preview retains the selection.

Desktop result lists and the planner day rail own their bounded scrolling; mobile uses document scrolling. Deliberate reveals/pans are smooth unless reduced motion is requested. Following the user's explicit request for a gradual stopping motion, discrete vertical mouse-wheel steps use the shared useSoftScroll owner and frame-rate-independent damping. Fine trackpad deltas, touch, keyboard, browser zoom, horizontal input, form controls and map gestures keep native behavior. Direction reversal discards queued movement; pointer/key input, route changes and reduced motion cancel pending easing. Maps resize with their containers and use cooperative gestures.

City headings group attractions, stays and tours alphabetically. Multi-city products appear once under Multi-city itineraries with covered cities. Place previews use shared place-ui.jsx content, a non-modal desktop map card and the existing Radix dialog owner styled as a mobile bottom sheet. Escape restores focus to a visible initiating control or selected item. Show in list closes the sheet, switches view and reveals the highlighted entry.

Planner selection uses stop occurrence IDs. Selected-day and All days map scopes preserve the draft; routes never connect separate days. Day colours are stable across tabs, badges, markers and route features, with explicit day/stop numbers. Nearby/overlapping markers expose every underlying place or occurrence through selectable choices. Fit places restores the complete visible collection.

Attractions show Suggested visit; tours show Tour duration and separate destination-local schedules. Photo failures preserve content/actions. Photo credits expose source, title, creator, license and modification notes. Fictional products use explicitly representative destination photography. Preview additions obey the same limits and selection rules as ordinary add controls.

## Reservation identification

Reservation list entries identify the destination and booking kind, booked date range, cities, travelers, stay/tour counts, lodging nights, currency total, lifecycle timestamps and a short reference linked to the full identifier. Dates and selections come from the immutable reservation snapshot, never a subsequently edited trip. Tours use their destination timezone; stay end dates are explicitly checkout dates. A native disclosure exposes the full booked selection with dates, room types and quantities. Similar or identical selections keep separate references and status labels; do not infer that one reservation replaced another.
