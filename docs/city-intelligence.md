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

A roundabout replaces one street junction so the ground plan has a corner that
is not another right angle. An elevated expressway was tried across the whole
city and taken out again: at this camera angle a deck on piers crossed in front
of the districts it was meant to sit among, and the city was harder to read with
it than without.

## Opening

The page opens dark: the city as a lit subject over a night sky, a statement
across it and almost no other chrome. Below it the story is the pale canvas it
always was, because eight chapters of reading is what the rest of the page is
for and black is bad at that.

It is one canvas throughout on the desktop layout. A night layer sits behind it
- the renderer clears transparent - and fades out as the opening scrolls away,
so nothing about the city is repainted; lit for a pale canvas, it simply reads as the lit thing
against the dark. The header follows the same fade. The opening has its own
camera framing, which looks at a point below the model to lift it clear of the
headline, and no narrative beside it, so the city sits centred rather than
pushed left.

The compact layout has no canvas behind the opening: the visual column leaves
its fixed position there, so the night layer sits below the hero rather than
behind it. The opening is simply the light page at that width, and the stage
never enters its hero state, so the header and the furniture stay light with it.

The reference for this was a hero built on a compact centred subject with the
type over its dark underside. A wide isometric city fills its frame instead, so
the type is given its own ground by a wash rising from the bottom rather than by
finding a dark part of the subject to sit on.

Motes drift up through the opening in three layers of different size and speed.
A still isometric city gives the eye no evidence that the scene has any air in
it, which is most of what the reference had and this did not. They are tinted
lime and orchid rather than white, because a white speck on a night sky is a
star and the sky behind is already full of them; the site's own colours read as
its data layer drifting over the city instead. They add light rather than paint
over it, so they are kept small - a large one crossing a white roof blows out to
a smudge. Each one fades in and out over its own climb, so none pops at the top
of the band, and the whole set dims with the night layer: over the pale story
the same specks would read as dust on the screen.

## Story and interaction

Eight real document sections: living city, fragmentation, Data Consolidation, IoT Data Integration, flood response, connected services, AI-Powered Intelligence and roadmap.

Ordinary vertical scrolling drives the active chapter and its progress. Each chapter has its own framing and the camera eases to it - the flood chapter holds the waterway and the command center in one frame, the AI chapter pulls back far enough to hold the city and the command center together - but it moves on the change of chapter only and never follows the scrollbar, which is what makes a page like this unreadable. Within a chapter the camera is stable while reading, apart from the pointer swing. Explore enables intentional rotation and district focus. The canvas is resized only when its actual dimensions change.

- Ambient animation: vehicles follow the central road loop; turbine rotors turn.
- The camera swings a little around the city as the pointer crosses the page, damped toward the cursor rather than tracking it directly. It is what gives a still isometric model any sense of depth. Explore drives the camera itself and opts out, as does reduced motion.
- Data phase: routes progressively connect seven districts to the command center, with moving lime/pink packets.
- IoT phase: elevated sensor markers show covered locations.
- The stage furniture - the chapter heading, the fine print - floats on the canvas, so its background is a moving 3D scene. Each one carries its own pale pill: measured against the real pixels, the chapter name ran at 1.09:1 where a data route passed behind it and the mode label at 1.00:1 over a white roof, and contrast cannot depend on where the camera happens to be. The instruction and the disclaimer are one pill rather than two, because as separate boxes they overlapped.
- Every district carries a label on the model, projected through the camera each frame. Ten will not all fit at every angle, so they are placed in order of importance and any that would land on one already down is dropped for that frame. The narrative scrolls above them, so a district on that side hangs its label to the left of its marker rather than centred, and only one that still cannot clear the scrim is hidden - the limit is where the scrim's ramp has climbed far enough to wash a chip pale, not the column edge. A marker at the top of the frame - the command center sits above the city rather than in it - hangs its label under the marker instead of over it, which is where that one chip had been drawn off the canvas into the header. Sizes are estimated from the text rather than measured, because reading layout back per frame would stall the render loop.
- Flood example: mock water level progresses from 1.20 to 1.60 m; the simulated water surface rises and gate panels lift. The UI and scene use the same telemetry function.
- AI phase: a pink footprint expands alongside an illustrative 1.60 to 1.90 m forecast. A ring pulses over the command center while it works, and larger pink beads run the connection routes the other way, so the chapter shows the recommendation going back out to the districts rather than only the readings arriving. Both appear in this chapter alone.
- Reverse scrolling restores the corresponding scenario state.
- Each section's parts arrive in the order they are read as it comes into view, and stay once revealed: fading back out on the way up would fight the reader. The readout animates on a change of chapter rather than on a change of text, since it rewrites its value every frame through flood and AI. Under reduced motion the hidden state is never applied, because the global rule kills transitions and text left at opacity 0 with nothing to run would never appear.
- Ground paint - lane markings, crossings, pitch lines - receives shadow but casts none. It is thin enough that its own shadow lands inside the shadow bias, which shimmered once the camera started moving with the pointer.
- Pause animation stops the ambient clock while preserving scroll-based scenario selection. Reduced motion applies immediate state changes without continuous animation.
- Rendering is capped around 30 fps, stops in hidden tabs and when the canvas is outside the viewport. Geometry is created once, not per frame. The motes are three `Points` clouds, three draw calls between them, and their buffers are rewritten in place rather than rebuilt.

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

