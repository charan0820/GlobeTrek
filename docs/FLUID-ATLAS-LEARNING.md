# Fluid atlas layouts and contextual islands

## Presentation state is not domain state
What: a shell-level registry displays a route-owned contextual island. Why: the destination, trip reducer, pricing query and reservation response remain their existing sources of truth. Where: atlas-presentation.jsx and the route-level IslandContent publishers. Verification: the complete guest, sign-in, save, hold, confirmation and cancellation browser journey passed, as did all 81 automated tests. Interview explanation: I reused business state and actions instead of creating a second booking or draft model for an animated widget.

## Motion follows meaning
What: finite title, page, panel, tab and island transitions use Motion 14.9.0. Why: the movement explains entry, selection and expansion. Where: the shared presentation primitives and existing destination reveal. Verification: keyboard, reduced-motion and seven-width browser checks. Interview explanation: navigation never waits for animation completion, outgoing interactive pages are not retained, and only one geographic engine is mounted.

## Responsive panels and focus
What: wide screens reserve equal side tracks; smaller screens open panels through Radix dialogs. Why: the geography keeps its space while the collection stays accessible. Desktop collapsed content stays mounted and inert; session preferences, draft state and scroll restoration are separate concerns. Verification caught an old mobile rule hiding new setup panels and a tablet breakpoint mismatch; both were corrected. Preview dialogs close an existing collection sheet rather than layering inaccessible actions behind it.

## Accessibility during animation
What: reduced motion removes displacement and staggering; keyboard controls have labelled expansion and focus restoration. Why: animation is optional, and intermediate frames must stay readable. A browser accessibility check found that simultaneously interpolating foreground and background tab colours produced low contrast. The fix makes those colours immediate while retaining the moving tab indicator. Interview explanation: testing only the settled screenshot would miss an accessibility regression during a transition.

## Performance and honest progress
What: country-list progress measures actual scrollTop over scrollable height. It is not loading or booking progress. Geographic engines remain lazy and idle rendering remains on demand. Adding Motion at the shared shell moves its code into the initial entry bundle; this has a measurable loading cost. Verification records bundle sizes and unthrottled local timings, not mobile hardware FPS or hosted scalability. Interview explanation: I check both visual smoothness and the cost of delivering the animation code.
