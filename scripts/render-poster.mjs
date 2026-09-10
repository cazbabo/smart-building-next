// Offline render of the civic city for the static preview shown when WebGL is
// unavailable. Software rasteriser rather than a GPU: this box has no WebGL, and
// SVGRenderer cannot resolve the kit's texture atlas. Colour comes from the same
// atlas pixels and material colours the browser samples, and the light rig
// mirrors civic-scene.js, so the preview tracks the real scene.
import fs from 'node:fs';
import path from 'node:path';
import * as T from 'three';
import {installNodeDom, serveDirectory} from './node-dom.mjs';
import {decodePng, encodePng} from './png.mjs';

const ORIGIN = 'http://kit.local/models';
installNodeDom();
serveDirectory(ORIGIN, 'public/models', fs, path);

const {loadKenneyKit} = await import('../src/intelligence/kenney-kit.js');
const {createCivicCity} = await import('../src/intelligence/civic-model.js');

const WIDTH = 1600, HEIGHT = 1200, SPAN = 145, SHADOW = 2048;
const BACKGROUND = [250, 248, 252];                       // #FAF8FC, the page canvas
// Matches the rig in civic-scene.js: a low hemisphere so the key light carries
// the form, plus a cool fill that keeps the shaded faces readable.
const SUN = new T.Vector3(-45, 85, 35).normalize();
const FILL = new T.Vector3(55, 35, -40).normalize();
const SKY = [255, 250, 255], GROUND = [138, 121, 151], FILL_COLOUR = [205, 188, 245];
const HEMI = 0.62, KEY = 3.1 / 3.4, FILL_STRENGTH = 0.5 / 3.4, EXPOSURE = 1.08;

// POSTER_KIT=0 renders the procedural fallback instead, which is what the page
// draws if the kit cannot be fetched. Useful for telling the two apart.
const useKit = process.env.POSTER_KIT !== '0';
const output = process.env.POSTER_OUT ?? 'public/city-intelligence-civic.png';
const kit = useKit ? await loadKenneyKit(ORIGIN) : null;
if (useKit && !kit) throw new Error('kit failed to load');

// Pair every kit material - one per kit per atlas variant - with the pixels it
// samples, so the preview picks up the colour variety the page shows.
const materialAtlas = new Map();
if (kit) {
 const seen = new Map();
 for (const key of ['towers', 'blocks', 'fill', 'houses', 'trees', 'frontage', 'ground', 'lamps', 'signals', 'clutter', 'cars']) {
  for (const model of kit.group(key)) seen.set(model.name.split('/')[0], model);
 }
 for (const [name, model] of seen) {
  for (let variant = 0; variant < kit.variants; variant++) {
   const file = variant === 0 ? 'colormap.png' : `colormap-${variant}.png`;
   materialAtlas.set(kit.material(model, variant), decodePng(fs.readFileSync(`public/models/${name}/Textures/${file}`)));
  }
 }
}

const city = createCivicCity(kit);
// The preview stands in for the whole scene on machines without WebGL, so it is
// rendered at the IoT chapter: the city connected to the command center with
// sensor markers up, and no flood or forecast overlay yet.
city.setStage('iot', 1);
city.update(6, 0, true);
city.root.updateMatrixWorld(true);

// ---- collect world-space triangles -----------------------------------------
const hidden = object => {
 for (let node = object; node; node = node.parent) if (!node.visible) return true;
 return false;
};
const meshes = [];
city.root.traverse(object => { if (object.isMesh && !hidden(object)) meshes.push(object); });
meshes.sort((a, b) => Number(a.material.transparent) - Number(b.material.transparent));

