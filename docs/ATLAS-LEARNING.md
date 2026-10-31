# Atlas identity and discovery layout

## Semantic tokens and typography roles

What: a shared palette assigns colours to purposes such as action, ink, surface and danger. Typography also has roles: Allura for the wordmark, Cormorant Garamond for editorial headings and Source Sans 3 for task data.

Why: changing a brand should not require editing every component or weaken form readability. Dark mode changes the token values while keeping each component's meaning.

Where: travel.css owns runtime tokens; main.jsx owns the shell variant; DESIGN.md mirrors those accepted choices. Fonts and their notices are local public assets.

Testing: the atlas browser check exercises both themes and multiple widths; accessibility checks verify contrast and semantic controls. Font requests are deliberately failed to verify usable fallback navigation.

Interview explanation: "I separated presentation roles from business behaviour. The redesign changed shared tokens and the discovery shell while the booking services and immutable reservation snapshots stayed unchanged."

## Centring an interactive canvas

What: equal reserved widths on either side of the globe keep its midpoint aligned with the viewport. ResizeObserver supplies the actual host dimensions to the geographic renderer.

Why: placing a globe in a flexible centre column does not guarantee viewport centring if the side panels have different widths. A CSS-sized canvas must also update its rendering dimensions after responsive changes.

Where: atlas discovery layout in travel.css and the existing Globe.jsx interface. Theme changes update materials rather than remounting the renderer, preserving camera and selection.

Testing: browser geometry checks compare globe midpoint with half the viewport width and canvas size with its container, alongside screenshot review. Country list selection remains available when rendering fails.

Interview explanation: "I treat the globe as an optional interactive enhancement. Semantic country buttons and explicit navigation links provide the same discovery path without relying on WebGL, colour or pointer input."
