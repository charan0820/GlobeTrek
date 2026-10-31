---
name: GlobeTrek
description: Globe-led travel discovery and a practical itinerary workspace
colors:
  action: "#a34b12"
  ink: "#26312e"
  canvas: "#f4f1e9"
  surface: "#fffdf7"
  muted: "#62665f"
  line: "#d8d2c6"
  on-action: "#fffdf7"
  soft: "#e9e3d7"
  danger: "#a32936"
  success: "#356047"
  warning: "#805417"
  dark-canvas: "#1d2421"
  dark-surface: "#26312c"
  dark-ink: "#eee9dd"
  dark-muted: "#b9c0b7"
  dark-action: "#e4ab79"
  dark-on-action: "#1d2421"
  dark-line: "#46524b"
  dark-soft: "#303d35"
  dark-danger: "#ffabb1"
  dark-success: "#a9ceb0"
  dark-warning: "#e8c17e"
typography:
  display:
    fontFamily: "'Cormorant Garamond', Georgia, serif"
    fontSize: "clamp(42px, 5vw, 72px)"
    fontWeight: 500
    lineHeight: 1.16
    letterSpacing: "-0.03em"
  brand:
    fontFamily: "Allura, cursive"
    fontSize: "48px"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "0"
  body:
    fontFamily: "'Source Sans 3', sans-serif"
  paragraph:
    fontFamily: "'Source Sans 3', sans-serif"
    lineHeight: 1.6
  discovery-display:
    fontFamily: "'Cormorant Garamond', Georgia, serif"
    fontSize: "clamp(44px, 5.3vw, 76px)"
    fontWeight: 500
    lineHeight: 1.16
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "'Cormorant Garamond', Georgia, serif"
    fontSize: "34px"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "-0.03em"
rounded:
  badge: "4px"
  field: "6px"
  stop: "8px"
  card: "12px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "32px"
  section: "48px"
components:
  button-primary:
    backgroundColor: "{colors.action}"
    textColor: "{colors.on-action}"
    rounded: "{rounded.field}"
    padding: "12px 18px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "12px 18px"
  field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "10px 12px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "28px"
---

# Design System: GlobeTrek

## Overview

**Creative North Star: "The living atlas"** — user-approved on 30 October 2026. The Psyche reference supplies ivory paper, rust type and quiet editorial spacing; Google Earth supplies the centred exploration composition. The globe is the signature interaction. This replaces the earlier ocean/cobalt identity.

Discovery is an Experience surface; planning and reservations remain Operate surfaces. Expressive type is restrained to the wordmark and editorial headings; task data stays in a readable sans serif. Geography and genuine destination photography carry the visual interest.

**Key Characteristics:**

- A viewport-centred atlas globe between left navigation and right destination selection.
- Ivory/rust light and charcoal-green/copper dark themes.
- Thin rules, clear actions, readable data and visible demo labels.

## Colors

`client/src/travel.css` owns runtime tokens. Frontmatter records light primitives under their runtime role names; `dark-*` records the matching `[data-theme="dark"]` overrides. Runtime components consume the unprefixed CSS variables in both themes.

Primary action is rust in light mode and copper in dark mode. Action foreground uses paper in light and charcoal in dark. UI tokens remain canonical in travel.css (ownership model B); this document mirrors their exact values. System preference and explicit locally saved theme choice remain intact. Confirmed status uses success; pending status uses warning, always with a text label/icon; destructive actions and errors use danger.

**The Day Identity Rule.** Thirty planner days use stable, zero-based day colours from `client/src/geo/presentation.js`: hue is `round((index * 137.508 + 212) % 360)`, with light-theme saturation/lightness of 72%/26% and dark-theme 78%/72%. Tabs, stop badges, markers, legends and route features share this identity. Always retain explicit day and stop labels; colour alone is insufficient.

Detailed geographic styles are owned by `client/src/geo/map-style.js`: both themes adapt named land, water, vegetation, building, boundary, road and label roles. Light water is `#b9d1cf`, dark water `#294749`; label/halo pairs are `#354239`/`#fffdf7` and `#eee9dd`/`#1d2421`. Do not dim the entire map canvas. Atlas-globe materials are owned by Globe.jsx: aqua water, parchment land, rust/copper selection, fine boundaries, resting/hovered/selected polygon heights of 0.001/0.025/0.055 globe radii with 300ms transitions (immediate under reduced motion), contrasting side faces and no atmosphere halo.

## Typography

Allura is reserved for the GlobeTrek wordmark (48px, 42px on mobile, 52px on the desktop discovery rail). Cormorant Garamond is used for large page titles and editorial h2 headings. Source Sans 3 owns forms, navigation, product/list names, planner entries, money and clocks. All fonts are self-hosted with OFL notices; no font CDN runs in the browser. The two new fonts retain Latin/extended Latin characters and punctuation, subset with fontTools from the Google Fonts originals. Body remains 16px/1.6 with a 72ch maximum; utility labels retain their existing scale. Fallbacks are cursive for the wordmark, Georgia for editorial headings and sans-serif for controls. Numerals use tabular figures where appropriate. Page titles use up to 72px/500 (42px mobile); Explore uses up to 76px/500 (44px mobile). Editorial h2 is 34px/500; operational product/list names retain their readable sans-serif sizing.

