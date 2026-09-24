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

No kit contains the landmarks, and each one identifies its district, so they are
modelled for this page in Blender (below). `block()` and `tree()` are the only
generic-architecture factories in `civic-model.js`, so swapping their
implementations replaces every generic building and tree in the city while every
landmark, platform, road and story prop keeps its exact position.

## Landmarks

The seven objects the story is told through are modelled in Blender, from
Python, by `scripts/blender/landmarks.py`: the command center, the city hall,
the flood barrier, the wind turbine, the works with its tanks and chimneys, the
transit station with its bus, and a solar table. Each is built in its
district's own frame, so it drops into the position the procedural stand-in held
and nothing about the layout moves.

- **Command center.** A two-tier plinth with a dark control-room floor, a
  76-degree curved video wall of 7 by 3 screens on raked steel legs, two tiers of
  consoles on the same centre so every screen faces the operators square-on, a
  glass balustrade, and the six data-source pods rebuilt as server cabinets with
  lime status strips and conduits back to the plinth. The wall shows a dashboard
  drawn in HTML and rendered by Chromium (`scripts/blender/textures/dashboard.html`,
  `scripts/render-textures.mjs`): the city map with its routes converging on the
  hub, the water level against the 1.40 m line, the forecast, sensors and
  incidents - the story's own numbers. The lime line along the wall's foot is the
  one piece of brand colour on any building, and it is a display.
- **City hall.** Podium and grand stair, a two-storey block with pilasters,
  string course and cornice, a hexastyle portico under a pediment with a clock,
  and a verdigris copper dome with ribs, drum colonnade, lantern and gilt finial.
  Two flags on the forecourt.
- **Flood barrier.** Quay walls round the basin, six streamlined piers with gate
  guides, a service deck with stainless machine hoods, a control house and a
  staff gauge in the water. The gauge's green, amber and red bands are placed by
  the same formula `civic-motion.js` uses for the water's height, so the water
  crosses 1.40 m and 1.60 m on the gauge exactly when the readout says it does.
  The five gate leaves are separate nodes built round their own centres, and
  `civic-motion.js` lifts them exactly as it lifted the boxes they replace.
- **Wind turbine.** Tapered tower, streamlined nacelle, and three twisted,
  tapering aerofoil blades with aviation-red tips. The rotor is its own node
  pivoting on the hub; the page drives it through the same group as before.
- **Works.** A sawtooth-roofed hall glazed on its steep faces, brick base and
  ribbed cladding, loading doors with hazard bollards; two storage tanks with weld
  bands, domed roofs and spiral stairs; three chimneys with aviation bands and
  service galleries; and a pipe rack in the usual service colours - gas yellow,
  grey, water green.
- **Transit.** A station hall with a glazed front, a glass barrel-vault canopy on
  branching columns over a platform with a tactile edge, and a low-floor city bus
  in blue and white.
- **Solar table.** A framed module tilted 15 degrees on aluminium legs and
  footings, its cells painted into a texture in numpy.

Materials are real ones throughout, as the rest of the city: concrete, stone,
brick, steel, copper, glass. Lime, orchid and pink stay on the data layer.

