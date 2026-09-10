# City Intelligence

English-only enterprise presentation at `/city-intelligence`.

## Visual identity

- Light canvas `#FAF8FC`, readable plum `#52205E`.
- Lime `#C7FF3D`: connected data, primary controls and operational activity.
- Orchid `#C044D9` and pink `#F05BB5`: intelligence, predictions and visual accents.
- Trees, water and glazing retain material colors so the city stays legible.
- Lime, orchid and pink are the site's identity, not the city's. They mark the data routes, the forecast overlays, the command center's screens and the interface. The architecture is never painted in them: buildings, planting, water and road surfaces use real material colour so the brand layer reads as information laid over a city rather than as the city itself.
- Civic architecture uses rounded slabs, continuous glass, facade mullions, roof planting, colonnades and a dome. Hospital terraces include plant equipment. The scene includes a school, renewable district, industry, park, housing, transit and a command center.

## Architecture assets

Generic buildings and planting are Kenney models (City Kit Commercial, City Kit
Suburban, City Kit Roads and Car Kit, all CC0 1.0; sources kept in
`assets/kenney/`). `npm run assets` selects the models the scene loads, strips
the tangent attribute they carry for a normal map the material does not use, and
writes them with harmonised atlases into `public/models/`.

Each kit ships one texture atlas that every model in it samples, so colour is a
property of the atlas rather than of any mesh. Kenney's own hues are kept: they
are already a plausible city palette, and the brand colours belong to the data
layer rather than the buildings. The build only caps the most cartoon-saturated
values so the city sits on the pale canvas without shouting.

One atlas per kit would mean one wall colour for the whole city, which reads as
a single model rather than a place. The build therefore writes six atlases per
kit whose walls take a different real material - concrete as authored, then warm
stone, brick, slate, weathered stone and sandstone. Only the unsaturated part of
the atlas is a wall; windows, doors, roof tiles and planting keep Kenney's own
colour in every variant, so a variant changes what a building is made of rather
than repainting it. Kenney renders walls near white and a tint at that lightness
is invisible, so materials that are genuinely darker in life bring the lightness
down with them. Only buildings take a variant - trees, cars and street furniture
always draw from the base atlas.

Each atlas is one cloned material shared by every model in its kit. GLTFLoader
hands back a separate material and a separate copy of the atlas per GLB, which
would be dozens of uploads of one image, so the loader collapses them to one
material per kit before cloning.

Landmarks stay procedural, because no kit contains them and each one identifies
its district: the command center and its video wall, the flood gates and water
surface, the wind turbines, the civic dome and colonnade, the hospital roof
plant, the industrial chimneys and the solar field. `block()` and `tree()` are
the only generic-architecture factories in `civic-model.js`, so swapping their
implementations replaces every generic building and tree in the city while every
landmark, platform, road and story prop keeps its exact position.

`block()` fills its rectangle plot by plot rather than dropping one slab. An even
grid of same-sized buildings is what makes a city read as a toy, so each plot
varies its height, plan size, wall material, rotation and offset, a share of
plots are left open and planted instead, and a few take a tower so the skyline is
not one flat line. Detailed models are spent on part of the plots and the rest
draw from the low-detail stock, which averages 164 triangles against 1,089, so a
denser city does not cost proportionally more to draw. Districts also plant their
platform margin, which was otherwise bare lawn, and the road corridors carry
lamps, signals, signs, skips and parked cars: they had nothing but paint before,
which was most of why the city read as a model rather than a place.

Nine platforms on a three by three grid still read as a diagram, so an elevated
expressway climbs off the street, crosses the whole city on piers, turns a corner
and comes back down. Both ends land on the ground inside the plate; a deck simply
cut off at the edge read as a broken bridge. Kenney's ramp tile climbs 0.52 of a
tile per tile, so the deck height is three of those exactly and the ramp meets it
with no step at the top and no lip at the bottom. It follows the existing road
corridors, which is what keeps it clear of every building and puts its piers on
open ground, and it is the one element in the scene that is neither on the grid
nor on the ground. A roundabout replaces
one street junction so the ground plan has a corner that is not another right
angle. Six cars run the expressway on their own polyline and ride the same height
profile as the deck, so they climb the ramps rather than appearing at altitude;
the other eight keep the central loop, so `civic-motion.js` gained only a check
for a per-vehicle route and drives everything else exactly as before.

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

The stage carries the city alone: the heading, the readout and the controls float
over the canvas rather than taking bands of height beside it. They were costing
the canvas a third of its height, and since the fit keeps both axes in frame, a
wide short canvas forced the camera out to 152 units to show a city only 99
across. Floating them also removes the card edges between the two columns, and
the narrative drops its rules, borders and filled bands so the right-hand column
reads as text laid on the page rather than a panel beside the model.

Desktop uses WebGL when available. Mobile and unavailable WebGL use a labeled static model preview with the complete text story. `npm run poster` renders that preview from the real scene at the IoT chapter with a software rasteriser (`scripts/render-poster.mjs`), sampling the same atlas pixels and material colours the browser samples, so the preview cannot drift from the scene. It casts shadows through a software shadow map of its own, but has no ambient occlusion and no environment reflections, so it still reads flatter than the GPU render.

## Verification

- Production build for all three page entries.
- `node tests/civic-motion.test.mjs`: vehicles and rotors move; equal timestamps preserve ambient poses; connection reveal progresses; water and gates reverse; mock forecast values match; geometry counts remain stable through every chapter. This runs the procedural fallback, since it builds the city with no kit.
- `node tests/kenney-city.test.mjs`: every kit model loads and reports a finite extent with no tangent attribute; the city builds with the kit; rotors, the fourteen vehicles, the flood gates and the water surface all survive the swap; expressway traffic climbs to the deck and returns to the street over one lap; every district keeps its location and clickable group; kit buildings land inside districts; geometry counts stay stable through every chapter.
- With the kit: 628 meshes, 894 instances, 175,848 triangles. Without it: 1,570 meshes, 103,242 triangles. The kit city carries half again the triangles of the procedural one but a third of the meshes, which is the trade that buys the density.
- Served build checked over HTTP: page, GLB, atlas and preview image all return 200.
- Offline poster render inspected. GPU appearance, shadow quality, ambient occlusion and frame rate remain unverified: this environment has no WebGL, so nothing here has been seen through the real renderer. The poster's own shadows come from its software shadow map, not from the renderer the page uses.

The existing Smart Building/AIS pages retain their entry points. Unpublished `/smart-city` draft files are not part of this route.
