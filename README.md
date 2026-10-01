# ONE Building

Cinematic Smart Building presentation built around a polished parametric office tower. The experience combines a guided executive story with a free-explore mode and product-specific digital-twin layers.

## Run locally

```bash
npm run dev
```

Open `http://localhost:4173`.

## Build

```bash
npm run build
```

Vite writes the production site to `dist/` for Vercel deployment.

## Digital twin (SuperMap)

`/digital-twin` tells the City Intelligence story on a real 3D city streamed from SuperMap iServer with SuperMap iClient3D for WebGL. `npm run assets` (part of `npm run build`) copies the SDK from `node_modules/@supermap/iclient3d-webgl` to `public/vendor/supermap3d`.

The page uses SuperMap's public 3D-CBD demo scene. To show another iServer realspace service, open `/digital-twin?scene=<service url>`, for example `https://<host>/iserver/services/<name>/rest/realspace`. The story's pins and routes are placed on the demo scene, so another scene shows the city on its own. The service must allow cross-origin requests.

## Story chapters

- Living Digital Twin
- Energy Flow
- HVAC & Air Quality
- People & Workspace
- Access & CCTV
- Parking & EV
- Plant Intelligence

The building is generated from deterministic Three.js source with a transparent double-height lobby, deliberate curtain-wall rhythm, vertical aluminium fins, two planted sky terraces, a glazed atrium blade, and rooftop solar equipment. The model source lives in `src/building.js` so architectural proportions and materials remain editable.
