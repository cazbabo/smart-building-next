# Lumen Building

Interactive 3D art-direction prototype for the Smart Building presentation platform.

## Run locally

```bash
npm run dev
```

Open `http://localhost:4173`.

## Build

```bash
npm run build
```

The static site is written to `dist/` for Vercel deployment.

## Prototype views

- Exterior: premium office tower and system overview
- Cutaway: hides the glass shell to reveal modular floor interiors
- Plant room: moves the camera to B2 and shows a simulated chiller incident

The procedural model keeps floors and systems as named scene groups so the setup wizard can later assemble 1–10 upper floors and toggle system overlays.
