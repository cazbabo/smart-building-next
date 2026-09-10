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
 ],
};

// One atlas per kit means one colour scheme per kit, and a city where every
// building shares a palette reads as a single model rather than a place. Each
// kit therefore ships several atlases: the neutrals are identical across all of
// them so the city stays coherent, while the accent hues are pulled toward a
// different brand colour in each. Green and cyan are never re-aimed - they mark
// planting and water, which carry meaning in the scene.
const VARIANT_HUES = [null, 287, 250, 322, 215, 38];   // neutral, plum, periwinkle, rose, steel, sand
const SEMANTIC = new Set([95, 188]);
// A variant has to reach the building body, not just its trim: Kenney's
// commercial stock is mostly grey, so re-aiming the accents alone leaves the
// city monochrome. Variants therefore tint the neutrals too, hard enough to read
// across a district but well short of a painted facade.

// Hue families of the site palette. Source hue picks the family; the atlas keeps
// its own lightness so Kenney's baked shading and window detail survive.
const FAMILIES = [
 {upTo: 10, hue: 322, sat: 0.30},   // true red   -> dusty rose (signs, sirens)
 {upTo: 50, hue: 38, sat: 0.32},    // orange     -> wood; Kenney paints trunks,
                                    // roof tiles and terracotta at hue 15-20,
                                    // so the red family has to stop short of it
 {upTo: 70, hue: 46, sat: 0.30},    // yellow     -> warm stone
 {upTo: 160, hue: 95, sat: 0.24},   // green      -> sage, keeps planting legible
 {upTo: 200, hue: 188, sat: 0.42},  // cyan       -> water
 {upTo: 255, hue: 250, sat: 0.26},  // blue       -> periwinkle
 {upTo: 300, hue: 287, sat: 0.34},  // purple     -> plum
 {upTo: 361, hue: 320, sat: 0.30},  // magenta    -> rose
];
// Greys pick up a plum cast, but only as they get lighter: the palette's tinted
// neutrals (stone #dcd4e5, white #f6f1fa) are all pale, and carrying the same
// tint into mid and dark greys turns them muddy pink instead of lavender.
const NEUTRAL_HUE = 283;
const neutralSat = lightness => 0.012 + 0.085 * lightness ** 2;

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

function recolour(image, dominant = null) {
 const {rgba} = image;
 for (let i = 0; i < rgba.length; i += 4) {
  if (rgba[i + 3] === 0) continue;
  const [h, s, l] = toHsl(rgba[i], rgba[i + 1], rgba[i + 2]);
  const family = s >= 0.14 ? FAMILIES.find(f => h < f.upTo) : null;
  const semantic = family && SEMANTIC.has(family.hue);
  let hue, sat, lightness = l < 0.12 ? l + 0.05 : l;
  if (dominant !== null && !semantic) {
   // Keep a little internal spread so a building is not one flat colour.
   hue = dominant + (family ? FAMILIES.indexOf(family) % 3 - 1 : 0) * 13;
   sat = family ? Math.min(family.sat + 0.06, 0.3 + s * 0.4) : 0.3;
   // Kenney's commercial stock is near-white, and a tint at that lightness is
   // invisible. Compressing the range downward is what makes the variant read.
   lightness = 0.26 + lightness * 0.58;
  } else if (family) {
   hue = family.hue;
   sat = Math.min(family.sat, 0.25 + s * 0.45);
  } else {
   hue = NEUTRAL_HUE;
   sat = Math.min(s, neutralSat(l));
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
 VARIANT_HUES.forEach((dominant, index) => {
  const name = index === 0 ? 'colormap.png' : `colormap-${index}.png`;
  fs.writeFileSync(path.join(TARGET, kit, 'Textures', name), encodePng(recolour(decodePng(source), dominant)));
 });
}
const bytes = Object.entries(ROSTER).reduce((sum, [kit, names]) =>
 sum + names.reduce((n, name) => n + fs.statSync(path.join(TARGET, kit, `${name}.glb`)).size, 0), 0);
console.log(`${models} models, ${(bytes / 1024 / 1024).toFixed(2)} MB, 4 atlases repainted -> ${TARGET}`);
