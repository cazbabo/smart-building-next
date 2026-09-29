// The film's timeline and camera, shared by the Blender plate and the
// JavaScript frames so every line and pin drawn over the city sits on the
// building it belongs to. Page units (three.js, Y up).
//
// The camera is the page's own isometric orthographic view and it never turns:
// it only pans and zooms. With an orthographic camera that makes every frame an
// exact crop of one large image, so Cycles renders the city once, at a
// resolution that holds up at the closest shot, instead of 540 times - four
// hours of rendering on this machine became one still.
export const FPS = 30, SECONDS = 18, FRAMES = FPS * SECONDS;
export const WIDTH = 1920, HEIGHT = 1080;

// Beats, in seconds.
export const BEATS = {
 title: [0, 3.2],        // From data to a city in sync.
 data: [3.2, 7.4],       // 01 Data: routes connect, 0/7 -> 7/7
 iot: [7.4, 10.8],       // 02 IoT: sensors light up, readings arrive
 ai: [10.8, 15],         // 03 AI: water rises, forecast, recommendation
 end: [15, 18],          // Connect first. Expand with purpose.
};

// Camera keys: time, look-at point, view width in world units.
const KEYS = [
 [0,    [-10, 1, 2],   176],
 [3.2,  [-16, 2, 2],   138],
 [7.4,  [-28, 4, 4],   120],
 [10.8, [-6, 2, 0],    104],
 [15,   [-8, 3, 16],   76],
 [18,   [-16, 2, 2],   156],
];

// The page's view direction, and the image plane's axes in world space.
const OFFSET = [102, 100, 102];
const norm = v => { const l = Math.hypot(...v); return v.map(x => x / l); };
const N = norm(OFFSET);
export const RIGHT = norm([1, 0, -1]);
export const UP = norm([-N[0] * N[1], 1 - N[1] * N[1], -N[2] * N[1]]);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
/** A world point's position on the image plane, in world units. */
export const plane = p => [dot(p, RIGHT), dot(p, UP)];

function spline(values, i, u) {
 const p = k => values[Math.max(0, Math.min(values.length - 1, k))];
 const [a, b, c, d] = [p(i - 1), p(i), p(i + 1), p(i + 2)];
 const u2 = u * u, u3 = u2 * u;
 return 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3);
}
const ease = x => x * x * (3 - 2 * x);
/** The camera at time t: look-at point and view width. */
export function cameraAt(t) {
 let i = KEYS.length - 2;
 for (let k = 0; k < KEYS.length - 1; k++) if (t < KEYS[k + 1][0]) { i = k; break; }
 const [t0] = KEYS[i], [t1] = KEYS[i + 1];
 let u = Math.max(0, Math.min(1, (t - t0) / (t1 - t0)));
 if (i === 0 || i === KEYS.length - 2) u = ease(u);
 const target = [0, 1, 2].map(axis => spline(KEYS.map(k => k[1][axis]), i, u));
 return {target, scale: spline(KEYS.map(k => k[2]), i, u)};
}

// The master still has to cover every frame's view, at a density that gives
// the closest shot a full 1920 pixels.
export function master() {
 let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity, closest = Infinity;
 for (let f = 0; f < FRAMES; f++) {
  const {target, scale} = cameraAt(f / FPS), [u, v] = plane(target), h = scale * HEIGHT / WIDTH;
  u0 = Math.min(u0, u - scale / 2); u1 = Math.max(u1, u + scale / 2);
  v0 = Math.min(v0, v - h / 2); v1 = Math.max(v1, v + h / 2);
  closest = Math.min(closest, scale);
 }
 const density = WIDTH / closest * 1.1;            // a little headroom
 const pad = 4;
 u0 -= pad; u1 += pad; v0 -= pad; v1 += pad;
 return {u0, v0, u1, v1, density,
  width: Math.ceil((u1 - u0) * density), height: Math.ceil((v1 - v0) * density)};
}

// node scripts/video/timeline.mjs out.json - the master still's framing, for Blender.
// (The film page imports this module too, where there is no `process`.)
if (typeof process !== 'undefined' && process.argv[1]?.endsWith('timeline.mjs') && process.argv[2]) {
 const fs = await import('node:fs');
 const m = master();
 // The still's centre, back on the world's ground plane, is the camera's target.
 const cu = (m.u0 + m.u1) / 2, cv = (m.v0 + m.v1) / 2;
 const target = [0, 1, 2].map(k => RIGHT[k] * cu + UP[k] * cv);
 fs.writeFileSync(process.argv[2], JSON.stringify({...m, target, scale: m.u1 - m.u0, offset: OFFSET}));
 console.log(`master still ${m.width} x ${m.height} px, ${m.density.toFixed(1)} px per unit -> ${process.argv[2]}`);
}
