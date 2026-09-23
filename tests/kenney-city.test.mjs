// Builds the real city with the real kit under Node, so the GLB pipeline and the
// scene assembly are checked without a browser. three's FileLoader builds a
// Request before fetching and Node rejects relative URLs there, so the kit is
// loaded from a stand-in origin that this shim serves out of public/.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import * as T from 'three';
import {installNodeDom, serveDirectory} from '../scripts/node-dom.mjs';

const ORIGIN = 'http://kit.test/models', LANDMARKS = 'http://kit.test/landmarks';
installNodeDom();
serveDirectory(ORIGIN, 'public/models', fs, path);
serveDirectory(LANDMARKS, 'public/landmarks', fs, path);

const {loadKenneyKit} = await import('../src/intelligence/kenney-kit.js');
const {loadLandmarks} = await import('../src/intelligence/landmarks.js');
const {createCivicCity} = await import('../src/intelligence/civic-model.js');

const kit = await loadKenneyKit(ORIGIN);
assert.ok(kit, 'kit loads');
// The Blender landmarks: every manifest entry decodes (meshopt, quantised) and
// every node the city asks for is present. Textures are the browser's job.
const landmarks = await loadLandmarks(LANDMARKS, {textures: false});
for (const name of ['command', 'civic', 'barrier', 'turbine', 'industry', 'transit', 'solar']) {
 assert.ok(landmarks.names.includes(name), `${name} landmark loads`);
 for (const id of Object.keys(landmarks.entry(name).nodes)) {
  const node = landmarks.node(name, id);
  let triangles = 0;
  node.traverse(o => { if (o.isMesh) triangles += (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3; });
  assert.ok(triangles > 0, `${name}/${id} has geometry`);
  const box = new T.Box3().setFromObject(node);
  assert.ok([...box.min.toArray(), ...box.max.toArray()].every(Number.isFinite), `${name}/${id} has finite bounds`);
 }
}
// Moving parts are built round their pivots. A three-bladed rotor's bounding
// box is lopsided (one blade straight up, two at -30 degrees), so the rotor is
// checked by its vertex centroid, which symmetric blades put on the hub.
const centroid = node => {
 node.updateMatrixWorld(true);
 const sum = new T.Vector3(), v = new T.Vector3();
 let count = 0;
 node.traverse(o => {
  if (!o.isMesh) return;
  const p = o.geometry.attributes.position;
  for (let i = 0; i < p.count; i++) { sum.add(v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld)); count++; }
 });
 return sum.divideScalar(count);
};
assert.ok(centroid(landmarks.node('turbine', 'turbine-rotor')).length() < 0.35, 'rotor pivots on its hub');
const gateBox = new T.Box3().setFromObject(landmarks.node('barrier', 'gate-0'));
assert.ok(gateBox.getCenter(new T.Vector3()).length() < 0.3, 'gate leaf is built round its centre');
for (const group of ['towers', 'blocks', 'houses', 'trees', 'cars']) {
 assert.ok(kit.group(group).length > 0, `${group} present`);
}
for (const model of kit.group('blocks')) {
 assert.ok(model.height > 0 && model.footprint > 0, `${model.name} has extent`);
 assert.ok(Number.isFinite(model.base), `${model.name} has a base`);
 assert.equal(model.geometry.getAttribute('tangent'), undefined, `${model.name} carries no tangent`);
}

const city = createCivicCity(kit, landmarks);
const survey = () => {
 let meshes = 0, instances = 0, triangles = 0;
 city.root.traverse(object => {
  assert.ok([...object.position, ...object.quaternion, ...object.scale].every(Number.isFinite),
   `${object.name || object.type} has finite transform`);
  if (!object.isMesh) return;
  meshes++;
  const count = object.isInstancedMesh ? object.count : 1;
  instances += count;
  const index = object.geometry.index;
  triangles += (index ? index.count : object.geometry.attributes.position.count) / 3 * count;
 });
 return {meshes, instances, triangles};
};
const baseline = survey();

// The story props civic-motion.js drives must survive the kit swap.
assert.ok(city.rotors.length > 0, 'wind turbines remain');
assert.equal(city.vehicles.length, 8, 'the ground loop keeps its eight cars');
assert.equal(city.rotors.length, 3, 'three modelled turbines turn');
assert.equal(city.gates.length, 5, 'the modelled barrier brings five gate leaves');
city.setStage('flood', 1); city.update(1, 0.03, true);
assert.ok(city.gates.every(g => Math.abs(g.position.y - 2.4) < 1e-6), 'gates lift to 2.4 at the height of the flood');
city.setStage('overview', 0); city.update(1, 0.03, true);
assert.ok(city.gates.every(g => Math.abs(g.position.y - 1.5) < 1e-6), 'and settle back to 1.5');
assert.ok(city.waterSurface, 'flood water surface remains');
for (const id of ['civic', 'hospital', 'school', 'water', 'industry', 'energy', 'transit', 'command']) {
 assert.ok(city.locations[id], `${id} keeps a location`);
 assert.ok(city.assets[id], `${id} keeps a clickable group`);
}
// Kit buildings must sit inside their district so Explore can resolve a click.
const owners = new Set();
for (const [id, group] of Object.entries(city.assets)) {
 group.traverse(object => { if (object.isInstancedMesh) owners.add(id); });
}
assert.ok(owners.size >= 6, `kit buildings land in districts (${[...owners].join(', ')})`);

for (const [id, progress] of [['overview', 0], ['foundation', 1], ['flood', 1], ['ai', 1], ['roadmap', 0]]) {
 city.setStage(id, progress);
 city.update(4, 0.03, true);
 assert.deepEqual(survey(), baseline, `${id} does not change geometry`);
}

console.log(`kenney city ok: ${baseline.meshes} meshes, ${baseline.instances} instances, ${Math.round(baseline.triangles)} triangles`);