## Layout

The ordinary wrapper is at most 1440px with 40px side padding, expanding to 1520px from 1600px. Discovery has its own shell at 1100px and wider: left rail reserves 312px, the right panel plus gap/padding reserves the same 312px, so the globe remains centred in the viewport. Below 1100px navigation compacts and the globe precedes the searchable country collection in document flow. Mobile secondary navigation uses a native details disclosure. The theme toggle has a reserved 44px top-right header target, independent of the compact wrapping disclaimer, and scrolls with the document. Country routes use the full-width workspace with 24px side padding (16px below 1100px); other routes retain the ordinary shared header and natural-height layouts. Country-list entries are real destination links. Globe hover temporarily raises a country; a single click keeps it raised and updates the preview. Double click, a country link or Explore action starts a coordinated 600ms approach and a 200ms country reveal; reduced motion and rendering failure bypass it. All geographic choices have list equivalents.

The country workspace owns Explore and Plan modes and URL-backed Model, Detailed map and List presentations. Model is the default on every viewport; only the active geographic engine mounts. A compact country introduction replaces the former photograph banner. Desktop Explore uses a 240px context column, flexible model and 330px collection. Embedded Plan uses a 250px day rail, flexible model and 330px collection. Below 1100px the context compacts and the planner collection moves beneath its rail/model; below 760px the model precedes the collection/day panel in document flow. Dates and party are edited inline. Switching modes preserves the mounted editor and shared camera state. City groups and names sort alphabetically; multi-city products appear once under Multi-city itineraries with covered cities.

Desktop country collections use bounded 68vh scrolling; embedded planner rails/collections use 72vh. Mobile and List presentation return to document scrolling. Discrete wheel momentum follows the shared useSoftScroll owner; map gestures and fine trackpad/touch input remain native. Deliberate reveals respect reduced motion. Relief controls and regional shortcuts sit outside the canvas so they cannot cover pins. Camera framing adapts to aspect ratio while preserving orientation and deliberate zoom. Insets retain readable labels and explicitly do not represent distance.

## Elevation & Depth

Country relief is the geographic extension of the living atlas. `geo/CountryModel.jsx` owns the local mesh and camera; `workspace.css` owns its surrounding controls and layout. The canvas uses real sampled elevation and theme-adapted materials, not decorative terrain. Source metadata and provider attribution accompany the model; regional insets keep their own scale and explicit labels. Preserve the declared height exaggeration and never imply that inset spacing measures distance.

Borders and tonal layering establish ordinary surfaces. Dialogs use `--shadow`: `0 14px 50px #26312e26` in light and `0 14px 50px #0006` in dark, with a `#151c18b3` overlay. The atlas globe has restrained geographic shading without an atmospheric halo; the flat-surface rule applies to UI containers. No ornamental UI gradients or card stacks.

## Shapes

Controls use 6px corners, stop rows 8px, panels/maps/photos/dialogs 12px and small status badges 4px. Thin 1px borders define fields and containers. Circular numbered markers identify actual itinerary order. Lucide is the icon source.

## Components

Runtime owners: ui.jsx Field/DateField/Modal/ErrorMessage/Status; travel.css theme and scrollbar tokens. See UX-CONTRACT.md for interaction behavior.

- **Buttons:** primary is action/on-action, minimum height 48px; hover uses `brightness(0.93)`. Secondary is transparent with a line border and soft hover fill. Disabled buttons use 0.55 opacity and a not-allowed cursor. Icon controls normally have 44px minimum dimensions; compact stop controls have their own overrides.
- **Fields:** persistent 14px/600 labels, surface fill, line border, 46px minimum height and linked danger-colored errors. DateField is an authored English calendar with ISO typing. Simple finite selects accept OS popups. Product forms disable native validation bubbles.
- **Panels and dialogs:** bordered surface panels use 28px padding (22px on mobile). Radix dialogs trap and restore focus, use a 460px width constrained to the viewport, and scroll within 90dvh.
- **Navigation and selection:** active navigation is underlined in action color. Category tabs use an action underline; selected days use action/on-action fill; map/list switches use ink/canvas fill. Text and state attributes accompany color.
- **Globe and geography:** single-country selection updates its dossier and highlight; double-click and real country links enter the country workspace through the approach transition. Local relief uses sampled geographic elevation, eight-times declared height exaggeration and labelled regional insets. Planner pins correspond to numbered stop occurrences; routes are separate per day. Cross-inset connections are described rather than drawn as misleading distances. Detailed maps remain an alternative. Preserve attribution and a usable list when rendering fails.
- **Connected selection:** list rows, markers and previews share selection; filtering out the selected place clears it. Closing a preview retains selection. Every Show in list activation explicitly reveals the highlighted entry, including when it was already selected. Nearby or overlapping markers expose each underlying place or stop occurrence through a choice list. Fit places restores the complete visible collection.
- **Place previews:** shared photo, summary and actions live in `place-ui.jsx`. Desktop uses a non-modal map card; below 760px the existing Radix dialog owner becomes a bottom sheet, up to 82dvh, with safe-area padding. Escape dismissal restores a visible initiating or selected control. Show in list closes the sheet and changes view before revealing the entry. Preview additions follow the ordinary stop, lodging and date limits.
- **Day routes:** Selected day and All days scopes preserve the draft. Selection identifies stop occurrences, including repeated visits to the same place. Route features group by day and never connect separate days; retain explicit day/stop numbers alongside the stable day colours.
- **Duration and media:** attractions say Suggested visit and explain the planning estimate; tours say Tour duration with separate destination-local schedules. Use local attributed photographs and keep source, title, creator, license and modification notes accessible. Fictional products explicitly use representative destination imagery. Image failure preserves readable content and actions. The Nea Chora Beach image is CC BY-NC-SA 2.0 for this noncommercial demo; preserve that restriction and the record in `client/public/destinations/README.md`.

