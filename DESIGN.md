---
name: GlobeTrek
description: Globe-led travel discovery and a practical itinerary workspace
colors:
  action: "#2459d3"
  ink: "#102e3a"
  canvas: "#f3f7f8"
  surface: "#ffffff"
  muted: "#526772"
  line: "#d5e0e5"
  on-action: "#fff"
  soft: "#e7eef3"
  danger: "#a32936"
  dark-canvas: "#0b1720"
  dark-surface: "#122a38"
  dark-ink: "#edf5f7"
  dark-muted: "#a7bac6"
  dark-action: "#8fb3ff"
  dark-on-action: "#0b1720"
  dark-line: "#314c5a"
  dark-soft: "#1c3545"
  dark-danger: "#ffabb1"
typography:
  display:
    fontFamily: "Sora, sans-serif"
    fontSize: "clamp(32px, 4.5vw, 58px)"
    fontWeight: 400
    lineHeight: 1.16
    letterSpacing: "-0.03em"
  body:
    fontFamily: "'Source Sans 3', sans-serif"
  paragraph:
    fontFamily: "'Source Sans 3', sans-serif"
    lineHeight: 1.6
  discovery-display:
    fontFamily: "Sora, sans-serif"
    fontSize: "clamp(36px, 4.4vw, 64px)"
    fontWeight: 400
    lineHeight: 1.16
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Sora, sans-serif"
    fontSize: "25px"
    fontWeight: 400
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

**Creative North Star: "Cartographic explorer"** — the explicitly approved replacement identity. Ocean tones, cobalt actions and clear sans-serif typography support curiosity followed by practical planning. The former forest/cream hotel journal is superseded.

Discovery gives the globe room to lead; planner and reservation surfaces use calmer lists, numbered stops and explicit summaries. The six local review screenshots show this direction in light desktop discovery, dark mobile discovery, country exploration, desktop/mobile planning and a reservation summary.

**Key Characteristics:**

- Geography as the discovery focal point, with a country-list equivalent.
- Cool neutral surfaces, ocean ink and theme-aware cobalt actions.
- Clear task controls, thin borders and visible demo-data labels.

## Colors

`client/src/travel.css` owns runtime tokens. Frontmatter records light primitives under their runtime role names; `dark-*` records the matching `[data-theme="dark"]` overrides. Runtime components consume the unprefixed CSS variables in both themes.

Primary action is cobalt in light mode and pale cobalt in dark mode. Ocean ink anchors text and the globe; canvas, surface, soft and line separate content without heavy decoration. Muted supports secondary copy; danger identifies errors and destructive actions. Action foreground is white in light and dark ocean canvas in dark. Theme follows the system until explicitly selected and saved locally.

**The Day Identity Rule.** Thirty planner days use stable, zero-based day colours from `client/src/geo/presentation.js`: hue is `round((index * 137.508 + 212) % 360)`, with light-theme saturation/lightness of 72%/26% and dark-theme 78%/72%. Tabs, stop badges, markers, legends and route features share this identity. Always retain explicit day and stop labels; colour alone is insufficient.

The dark geographic palette is owned by `client/src/geo/map-style.js`, separately from UI tokens: background `#233b49`, water fill `#122c40`, vegetation `#2e514c`, buildings `#3b5360`, remaining fills `#293f4c`, fill outlines `#58717d`, water lines `#56879b`, boundaries `#a7bac6`, major roads `#c4ad7a`, other lines `#718c9a`, labels `#edf5f7` and their 1.5px halo `#172b38`. Adapt geographic layer roles instead of dimming the complete map canvas or controls. These observed roles are not a tonal ramp.

## Typography

Sora headings; Source Sans 3 body and controls. Both self-hosted via Fontsource, Latin subsets. Body inherits the browser baseline (normally 16px); paragraphs use 1.6 line height and a 72ch maximum. Common labels are 14px, navigation 15px, and primary buttons 15px/600. The general h1 uses the display token; discovery uses its own display token, reaching 64px. Mobile discovery uses `clamp(35px, 7vw, 52px)`. No decorative monospace. Price summaries and hold clocks use tabular numerals.

## Layout

The main wrapper is at most 1440px with 40px side padding, expanding to 1520px from 1600px. Side padding becomes 28px at 1100px and 20px at 760px. Discovery uses a 43%/57% copy/globe split, then stacks at 760px. Country exploration pairs a place list with a sticky map. Desktop planner uses a 340–420px day rail beside its map (350px at the intermediate breakpoint). Mobile uses a day-list-first layout and an explicit Map switch; day tabs scroll horizontally. All geographic choices have list equivalents. The recurring spacing steps are in frontmatter; larger sections also use 64px.

Country exploration offers URL-backed List, Map and Split, defaulting to Split on desktop. Below 760px, Split renders as List while preserving the URL preference. City groups and their place names sort alphabetically; multi-city products appear once under Multi-city itineraries with covered cities. Keep the country heading photograph compact: up to 420px wide and 240px high on desktop, 180px high on mobile.

Desktop result lists and planner day rails own bounded scrolling (`max-height: min(760px, 78dvh)`) with stable scrollbar space; mobile returns to document scrolling. Keep ordinary wheel behavior native. Deliberate reveals and pans respect reduced motion. Map navigation sits at the top left below Fit places, clear of the right-hand preview.