Each landmark is baked for ambient occlusion with Cycles into a lightmap, and
the page applies it as an `aoMap`: it darkens ambient and environment light only,
so the real-time sun and its shadows stay in charge of the direct light and
nothing is darkened twice. The lightmap must be the only UV set on a baked body -
swept tubes carry UVs out of the curve conversion, and when those came first the
page's `aoMap` sampled the wrong coordinates and blacked out every wall. Maps are
baked at 2048, halved (a 2 x 2 average, which also removes the bake's grain)
and stored as greyscale JPEG: 14 MB of PNG became about 1.1 MB. Meshes are
meshopt-compressed and quantised (`scripts/compress-landmarks.mjs`), which took
them from 3.1 MB to 0.9 MB; three decodes them with the decoder it ships.
Quantisation keeps its dequantising transform on the node, so the loader
(`landmarks.js`) leaves the node alone and places a holder group instead.

If the landmarks cannot be fetched the procedural stand-ins are drawn, exactly
as before.

## Light

**Contact shadows, baked.** Kit buildings are instances sharing geometry, so
they cannot carry per-building occlusion. Instead `scripts/blender/city.py`
rebuilds the whole city from `scripts/dump-city.mjs` - civic-model.js itself,
flattened to triangles - and renders ambient occlusion straight down onto the
ground surfaces the page tags (base slab, road, platforms, lawns, paths, lane
paint). Every building, tree, lamp and parked car is invisible to that camera but
still in the way of the occlusion rays, so the ground comes out dark where
something stands on or beside it while the thing itself is not in the picture.
`ground-ao.js` projects the image back onto those surfaces by world X and Z: one
2048-pixel texture, 300 KB, and every kit instance gets a soft footprint. Ambient
light takes the full occlusion; the sun takes half of it, which is not physical
but is what makes a footprint visible in full daylight.

**Post-processing** (`civic-post.js`). Ground-truth ambient occlusion (GTAO)
covers what no bake can: kit buildings against each other, cars, anything that
moves. It leaves translucent and self-lit surfaces out of its depth and normals -
the pink forecast plane otherwise occluded the whole water district under it.
Bloom runs in the night opening only and is selective: after tone mapping a
white roof is as bright as a lit screen, so a luminance threshold blew the city
hall into glare. Only what emits light - the video wall, the consoles, lamps, the
data routes, the motes - is drawn into a half-resolution glow buffer, everything
else is drawn black so it still hides what is behind it, and only the halo is
added back.

A composer tone-maps once, at the end, which would have put the brand lime and
pink through ACES again - a different lime from the button beside the canvas.
The scene is instead rendered into targets flagged the way three flags an XR
target, which makes every material tone-map in its own shader exactly as it does
drawing straight to the screen; the last pass converts to sRGB and nothing else.
Measured: the same 248 pixels land exactly on #C7FF3D in the Data chapter with
post-processing on and off. The canvas stays transparent over the night layer
throughout; the halo raises alpha over empty sky so the glow reads against it.

**Quality guard.** Level 2 is AO and bloom; 1 drops AO and caps the pixel ratio at
1.5; 0 renders straight to the canvas with no post-processing, exactly as the
page did before any of this. The level steps down, never up, when the median gap
between rendered frames over two seconds passes 52 ms (the page renders at most
30 frames a second, so a healthy machine shows about 33). The window is time,
not frames: on the machine it is for, 45 frames took most of a minute. `?fx=high`,
`low` or `off` pins a level for a presenter who knows their machine, and
`<html data-fx>` shows the level in use.

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

## Presentation

On a desktop screen the story is presented, not scrolled: the opening, then one
chapter per screen (`present.js`). The scrolling page never came to rest on a
composition - stopped anywhere, it showed half a chapter with its heading cut by
the header - and while the text scrolled, the city and its furniture stood still,
so it read as a document with a picture beside it rather than as a story being
told. Its hand-off from the opening also crossed a visible horizontal seam where
the night layer had not yet faded but the narrative's wash had begun.

- **One step at a time.** One wheel gesture, one key (arrows, Space, PageUp and
  PageDown, Home, End, 1 to 8), one swipe, one click on the rail or the card's
  Next button. Presenter clickers send PageUp and PageDown, so they work with no
  setup.
- **Chapters play.** Arriving at a chapter, the camera flies to its frame and the
  chapter then plays itself once the camera is there: the routes connect, the
  water rises from 1.20 to 1.60 m and the gates lift, the forecast grows. Stepping
  back shows the previous chapter already played, the way it was left. Fades and
  playback run off the clock, not the frame count, so a slow machine takes the
  same time.
- **Layout: the city fills the stage, the words sit in a band along the
  bottom.** The first presentation put a card on the right over a wash, which
  cut the model in two and set a document beside a picture. Now the camera
  centres the city and lifts it above a band that rises out of the page colour:
  phase, title and a short lede on the left, the three points spread across the
  right, the takeaway under them. The lede is a shorter brief written for the
  band (`present` in `long-story.js`); the scrolling page and phones keep the full
  intro. The band is sized by viewport height too, so it keeps to the bottom third
  from 1366 by 768 to 1920 by 1080 (the takeaway gives way below 800 pixels high,
  the fine print underneath still says every value is mock data).
- **Numbered pins.** Each point has a pin on the model - the water gauge, the road
  beside the waterway, the command center's consoles - projected through the
  camera every frame like the district names, dropping in once the camera has
  arrived. Hovering a point lights its pin and the other way round. Pins go down
  before district names, which give way to them, and none is placed inside the
  band's fade. The presentation has its own chapter framings, since a frame chosen
  for a city pushed aside does not hold the same subject once it is centred.
- **Side panels on wide screens** (`side-panels.js`). Fitting the city between
  the header and the band made its height the limit, so a wide screen was left
  empty a third either side. The camera now fits by width and lets the city's
  lower edge run under the band, and screens from 1760 pixels wide (and 761
  high) carry two glass panels in the sides. Left, *Live signals*: readings
  arriving with a time, newest on top, one every 2.2 s, their content following
  the chapter - separate systems, routed to the command center, sensors, the
  flood alert with the live water level turning pink past 1.40 m, the forecast.
  Right, *Connected systems*: seven sources at 0 / 7 while the story is about
  separate systems, counting up as the Data chapter's routes connect on the
  model, 7 / 7 after; it also carries the only key to what lime and pink mean on
  the model. Narrower screens have no panels and a tighter zoom. Rows are built
  when one arrives and only the live values are written after that; rebuilding
  the list every frame during playback restarted the arrival animation each
  time. The panels hold nothing the band does not, so they are hidden from
  assistive technology; pause stops the feed.
- **Pins sit in their own layer above the band.** Left in the canvas's layer
  they were washed out by the band's fade whenever a point sat low in the frame;
  they now stay crisp over the fade and only keep clear of the band's text.
 The live readout becomes a compact chip top left; Back and Next
  sit top right; Explore, Pause and the fine print sit in one row at the foot.
  Those last two live in the canvas's layer, which the band covers, so the
  presentation moves them into the band's own layer - they were ghosted and
  unclickable under it.
- **The rail.** A dot per step on the right edge, the chapter's name on hover or
  focus, the current one lime. It is how a presenter answers a question about an
  earlier chapter.
- **The URL follows the chapter**, so a link opens on it and a reload keeps the
  place.

A trackpad keeps sending momentum for a second or more after the fingers lift,
and one flick first ran five chapters. After a step the wheel is treated as
coasting until it goes quiet or a delta arrives larger than the ones before it -
momentum only decays, so a push that grows is a new gesture - and timing uses
each event's own timestamp, which a busy main thread does not stretch.

Phones keep the scrolling page, which is what a phone is good at, and `?scroll`
keeps it on any screen, for reading at a desk. Both modes drive the same state -
chapter, how far it has played, how much of the opening is on screen - through
one function in `app.js`.

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

`story-state.js` is a lightweight shared telemetry function. `civic-motion.js` controls the animated meshes. `civic-model.js` builds the city; `kenney-kit.js` loads the kit and instances it; `landmarks.js` loads the Blender landmarks; `ground-ao.js` applies the baked contact shadows; `civic-post.js` owns post-processing and the quality guard; `present.js` runs the desktop presentation; `civic-scene.js` manages camera, lighting and animation lifecycle. `app.js` owns the narrative, readout and accessible HTML controls.

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

Desktop uses WebGL when available. Mobile and unavailable WebGL use a labeled static model preview with the complete text story. `npm run poster` renders that preview with Cycles from the same flattened city the ground bake uses, at the IoT chapter: global illumination, a soft sun, the dashboard lit on the wall, framed on the content. It is composited onto the page's own ground, #FAF8FC, because on a phone nothing sits under the image in its layer for a multiply blend to hide a white one. It replaces the software rasteriser the page used before, which had no ambient occlusion and no bounce light.

### Rebuilding the assets

The built files are committed; none of this runs in `npm run build`.

- `pip install bpy==4.2.0` once - Blender as a Python module.
- `npm run landmarks` - model, bake and export every landmark, then compress.
  `python3 scripts/blender/landmarks.py civic` rebuilds one;
  `LANDMARK_PREVIEW=<dir>` also renders each from the page's angle.
- `node scripts/render-textures.mjs` - the dashboard; needs Playwright.
- `npm run ground-ao` - the top-down contact shadow map.
- `npm run poster` - the Cycles preview.

## Verification

- Production build for all three page entries.
- `node tests/civic-motion.test.mjs`: vehicles and rotors move; equal timestamps preserve ambient poses; connection reveal progresses; water and gates reverse; mock forecast values match; geometry counts remain stable through every chapter. This runs the procedural fallback, since it builds the city with no kit.
- `node tests/kenney-city.test.mjs`: every kit model loads and reports a finite extent with no tangent attribute; the city builds with the kit; rotors, the eight vehicles, the flood gates and the water surface all survive the swap; every district keeps its location and clickable group; kit buildings land inside districts; geometry counts stay stable through every chapter.
- `node tests/kenney-city.test.mjs` also loads the landmarks under Node: every manifest entry decodes (meshopt, quantised), every node has geometry and finite bounds, the rotor's vertices centre on its hub, each gate leaf is built round its centre, three turbines turn, five gates lift to 2.4 at the height of the flood and settle back to 1.5.
- With the kit and the landmarks: 506 meshes, 747 instances, 202,016 triangles. Without either: 1,585 meshes, 108,582 triangles. Landmarks: command center 12.0k triangles, city hall 10.8k, works 10.2k, barrier 6.9k, transit 4.6k, turbine 1.9k, solar table 0.6k; 2.2 MB on disk with their AO maps and textures.
- Served build checked over HTTP: page, GLB, atlas and preview image all return 200.
- Presentation driven in Chromium: a replayed trackpad flick with 1.5 s of momentum is one step, a fresh push during the coast is a second, three mouse-wheel notches are three, and the same upward; PageDown, the rail and Home reach the right chapters; the flood chapter plays 1.20, 1.31, 1.51, 1.60 m on its own; the band keeps to the bottom third of the stage at 1366 by 768, 1600 by 900 and 1920 by 1080 for every chapter, every pin is on screen and clear of the band at 1366 and 1600, and Explore, Pause and Return to the story take clicks. Under reduced motion each chapter appears already played. Phones and `?scroll` keep the scrolling page, which still reaches the flood and AI chapters by scroll position.
- Rendered in Chromium at 1600 by 900 and 1366 by 768, all eight chapters: WebGL initialises, the whole city sits in frame with nothing clipped, the narrative reads over it, and scrolling to the flood chapter drives both the scene and the readout. At the top the night layer is fully on and the motes drift over it; at the Data chapter the night reads 0 and no mote is on screen. No page errors and no horizontal overflow at 390, 1366 or 1600.
- Floating chrome measured against its own pixels, animation paused, the glyphs made transparent so the sample is the ground the text sits on and the rounded corners excluded: chapter name 10.8 to 11.5:1, mode label 6.9 to 7.4:1, fine print 6.3 to 7.4:1 across every chapter at both widths. All above the 4.5:1 floor; before the pills the first two ran to 1.00:1.
- Compact layout at 390 by 844: the opening reads plum on the pale page at 11.5:1, the night layer is absent, and the city preview sits on the page rather than under it.
- Keyboard: skip link, brand, three phase links, fullscreen, then the hero's two actions and the view controls, each with a visible focus ring. Reduced motion: all eight sections revealed at full opacity, chapter and readout still tracking scroll, no errors.
- Post-processing seen in Chromium with `?fx=high`: the opening with selective bloom on the video wall, consoles and motes and no glare on white roofs; every chapter with GTAO. The quality guard seen stepping down under SwiftShader at a pixel ratio of 2: level 2 at 5.8 s a frame, then level 1 at 2.5 s, then 0.
- Frame rate on real hardware stays unverified: this box has no GPU and Chromium renders through SwiftShader, which is what the guard is for.

The existing Smart Building/AIS pages retain their entry points. Unpublished `/smart-city` draft files are not part of this route.