The city and the narrative share one stage rather than sitting in two columns.
The canvas spans the full width and the narrative scrolls over it with nothing
behind the type but a scrim that fades in from transparent, so the city carries
on beneath the words instead of stopping at a seam. Both the wash and the blur
sit on one element that starts 260px to the left of the column, so the ramp
finishes before the column does and the type never begins on ground that is
still climbing. Ramping inside the column forced the trade the other way: a 35px
ramp made the text legible by cutting a visible vertical band through the model
at 56% of the viewport, which is the seam this layout exists to avoid. The camera pushes the city
left of centre by an eighth of the frame, as far as it goes before the command
center leaves the frame, so the text lands on the quietest ground available.
The heading, the readout and the controls float over the canvas rather than
taking bands of height beside it. They were costing
the canvas a third of its height, and since the fit keeps both axes in frame, a
wide short canvas forced the camera out to 152 units to show a city only 99
across. Floating them also removes the card edges between the two columns, and
the narrative drops its rules, borders and filled bands so the right-hand column
reads as text laid on the page rather than a panel beside the model.

Desktop uses WebGL when available. Mobile and unavailable WebGL use a labeled static model preview with the complete text story. `npm run poster` renders that preview from the real scene at the IoT chapter with a software rasteriser (`scripts/render-poster.mjs`), sampling the same atlas pixels and material colours the browser samples, so the preview cannot drift from the scene. It casts shadows through a software shadow map of its own, but has no ambient occlusion and no environment reflections, so it still reads flatter than the GPU render.

## Verification

- Production build for all three page entries.
- `node tests/civic-motion.test.mjs`: vehicles and rotors move; equal timestamps preserve ambient poses; connection reveal progresses; water and gates reverse; mock forecast values match; geometry counts remain stable through every chapter. This runs the procedural fallback, since it builds the city with no kit.
- `node tests/kenney-city.test.mjs`: every kit model loads and reports a finite extent with no tangent attribute; the city builds with the kit; rotors, the eight vehicles, the flood gates and the water surface all survive the swap; every district keeps its location and clickable group; kit buildings land inside districts; geometry counts stay stable through every chapter.
- With the kit: 619 meshes, 875 instances, 160,502 triangles. Without it: 1,570 meshes, 103,242 triangles. The kit city carries half again the triangles of the procedural one but a third of the meshes, which is the trade that buys the density.
- Served build checked over HTTP: page, GLB, atlas and preview image all return 200.
- Rendered in Chromium at 1600 by 900 and 1366 by 768, all eight chapters: WebGL initialises, the whole city sits in frame with nothing clipped, the narrative reads over it, and scrolling to the flood chapter drives both the scene and the readout. At the top the night layer is fully on and the motes drift over it; at the Data chapter the night reads 0 and no mote is on screen. No page errors and no horizontal overflow at 390, 1366 or 1600.
- Floating chrome measured against its own pixels, animation paused, the glyphs made transparent so the sample is the ground the text sits on and the rounded corners excluded: chapter name 10.8 to 11.5:1, mode label 6.9 to 7.4:1, fine print 6.3 to 7.4:1 across every chapter at both widths. All above the 4.5:1 floor; before the pills the first two ran to 1.00:1.
- Compact layout at 390 by 844: the opening reads plum on the pale page at 11.5:1, the night layer is absent, and the city preview sits on the page rather than under it.
- Keyboard: skip link, brand, three phase links, fullscreen, then the hero's two actions and the view controls, each with a visible focus ring. Reduced motion: all eight sections revealed at full opacity, chapter and readout still tracking scroll, no errors. Frame rate stays unverified: this box has no GPU and Chromium falls back to SwiftShader.
- Offline poster render inspected. GPU appearance, shadow quality, ambient occlusion and frame rate remain unverified: this environment has no WebGL, so nothing here has been seen through the real renderer. The poster's own shadows come from its software shadow map, not from the renderer the page uses.

The existing Smart Building/AIS pages retain their entry points. Unpublished `/smart-city` draft files are not part of this route.
