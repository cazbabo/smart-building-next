import * as T from 'three';
// Contact shadows for the whole city, baked. scripts/blender/city.py renders
// ambient occlusion straight down onto the ground with every building, tree,
// lamp and parked car invisible to the camera but still in the way of the
// occlusion rays, so the ground comes out dark wherever something stands on or
// beside it. The page projects that image back onto the ground surfaces by
// world X and Z - the meshes civic-model.js tags as ground - which gives every
// kit instance a soft footprint without one extra draw call or texture per
// building. Real-time AO (civic-post.js) still handles what moves.
export async function loadGroundAO(base='/city'){
 const [bounds,texture]=await Promise.all([
  fetch(`${base}/ground-ao.json`).then(r=>{if(!r.ok)throw new Error(r.status);return r.json();}),
  new T.TextureLoader().loadAsync(`${base}/ground-ao.jpg`),
 ]);
 texture.colorSpace=T.NoColorSpace;texture.anisotropy=4;
 return {bounds,texture};
}

/** Swaps every tagged ground mesh onto a copy of its material that reads the
 *  map. Ambient light takes the full occlusion; the sun takes part of it, which
 *  is not physical but is what makes a footprint visible in full daylight. */
export function applyGroundAO(root,{bounds,texture},{strength=.9,direct=.5}={}){
 const uniforms={
  uGroundAO:{value:texture},
  uGroundMin:{value:new T.Vector2(...bounds.min)},
  uGroundSize:{value:new T.Vector2(...bounds.size)},
  uGroundStrength:{value:strength},
  uGroundDirect:{value:direct},
 };
 const copies=new Map();
 const patch=material=>{
  if(copies.has(material))return copies.get(material);
  const m=material.clone();
  m.onBeforeCompile=shader=>{
   Object.assign(shader.uniforms,uniforms);
   shader.vertexShader=shader.vertexShader
    .replace('#include <common>','#include <common>\nvarying vec2 vGroundUv;\nuniform vec2 uGroundMin;\nuniform vec2 uGroundSize;')
    .replace('#include <project_vertex>',`#include <project_vertex>
    {vec4 groundWorld=modelMatrix*vec4(transformed,1.0);
     // The bake looks straight down with -Z at the top of the image.
     vGroundUv=vec2((groundWorld.x-uGroundMin.x)/uGroundSize.x,1.0-(groundWorld.z-uGroundMin.y)/uGroundSize.y);}`);
   shader.fragmentShader=shader.fragmentShader
    .replace('#include <common>','#include <common>\nvarying vec2 vGroundUv;\nuniform sampler2D uGroundAO;\nuniform float uGroundStrength;\nuniform float uGroundDirect;')
    .replace('#include <aomap_fragment>',`#include <aomap_fragment>
    {float groundAO=mix(1.0,texture2D(uGroundAO,vGroundUv).r,uGroundStrength);
     reflectedLight.indirectDiffuse*=groundAO;reflectedLight.indirectSpecular*=groundAO;
     reflectedLight.directDiffuse*=mix(1.0,groundAO,uGroundDirect);}`);
  };
  m.customProgramCacheKey=()=>'ground-ao';
  copies.set(material,m);
  return m;
 };
 let count=0;
 root.traverse(o=>{if(o.isMesh&&o.userData.ground){o.material=patch(o.material);count++;}});
 return count;
}
