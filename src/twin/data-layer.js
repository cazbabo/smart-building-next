// The City Intelligence data layer, drawn with Cesium entities on the SuperMap
// scene: the data core over the hub tower, each system's route into it, the
// field sensors, and the flood forecast around the park lake. HTML labels ride
// on top, placed through the same camera every frame.
//
// The story moves in stages - 0 overview, 1 data, 2 IoT, 3 AI - and each part
// eases in with the stage that introduces it and out again when the story
// steps back. Everything animates from one clock.
import {HUB, CORE_HEIGHT, SYSTEMS, SENSORS, READINGS, RISK} from './story.js';

const C = window.Cesium;
const LIME = C.Color.fromCssColorString('#C7FF3D'), PINK = C.Color.fromCssColorString('#F05BB5');
const ORCHID = C.Color.fromCssColorString('#DE8BF0'), WHITE = C.Color.WHITE;
const at = ([lon, lat, h]) => C.Cartesian3.fromDegrees(lon, lat, h);
const clamp = x => Math.min(1, Math.max(0, x)), smooth = x => (x = clamp(x), x * x * (3 - 2 * x));
const mix = (a, b, k) => a + (b - a) * k;
const live = fn => new C.CallbackProperty(fn, false);
const fill = color => new C.ColorMaterialProperty(live(color));
const ON_TOP = Number.POSITIVE_INFINITY;   // disableDepthTestDistance: never hidden by a building

// Pulses are a ring drawn once and scaled on a billboard: cheaper than ground
// geometry rebuilt every frame.
const RING = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.strokeStyle = '#fff';
  g.lineWidth = 7;
  g.beginPath();
  g.arc(64, 64, 58, 0, Math.PI * 2);
  g.stroke();
  return c;
})();

// A route from a system up and over into the core: a straight line on the map,
// lifted into an arc that rises with the distance it covers.
function arc(from, to, n = 64) {
  const dist = C.Cartesian3.distance(at([from[0], from[1], 0]), at([to[0], to[1], 0]));
  const lift = 40 + dist * .14;
  return Array.from({length: n}, (_, i) => {
    const k = i / (n - 1);
    return at([mix(from[0], to[0], k), mix(from[1], to[1], k), mix(from[2], to[2], k) + lift * Math.sin(Math.PI * k)]);
  });
}
function along(pts, u) {
  const f = clamp(u) * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(f));
  return C.Cartesian3.lerp(pts[i], pts[i + 1], f - i, new C.Cartesian3());
}

