# AIS Smart Building Digital Twin

Standalone page in the existing Vercel project: `/ais-smart-building`.
Vite multi-page entry preserves the Mockup Building showcase at `/`.

## Design

Pearl `#EDF1EE`, white `#FFFFFF`, architectural silver, deep teal `#123237`, and the user-selected lime `#B0D233`. Manrope for interface numerals and English; Noto Sans Thai for Thai. The architectural model has the largest single area; operational insights sit on a dark surface beside it. Warning and security colors retain their meanings.

The new generic office asset has five storeys and a solar rooftop. Curtain walls, mullions, planted terraces, entrance canopy, landscaping, and different office/facility/lobby interiors are procedural Three.js geometry. It is not a photo or video. WebGL uses environment lighting; SVGRenderer supports machines without WebGL.

## Interaction

- Overview, Digital Twin, AI & Insights, Control Center have separate hash locations and one shared data store.
- Hover on floors, click to explode, click again for floor cutaway, select projected device hotspots. Keyboard-accessible floor controls provide the same navigation.
- Orbit, zoom, camera reset, assemble, explode, room breadcrumb and anchored glass device cards.
- Scenario Explore routes to the relevant floor/device and displays the AI trace, root cause, prediction, and recommendation.
- Four one-click simulated actions update KPIs, device data, alerts, feed, and the executive result strip. Actions are idempotent and resettable.
- Guided presentation uses six presenter-controlled steps. Pause/resume simulation is explicit.
- Session storage preserves demo outcomes on reload in the same tab. No backend, accounts, real AI service, IoT, or CMMS is used.

## Requirements interpretations

AHU-03 appeared on both Floors 3 and 5 in the supplied document. It is a single physical asset on Floor 5 serving Floor 3 Zone A. The energy trace explicitly names this relationship. The base security status is Secure; opening the security scenario activates a simulated unauthorized-access event. The two initial alerts are energy and predictive maintenance.

The 10.1% baseline saving is an illustrative requirement value; HVAC optimization separately measures 425 to 382 kW (rounded 10.1%). Avoid adding these two percentages. Accumulated daily energy and solar emissions values remain illustrative snapshots. Building health is a transparent demo score (100 minus 7 points per unresolved attention item), not an engineering safety rating. Maintenance scheduling acknowledges a task; it does not falsely restore machine health or vibration.

The first-load architectural reveal is intentionally shortened to 1.8 seconds and does not block controls. Reduced motion disables it. Small screens stack panels and device details. Desktop remains the primary presentation target.

## Validation

- Production build passes, both original and new HTML outputs exist.
- Data checks pass: baseline, four actions, duplicate guards, security prerequisites, IAQ/HVAC coupled power response, cross-view persistence, reset, device-floor mapping.
- Live browser checks passed: Energy Explore to Floor 3, Optimize HVAC result propagated to Control Center (425 → 382 kW); AHU-03 physical context on Floor 5 retained and power reflected optimization; maintenance task DEMO-MT-001 created; Security Explore to Door G-01 then Lock Door; IAQ Explore to Floor 2 then Increase Fresh Air yielded 850 ppm. All are client-side simulations.
- First visual review identified overexposure in SVG compatibility lighting and a grid row overlap; reduced SVG lighting, made its backdrop transparent, and changed workspace rows to size to their actual panels.
- The verification browser has no WebGL: model composition and interactions can be reviewed in SVG compatibility mode; physically based reflections, WebGL shadows, and GPU performance remain unverified on a normal GPU browser.

- All five floors and rooftop navigation were checked; floor-specific insights now follow manual selection too. Rooftop and Executive floor show their own contextual data instead of a stale previous scenario.

## Modernist architectural revision

The exterior now uses a recessed lobby, deep entrance canopy, dark broad glass bays, bronze vertical sun fins, mineral piers, a planted sky terrace, and a floating L-shaped roof crown. A reflecting pool, paving and planted arrival islands anchor the building. Facade geometry is owned by individual floors so assembly/explosion and cutaway access remain intact. Solar and inverter IDs and all operational floor/device mappings are retained. The default viewpoint is lower to emphasize the facade and roof silhouette.

The envelope is isolated in `src/ais/modern-envelope.js`. Geometry validation: 457 meshes, 10,192 triangles, finite transforms. Production build passes.

The AIS experience is now English throughout: navigation, headings, device descriptions, AI explanations, action results, accessibility labels, and presenter guidance. The document language is `en`; timestamps use `en-GB`. Demo storage uses a new English-specific key to prevent older Thai result messages appearing after the upgrade. A source scan found no Thai text in the AIS entry or its modules.
