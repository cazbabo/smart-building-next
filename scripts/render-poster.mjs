// Offline render of the civic city for the static preview shown when WebGL is
// unavailable. Software rasteriser rather than a GPU: this box has no WebGL, and
// SVGRenderer cannot resolve the kit's texture atlas. Colour comes from the same
// atlas pixels and material colours the browser samples, so the poster tracks
// the real scene instead of drifting from it.
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

const WIDTH = 1600, HEIGHT = 1200, SPAN = 145;
const BACKGROUND = [250, 248, 252];                       // #FAF8FC, the page canvas
const SUN = new T.Vector3(-45, 85, 35).normalize();
const SKY = [255, 250, 255], GROUND = [138, 121, 151];

// POSTER_KIT=0 renders the procedural fallback instead, which is what the page
// draws if the kit cannot be fetched. Useful for telling the two apart.
const useKit = process.env.POSTER_KIT !== '0';
const output = process.env.POSTER_OUT ?? 'public/city-intelligence-civic.png';
const kit = useKit ? await loadKenneyKit(ORIGIN) : null;
if (useKit && !kit) throw new Error('kit failed to load');

// Pair each kit material with the atlas pixels its models sample.
const atlases = new Map();
for (const name of ['commercial', 'suburban', 'roads', 'cars']) {
 atlases.set(name, decodePng(fs.readFileSync(`public/models/${name}/Textures/colormap.png`)));
}
const materialAtlas = new Map();
for (const key of kit ? ['towers', 'blocks', 'houses', 'trees', 'street', 'cars'] : []) {
 for (const model of kit.group(key)) materialAtlas.set(model.material, atlases.get(model.name.split('/')[0]));
}

const city = createCivicCity(kit);
// The preview stands in for the whole scene on machines without WebGL, so it is
// rendered at the IoT chapter: the city connected to the command center with
// sensor markers up, and no flood or forecast overlay yet.
city.setStage('iot', 1);
city.update(6, 0, true);
city.root.updateMatrixWorld(true);

const camera = new T.OrthographicCamera(-SPAN / 2, SPAN / 2, SPAN / 2 * HEIGHT / WIDTH, -SPAN / 2 * HEIGHT / WIDTH, 0.1, 400);
const target = new T.Vector3(-15, 4, 0);
camera.position.copy(target).add(new T.Vector3(102, 100, 102));
camera.lookAt(target);
camera.updateMatrixWorld(true);
camera.updateProjectionMatrix();
const viewProjection = new T.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);

const pixels = Buffer.alloc(WIDTH * HEIGHT * 4);
for (let i = 0; i < WIDTH * HEIGHT; i++) {
 pixels[i * 4] = BACKGROUND[0]; pixels[i * 4 + 1] = BACKGROUND[1];
 pixels[i * 4 + 2] = BACKGROUND[2]; pixels[i * 4 + 3] = 255;
}
const depth = new Float32Array(WIDTH * HEIGHT).fill(Infinity);

const aces = v => {
 const out = (v * (2.51 * v + 0.03)) / (v * (2.43 * v + 0.59) + 0.14);
 return Math.max(0, Math.min(255, Math.round(255 * Math.pow(Math.max(out, 0), 1 / 2.2))));
};
function shade(normal, colour) {
 const lambert = Math.max(0, normal.dot(SUN));
 const hemi = 0.5 + 0.5 * normal.y;
 return colour.map((channel, index) => {
  const ambient = (SKY[index] * hemi + GROUND[index] * (1 - hemi)) / 255;
  return aces((channel / 255) * (0.34 * ambient + 1.02 * lambert) + 0.035 * lambert);
 });
}

const a = new T.Vector3(), b = new T.Vector3(), c = new T.Vector3(), normal = new T.Vector3();
function triangle(p0, p1, p2, colour, opacity = 1) {
 const [r, g, bl] = colour;
 const minX = Math.max(0, Math.floor(Math.min(p0.x, p1.x, p2.x)));
 const maxX = Math.min(WIDTH - 1, Math.ceil(Math.max(p0.x, p1.x, p2.x)));
 const minY = Math.max(0, Math.floor(Math.min(p0.y, p1.y, p2.y)));
 const maxY = Math.min(HEIGHT - 1, Math.ceil(Math.max(p0.y, p1.y, p2.y)));
 const area = (p1.y - p2.y) * (p0.x - p2.x) + (p2.x - p1.x) * (p0.y - p2.y);
 if (!area) return;
 for (let y = minY; y <= maxY; y++) {
  for (let x = minX; x <= maxX; x++) {
   const fx = x + 0.5, fy = y + 0.5;
   const w0 = ((p1.y - p2.y) * (fx - p2.x) + (p2.x - p1.x) * (fy - p2.y)) / area;
   const w1 = ((p2.y - p0.y) * (fx - p2.x) + (p0.x - p2.x) * (fy - p2.y)) / area;
   const w2 = 1 - w0 - w1;
   if (w0 < 0 || w1 < 0 || w2 < 0) continue;
   const z = w0 * p0.z + w1 * p1.z + w2 * p2.z;
   const slot = y * WIDTH + x;
   if (z >= depth[slot]) continue;
   // Translucent surfaces blend over what is already there and leave the depth
   // buffer alone, so several can stack without hiding the city behind them.
   if (opacity >= 1) {
    depth[slot] = z;
    pixels[slot * 4] = r; pixels[slot * 4 + 1] = g; pixels[slot * 4 + 2] = bl;
   } else {
    pixels[slot * 4] += (r - pixels[slot * 4]) * opacity;
    pixels[slot * 4 + 1] += (g - pixels[slot * 4 + 1]) * opacity;
    pixels[slot * 4 + 2] += (bl - pixels[slot * 4 + 2]) * opacity;
   }
  }
 }
}

const project = (source, out) => {
 out.copy(source).applyMatrix4(viewProjection);
 out.x = (out.x * 0.5 + 0.5) * WIDTH;
 out.y = (0.5 - out.y * 0.5) * HEIGHT;
 return out;
};

let drawn = 0;
const matrix = new T.Matrix4(), instance = new T.Matrix4();
const hidden = object => {
 for (let node = object; node; node = node.parent) if (!node.visible) return true;
 return false;
};
const queue = [];
city.root.traverse(object => {
 // Chapter state is expressed by toggling visibility, so hidden props stay out.
 if (object.isMesh && !hidden(object)) queue.push(object);
});
// Opaque geometry first, then the translucent data routes and overlays on top.
queue.sort((a, b) => Number(a.material.transparent) - Number(b.material.transparent));
for (const object of queue) {
 const opacity = object.material.transparent ? object.material.opacity ?? 1 : 1;
 const geometry = object.geometry;
 const position = geometry.getAttribute('position');
 const uv = geometry.getAttribute('uv');
 const index = geometry.index;
 const atlas = materialAtlas.get(object.material);
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
   triangle(project(a, a), project(b, b), project(c, c), shade(normal, colour), opacity);
   drawn++;
  }
 }
}

fs.writeFileSync(output, encodePng({width: WIDTH, height: HEIGHT, rgba: pixels}));
console.log(`poster (${useKit ? 'kit' : 'procedural'}): ${drawn} triangles -> ${output} (${(fs.statSync(output).size / 1024).toFixed(0)} KB)`);
