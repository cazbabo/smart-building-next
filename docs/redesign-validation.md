# Architectural showroom redesign — 7 September 2026

## Scope
Replaced the full-screen overlapping composition with a separate architectural stage, readable Thai narrative, bottom system navigation, and a contained detail panel. Rebuilt the terraced office tower and created six equipment-based interior/rooftop scenes in Three.js. Hotspots open relevant detail stages. Explicit explore controls support orbit and zoom; the guided tour stops after seven 18-second chapters. Removed unsupported savings claims from the primary business-outcome copy.

## Verification
- Vite production build passed. Three.js vendor chunk remains above Vite's 500 kB warning threshold; compressed vendor size approximately 135 kB.
- All seven model scenes instantiate with finite transforms. Overview: 13,108 triangles; solution scenes: 1,672–6,652 triangles.
- Browser at 1363 × 936: all seven chapters switch correctly, all 28 detail titles load, details open and close, and an equipment hotspot opens its matching stage.
- Visually inspected overview, HVAC detail, and chiller-plant scenes. Added label collision avoidance after inspecting the plant scene.
- Browser WebGL is disabled. Screenshots exercise the actual Three.js geometry through an SVG renderer, with simplified lighting. The full WebGL material, shadow quality, and GPU performance have NOT been visually verified in this environment.
- Basic rendering is explicitly labeled in the interface and avoids the former permanent loading screen when WebGL is unavailable.

## Boundaries
This is an interactive presentation prototype with illustrative equipment geometry and demonstration data. Stage copy includes simulated behaviors; it is not a live BMS connection or a physics simulation. Team authentication, saved wizard projects, draft/publish and revocable customer sharing are not implemented by this visual redesign. Vercel plugin access to the configured team remains forbidden; GitHub's existing Vercel integration handles deployment.

## Command Center addition
Added an eighth chapter with a 5,212-triangle operations room, six-panel video wall and operator consoles. Three local demonstration incidents share one state store across the incident desk, video-wall status colors, counters and related system telemetry. Assignment is required before simulated resolution; duplicate transitions are guarded; reset restores all three incidents. These transitions and geometry passed local checks. No messages or real equipment commands are sent. Browser verified on 8 September 2026: all three incidents can be selected, assigned and resolved; the open count decreases 3 → 2 → 1 → 0; reset restores three open incidents. Resolving the chiller propagates the 6.2°C value to the Plant chapter. All four Command Center explanation steps open and close correctly.

## Lime theme and final rendering pass
The supplied 86 × 48 PNG is uniformly RGB (176, 210, 51), #B0D233. Applied this brand accent to primary buttons, headings, selected navigation, focus indicators and hotspot accents, retaining separate alert severity colors. Added chapter hash links, including #command. SVG fallback floor/wall/video-wall ordering is explicit, and static fallback scenes render on demand to keep controls responsive. Full WebGL visual validation remains unavailable in the review browser.