const triangles = [];
const bounds = new T.Box3();
{
 const a = new T.Vector3(), b = new T.Vector3(), c = new T.Vector3(), normal = new T.Vector3();
 const matrix = new T.Matrix4(), instance = new T.Matrix4();
 for (const object of meshes) {
  const geometry = object.geometry;
  const position = geometry.getAttribute('position'), uv = geometry.getAttribute('uv');
  const index = geometry.index;
  const atlas = materialAtlas.get(object.material);
  const opacity = object.material.transparent ? object.material.opacity ?? 1 : 1;
  const base = object.material.color
   ? [object.material.color.r * 255, object.material.color.g * 255, object.material.color.b * 255]
   : [200, 200, 200];
  const count = index ? index.count : position.count;
  const instances = object.isInstancedMesh ? object.count : 1;
  for (let n = 0; n < instances; n++) {
   if (object.isInstancedMesh) {
    object.getMatrixAt(n, instance);
    matrix.multiplyMatrices(object.matrixWorld, instance);
   } else matrix.copy(object.matrixWorld);
   for (let i = 0; i < count; i += 3) {
    const i0 = index ? index.getX(i) : i, i1 = index ? index.getX(i + 1) : i + 1, i2 = index ? index.getX(i + 2) : i + 2;
    a.fromBufferAttribute(position, i0).applyMatrix4(matrix);
    b.fromBufferAttribute(position, i1).applyMatrix4(matrix);
    c.fromBufferAttribute(position, i2).applyMatrix4(matrix);
    normal.copy(b).sub(a).cross(c.clone().sub(a)).normalize();
    let colour = base;
    if (atlas && uv) {
     const u = (uv.getX(i0) + uv.getX(i1) + uv.getX(i2)) / 3;
     const v = (uv.getY(i0) + uv.getY(i1) + uv.getY(i2)) / 3;
     const px = Math.min(atlas.width - 1, Math.max(0, Math.floor(u * atlas.width)));
     const py = Math.min(atlas.height - 1, Math.max(0, Math.floor(v * atlas.height)));
     const offset = (py * atlas.width + px) * 4;
     colour = [atlas.rgba[offset], atlas.rgba[offset + 1], atlas.rgba[offset + 2]];
    }
    triangles.push({
     v: [a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z],
     n: [normal.x, normal.y, normal.z], colour, opacity,
    });
    bounds.expandByPoint(a); bounds.expandByPoint(b); bounds.expandByPoint(c);
   }
  }
 }
}

// ---- generic rasteriser -----------------------------------------------------
/** Rasterises `tris` through `project`, calling `plot(x, y, z, tri, w0, w1, w2)`. */
function raster(tris, project, width, height, plot) {
 const p0 = new T.Vector3(), p1 = new T.Vector3(), p2 = new T.Vector3(), work = new T.Vector3();
 for (const tri of tris) {
  project(work.set(tri.v[0], tri.v[1], tri.v[2]), p0);
  project(work.set(tri.v[3], tri.v[4], tri.v[5]), p1);
  project(work.set(tri.v[6], tri.v[7], tri.v[8]), p2);
  const area = (p1.y - p2.y) * (p0.x - p2.x) + (p2.x - p1.x) * (p0.y - p2.y);
  if (!area) continue;
  const minX = Math.max(0, Math.floor(Math.min(p0.x, p1.x, p2.x)));
  const maxX = Math.min(width - 1, Math.ceil(Math.max(p0.x, p1.x, p2.x)));
  const minY = Math.max(0, Math.floor(Math.min(p0.y, p1.y, p2.y)));
  const maxY = Math.min(height - 1, Math.ceil(Math.max(p0.y, p1.y, p2.y)));
  for (let y = minY; y <= maxY; y++) {
   for (let x = minX; x <= maxX; x++) {
    const fx = x + 0.5, fy = y + 0.5;
    const w0 = ((p1.y - p2.y) * (fx - p2.x) + (p2.x - p1.x) * (fy - p2.y)) / area;
    const w1 = ((p2.y - p0.y) * (fx - p2.x) + (p0.x - p2.x) * (fy - p2.y)) / area;
    const w2 = 1 - w0 - w1;
    if (w0 < 0 || w1 < 0 || w2 < 0) continue;
    plot(x, y, w0 * p0.z + w1 * p1.z + w2 * p2.z, tri, w0, w1, w2);
   }
  }
 }
}

// ---- shadow pass ------------------------------------------------------------
// The city is lit by one directional light, so one depth map from the sun's
// point of view is all the occlusion information the preview needs.
const centre = bounds.getCenter(new T.Vector3()), extent = bounds.getSize(new T.Vector3()).length();
const sunCamera = new T.OrthographicCamera(-extent / 2, extent / 2, extent / 2, -extent / 2, 0.1, extent * 2);
sunCamera.position.copy(centre).addScaledVector(SUN, extent * 0.8);
sunCamera.lookAt(centre);
sunCamera.updateMatrixWorld(true);
const sunMatrix = new T.Matrix4().multiplyMatrices(sunCamera.projectionMatrix, sunCamera.matrixWorldInverse);

const shadowDepth = new Float32Array(SHADOW * SHADOW).fill(Infinity);
const toShadow = (source, out) => {
 out.copy(source).applyMatrix4(sunMatrix);
 out.x = (out.x * 0.5 + 0.5) * SHADOW;
 out.y = (0.5 - out.y * 0.5) * SHADOW;
 return out;
};
const opaque = triangles.filter(tri => tri.opacity >= 1);
raster(opaque, toShadow, SHADOW, SHADOW, (x, y, z) => {
 const slot = y * SHADOW + x;
 if (z < shadowDepth[slot]) shadowDepth[slot] = z;
});