export function dataLayer(viewer, overlay) {
  const E = viewer.entities, scene = viewer.scene;
  // level[n] eases toward 1 while the story is at stage n or later, toward 0
  // before it; began[n] is when stage n last came in from nothing.
  const level = [1, 0, 0, 0], began = [0, 0, 0, 0];
  let stage = 0, now = performance.now() / 1000, last = now;
  const since = n => now - began[n];

  // The data core: a column of light from the hub tower's roof, a core, and
  // rings turning round it at different tilts.
  const core = [HUB[0], HUB[1], CORE_HEIGHT];
  const coreOn = () => .45 + .55 * level[1];
  const beam = [at(HUB), at([HUB[0], HUB[1], 620])];
  E.add({polyline: {positions: beam, width: 16, material: fill(() => LIME.withAlpha(.12 + .14 * coreOn()))}});
  E.add({polyline: {positions: beam, width: 3, material: fill(() => LIME.withAlpha(.5 + .4 * coreOn()))}});
  E.add({position: at(core), ellipsoid: {radii: new C.Cartesian3(15, 15, 15),
    material: fill(() => LIME.withAlpha(.55 + .4 * coreOn()))}});
  const enu = C.Transforms.eastNorthUpToFixedFrame(at(core));
  [[36, 72, .5, LIME], [54, 58, -.32, ORCHID], [76, 80, .2, LIME]].forEach(([r, tilt, speed, color]) => {
    const tl = C.Math.toRadians(tilt), pts = Array.from({length: 73}, () => new C.Cartesian3());
    E.add({polyline: {width: 3, material: fill(() => color.withAlpha(.55 + .45 * coreOn())),
      positions: live(() => {
        const spin = now * speed;
        pts.forEach((p, i) => {
          const a = i / 72 * Math.PI * 2, x = r * Math.cos(a), y = r * Math.sin(a) * Math.cos(tl), z = r * Math.sin(a) * Math.sin(tl);
          C.Matrix4.multiplyByPoint(enu, new C.Cartesian3(x * Math.cos(spin) - y * Math.sin(spin), x * Math.sin(spin) + y * Math.cos(spin), z), p);
        });
        return pts;
      })}});
  });
  // A wave leaves the hub roof now and then.
  const wave = () => (now * .45) % 1;
  E.add({position: at([HUB[0], HUB[1], HUB[2] + 2]), billboard: {image: RING, sizeInMeters: true,
    width: live(() => 40 + wave() * 180), height: live(() => 40 + wave() * 180),
    color: live(() => LIME.withAlpha((1 - wave()) * .6 * coreOn()))}});

  // Systems: a pin on each, and a route that draws itself into the core.
  const routes = SYSTEMS.map((s, i) => {
    const top = [s.at[0], s.at[1], s.at[2] + (s.at[2] < 30 ? 70 : 35)];
    const pts = arc(top, core), color = i % 3 === 0 ? PINK : LIME;
    const grow = () => smooth((since(1) - .4 - i * .22) / 1.3) * (level[1] > .02 ? 1 : 0);
    E.add({polyline: {positions: [at(s.at), at(top)], width: 2, material: new C.ColorMaterialProperty(live(() => WHITE.withAlpha(.7 * level[1])))}});
    E.add({position: at(top), point: {pixelSize: 12, color: live(() => color.withAlpha(level[1])), outlineColor: live(() => C.Color.fromCssColorString('#15112A').withAlpha(level[1])), outlineWidth: 2, disableDepthTestDistance: ON_TOP}});
    // Routes step back while the sensors and the forecast have the floor.
    const routeOn = () => level[1] * (1 - .45 * level[2]) * (1 - .6 * level[3]);
    const drawn = live(() => pts.slice(0, Math.max(2, Math.ceil(pts.length * grow()))));
    E.add({polyline: {width: 10, show: live(() => level[1] > .02), positions: drawn, material: fill(() => color.withAlpha(.18 * routeOn()))}});
    E.add({polyline: {width: 3, show: live(() => level[1] > .02), positions: drawn, material: fill(() => color.withAlpha(.95 * routeOn()))}});
    // Packets of data riding the route once it is drawn.
    for (let j = 0; j < 2; j++) {
      const u = () => (now * .32 + j / 2 + i * .137) % 1;
      E.add({position: live(() => along(pts, u())), point: {pixelSize: 8, disableDepthTestDistance: ON_TOP,
        color: live(() => WHITE.withAlpha(grow() >= 1 ? level[1] * (1 - level[3]) * Math.sin(Math.PI * u()) : 0))}});
    }
    return {s, top, grow};
  });

  // Sensors: rings pulsing on rooftops, roads and the lake shore.
  SENSORS.forEach((p, i) => {
    const w = () => (now * .55 + i * .173) % 1;
    E.add({position: at([p[0], p[1], p[2] + 2]), billboard: {image: RING, sizeInMeters: true, disableDepthTestDistance: ON_TOP,
      width: live(() => 12 + w() * 70), height: live(() => 12 + w() * 70),
      color: live(() => LIME.withAlpha((1 - w()) * .85 * level[2]))}});
    E.add({position: at([p[0], p[1], p[2] + 2]), point: {pixelSize: 6, disableDepthTestDistance: ON_TOP,
      color: live(() => LIME.withAlpha(level[2]))}});
  });

  // The forecast: the area at risk round the lake, filling as the water rises.
  const water = () => smooth((since(3) - .6) / 2.6) * level[3];
  const depth = () => .5 + 6.5 * water();
  const ring = RISK.concat([RISK[0]]);
  E.add({polygon: {hierarchy: new C.PolygonHierarchy(RISK.map(([lon, lat]) => at([lon, lat, 0]))),
    height: 0, extrudedHeight: live(depth), material: fill(() => PINK.withAlpha(.32 * level[3]))}});
  E.add({polyline: {width: 3, show: live(() => level[3] > .02),
    positions: live(() => ring.map(([lon, lat]) => at([lon, lat, depth() + .4]))),
    material: new C.PolylineDashMaterialProperty({color: live(() => PINK.withAlpha(level[3])), dashLength: 22})}});

  // Labels.
  const labels = [];
  const label = (pos, html, cls, alpha) => {
    const el = document.createElement('div');
    el.className = 'tw-label ' + cls;
    el.innerHTML = `<div>${html}</div>`;
    overlay.append(el);
    labels.push({el, pos: at(pos), alpha});
    return el;
  };
  label([HUB[0], HUB[1], CORE_HEIGHT + 95], '<b>Data core</b>', 'core', () => level[1]);
  routes.forEach(({s, top}) => label(top, `<i></i>${s.name}`, 'system', () => level[1] * (1 - level[2])));
  const gauge = {};
  READINGS.forEach(r => {
    const el = label([r.at[0], r.at[1], r.at[2] + 18], `<b>${r.label}</b><span>${r.value}</span>`, 'reading',
      () => level[2] * (r.gauge ? 1 : 1 - level[3]));
    if (r.gauge) Object.assign(gauge, {label: el, el: el.querySelector('span')});
  });

  const camDir = new C.Cartesian3(), toLabel = new C.Cartesian3();
  scene.postRender.addEventListener(() => {
    const cam = scene.camera;
    C.Cartesian3.clone(cam.directionWC, camDir);
    for (const l of labels) {
      const a = l.alpha();
      C.Cartesian3.subtract(l.pos, cam.positionWC, toLabel);
      const p = a > .01 && C.Cartesian3.dot(toLabel, camDir) > 0 && C.SceneTransforms.wgs84ToWindowCoordinates(scene, l.pos);
      if (!p) { l.el.style.opacity = 0; continue; }
      l.el.style.opacity = a.toFixed(3);
      l.el.style.transform = `translate(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px)`;
    }
  });

  scene.preRender.addEventListener(() => {
    now = performance.now() / 1000;
    const dt = Math.min(.1, now - last);
    last = now;
    for (let n = 1; n < 4; n++) {
      const target = stage >= n ? 1 : 0;
      if (target && level[n] < .01) began[n] = now;
      level[n] += (target - level[n]) * Math.min(1, dt * 3.2);
    }
    // The gauge climbs past its 1.40 m warning line, then the forecast appears.
    const reading = 1.2 + .4 * smooth((since(3) - .3) / 1.6) * (stage >= 3 ? 1 : 0);
    const forecast = stage >= 3 && since(3) > 1.9 ? ` → ${(1.6 + .3 * smooth((since(3) - 1.9) / 1.4)).toFixed(2)} m` : '';
    gauge.el.textContent = `${reading.toFixed(2)} m${forecast}`;
    gauge.label.classList.toggle('alert', reading > 1.4);
  });

  return {
    setStage(n) { stage = n; },
    level: n => level[n],
    since,
    connected: () => routes.filter(r => r.grow() >= .98).length,
    alert: () => stage >= 3 && since(3) > 1.2,
    recommend: () => stage >= 3 && since(3) > 2.8,
    water,
  };
}
