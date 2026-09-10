import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createCivicCity} from './civic-model.js';
import {loadKenneyKit} from './kenney-kit.js';
export async function mountCivicScene(host,{onReady,onSelect,onLabels}) {
 let renderer;
 try {renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});}
 catch {onReady(false);return {setStage(){},setExplore(){},setPaused(){},home(){},focus(){}};}
 // The kit is the city's architecture; if it cannot be fetched the scene still
 // builds from procedural geometry rather than dropping to the static poster.
 const kit=await loadKenneyKit().catch(()=>null);
 const scene=new T.Scene(),city=createCivicCity(kit);scene.add(city.root);
 scene.add(new T.HemisphereLight(0xfffaff,0x8a7997,1.45));
 const sun=new T.DirectionalLight(0xfff5f9,2.6);sun.position.set(-45,85,35);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
 Object.assign(sun.shadow.camera,{left:-100,right:100,top:80,bottom:-80,near:1,far:220});sun.shadow.normalBias=.14;sun.shadow.bias=-.0003;scene.add(sun);
 const fill=new T.DirectionalLight(0xd8c4ff,.7);fill.position.set(55,35,-40);scene.add(fill);
 renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
 renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;renderer.setClearColor(0xfaf8fc,0);
 const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment();scene.environment=pmrem.fromScene(room,.1).texture;scene.environmentIntensity=.65;room.dispose();pmrem.dispose();
 host.appendChild(renderer.domElement);renderer.domElement.setAttribute('aria-label','Animated 3D civic district and command center');
 const camera=new T.OrthographicCamera(-70,70,60,-60,.1,400),controls=new OrbitControls(camera,renderer.domElement);
 controls.enabled=false;controls.enableDamping=false;controls.enablePan=false;controls.enableZoom=false;
 controls.minPolarAngle=Math.PI*.25;controls.maxPolarAngle=Math.PI*.37;controls.minAzimuthAngle=Math.PI*.19;controls.maxAzimuthAngle=Math.PI*.31;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let width=0,height=0,scheduled=false,explore=false,span=145,minHeight=92,paused=false,last=0,time=0,visible=true;
 function draw(now){
  scheduled=false;if(document.hidden||!visible){last=0;return;}
  const moving=!paused&&!reduced.matches,dt=last?Math.min((now-last)/1000,.06):0;
  if(moving&&last&&now-last<32){invalidate();return;}
  last=now;if(moving)time+=dt;
  city.update(time,dt||1/30,!moving);renderer.render(scene,camera);
  onLabels?.(Object.fromEntries(['command','civic','water'].map(id=>{const p=new T.Vector3(...city.locations[id]);p.y+=3;p.project(camera);return[id,[(p.x*.5+.5)*100,(-p.y*.5+.5)*100]];})));
  if(moving)invalidate();
 }
 function invalidate(){if(!scheduled&&!document.hidden&&visible){scheduled=true;requestAnimationFrame(draw);}}
 function resize(){
  const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;
  if(w!==width||h!==height){width=w;height=h;renderer.setSize(w,h);}
  // Fit both axes: landscape explore must not crop the city vertically.
  const horizontal=Math.max(span,minHeight*w/h);
  camera.left=-horizontal/2;camera.right=horizontal/2;camera.top=horizontal/2*h/w;camera.bottom=-camera.top;camera.updateProjectionMatrix();invalidate();
 }
 function home(){span=145;minHeight=92;controls.target.set(-15,4,0);camera.position.copy(controls.target).add(new T.Vector3(102,100,102));camera.lookAt(controls.target);resize();controls.update();}
 new ResizeObserver(resize).observe(host);
 new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;last=0;invalidate();}).observe(host);
 controls.addEventListener('change',invalidate);
 let down=null;const ray=new T.Raycaster();
 renderer.domElement.addEventListener('pointerdown',e=>{if(explore)down=[e.clientX,e.clientY];});
 renderer.domElement.addEventListener('pointerup',e=>{const origin=down;down=null;if(!explore||!origin||Math.hypot(e.clientX-origin[0],e.clientY-origin[1])>5)return;
  const b=renderer.domElement.getBoundingClientRect();ray.setFromCamera(new T.Vector2((e.clientX-b.left)/b.width*2-1,-(e.clientY-b.top)/b.height*2+1),camera);
  for(const hit of ray.intersectObject(city.root,true)){let o=hit.object;while(o&&!o.userData.asset)o=o.parent;if(o){onSelect(o.userData.asset);break;}}
 });
 document.addEventListener('visibilitychange',()=>{last=0;invalidate();});reduced.addEventListener('change',()=>{last=0;invalidate();});home();onReady(true);invalidate();
 return {
  setStage(id,progress=0){city.setStage(id,progress);invalidate();},
  setPaused(value){paused=value;last=0;invalidate();},
  setExplore(value){explore=value;controls.enabled=value;},home,
  focus(id){const pos=city.locations[id];if(!pos)return;span=id==='command'?75:95;minHeight=span*.65;controls.target.set(...pos);camera.position.copy(controls.target).add(new T.Vector3(102,100,102));camera.lookAt(controls.target);resize();controls.update();invalidate();}
 };
}
