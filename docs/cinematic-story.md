# Mockup Building: scroll-led story

Requested reference: https://pub-86dc5b5484314368ac5436a674b0d919.r2.dev/hero%20sections/animated%20(20).webp

The reference was downloaded and inspected at frames 0, 25 and 50 (75 animated frames, 640 × 470). Its relevant design language is a dark, full-screen animated subject, large sparse titles, modest corner navigation, and scroll-led scene changes. The reference media and copy are not included in the website.

## Design direction
- Base #050A0C, existing application navy #09111F, supplied lime #B0D233, soft lime #C9E77A, white #F0F4ED, muted grey #A7B1AC.
- Noto Sans Thai for narrative and controls; Manrope for small secondary labels.
- A persistent 3D stage with five scrolling narrative chapters. Large titles stay left; short explanation and action sit in the opposite lower corner. Application panels reappear when entering Explore.
- The opening light sculpture represents building-system connections. Subsequent scenes show the office architecture, occupied interior, chiller room and Command Center.
- Scroll adjusts the camera; a two-minute play control can advance the page. Wheel, touch and navigation keys interrupt playback. Reduced-motion mode avoids continuous camera motion and uses timed chapter jumps for requested playback.

## Routes and continuity
- Root / or #story: cinematic story.
- Existing #overview, #comfort, #plant, #command and other system hashes: direct Explore view.
- Returning from a story scene preserves the shared Command Center incident store.
- Brand changed from ONE Building to Mockup Building in the header, document title, scene label, footer and model object name.

## Verification notes
Vite production build passes. Browser review is required after deployment; the current review browser uses the SVG fallback because WebGL is disabled. Full WebGL glow and materials therefore remain unverified here.
