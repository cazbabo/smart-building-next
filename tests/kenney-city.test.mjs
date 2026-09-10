// Builds the real city with the real kit under Node, so the GLB pipeline and the
// scene assembly are checked without a browser. three's FileLoader builds a
// Request before fetching and Node rejects relative URLs there, so the kit is
// loaded from a stand-in origin that this shim serves out of public/.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {installNodeDom, serveDirectory} from '../scripts/node-dom.mjs';

const ORIGIN = 'http://kit.test/models';
installNodeDom();
serveDirectory(ORIGIN, 'public/models', fs, path);

const {loadKenneyKit} = await import('../src/intelligence/kenney-kit.js');
const {createCivicCity} = await import('../src/intelligence/civic-model.js');

const kit = await loadKenneyKit(ORIGIN);
assert.ok(kit, 'kit loads');
for (const group of ['towers', 'blocks', 'houses', 'trees', 'cars']) {
 assert.ok(kit.group(group).length > 0, `${group} present`);
}
for (const model of kit.group('blocks')) {
 assert.ok(model.height > 0 && model.footprint > 0, `${model.name} has extent`);
 assert.ok(Number.isFinite(model.base), `${model.name} has a base`);
 assert.equal(model.geometry.getAttribute('tangent'), undefined, `${model.name} carries no tangent`);
}

const city = createCivicCity(kit);
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
assert.ok(city.gates.length > 0, 'flood gates remain');
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