## Elevation & Depth

Borders and tonal layering establish ordinary surfaces. Dialogs use `--shadow`: `0 14px 50px #102e3a26` in light and `0 14px 50px #0006` in dark, with a `#06162399` overlay. The rendered globe has dimensional geographic shading and an atmospheric halo; the flat-surface rule applies to UI containers. No ornamental UI gradients or card stacks.

## Shapes

Controls use 6px corners, stop rows 8px, panels/maps/photos/dialogs 12px and small status badges 4px. Thin 1px borders define fields and containers. Circular numbered markers identify actual itinerary order. Lucide is the icon source.

## Components

Runtime owners: ui.jsx Field/DateField/Modal/ErrorMessage/Status; travel.css theme and scrollbar tokens. See UX-CONTRACT.md for interaction behavior.

- **Buttons:** primary is action/on-action, minimum height 48px; hover uses `brightness(0.93)`. Secondary is transparent with a line border and soft hover fill. Disabled buttons use 0.55 opacity and a not-allowed cursor. Icon controls normally have 44px minimum dimensions; compact stop controls have their own overrides.
- **Fields:** persistent 14px/600 labels, surface fill, line border, 46px minimum height and linked danger-colored errors. DateField is an authored English calendar with ISO typing. Simple finite selects accept OS popups. Product forms disable native validation bubbles.
- **Panels and dialogs:** bordered surface panels use 28px padding (22px on mobile). Radix dialogs trap and restore focus, use a 460px width constrained to the viewport, and scroll within 90dvh.
- **Navigation and selection:** active navigation is underlined in action color. Category tabs use an action underline; selected days use action/on-action fill; map/list switches use ink/canvas fill. Text and state attributes accompany color.
- **Globe and maps:** selected-country geography links to its dossier and list choice. Planner markers correspond to numbered stops; straight connections are labeled as planning connections, not transport navigation. Preserve attribution and a usable list when rendering fails.
- **Connected selection:** list rows, markers and previews share selection; filtering out the selected place clears it. Closing a preview retains selection. Every Show in list activation explicitly reveals the highlighted entry, including when it was already selected. Nearby or overlapping markers expose each underlying place or stop occurrence through a choice list. Fit places restores the complete visible collection.
- **Place previews:** shared photo, summary and actions live in `place-ui.jsx`. Desktop uses a non-modal map card; below 760px the existing Radix dialog owner becomes a bottom sheet, up to 82dvh, with safe-area padding. Escape dismissal restores a visible initiating or selected control. Show in list closes the sheet and changes view before revealing the entry. Preview additions follow the ordinary stop, lodging and date limits.
- **Day routes:** Selected day and All days scopes preserve the draft. Selection identifies stop occurrences, including repeated visits to the same place. Route features group by day and never connect separate days; retain explicit day/stop numbers alongside the stable day colours.
- **Duration and media:** attractions say Suggested visit and explain the planning estimate; tours say Tour duration with separate destination-local schedules. Use local attributed photographs and keep source, title, creator, license and modification notes accessible. Fictional products explicitly use representative destination imagery. Image failure preserves readable content and actions. The Nea Chora Beach image is CC BY-NC-SA 2.0 for this noncommercial demo; preserve that restriction and the record in `client/public/destinations/README.md`.

Saved journey rows include their country's credited destination photo at 180px high. Reservation headings pair the summary with a country photo capped at 420px wide and 220px high, stacking at 180px high on mobile. Place previews use an auto-height cover crop within their bounded frame, without grey letterboxing. Page navigation and deliberate list scrolling are smooth, with reduced-motion overrides; native wheel behavior remains unchanged.

The subsequent user-approved momentum refinement supersedes the native-wheel sentence above: discrete vertical wheel steps ease toward a bounded target with an 85ms exponential time constant and an approximately 400ms visible tail. Reverse input resets queued travel. Touch and fine trackpad deltas stay native; controls, maps and reduced motion bypass the effect. No page wrapper transforms or animation dependency are introduced.
- **Reservation summaries:** item rows and totals are separated by rules, with explicit demo payment, dated INR estimate and whole-reservation cancellation language.

## Do's and Don'ts

Reservation list rows prioritize destination and booked dates, with status/reference above, cities and selection counts below, and the native-currency total aligned opposite on desktop. Narrow layouts stack the total and action. A native disclosure reveals the immutable booked items; creation/confirmation/cancellation timestamps and explicit references distinguish otherwise identical selections. Status uses text and icons as well as colour.

- **Do** preserve visible focus: a 3px action outline with 3px offset for the controls covered by the stylesheet. Keep themed visible scrollbars and text alongside color.
- **Do** respect reduced motion: country selection uses immediate orientation; CSS animations and transitions reduce to 0.01ms. Keep drag's move-button equivalents and map/list selection consistent.
- **Do** retain source links for real attractions and approximate planning coordinates. Keep fictional stays, tours, inventory, fees and payments labeled demo.
- **Do** credit destination photographs by author, source and license; retain dated informational INR estimates.
- **Don't** restore the superseded forest/cream and serif hotel-journal identity.
- **Don't** add decorative globe auto-rotation, invented ratings or operator partnerships, or represent straight map connections as navigation.
- **Don't** claim destination photographs depict fictional properties, or show an invalidated quote as current.
