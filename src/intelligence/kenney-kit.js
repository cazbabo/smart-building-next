import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Kenney CC0 kits, repainted into the site palette by scripts/build-kenney-assets.mjs.
// Every model is one material sampling one atlas per kit, so a kit collapses to a
// handful of shared materials and the scene can instance freely.
const CATALOGUE = {
 towers: ['commercial/building-skyscraper-a', 'commercial/building-skyscraper-b',
  'commercial/building-skyscraper-c', 'commercial/building-skyscraper-d',
  'commercial/building-skyscraper-e'],
 blocks: ['commercial/building-a', 'commercial/building-b', 'commercial/building-c',
  'commercial/building-d', 'commercial/building-e', 'commercial/building-f',
  'commercial/building-g', 'commercial/building-h', 'commercial/building-n'],
 houses: ['suburban/building-type-a', 'suburban/building-type-b', 'suburban/building-type-c',
  'suburban/building-type-d', 'suburban/building-type-e', 'suburban/building-type-f',
  'suburban/building-type-g', 'suburban/building-type-h', 'suburban/building-type-i',
  'suburban/building-type-j', 'suburban/building-type-k', 'suburban/building-type-l'],
 trees: ['suburban/tree-large', 'suburban/tree-small'],
 street: ['suburban/planter', 'roads/traffic-light', 'roads/electricity-pole', 'roads/road-sign-street'],
 cars: ['cars/sedan', 'cars/taxi', 'cars/van', 'cars/suv', 'cars/ambulance', 'cars/police'],
};

// Bake node transforms into the geometry and merge the primitives, so a model
// becomes one geometry that InstancedMesh can place without a wrapper Object3D.
function flatten(scene) {
 const parts = [];
 let material = null;
 scene.updateMatrixWorld(true);
 scene.traverse(object => {
  if (!object.isMesh) return;
  const geometry = object.geometry.clone().applyMatrix4(object.matrixWorld);
  for (const name of Object.keys(geometry.attributes)) {
   if (!['position', 'normal', 'uv'].includes(name)) geometry.deleteAttribute(name);
  }
  parts.push(geometry);
  material ??= object.material;
 });
 if (!parts.length) return null;
 const geometry = parts.length === 1 ? parts[0] : mergeGeometries(parts, false);
 geometry.computeBoundingBox();
 return {geometry, material};
}

function describe(name, {geometry, material}) {
 const box = geometry.boundingBox, size = new T.Vector3();
 box.getSize(size);
 return {
  name, geometry, material,
  width: size.x, height: size.y, depth: size.z,
  footprint: Math.max(size.x, size.z) || 1,
  base: box.min.y,
 };
}

export async function loadKenneyKit(base = '/models') {
 const loader = new GLTFLoader();
 const names = [...new Set(Object.values(CATALOGUE).flat())];
 const loaded = await Promise.all(names.map(async name => {
  const gltf = await loader.loadAsync(`${base}/${name}.glb`);
  const flat = flatten(gltf.scene);
  return flat && describe(name, flat);
 }));

 const byName = new Map();
 for (const model of loaded) if (model) byName.set(model.name, model);
 // A kit is unusable if any group came back empty; the caller falls back rather
 // than drawing half a city.
 for (const group of Object.values(CATALOGUE)) {
  if (!group.some(name => byName.has(name))) return null;
 }

 const group = key => CATALOGUE[key].map(name => byName.get(name)).filter(Boolean);
 const materials = new Set();
 for (const model of byName.values()) {
  model.material.roughness = 0.78;
  model.material.metalness = 0;
  materials.add(model.material);
 }

 return {
  get: name => byName.get(name),
  group,
  materials: [...materials],
  /**
   * The `count` models whose natural height lands closest to `height` once
   * scaled to `footprint`. Returning several rather than the single best is what
   * lets a block of the same target height still read as different buildings.
   */
  fit(key, height, footprint, count = 4) {
   return group(key)
    .map(model => [Math.abs(Math.log((model.height * footprint / model.footprint) / height)), model])
    .sort((a, b) => a[0] - b[0])
    .slice(0, count)
    .map(([, model]) => model);
  },
 };
}

/**
 * Collects placements per model and emits one InstancedMesh each, so a city of
 * hundreds of buildings costs a draw call per distinct model rather than per building.
 */
export class KitPlacer {
 constructor() { this.queues = new Map(); }

 /**
  * `owner` is the group the instances belong to - a district, or the city root.
  * Instances are kept under their owner so Explore's click-to-focus still finds
  * the district through userData.asset on the way up the parent chain.
  */
 place(model, {owner, x, y = 0, z, scale = 1, rotation = 0}) {
  if (!model) return;
  if (!this.queues.has(owner)) this.queues.set(owner, new Map());
  const byModel = this.queues.get(owner);
  if (!byModel.has(model)) byModel.set(model, []);
  byModel.get(model).push(new T.Matrix4().compose(
   new T.Vector3(x, y - model.base * scale, z),
   new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), rotation),
   new T.Vector3(scale, scale, scale),
  ));
 }

 build() {
  for (const [owner, byModel] of this.queues) {
   for (const [model, matrices] of byModel) {
    const mesh = new T.InstancedMesh(model.geometry, model.material, matrices.length);
    matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = model.name;
    owner.add(mesh);
   }
  }
  this.queues.clear();
 }
}
