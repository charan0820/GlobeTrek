---
name: GlobeTrek
description: A warm travel journal for a hotel reservation demo
colors:
  action: "#245746"
  ink: "#183b32"
  rust: "#a4462e"
  paper: "#f6f4ed"
  surface: "#ffffff"
  muted: "#526259"
  line: "#d8ddd2"
typography:
  display:
    fontFamily: "Georgia, 'Times New Roman', serif"
    fontSize: "clamp(38px, 5.8vw, 76px)"
    fontWeight: 400
    lineHeight: 1.06
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Georgia, 'Times New Roman', serif"
    fontSize: "32px"
    fontWeight: 400
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "16px"
    lineHeight: 1.6
  label:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "13px"
    fontWeight: 600
rounded:
  field: "6px"
  card: "14px"
spacing:
  compact: "8px"
  control: "12px"
  group: "16px"
  section: "24px"
  roomy: "32px"
  wide: "48px"
components:
  button-primary:
    backgroundColor: "{colors.action}"
    textColor: "{colors.surface}"
    rounded: "{rounded.field}"
    padding: "13px 19px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
---

# GlobeTrek design

## Overview

**Creative North Star: "A place to pause"**

A travel journal applied to a working hotel reservation application. Warm paper surrounds forest-green controls and local destination typography. The catalog leads to an availability form and explicit demo reservation; decorative material does not imply that fictional properties are real.

**Key Characteristics:**

- Editorial serif headlines with clear sans-serif controls.
- Quiet surfaces separated by thin borders.
- Local destination artwork and visible demo labels.

## Colors

Action green identifies primary buttons; ink carries text and the demo strip. Rust marks emphasis, active navigation, and cancellation. Paper surrounds white cards and forms. Muted text and lines group secondary information without competing with the task.

## Typography

The shipped implementation uses Georgia for headings and Arial/Helvetica for body text and controls. Headings are balanced; descriptions have a 65ch maximum measure. Small metadata appears on catalog cards and the demo strip. These observed system fonts are implementation fallbacks rather than a custom brand font commitment for future surfaces.

## Layout

The wrapper is 1248px including 32px horizontal padding. At 1600px and above it grows to 1360px. The catalog uses three columns, two below 1000px, and one below 680px. Mobile wrapper padding is 20px. The detail page has a sticky booking panel on desktop; on mobile the panel follows the artwork and precedes descriptive sections. Related inputs use two columns.

## Elevation & Depth

The system is flat. White surfaces, tonal destination art, and thin borders establish grouping; cards do not use shadows. Focus uses a rust outline with an offset rather than a glow.

## Shapes

Forms and buttons use restrained field corners; catalog cards and booking panels use broader card corners. Artwork is rectangular. The home collection artwork has one asymmetric rounded corner. Small status tags use 4px corners.

## Components

Buttons use a 46px minimum height, white text, and a darker green hover. Secondary buttons use a green outline; cancellation uses rust. Inputs have persistent labels, white surfaces, a thin line border, and visible keyboard focus. Catalog cards show destination, name, amenities, nightly price, and a View stay link. Status tags distinguish confirmed and cancelled bookings with text as well as color. The navigation keeps Explore stays, My bookings, and login/logout visible at mobile widths.

Validation and network errors appear inline with a readable message. Loading, empty, disabled, available, sold-out, confirmed, and cancelled states are implemented. Confirmation feedback is scoped to an actual confirmed booking. All currency uses INR and date labels use UTC.

## Do's and Don'ts

- Do preserve persistent form labels, visible focus, and explicit loading/error states.
- Do identify fictional stays and simulated payments.
- Do respect reduced-motion preferences; content must remain visible without animation.
- Don't present destination artwork as a hotel photograph.
- Don't display a previous quote as current after its input changes.
