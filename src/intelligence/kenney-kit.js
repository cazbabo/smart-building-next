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
 // Cheap background stock: a sixth of the triangles of the detailed blocks, so
 // the city can be filled in properly without spending the frame on rooftops
 // nobody looks at.
 fill: ['commercial/low-detail-building-a', 'commercial/low-detail-building-b',
  'commercial/low-detail-building-c', 'commercial/low-detail-building-d',
  'commercial/low-detail-building-e', 'commercial/low-detail-building-f',
  'commercial/low-detail-building-g', 'commercial/low-detail-building-h',
  'commercial/low-detail-building-i', 'commercial/low-detail-building-j',
  'commercial/low-detail-building-k', 'commercial/low-detail-building-l',
  'commercial/low-detail-building-m', 'commercial/low-detail-building-n',
  'commercial/low-detail-building-wide-a', 'commercial/low-detail-building-wide-b'],
 houses: ['suburban/building-type-a', 'suburban/building-type-b', 'suburban/building-type-c',
  'suburban/building-type-d', 'suburban/building-type-e', 'suburban/building-type-f',
  'suburban/building-type-g', 'suburban/building-type-h', 'suburban/building-type-i',
  'suburban/building-type-j', 'suburban/building-type-k', 'suburban/building-type-l',
  'suburban/building-type-n', 'suburban/building-type-p', 'suburban/building-type-r',
  'suburban/building-type-t'],
 trees: ['suburban/tree-large', 'suburban/tree-small'],
 // Awnings and parasols break up a bare facade at street level.
 frontage: ['commercial/detail-awning', 'commercial/detail-awning-wide',
  'commercial/detail-overhang', 'commercial/detail-overhang-wide',
  'commercial/detail-parasol-a', 'commercial/detail-parasol-b'],
 ground: ['suburban/planter', 'suburban/fence', 'suburban/fence-low', 'suburban/fence-1x3',
  'suburban/fence-2x2', 'suburban/path-long', 'suburban/path-stones-long',
  'suburban/driveway-short'],
 lamps: ['roads/light-square', 'roads/light-square-double', 'roads/light-curved',
  'roads/light-curved-double', 'roads/electricity-pole'],
 signals: ['roads/traffic-light', 'roads/traffic-light-hanging', 'roads/road-sign-street',
  'roads/road-sign-warning', 'roads/road-sign-stop'],
 clutter: ['roads/dumpster', 'roads/construction-barrier', 'roads/construction-cone'],
 cars: ['cars/sedan', 'cars/taxi', 'cars/van', 'cars/suv', 'cars/ambulance', 'cars/police'],
};

// Atlas variants written by scripts/build-kenney-assets.mjs. Index 0 is the base
// atlas the GLB already references; the rest re-aim the accent hues.
const VARIANTS = 6;

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

export async function loadKenneyKit(base_url = '/models') {
 const loader = new GLTFLoader();
 const names = [...new Set(Object.values(CATALOGUE).flat())];
 const loaded = await Promise.all(names.map(async name => {
  const gltf = await loader.loadAsync(`${base_url}/${name}.glb`);
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

 // Each GLB is fetched separately, so GLTFLoader hands back its own material and
 // its own copy of the kit's atlas - dozens of uploads of one image. Collapse
 // them to one material per kit, then clone that once per atlas variant, so
 // colour variety costs a handful of materials rather than one per building.
 const textures = new T.TextureLoader();
 const variantMaterial = new Map();
 const kits = [...new Set(names.map(name => name.split('/')[0]))];
 await Promise.all(kits.map(async kit => {
  const owned = [...byName.values()].filter(model => model.name.startsWith(`${kit}/`));
  const base = owned[0]?.material;
  if (!base) return;
  base.roughness = 0.78;
  base.metalness = 0;
  for (const model of owned) {
   if (model.material !== base) model.material.dispose();
   model.material = base;
  }
  const clones = [base];
  for (let index = 1; index < VARIANTS; index++) {
   const map = await textures.loadAsync(`${base_url}/${kit}/Textures/colormap-${index}.png`);
   map.flipY = false;
   map.colorSpace = base.map?.colorSpace ?? T.SRGBColorSpace;
   map.wrapS = map.wrapT = T.ClampToEdgeWrapping;
   map.minFilter = base.map?.minFilter ?? T.LinearMipmapLinearFilter;
   map.magFilter = base.map?.magFilter ?? T.LinearFilter;
   const clone = base.clone();
   clone.map = map;
   clones.push(clone);
  }
  variantMaterial.set(kit, clones);
 }));
 const materials = [...variantMaterial.values()].flat();

 return {
  get: name => byName.get(name),
  group,
  materials,
  variants: VARIANTS,
  /** Material for `model` in atlas variant `index`, falling back to its own. */
  material(model, index = 0) {
   const clones = variantMaterial.get(model.name.split('/')[0]);
   return clones?.[index % clones.length] ?? model.material;
  },
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
 constructor(kit) { this.kit = kit; this.queues = new Map(); }

 /**
  * `owner` is the group the instances belong to - a district, or the city root.
  * Instances are kept under their owner so Explore's click-to-focus still finds
  * the district through userData.asset on the way up the parent chain.
  * `variant` selects an atlas, which is how two of the same model end up
  * different colours.
  */
 place(model, {owner, x, y = 0, z, scale = 1, rotation = 0, variant = 0}) {
  if (!model) return;
  if (!this.queues.has(owner)) this.queues.set(owner, new Map());
  const byModel = this.queues.get(owner);
  const key = `${model.name}#${variant}`;
  if (!byModel.has(key)) byModel.set(key, {model, variant, matrices: []});
  byModel.get(key).matrices.push(new T.Matrix4().compose(
   new T.Vector3(x, y - model.base * scale, z),
   new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), rotation),
   new T.Vector3(scale, scale, scale),
  ));
 }

 build() {
  for (const [owner, byModel] of this.queues) {
   for (const [key, {model, variant, matrices}] of byModel) {
    const mesh = new T.InstancedMesh(model.geometry, this.kit.material(model, variant), matrices.length);
    matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = key;
    owner.add(mesh);
   }
  }
  this.queues.clear();
 }
}
