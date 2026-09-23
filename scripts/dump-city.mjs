// Flattens the real city - kit, landmarks and all - into world-space triangles
// for Blender, which rebuilds it for the Cycles poster and for the top-down
// ground occlusion bake (scripts/blender/city.py). Building it here, from
// civic-model.js itself, is what keeps both of those faithful to the page.
//   node scripts/dump-city.mjs [stage] [out.bin]
// Writes <out>.bin (float32 per vertex: position 3, normal 3, colour 3, uv 2)
// and <out>.json describing the groups.
import fs from 'node:fs';
import path from 'node:path';
import * as T from 'three';
import {installNodeDom, serveDirectory} from './node-dom.mjs';
import {decodePng} from './png.mjs';

const KIT = 'http://dump.local/models', LANDMARKS = 'http://dump.local/landmarks';
installNodeDom();
serveDirectory(KIT, 'public/models', fs, path);
serveDirectory(LANDMARKS, 'public/landmarks', fs, path);
const {loadKenneyKit} = await import('../src/intelligence/kenney-kit.js');
const {loadLandmarks} = await import('../src/intelligence/landmarks.js');
const {createCivicCity} = await import('../src/intelligence/civic-model.js');

const stage = process.argv[2] ?? 'iot';
const out = process.argv[3] ?? 'city-dump';
const kit = await loadKenneyKit(KIT);
const landmarks = await loadLandmarks(LANDMARKS, {textures: false});
const manifest = JSON.parse(fs.readFileSync('public/landmarks/manifest.json', 'utf8'));
const city = createCivicCity(kit, landmarks);
city.setStage(stage, 1);
city.update(6, 0, true);
city.root.updateMatrixWorld(true);

// Atlas pixels per kit material, so each triangle takes the colour the browser
// samples for it.
const atlas = new Map();
{
 const seen = new Map();
 for (const key of ['towers', 'blocks', 'fill', 'houses', 'trees', 'frontage', 'ground', 'lamps', 'signals', 'clutter', 'cars']) {
  for (const model of kit.group(key)) seen.set(model.name.split('/')[0], model);
 }
 for (const [name, model] of seen) {
  for (let v = 0; v < kit.variants; v++) {
   const file = v === 0 ? 'colormap.png' : `colormap-${v}.png`;
   atlas.set(kit.material(model, v), decodePng(fs.readFileSync(`public/models/${name}/Textures/${file}`)));
  }
 }
}
// Textures the landmarks carry, by material name.
const maps = {};
for (const entry of Object.values(manifest)) {
 for (const node of Object.values(entry.nodes)) {
  for (const [mat, m] of Object.entries(node.maps ?? {})) maps[mat] = m;
 }
}

const hidden = o => { for (let n = o; n; n = n.parent) if (!n.visible) return true; return false; };
const overlay = o => { for (let n = o; n; n = n.parent) if (['Connected data', 'IoT coverage', 'AI processing'].includes(n.name) || n === city.root.children[0]) return true; return false; };
const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };

const groups = new Map();
const group = (key, meta) => { if (!groups.has(key)) groups.set(key, {...meta, data: []}); return groups.get(key); };
const a = new T.Vector3(), n = new T.Vector3(), matrix = new T.Matrix4(), instance = new T.Matrix4(), normalMatrix = new T.Matrix3();
city.root.traverse(object => {
 if (!object.isMesh || hidden(object)) return;
 const materials = Array.isArray(object.material) ? object.material : [object.material];
 const geometry = object.geometry;
 const position = geometry.getAttribute('position'), normal = geometry.getAttribute('normal'), uv = geometry.getAttribute('uv');
 const index = geometry.index, count = index ? index.count : position.count;
 const instances = object.isInstancedMesh ? object.count : 1;
 for (const [slot, material] of materials.entries()) {
  // Geometry groups only select faces for a material array. BoxGeometry carries
  // six of them regardless, and honouring them on a single material kept one
  // face of every box.
  const range = Array.isArray(object.material) ? geometry.groups.filter(g => (g.materialIndex ?? 0) === slot) : [{start: 0, count}];
  const map = maps[material.name];
  const pixels = atlas.get(material);
  const role = object.userData.ground ? 'ground' : overlay(object) ? 'overlay' : 'solid';
  const emissive = material.emissive ? [material.emissive.r, material.emissive.g, material.emissive.b] : [0, 0, 0];
  const intensity = material.emissiveIntensity ?? 1;
  const meta = {
   role, roughness: material.roughness ?? 0.6, metalness: material.metalness ?? 0,
   opacity: material.transparent ? material.opacity : 1,
   emissive: material.isMeshBasicMaterial ? [material.color.r, material.color.g, material.color.b] : emissive.map(e => e * intensity),
   texture: map?.file ?? null, textureRole: map ? (map.emissive ? 'emissive' : 'base') : null,
  };
  const key = [role, material.uuid].join(':');
  const g = group(key, {name: material.name || material.type, ...meta});
  const base = material.color ? [material.color.r, material.color.g, material.color.b] : [0.8, 0.8, 0.8];
  for (let k = 0; k < instances; k++) {
   if (object.isInstancedMesh) { object.getMatrixAt(k, instance); matrix.multiplyMatrices(object.matrixWorld, instance); }
   else matrix.copy(object.matrixWorld);
   normalMatrix.getNormalMatrix(matrix);
   for (const r of range) {
    for (let i = r.start; i < r.start + r.count; i += 3) {
     const ids = [0, 1, 2].map(j => index ? index.getX(i + j) : i + j);
     let colour = base;
     if (pixels && uv) {
      const u = ids.reduce((s, id) => s + uv.getX(id), 0) / 3, v = ids.reduce((s, id) => s + uv.getY(id), 0) / 3;
      const px = Math.min(pixels.width - 1, Math.max(0, Math.floor(u * pixels.width)));
      const py = Math.min(pixels.height - 1, Math.max(0, Math.floor(v * pixels.height)));
      const o = (py * pixels.width + px) * 4;
      colour = [0, 1, 2].map(c => base[c] * lin(pixels.rgba[o + c]));
     }
     for (const id of ids) {
      a.fromBufferAttribute(position, id).applyMatrix4(matrix);
      if (normal) n.fromBufferAttribute(normal, id).applyMatrix3(normalMatrix).normalize(); else n.set(0, 1, 0);
      g.data.push(a.x, a.y, a.z, n.x, n.y, n.z, ...colour, uv ? uv.getX(id) : 0, uv ? uv.getY(id) : 0);
     }
    }
   }
  }
 }
});

const header = {stage, groups: []};
const chunks = [];
let offset = 0;
for (const [, g] of groups) {
 const {data, ...meta} = g;
 const floats = new Float32Array(data);
 header.groups.push({...meta, offset, vertices: floats.length / 11});
 chunks.push(Buffer.from(floats.buffer));
 offset += floats.byteLength;
}
fs.writeFileSync(`${out}.bin`, Buffer.concat(chunks));
fs.writeFileSync(`${out}.json`, JSON.stringify(header));
const tris = header.groups.reduce((s, g) => s + g.vertices / 3, 0);
console.log(`city dump (${stage}): ${header.groups.length} groups, ${tris} triangles -> ${out}.bin`);
