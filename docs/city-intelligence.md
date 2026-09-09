# City Intelligence

Route: `/city-intelligence`. Generic, English-only, light isometric 3D scrollytelling.

## Approved direction

Based on the consolidated v1.2 master blueprint. White/off-white 60–70%; lime #C7FF3D for operational activity; orchid #C044D9 for intelligence; pink #F05BB5 for selected history/recommendations; deep plum #52205E for readable headings. Warning and critical are separate semantic colors.

Desktop is the primary platform. The user confirmed a capable presentation machine. Manual scroll only; no autoplay or narration audio. Target sales narration approximately 6.5 minutes at presenter pace, not a forced timer.

Eight chapters: Living City → Fragmentation → Connected Platform → Data Foundation → IoT → Five Use Cases → AI → Roadmap. Use cases: flood, traffic, air quality, energy, public safety. All use one persistent modular city. Asset cards explain data source, platform context and operational decision. Selecting a card focuses the associated 3D district.

## Implementation

- Three.js procedural city, orthographic camera, fixed diagonal orientation.
- 773 meshes, approximately 19,160 triangles before any later refinements.
- Deterministic scene and mock data from normalized scroll; reverse scrolling restores state.
- Camera pan/zoom interpolates over the opening portion of each chapter or use case.
- Manual rotation limited to ±12° horizontally and ±5° vertically. Further scrolling or Return to story restores the guided camera.
- Accessible HTML controls separate from canvas. Keyboard chapter navigation, native modal focus handling, reduced motion, fullscreen, loading progress.
- Scene module lazy-loaded. Narrow screens skip all Three.js assets and show the full textual story. WebGL failure uses a lightweight vector-rendered 3D view; fatal scene errors show the textual story.
- Render on state changes, suspend drawing in hidden tabs, cap device pixel ratio at 2 and reduce resolution/shadows if frame rendering is costly.
- No real AI, live connections, device controls, customer branding, authentication or dashboard backend.

## Review notes

The city is procedural web geometry rather than a supplied GLB asset collection. Mobile currently uses a text summary, not a rendered poster collection. Review/Approve are disabled demonstration controls. Numerical performance on the user's GPU must be assessed on their device; the cloud visual browser may use the lightweight renderer.

Existing Smart Building pages remain separately accessible. Unpublished earlier `/smart-city` draft files are not part of this page's build or deployment.
