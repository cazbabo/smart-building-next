# City Intelligence

Route: `/city-intelligence`. Generic, English-only, light isometric 3D scrollytelling.

## Approved direction

Based on the consolidated v1.2 master blueprint. White/off-white 60–70%; lime #C7FF3D for operational activity; orchid #C044D9 for intelligence; pink #F05BB5 for selected history/recommendations; deep plum #52205E for readable headings. Warning and critical are separate semantic colors.

Desktop is the primary platform. The user confirmed a capable presentation machine. Manual scroll only; no autoplay or narration audio. Target sales narration approximately 6.5 minutes at presenter pace, not a forced timer.

Eight chapters: Living City → Fragmentation → Connected Platform → Data Foundation → IoT → Five Use Cases → AI → Roadmap. Use cases: flood, traffic, air quality, energy, public safety. All use one persistent modular city. Asset cards explain data source, platform context and operational decision. Selecting a card focuses the associated 3D district.

## Implementation

- Three.js procedural city, orthographic camera, fixed diagonal orientation.
- Modular procedural geometry, with segmented curtain walls and separately dimmable districts.
- Deterministic scene and mock data from normalized scroll; reverse scrolling restores state.
- Camera pan/zoom interpolates over 55% of each chapter/use-case segment, with a short settling filter; reduced motion uses static camera presets. Canvas size only changes when the viewport changes.
- Manual rotation limited to ±12° horizontally and ±5° vertically. Further scrolling or Return to story restores the guided camera.
- Accessible HTML controls separate from canvas. Keyboard chapter navigation, native modal focus handling, reduced motion, fullscreen, loading progress.
- Scene module lazy-loaded. Narrow screens skip all Three.js assets and show the full textual story. WebGL failure uses a lightweight vector-rendered 3D view; fatal scene errors show the textual story.
- Render on state changes, suspend drawing in hidden tabs, cap device pixel ratio at 2 and preserve resolution and shadows through camera movement.
- No real AI, live connections, device controls, customer branding, authentication or dashboard backend.

## Review notes

The city is procedural web geometry rather than a supplied GLB asset collection. Mobile uses a lightweight rendered city poster and the full chapter text. Review/Approve are disabled demonstration controls. Numerical performance on the user's GPU must be assessed on their device; the cloud visual browser may use the lightweight renderer.

Existing Smart Building pages remain separately accessible. Unpublished earlier `/smart-city` draft files are not part of this page's build or deployment.

## Readability refinement

Use-case copy follows What happens → What you see → What the team does. Technical data-source explanations remain in detail dialogs. Facades use deeper blue-green glass, bronze fins, recessed entrances, entrance canopies and open roof terraces. Unselected districts retain most material contrast. No automatic one-frame quality downgrade.

## Reference-inspired landscape revision

The user's illustrated city reference supersedes the earlier uniform architecture. The model now combines curved teal towers, tapered blue towers with rounded rectangular sections, an aqua tower, cream/mint/peach residences, roof gardens, a turquoise garden pond, a pedestrian bridge, terraced waterfront building, marina boats and a faceted terrain base. Decorative SVG clouds drift slowly above the scene and pause in reduced-motion mode; they never intercept pointer input and fade during operational chapters. Simulation geometry, district IDs and operational colors remain separate from decorative architecture.
