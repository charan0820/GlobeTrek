# Momentum scrolling

The user explicitly requested gradual deceleration after mouse-wheel input. This follow-up supersedes the earlier blanket rule against intercepting wheel events, while preserving native touch and fine trackpad movement.

## What it does and why

Discrete vertical wheel steps update a desired scroll position. A requestAnimationFrame loop approaches that position quickly at first, then moves smaller distances until it stops. This creates a gentle stopping motion without changing the document layout or replacing browser scroll containers.

## Where and how

client/src/useSoftScroll.js owns the behavior; the application shell mounts it per route. Each frame uses 1 - exp(-elapsed / 85) as its interpolation factor, so the damping responds to elapsed time rather than assuming a fixed frame rate. Queued travel is bounded; reversing the wheel discards the old target. Continuous positions are kept outside React state to avoid rerendering the interface every frame.

## Input and accessibility boundaries

The nearest scrollable ancestor receives movement, preserving bounded result lists and dialog scrolling. Contained lists do not chain into the page at their edges. Fine pixel deltas, touch, keyboard input, horizontal gestures, browser zoom, form controls and map gestures keep their native behavior. Pointer/key input, route changes, visibility changes and reduced-motion preferences cancel the pending animation. The small-delta rule is an input heuristic, not a claim to identify hardware perfectly.

## How it was tested

The real-browser check records frame positions after a wheel step and confirms a measurable decelerating tail. It verifies reversal, nested scrolling without page movement, contained boundaries, fine-delta/zoom/horizontal pass-through, reduced motion and a locked modal background. Lint and the client build also pass. No new dependency or external service was added.

## Interview explanation

Smooth navigation and wheel momentum are different: CSS scroll-behavior affects deliberate scroll operations, while this feature eases discrete wheel input. The engineering work is preserving cancellation, scroll ownership and accessibility rather than adding animation everywhere.

Questions: Why use elapsed-time damping instead of a fixed percentage per frame? Why keep frame values outside React state? How do you avoid a runaway scroll queue? What should immediately cancel the animation?
