import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {box,cylinder,tree,desk,pipe,mat,palette} from '../model-kit.js';
import {floors} from './data.js';

export async function createTwinScene(host,{onFloor,onDevice,onHover,onReady}){
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const canvas=document.createElement('canvas');let renderer,basic=false;
 const context=canvas.getContext('webgl2',{antialias:true,alpha:true});
 if(context){renderer=new THREE.WebGLRenderer({canvas,context,antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;}
 else {basic=true;const {SVGRenderer}=await import('three/addons/renderers/SVGRenderer.js');renderer=new SVGRenderer();renderer.setQuality('low');renderer.setPrecision(2);}
 host.prepend(renderer.domElement);renderer.domElement.classList.add('twin-renderer');renderer.domElement.setAttribute('aria-label','โมเดลอาคาร 5 ชั้น หมุน ซูม และเลือกชั้นได้');
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-28,28,22,-22,.1,250);
 const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=!basic;controls.enablePan=false;controls.minZoom=.65;controls.maxZoom=2.4;controls.minPolarAngle=.22;controls.maxPolarAngle=1.46;controls.target.set(0,10,0);camera.position.set(42,33,48);
 scene.add(new THREE.AmbientLight(0xffffff,basic?.8:1));scene.add(new THREE.HemisphereLight(0xe2f6ff,0x6b7d68,basic?.5:1.4));
 const sun=new THREE.DirectionalLight(0xfff0db,basic?1.6:3);sun.position.set(-25,45,30);sun.castShadow=!basic;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-35,right:35,top:40,bottom:-30,near:.5,far:140});sun.shadow.normalBias=.05;scene.add(sun);
 if(!basic){const pmrem=new THREE.PMREMGenerator(renderer),env=new RoomEnvironment();scene.environment=pmrem.fromScene(env,.04).texture;scene.environmentIntensity=.65;pmrem.dispose();env.dispose();}
 const silver=mat(0xd9e4de,{metalness:.25,roughness:.42}),rim=mat(0xf1f2e7),glass=mat(0x527887,{metalness:.65,roughness:.19}),frame=mat(0x758d94,{metalness:.5}),leaf=mat(0x6e9643),lime=mat(0xb0d233,{emissive:0x627e10,emissiveIntensity:.15}),solar=mat(0x214961,{metalness:.45,roughness:.27});
 const warningMaterial=mat(0xd4a052),alertMaterial=mat(0xd77956);
 const root=new THREE.Group();root.name='BUILDING';scene.add(root);
 const site=new THREE.Group();root.add(site);
 box(site,[35,.45,29],[0,-.65,0],mat(0xc8d3ce));box(site,[29,.22,24],[0,-.3,0],rim);
 for(const x of [-15,15])for(const z of [-10,-4,4,10]){box(site,[2.3,.35,2.3],[x,-.12,z],silver);tree(site,x,.1,z,1.2);}
 box(site,[16,.04,4],[0,-.15,12],mat(0xd1d8d3));for(let i=-7;i<8;i+=2)box(site,[1.2,.04,1.8],[i,-.1,12],rim);
 box(site,[6,.2,3],[4,.1,10.2],silver);box(site,[6,.05,2.8],[4,.23,10.2],leaf);
 const shadow=cylinder(site,19,.015,[0,-.9,0],mat(0xb9c8c4),48);shadow.scale.z=.8;shadow.renderOrder=-100;
 const levels=[],deviceObjects=new Map(),selectables=[];
 function device(parent,id,pos,type){const g=new THREE.Group();g.position.set(...pos);g.name=id;g.userData.device=id;parent.add(g);deviceObjects.set(id,g);selectables.push(g);
  if(type==='ahu'){box(g,[4,1.8,2.7],[0,.9,0],silver);box(g,[.07,1.2,2],[-2.04,1,0],palette.dark);for(const z of [-.55,.55]){const fan=cylinder(g,.44,.12,[-2.1,1,z],frame,12);fan.rotation.z=Math.PI/2;}box(g,[.7,.8,.12],[.8,1,1.4],palette.dark);box(g,[.48,.45,.05],[.8,1.06,1.49],lime);pipe(g,[[2,1,0],[3,1,0],[3,.3,3]],0x66bbcd,.13);}
  else if(type==='door'){box(g,[2.4,2.8,.22],[0,1.4,0],frame);box(g,[1.96,2.4,.25],[0,1.35,.06],glass);box(g,[.2,.55,.2],[1.4,1.5,.2],lime);}
  else if(type==='camera'){cylinder(g,.09,1,[0,.5,0],frame);box(g,[.6,.4,1],[0,1.1,.2],rim);box(g,[.35,.23,.06],[0,1.1,.74],palette.dark);}
  else if(type==='light'){box(g,[3,.18,.6],[0,2.3,0],lime);for(const x of [-1,1])box(g,[.025,.8,.025],[x,2.7,0],frame);}
  else if(type==='pump'){cylinder(g,.65,1.8,[0,.9,0],palette.blue);box(g,[2,.25,2],[0,.1,0],frame);pipe(g,[[0,1,0],[2,1,0],[2,.3,2]],0x74b9bc,.15);}
  else if(type==='solar'){for(let x=-3;x<=3;x+=3)for(let z=-2;z<=2;z+=2){const panel=box(g,[2.7,.13,1.8],[x,.6,z],solar);panel.rotation.x=-.17;for(let d=-.8;d<1;d+=.8)box(g,[.018,.018,1.75],[x+d,.74,z],frame);}}
  else {box(g,[type==='vav'?2:.65,type==='vav'?.8:1.1,.65],[0,.65,0],type==='vav'?silver:palette.dark);box(g,[.42,.36,.03],[0,.83,.34],lime);}
  const halo=new THREE.Mesh(new THREE.RingGeometry(.5,.65,24),new THREE.MeshBasicMaterial({color:0xb0d233,side:THREE.DoubleSide}));halo.rotation.x=-Math.PI/2;halo.position.y=.06;halo.name='selection-ring';halo.visible=false;g.add(halo);return g;
 }
 floors.forEach(f=>{
  const level=new THREE.Group();level.name=`FLOOR_${String(f.id).padStart(2,'0')}`;level.userData.floor=f.id;level.position.y=(f.id-1)*4.3;root.add(level);
  const shell=new THREE.Group(),interior=new THREE.Group();level.add(shell,interior);interior.visible=false;
  const slab=box(level,[24,.28,18],[0,.02,0],silver);slab.userData.floor=f.id;selectables.push(slab);
  box(shell,[24.4,.14,18.4],[0,.19,0],rim);
  if(f.id<6){
   box(shell,[23.4,3.8,.14],[0,2.15,8.83],glass);box(shell,[.14,3.8,17.5],[11.8,2.15,0],glass);box(shell,[23.4,3.8,.14],[0,2.15,-8.83],glass);box(shell,[.14,3.8,17.5],[-11.8,2.15,0],glass);
   for(let x=-11.8;x<12;x+=2){box(shell,[.075,4,.18],[x,2.2,8.94],frame);box(shell,[.075,4,.18],[x,2.2,-8.94],frame);}
   for(let z=-8.8;z<9;z+=2){box(shell,[.18,4,.075],[11.91,2.2,z],frame);box(shell,[.18,4,.075],[-11.91,2.2,z],frame);}
   box(shell,[24,.1,.1],[0,2.2,8.99],frame);box(shell,[.1,.1,18],[12,2.2,0],frame);
   for(let x=-10;x<11;x+=4){box(shell,[2.9,.11,.03],[x,3.5,8.96],rim);}
   // Terraces and planted vertical ribbon make the generic tower identifiable.
   box(shell,[3.6,.4,3.2],[9.6,.45,7],silver);box(shell,[3.4,.35,2.9],[9.6,.8,7],leaf);
   for(let z=-7;z<=7;z+=3)box(shell,[.32,3.8,.65],[-12.15,2.1,z],leaf);
   if(f.id===1){box(shell,[9,.17,4],[0,3.8,10],rim);for(const x of [-4,4])box(shell,[.15,3.5,.15],[x,1.8,11.5],frame);box(shell,[4,2.8,.25],[0,1.5,9],palette.dark);}
   box(interior,[24,.12,18],[0,.23,0],rim).renderOrder=-20;
   box(interior,[24,2.4,.14],[0,1.4,-9],silver).renderOrder=-10;box(interior,[.14,2.4,18],[-12,1.4,0],silver).renderOrder=-10;
   // Clearly separated office and meeting zones; open front is the cutaway.
   box(interior,[.16,1.3,12],[3,.9,-2],frame);box(interior,[8,1.3,.16],[7,.9,3.8],frame);
   if(f.id===1){box(interior,[5,1.1,1.5],[-6,.8,-3],palette.wood);for(const x of [-6,-3,0]){box(interior,[.7,1.1,1.8],[x,.8,4],frame);box(interior,[1,.7,.08],[x+.8,1,4],glass);}for(const z of [-4,-1,2])box(interior,[3,.6,1],[7,.6,z],palette.dark);}
   else if(f.id===5){for(const x of [-9,-6,-3]){box(interior,[1.8,2.5,1.6],[x,1.5,-6],palette.dark);for(let y=.8;y<2.4;y+=.35)box(interior,[1.3,.05,.03],[x,y,-5.17],frame);}pipe(interior,[[-10,2.8,-4],[-2,2.8,-4],[2,2.8,1],[8,2.8,1]],0x79c0ce,.14);}
   else {for(const x of [-8,-4,0])for(const z of [-5,-1,4])desk(interior,x,z,.32);box(interior,[5,.15,2.4],[7,1.15,-2],palette.wood);for(const x of [5.3,7,8.7])for(const z of [-3.8,-.2]){box(interior,[.65,.15,.7],[x,.8,z],palette.dark);box(interior,[.65,.65,.1],[x,1.1,z+(z<-2?-.3:.3)],palette.dark);}box(interior,[3,1.4,.1],[7,1.8,-8.8],palette.dark);box(interior,[2.6,1.05,.04],[7,1.8,-8.72],palette.blue);}
   tree(interior,-10,.3,6,.7);tree(interior,10,.3,6,.65);
   const types={1:['door','camera'],2:['sensor','light'],3:['vav','meter'],4:['sensor','light'],5:['ahu','pump']};
   const positions=f.id===1?[[7,.3,3.8],[10,.3,-6]]:f.id===5?[[0,.3,1],[7,.3,-3]]:[[6,.3,1],[-7,.3,-7]];
   f.devices.forEach((id,i)=>device(interior,id,positions[i],types[f.id][i]));
  } else {
   for(const z of [-8.7,8.7])box(shell,[24,.55,.18],[0,.65,z],silver);for(const x of [-11.8,11.8])box(shell,[.18,.55,18],[x,.65,0],silver);
   device(level,'SOLAR_ARRAY',[-3,.35,0],'solar');device(level,'SOLAR_INVERTER',[8,.35,-3],'meter');box(shell,[3,.4,14],[10,.5,0],leaf);for(const z of [-6,0,6])tree(shell,10,.7,z,.7);
  }
  levels.push({group:level,shell,interior,base:(f.id-1)*4.3,target:(f.id-1)*4.3});
 });
 const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let mode='building',floor=0,dirty=true,transition=true,selected=null,span=43,last=0,hoverFloor=0;
 const cameraGoal=new THREE.Vector3(42,33,48),targetGoal=new THREE.Vector3(0,10,0);
 function resize(){const {width,height}=host.getBoundingClientRect();renderer.setSize(width,height);const aspect=width/height;camera.left=-span*aspect/2;camera.right=span*aspect/2;camera.top=span/2;camera.bottom=-span/2;camera.updateProjectionMatrix();dirty=true;}
 new ResizeObserver(resize).observe(host);controls.addEventListener('change',()=>{dirty=true;});controls.addEventListener('start',()=>{transition=false;});
 function setMode(next,id=0){mode=next;floor=id;site.visible=next==='building';levels.forEach((l,i)=>{l.group.visible=next!=='floor'||i+1===id;l.target=next==='explode'?i*7.8:next==='floor'?0:l.base;l.shell.visible=next!=='floor';l.interior.visible=next==='floor';});span=next==='building'?43:next==='explode'?64:29;camera.zoom=1;cameraGoal.set(next==='floor'?27:42,next==='floor'?25:next==='explode'?42:33,next==='floor'?34:48);targetGoal.set(0,next==='building'?10:next==='explode'?19:1,0);transition=true;resize();}
 function selectDevice(id){selected=id;deviceObjects.forEach((g,key)=>{g.getObjectByName('selection-ring').visible=key===id;});dirty=true;}
 function pick(event){const rect=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);const hits=raycaster.intersectObjects(root.children,true);for(const hit of hits){let p=hit.object,visible=true;while(p){if(!p.visible)visible=false;p=p.parent;}if(!visible)continue;p=hit.object;let f=0,d;while(p){if(p.userData.device)d=p.userData.device;if(p.userData.floor)f=p.userData.floor;p=p.parent;}if(f)return {floor:f,device:d};}return null;}
 let startPoint;renderer.domElement.addEventListener('pointerdown',e=>{startPoint=[e.clientX,e.clientY];});renderer.domElement.addEventListener('pointerup',e=>{if(!startPoint||Math.hypot(e.clientX-startPoint[0],e.clientY-startPoint[1])>6)return;const hit=pick(e);if(hit?.device&&mode==='floor')onDevice(hit.device);else if(hit?.floor)onFloor(hit.floor);});
 renderer.domElement.addEventListener('pointermove',e=>{if(e.buttons||mode==='floor')return;const hit=pick(e);if(hoverFloor!==hit?.floor){hoverFloor=hit?.floor||0;onHover(hoverFloor,e.clientX,e.clientY);}renderer.domElement.style.cursor=hit?'pointer':'grab';});renderer.domElement.addEventListener('pointerleave',()=>onHover(0));
 const highlight=new THREE.Box3Helper(new THREE.Box3(),0xb0d233);highlight.visible=false;scene.add(highlight);
 function highlightFloor(id){highlight.visible=!!id;if(id){const l=levels[id-1];highlight.box.setFromCenterAndSize(new THREE.Vector3(0,l.group.position.y+2,0),new THREE.Vector3(24.5,4.2,18.5));}dirty=true;}
 function anchor(id){const obj=deviceObjects.get(id);if(!obj)return null;scene.updateMatrixWorld();const v=obj.getWorldPosition(new THREE.Vector3());v.y+=2;v.project(camera);return{x:(v.x*.5+.5)*host.clientWidth,y:(-.5*v.y+.5)*host.clientHeight,visible:v.z>-1&&v.z<1};}
 function sync(s){const door=deviceObjects.get('ACCESS_G01');door.children[1].material=s.secure?glass:alertMaterial;const ahu=deviceObjects.get('HVAC_AHU03');ahu.children[5].material=s.scheduled?lime:warningMaterial;dirty=true;}
 function animate(time){requestAnimationFrame(animate);if(document.hidden)return;let moving=false;for(const l of levels){if(Math.abs(l.group.position.y-l.target)>.02){l.group.position.y=reduced?l.target:THREE.MathUtils.lerp(l.group.position.y,l.target,.13);moving=true;}}
 if(transition){camera.position.lerp(cameraGoal,reduced?1:.12);controls.target.lerp(targetGoal,reduced?1:.12);if(camera.position.distanceTo(cameraGoal)<.04)transition=false;moving=true;}controls.update();if(!basic||((dirty||moving)&&time-last>90)){renderer.render(scene,camera);last=time;dirty=false;} }
 resize();requestAnimationFrame(animate);onReady(basic);
 return{setMode,selectDevice,highlightFloor,anchor,sync,reset(){setMode(mode,floor);},zoom(factor){camera.zoom=THREE.MathUtils.clamp(camera.zoom*factor,.65,2.4);camera.updateProjectionMatrix();dirty=true;}};
}
