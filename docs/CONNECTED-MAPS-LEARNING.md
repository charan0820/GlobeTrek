# Connected maps and place previews

## One selection, several representations

What: the page owns selection and passes it to the list, map and preview. Why: separate selection state in each component drifts out of sync. Where: discovery.jsx, planner.jsx and geo/Map.jsx. Verification: map presentation tests check identity and grouping; browser checks exercise both directions of selection. Interview explanation: shared state is lifted to the nearest common owner; showing information does not mutate the saved trip.

## Place identity versus stop identity

What: a place identifies a destination; a stop occurrence identifies one visit on one trip day. Why: the same attraction may appear on two days, so a place ID alone cannot identify the selected planner row. Where: geo/presentation.js tripPoints and markerId. Verification: a regression test selects two different occurrence IDs for the same place. Interview explanation: choose keys according to the entity represented, not whichever ID is easiest to access.

## Routes, days and accessible colours

What: route features are grouped by day, with stable day colours and explicit day/stop numbers. Why: flattening all stops into one line invents a connection between days; colour alone excludes people who cannot distinguish it. Where: routeFeatures and dayColor. Verification: tests assert separate route coordinates and thirty distinct stable day colours. Interview explanation: presentation must preserve the domain's grouping, and semantic labels provide information independently of colour.

## Scroll and map ownership

What: desktop lists scroll within their own bounded panels; mobile lists use normal page scrolling. Deliberate reveals and pans respect reduced motion. Why: scrolling the entire page to synchronize a desktop row disorients the user, while wheel interception makes ordinary browsing harder. Where: revealInContainer, shared map and travel.css. Verification: browser interaction checks cover view switches and mobile list reveal. Interview explanation: identify the actual scroll owner before moving content, and reserve animation for actions that explain a state change.

## Geographic overlap and layout changes

What: nearby markers offer a list of their underlying places or day occurrences. ResizeObserver resizes the map when its container changes. Why: overlapping buttons can hide valid destinations, and a map's canvas dimensions do not automatically describe a newly visible layout. Where: geo/Map.jsx. Verification: a browser check caught covered markers and the implementation was corrected to provide grouped choices. Interview explanation: a successful render is insufficient; every underlying record still needs an operable path.

## Build-time media and provenance

What: photographs are imported once, reviewed, resized and served locally with author, source and license metadata. Why: runtime image search is unpredictable, adds provider requests and can show the wrong subject. Where: import-place-images.mjs, prepare-place-images.py and the versioned media manifest. Verification: contact-sheet subject review and catalog assertions validate coverage, attribution and files. Interview explanation: content quality is part of correctness; an automatically retrieved image is a candidate, not proof of a match.

## Non-modal previews and mobile sheets

What: desktop previews allow continued map use; mobile sheets use the existing accessible dialog primitive. Why: mobile needs room for photographs and actions while desktop can retain context. Where: place-ui.jsx and ui.jsx. Verification: browser checks exercise Escape, focus restoration, preview actions and draft persistence. Interview explanation: the same content can use different presentation containers while sharing its data and behavior contract.

## Interview questions

1. Why does a repeated attraction need a different planner key on each day?
2. How would separate map and list selection state become inconsistent?
3. Why must a route be grouped by day before generating GeoJSON?
4. How do you keep nearby markers accessible without inventing different coordinates?
5. Why does a hidden map need resizing when its layout becomes visible?
6. When should smooth scrolling be disabled, and which element should scroll?
7. Why import photographs at build time instead of searching on every page load?
8. How do you verify that an image depicts the requested place and can be redistributed?

These notes document implementation concepts. The student still needs to explain the new code and tradeoffs in their own words.
