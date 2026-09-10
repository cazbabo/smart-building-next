// Copies the models the scene actually loads out of assets/kenney and repaints
// each kit atlas into the city-intelligence palette. Run: npm run assets
import fs from 'node:fs';
import path from 'node:path';
import {decodePng, encodePng} from './png.mjs';
import {stripAttributes} from './glb.mjs';

const SOURCE = 'assets/kenney', TARGET = 'public/models';

// Only these reach the browser; the rest of each kit stays in assets/.
// The low-detail commercial blocks average 164 triangles against 1,089 for the
// detailed ones, so they carry the bulk of the city and the detailed models are
// spent where the camera is close.
const ROSTER = {
 commercial: [
  'building-a', 'building-b', 'building-c', 'building-d', 'building-e', 'building-f',
  'building-g', 'building-h', 'building-n',
  'building-skyscraper-a', 'building-skyscraper-b', 'building-skyscraper-c',
  'building-skyscraper-d', 'building-skyscraper-e',
  'low-detail-building-a', 'low-detail-building-b', 'low-detail-building-c',
  'low-detail-building-d', 'low-detail-building-e', 'low-detail-building-f',
  'low-detail-building-g', 'low-detail-building-h', 'low-detail-building-i',
  'low-detail-building-j', 'low-detail-building-k', 'low-detail-building-l',
  'low-detail-building-m', 'low-detail-building-n',
  'low-detail-building-wide-a', 'low-detail-building-wide-b',
  'detail-awning', 'detail-awning-wide', 'detail-overhang', 'detail-overhang-wide',
  'detail-parasol-a', 'detail-parasol-b',
 ],
 suburban: [
  'building-type-a', 'building-type-b', 'building-type-c', 'building-type-d',
  'building-type-e', 'building-type-f', 'building-type-g', 'building-type-h',
  'building-type-i', 'building-type-j', 'building-type-k', 'building-type-l',
  'building-type-n', 'building-type-p', 'building-type-r', 'building-type-t',
  'tree-large', 'tree-small', 'planter',
  'fence', 'fence-low', 'fence-1x3', 'fence-2x2',
  'path-long', 'path-stones-long', 'driveway-short',
 ],
 cars: ['sedan', 'taxi', 'van', 'suv', 'ambulance', 'police'],
 roads: [
  'traffic-light', 'traffic-light-hanging', 'electricity-pole', 'road-sign-street',
  'road-sign-warning', 'road-sign-stop', 'light-square', 'light-square-double',
  'light-curved', 'light-curved-double', 'dumpster', 'construction-barrier',
  'construction-cone',
  // Elevated expressway: deck, ramp and the columns that carry it.
  'road-straight', 'road-straight-barrier', 'road-slant-high-barrier', 'bridge-pillar-wide',
  'road-roundabout', 'road-curve', 'road-crossroad',
 ],
};

// Lime and orchid are the site's identity - data routes, forecast overlays, the
// interface - and the architecture is deliberately not part of that. Buildings
// keep real material colour, so Kenney's own hues are left alone here; only the
// most cartoon-saturated values are pulled back so the city sits on the pale
// canvas without shouting.
const SATURATION_CAP = 0.55;

// A city where every wall is the same grey reads as one model. Each kit ships
// several atlases whose walls take a different real building material; windows,
// doors, roof tiles and planting keep Kenney's own colour in all of them, so the
// variants change what a building is made of rather than repainting it.
// `value` scales the wall's lightness. Kenney renders walls near white, and a
// tint at that lightness is invisible, so a material that is genuinely darker in
// life - brick, slate - has to bring the lightness down with it to read.
const MATERIALS = [
 null,                                    // as authored: concrete and render
 {hue: 36, sat: 0.26, value: 0.94},       // warm stone
 {hue: 15, sat: 0.42, value: 0.62},       // brick
 {hue: 208, sat: 0.18, value: 0.74},      // slate
 {hue: 86, sat: 0.16, value: 0.84},       // weathered stone
 {hue: 30, sat: 0.34, value: 0.88},       // sandstone
];
// Walls are the unsaturated part of the atlas; anything above this is trim the
// variants must not touch.
const WALL_SATURATION = 0.18;

function toHsl(r, g, b) {
 r /= 255; g /= 255; b /= 255;
 const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
 if (max === min) return [0, 0, l];
 const d = max - min;
 const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
 let h;
 if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
 else if (max === g) h = (b - r) / d + 2;
 else h = (r - g) / d + 4;
 return [h * 60, s, l];
}

function toRgb(h, s, l) {
 if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
 const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
 const f = t => {
  t = (t + 360) % 360 / 360;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
 };
 return [f(h + 120), f(h), f(h - 120)].map(v => Math.max(0, Math.min(255, Math.round(v * 255))));
}

function recolour(image, material = null) {
 const {rgba} = image;
 for (let i = 0; i < rgba.length; i += 4) {
  if (rgba[i + 3] === 0) continue;
  const [h, s, l] = toHsl(rgba[i], rgba[i + 1], rgba[i + 2]);
  let hue = h, sat = Math.min(s, SATURATION_CAP), lightness = l < 0.1 ? l + 0.04 : l;
  if (material && s < WALL_SATURATION) {
   // Wall. Carry the atlas's own shading through as lightness so the baked
   // panel lines and storey shadows survive the change of material.
   hue = material.hue;
   sat = material.sat * (0.45 + 0.55 * l);
   lightness = Math.min(0.97, l * material.value);
  }
  const [r, g, b] = toRgb(hue, sat, lightness);
  rgba[i] = r; rgba[i + 1] = g; rgba[i + 2] = b;
 }
 return image;
}

let models = 0;
for (const [kit, names] of Object.entries(ROSTER)) {
 fs.mkdirSync(path.join(TARGET, kit, 'Textures'), {recursive: true});
 for (const name of names) {
  const from = path.join(SOURCE, kit, `${name}.glb`);
  if (!fs.existsSync(from)) throw new Error(`missing model ${from}`);
  fs.writeFileSync(path.join(TARGET, kit, `${name}.glb`), stripAttributes(fs.readFileSync(from)));
  models++;
 }
 const source = fs.readFileSync(path.join(SOURCE, kit, 'Textures/colormap.png'));
 MATERIALS.forEach((material, index) => {
  const name = index === 0 ? 'colormap.png' : `colormap-${index}.png`;
  fs.writeFileSync(path.join(TARGET, kit, 'Textures', name), encodePng(recolour(decodePng(source), material)));
 });
}
const bytes = Object.entries(ROSTER).reduce((sum, [kit, names]) =>
 sum + names.reduce((n, name) => n + fs.statSync(path.join(TARGET, kit, `${name}.glb`)).size, 0), 0);
console.log(`${models} models, ${(bytes / 1024 / 1024).toFixed(2)} MB, ${MATERIALS.length} atlases per kit -> ${TARGET}`);