Saved journey rows include their country's credited destination photo at 180px high. Reservation headings pair the summary with a country photo capped at 420px wide and 220px high, stacking at 180px high on mobile. Place previews use an auto-height cover crop within their bounded frame, without grey letterboxing. Page navigation and deliberate list scrolling are smooth, with reduced-motion overrides; native wheel behavior remains unchanged.

The subsequent user-approved momentum refinement supersedes the native-wheel sentence above: discrete vertical wheel steps ease toward a bounded target with an 85ms exponential time constant and an approximately 400ms visible tail. Reverse input resets queued travel. Touch and fine trackpad deltas stay native; controls, maps and reduced motion bypass the effect. No page wrapper transforms or animation dependency are introduced.

- **Reservation summaries:** item rows and totals are separated by rules, with explicit demo payment, dated INR estimate and whole-reservation cancellation language.
- **Country workspace controls:** Explore and Build your trip select modes; Model, Detailed map and List select presentations. There is no Split presentation. Mode buttons use action/on-action when pressed, while presentation switches retain the existing ink/canvas treatment. Relief control groups sit outside the canvas; the relief frame uses the established stop corner size. These compact controls are distinct from ordinary primary actions.
- **Price labels and estimates:** `pricing.jsx` supplies shared name-adjacent unit labels and selection estimates. Keep the room/night or per-traveler basis visible, distinguish included demo service fees from unit rates, and retain assumptions, missing-selection explanations and dated INR references. Attractions say tickets are not sold here; templates say copying is free with bookings extra. Loading and failure copy remain visible beside available unit rates, with shared retry actions. Planning totals remain operational sans-serif text, with the final server quote and availability explained separately.

## Do's and Don'ts

Reservation list rows prioritize destination and booked dates, with status/reference above, cities and selection counts below, and the native-currency total aligned opposite on desktop. Narrow layouts stack the total and action. A native disclosure reveals the immutable booked items; creation/confirmation/cancellation timestamps and explicit references distinguish otherwise identical selections. Status uses text and icons as well as colour.

- **Do** preserve visible focus: a 3px action outline with 3px offset for the controls covered by the stylesheet. Keep themed visible scrollbars and text alongside color.
- **Do** respect reduced motion: country selection uses immediate orientation; CSS animations and transitions reduce to 0.01ms. Keep drag's move-button equivalents and map/list selection consistent.
- **Do** retain source links for real attractions and approximate planning coordinates. Keep fictional stays, tours, inventory, fees and payments labeled demo.
- **Do** credit destination photographs by author, source and license; retain dated informational INR estimates.
- **Don't** reintroduce ocean/cobalt brand colours, decorative script in task data, or the old split marketing hero. Ivory and editorial typography are explicitly approved for this atlas redesign.
- **Don't** add decorative globe auto-rotation, invented ratings or operator partnerships, or represent straight map connections as navigation.
- **Don't** claim destination photographs depict fictional properties, or show an invalidated quote as current.

## Interactive globe refinement

The camera fits the raised outer sphere to 90% of the smaller available dimension using the vertical field of view and aspect ratio. Resizing changes distance while preserving orientation. Supported country names use local HTML labels projected into the globe host, with selected then hovered priority, collision handling and rear-surface suppression. Labels ignore pointer events so polygons and dragging remain operable. Projection uses the current camera matrices; camera changes schedule DOM position updates through requestAnimationFrame rather than putting continuous coordinates in React state.

Navigation and textual actions share a soft-background pseudo-element that translates 8px and fades over 200ms. Text stays still. Keyboard focus uses the same surface and a visible outline; reduced motion removes the transition. Plain reading text does not animate. Source and attribution links retain persistent underlines.
