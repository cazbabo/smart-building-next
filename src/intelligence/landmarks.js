import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
// Landmark models built in Blender by scripts/blender/landmarks.py. Each one is
// a GLB in its district's own frame plus, for the parts that do not move, an
// ambient-occlusion lightmap baked with Cycles. The lightmap goes on as an aoMap
// - it darkens ambient and environment light only, so the real-time sun and its
// shadows stay in charge of the direct light, and nothing is darkened twice.
// Materials named screen* or light* are self-lit and never take it. The meshes are
// meshopt-compressed and quantised; the decoder ships inside three, so there is
// nothing extra to fetch.
const SELF_LIT=/^(screen|light)/;
export async function loadLandmarks(base='/landmarks',{textures=true}={}){
 const manifest=await (await fetch(`${base}/manifest.json`)).json();
 const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder),images=textures?new T.TextureLoader():null;
 const texture=async(file,colour)=>{
  const t=await images.loadAsync(`${base}/${file}`);
  // Blender writes its bake with glTF's orientation already in the UVs.
  t.flipY=false;t.colorSpace=colour?T.SRGBColorSpace:T.NoColorSpace;t.anisotropy=4;
  return t;
 };
 const entries={};
 await Promise.all(Object.entries(manifest).map(async([name,entry])=>{
  const gltf=await loader.loadAsync(`${base}/${entry.file}`);
  const nodes={};
  for(const [id,info] of Object.entries(entry.nodes)){
   const node=gltf.scene.getObjectByName(id);
   if(!node)throw new Error(`${entry.file} has no node ${id}`);
   // Quantisation keeps its dequantising scale and offset on the node itself, so
   // the node's transform is left alone and placement goes on a holder instead.
   node.removeFromParent();
   const holder=new T.Group();holder.name=id;holder.add(node);
   const ao=info.ao&&images?await texture(info.ao,false):null;
   const maps=images?Object.fromEntries(await Promise.all(Object.entries(info.maps??{}).map(async([mat,m])=>[mat,{texture:await texture(m.file,true),emissive:m.emissive}]))):{};
   node.traverse(o=>{
    if(!o.isMesh)return;
    o.castShadow=true;o.receiveShadow=true;
    // Materials are shared between nodes of one file; the lightmap belongs to
    // this node's UVs only, so it gets its own copy before the map goes on.
    const own=o.material.clone();own.name=o.material.name;
    if(ao&&!SELF_LIT.test(own.name)){own.aoMap=ao;own.aoMapIntensity=1;}
    const map=maps[own.name];
    // A self-lit map (the video wall) shows its own pixels untouched; a surface
    // map (the solar cells) is lit like everything else.
    if(map?.emissive){own.emissiveMap=map.texture;own.map=map.texture;own.color.set(0);own.emissive.set(1,1,1);own.toneMapped=false;}
    else if(map)own.map=map.texture;
    o.material=own;
   });
   nodes[id]=holder;
  }
  entries[name]={...entry,nodes};
 }));
 return {
  entry:name=>entries[name],
  /** A fresh copy of one node, sharing geometry and materials with the rest. */
  node:(name,id)=>entries[name].nodes[id].clone(),
  names:Object.keys(entries),
 };
}
