# City Intelligence

English-only enterprise presentation at `/city-intelligence`.

## Visual identity

- Light canvas `#FAF8FC`, readable plum `#52205E`.
- Lime `#C7FF3D`: connected data, primary controls and operational activity.
- Orchid `#C044D9` and pink `#F05BB5`: intelligence, predictions and visual accents.
- Trees, water and glazing retain material colors so the city stays legible.
- Civic architecture uses rounded slabs, continuous glass, facade mullions, roof planting, colonnades and a dome. Hospital terraces include plant equipment. The scene includes a school, renewable district, industry, park, housing, transit and a command center.

## Architecture assets

Generic buildings and planting are Kenney models (City Kit Commercial, City Kit
Suburban, City Kit Roads and Car Kit, all CC0 1.0; sources kept in
`assets/kenney/`). `npm run assets` selects the models the scene loads, strips
the tangent attribute they carry for a normal map the material does not use, and
writes them with repainted atlases into `public/models/`.

Each kit ships one texture atlas that every model in it samples, so colour is a
property of the atlas rather than of any mesh. The build maps each atlas pixel's
hue onto a palette family and keeps its lightness, so Kenney's baked shading and
window detail survive the repaint. Lime stays out of the mapping entirely: it
marks connected data, and spending it on architecture would blur the Data
Consolidation chapter. Orchid and pink are likewise reserved for the AI chapter,
so buildings take a muted rose instead. Greens stay green for planting and cyan
stays cyan for water, since both carry meaning in the scene.

Landmarks stay procedural, because no kit contains them and each one identifies
its district: the command center and its video wall, the flood gates and water
surface, the wind turbines, the civic dome and colonnade, the hospital roof
plant, the industrial chimneys and the solar field. `block()` and `tree()` are
the only generic-architecture factories in `civic-model.js`, so swapping their
implementations replaces every generic building and tree in the city while every
landmark, platform, road and story prop keeps its exact position.

## Story and interaction

Eight real document sections: living city, fragmentation, Data Consolidation, IoT Data Integration, flood response, connected services, AI-Powered Intelligence and roadmap.

Ordinary vertical scrolling drives the active chapter and its progress. The orthographic camera remains stable while reading. Explore enables intentional rotation and district focus. The canvas is resized only when its actual dimensions change.

- Ambient animation: vehicles follow the central road loop; turbine rotors turn.
- Data phase: routes progressively connect seven districts to the command center, with moving lime/pink packets.
- IoT phase: elevated sensor markers show covered locations.
- Flood example: mock water level progresses from 1.20 to 1.60 m; the simulated water surface rises and gate panels lift. The UI and scene use the same telemetry function.
- AI phase: a pink footprint expands alongside an illustrative 1.60 to 1.90 m forecast.
- Reverse scrolling restores the corresponding scenario state.
- Pause animation stops the ambient clock while preserving scroll-based scenario selection. Reduced motion applies immediate state changes without continuous animation.
- Rendering is capped around 30 fps, stops in hidden tabs and when the canvas is outside the viewport. Geometry is created once, not per frame.

All values and device actions are illustrative. No live forecasting service, sensor connection or physical device control exists.

## Implementation

`story-state.js` is a lightweight shared telemetry function. `civic-motion.js` controls the animated meshes. `civic-model.js` builds the city; `kenney-kit.js` loads the kit and instances it; `civic-scene.js` manages camera, lighting and animation lifecycle. `app.js` owns the narrative, readout and accessible HTML controls.

`civic-motion.js` is untouched by the kit: it drives the same rotors, vehicles,
gates, water surface and overlay meshes it always has. Kit buildings are
`InstancedMesh` grouped per district rather than per city, which keeps the draw
call count near the number of distinct models and leaves Explore's click-to-focus
working, since a raycast still reaches a district's `userData.asset` walking up
from an instance. If the kit cannot be fetched, `createCivicCity()` falls back to
the procedural slabs rather than dropping the page to the static preview.

Desktop uses WebGL when available. Mobile and unavailable WebGL use a labeled static model preview with the complete text story. `npm run poster` renders that preview from the real scene at the IoT chapter with a software rasteriser (`scripts/render-poster.mjs`), sampling the same atlas pixels and material colours the browser samples, so the preview cannot drift from the scene. It has no shadows and no ambient occlusion, so it reads flatter than the GPU render.

## Verification

- Production build for all three page entries.
- `node tests/civic-motion.test.mjs`: vehicles and rotors move; equal timestamps preserve ambient poses; connection reveal progresses; water and gates reverse; mock forecast values match; geometry counts remain stable through every chapter. This runs the procedural fallback, since it builds the city with no kit.
- `node tests/kenney-city.test.mjs`: every kit model loads and reports a finite extent with no tangent attribute; the city builds with the kit; rotors, the eight vehicles, the flood gates and the water surface all survive the swap; every district keeps its location and clickable group; kit buildings land inside districts; geometry counts stay stable through every chapter.
- With the kit: 576 meshes, 652 instances, 81,335 triangles. Without it: 1,570 meshes, 103,242 triangles. The kit city is the lighter of the two, because it replaces the procedural slabs and trees rather than adding to them.
- Served build checked over HTTP: page, GLB, atlas and preview image all return 200.
- Offline poster render inspected. GPU appearance, shadow quality, ambient occlusion and frame rate remain unverified: this environment has no WebGL, so nothing here has been seen through the real renderer.

The existing Smart Building/AIS pages retain their entry points. Unpublished `/smart-city` draft files are not part of this route.
