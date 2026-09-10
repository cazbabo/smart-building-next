# City Intelligence — civic city and long-form story

Route: `/city-intelligence`. English-only presentation for enterprise customers.

## Current draft

This revision follows the civic-city reference and the three-phase Data → IoT → AI reference. It replaces camera-driven, pinned chapter swapping with eight permanent sections in normal document flow. A stable city view remains beside the story on desktop. The model only rotates or focuses after an explicit Explore or district action.

This revision has been built and checked locally. Publication was blocked by automatic approval review reporting a usage limit. It is not a verified live deployment.

## Presentation

1. Different places, one connected city.
2. Disconnected systems: a water warning and an exposed road.
3. Phase 1 — consolidate existing data, establish locations and ownership.
4. Phase 2 — fill information gaps with IoT observations.
5. Flood example — detect, understand and coordinate.
6. Apply the shared foundation across public services.
7. Phase 3 — compare current conditions and an illustrative forecast; people review recommendations.
8. A phased adoption roadmap.

All figures are mock observations. The flood example uses a 1.40 m illustrative threshold, a 1.60 m observation and an illustrative 1.90 m forecast. There is no actual forecasting service, live connection or device actuation.

## Model and interaction

- `civic-model.js`: procedural Three.js civic administration, hospital, school, park, factory, renewable energy, transit terminal, flood gate, housing and command center. Includes windows, roofs, columns, dome, rooftop equipment, roads, crossings, vehicles, trees, solar panels, turbines and operator desks.
- `civic-scene.js`: orthographic camera, WebGL materials and shadows, render on demand. Camera stays independent of scroll position. ResizeObserver changes the framebuffer only when the canvas dimensions change.
- `app.js`: permanent story sections. One active chapter determines the relevant data/sensor/risk layers; scrolling does not remount the city, fade materials or move the camera.
- Explicit Explore allows limited drag rotation and building selection. District details explain data source, platform behavior and the team's action. Reset and Escape restore the overview.
- Three HTML labels project from model coordinates. They do not intercept mouse input.
- Mobile and unavailable WebGL use an explicitly labeled static poster with the complete readable story. They do not pretend the poster is an interactive model.
- Reduced-motion preferences disable smooth anchor scrolling. Native dialog, skip link, focus styles and fullscreen feedback are provided.

## Validation and limits

- Vite production build passes for all three existing page entries.
- Geometry checks pass: 10 matching district/detail IDs, 961 meshes and 32,810 triangles; finite transforms and vertices.
- All eight chapter states checked, including flood/AI risk visibility and restoration to overview.
- Offline Three.js SVG render inspected and converted to the fallback poster. This vector render does not reproduce WebGL shadows and can have painter-order artifacts; it is not browser verification.
- New scrolling, dialog behavior and WebGL appearance still require browser/device verification. The available remote browser could not reach the local dev server, and publication is blocked.
- The model is a procedural interpretation of the reference, not an exact reconstruction or photorealistic asset pack.

The previous city scene modules remain in the repository but are not imported by this page. Existing Smart Building and AIS pages retain their entry points. Unpublished `/smart-city` draft files are outside this change.