const shadowPoint = new T.Vector3(), worldPoint = new T.Vector3();
function litFraction(wx, wy, wz) {
 toShadow(worldPoint.set(wx, wy, wz), shadowPoint);
 const x = Math.round(shadowPoint.x), y = Math.round(shadowPoint.y);
 if (x < 1 || y < 1 || x >= SHADOW - 1 || y >= SHADOW - 1) return 1;
 // Sample a small neighbourhood so shadow edges are soft rather than stepped.
 let lit = 0, taps = 0;
 for (let dy = -1; dy <= 1; dy++) {
  for (let dx = -1; dx <= 1; dx++) {
   const nearest = shadowDepth[(y + dy) * SHADOW + x + dx];
   lit += shadowPoint.z - 0.0016 <= nearest ? 1 : 0;
   taps++;
  }
 }
 return lit / taps;
}

// ---- colour pass ------------------------------------------------------------
const camera = new T.OrthographicCamera(-SPAN / 2, SPAN / 2, SPAN / 2 * HEIGHT / WIDTH, -SPAN / 2 * HEIGHT / WIDTH, 0.1, 400);
const target = new T.Vector3(-15, 4, 0);
camera.position.copy(target).add(new T.Vector3(102, 100, 102));
camera.lookAt(target);
camera.updateMatrixWorld(true);
const viewProjection = new T.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
const toScreen = (source, out) => {
 out.copy(source).applyMatrix4(viewProjection);
 out.x = (out.x * 0.5 + 0.5) * WIDTH;
 out.y = (0.5 - out.y * 0.5) * HEIGHT;
 return out;
};

const pixels = Buffer.alloc(WIDTH * HEIGHT * 4);
for (let i = 0; i < WIDTH * HEIGHT; i++) {
 pixels[i * 4] = BACKGROUND[0]; pixels[i * 4 + 1] = BACKGROUND[1];
 pixels[i * 4 + 2] = BACKGROUND[2]; pixels[i * 4 + 3] = 255;
}
const depth = new Float32Array(WIDTH * HEIGHT).fill(Infinity);

const aces = v => {
 v *= EXPOSURE;
 const out = (v * (2.51 * v + 0.03)) / (v * (2.43 * v + 0.59) + 0.14);
 return Math.max(0, Math.min(255, Math.round(255 * Math.pow(Math.max(out, 0), 1 / 2.2))));
};
function shade(n, colour, lit) {
 const key = Math.max(0, n[0] * SUN.x + n[1] * SUN.y + n[2] * SUN.z) * KEY * lit;
 const fill = Math.max(0, n[0] * FILL.x + n[1] * FILL.y + n[2] * FILL.z) * FILL_STRENGTH;
 const hemi = 0.5 + 0.5 * n[1];
 return colour.map((channel, index) => {
  const ambient = (SKY[index] * hemi + GROUND[index] * (1 - hemi)) / 255 * HEMI;
  const bounced = FILL_COLOUR[index] / 255 * fill;
  return aces((channel / 255) * (0.34 * ambient + key + bounced) + 0.03 * key);
 });
}

raster(triangles, toScreen, WIDTH, HEIGHT, (x, y, z, tri, w0, w1, w2) => {
 const slot = y * WIDTH + x;
 if (z >= depth[slot]) return;
 const wx = w0 * tri.v[0] + w1 * tri.v[3] + w2 * tri.v[6];
 const wy = w0 * tri.v[1] + w1 * tri.v[4] + w2 * tri.v[7];
 const wz = w0 * tri.v[2] + w1 * tri.v[5] + w2 * tri.v[8];
 const [r, g, b] = shade(tri.n, tri.colour, litFraction(wx, wy, wz));
 // Translucent surfaces blend over what is already there and leave the depth
 // buffer alone, so several can stack without hiding the city behind them.
 if (tri.opacity >= 1) {
  depth[slot] = z;
  pixels[slot * 4] = r; pixels[slot * 4 + 1] = g; pixels[slot * 4 + 2] = b;
 } else {
  pixels[slot * 4] += (r - pixels[slot * 4]) * tri.opacity;
  pixels[slot * 4 + 1] += (g - pixels[slot * 4 + 1]) * tri.opacity;
  pixels[slot * 4 + 2] += (b - pixels[slot * 4 + 2]) * tri.opacity;
 }
});

fs.writeFileSync(output, encodePng({width: WIDTH, height: HEIGHT, rgba: pixels}));
console.log(`poster (${useKit ? 'kit' : 'procedural'}): ${triangles.length} triangles, ${opaque.length} casting -> ${output} (${(fs.statSync(output).size / 1024).toFixed(0)} KB)`);
