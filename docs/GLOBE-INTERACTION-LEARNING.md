# Interactive geography and camera projection

The current discovery contract replaces the earlier flat-country and preview-button behaviour. Country-list links open destination pages. Globe hover lifts a shape temporarily; clicking selects it and updates the preview. The explicit preview link opens its page.

## State and geographic hit testing

What: selected and hovered country identifiers are separate state. Selected height takes precedence, so leaving a hover never clears a deliberate choice. Polygon heights use fractions of globe radius rather than screen pixels.

Why: visual feedback should describe the user's action consistently across different screen sizes. Native links provide keyboard navigation and ordinary new-tab behaviour without JavaScript click emulation.

Where: Globe.jsx owns selection feedback and pointer handling; globe-layout.js owns height, fit and collision calculations. A fast-tap fallback checks the sphere's geographic hit against supported Natural Earth polygons only when the renderer's normal click callback was missed. Movement beyond five pixels or pointer cancellation prevents that fallback from turning a drag into selection. Polygon holes and island groups are respected.

How tested: unit cases cover height precedence, polygon holes, islands and open-ocean rejection; real-browser checks exercise hover entry/exit, polygon clicks, touch, oblique viewing and theme changes. Existing booking tests remain separate from these interaction checks.

Interview explanation: "I modelled temporary hover independently from persistent selection. I also used links for navigation and kept canvas interaction as an enhancement, so exploration remains usable without WebGL."

## Fitting a sphere and projecting labels

What: camera distance follows the sphere's tangent angle, camera field of view and viewport aspect ratio. The raised outer silhouette fits approximately ninety percent of the smaller available dimension. Country names project from geographic coordinates into HTML positions above the globe.

Why: a fixed camera distance clips a globe in narrow or short containers. World coordinates must pass through the current camera matrices before they become reliable screen positions. OrbitControls can emit a change before the renderer updates those matrices.

Where: fitGlobeAltitude uses elementary trigonometry; the projection effect updates camera matrices and schedules label position changes through requestAnimationFrame. Mutable DOM positions avoid React re-rendering for every camera frame. Rear-facing labels are hidden; collision placement prioritises selected and hovered names.

How tested: unit cases verify the projected raised silhouette across portrait and landscape viewports and label priority under collisions. Browser checks measure responsive layout, exercise camera movement and verify that labels do not obstruct polygon input. Reduced motion removes hover and camera transitions.

Interview explanation: "I separated layout sizing from camera projection. Fitting the raised sphere prevents clipping, while matrix updates keep labels and pointer targets aligned with the rendered geography."
