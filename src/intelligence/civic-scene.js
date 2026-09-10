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
 // Ambient light this strong flattens the city: it lifts the shaded faces to
 // nearly the lit ones, so nothing reads as solid. Keep it low, let the key
 // light carry the form, and use a cool fill so the shadow sides stay legible.
 scene.add(new T.HemisphereLight(0xfffaff,0x8a7997,.62));
 const sun=new T.DirectionalLight(0xfff3ee,3.1);sun.position.set(-45,85,35);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
 // Fitted to the city plus the command center rather than a loose box, which
 // buys roughly half again the shadow resolution at the same map size.
 Object.assign(sun.shadow.camera,{left:-82,right:56,top:52,bottom:-52,near:1,far:220});sun.shadow.normalBias=.11;sun.shadow.bias=-.0003;scene.add(sun);
 const fill=new T.DirectionalLight(0xcdbcf5,.5);fill.position.set(55,35,-40);scene.add(fill);
 renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
 renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;renderer.setClearColor(0xfaf8fc,0);
 const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment();scene.environment=pmrem.fromScene(room,.1).texture;scene.environmentIntensity=.42;room.dispose();pmrem.dispose();
 host.appendChild(renderer.domElement);renderer.domElement.setAttribute('aria-label','Animated 3D civic district and command center');
 const camera=new T.OrthographicCamera(-70,70,60,-60,.1,400),controls=new OrbitControls(camera,renderer.domElement);
 controls.enabled=false;controls.enableDamping=false;controls.enablePan=false;controls.enableZoom=false;
 controls.minPolarAngle=Math.PI*.25;controls.maxPolarAngle=Math.PI*.37;controls.minAzimuthAngle=Math.PI*.19;controls.maxAzimuthAngle=Math.PI*.31;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const OFFSET=new T.Vector3(102,100,102),RIGHT=new T.Vector3(1,0,-1).normalize();
 const anchor=new T.Vector3();
 let width=0,height=0,scheduled=false,explore=false,span=145,minHeight=92,paused=false,last=0,time=0,visible=true,bias=.12;
 // Pointer parallax. The camera swings a little around the city as the cursor
 // crosses the page, which is what gives a still isometric model any sense of
 // depth. Explore drives the camera itself, so it opts out.
 const UP=new T.Vector3(0,1,0),seat=new T.Vector3(),lens=new T.Vector3();
 let wantX=0,wantY=0,swingX=0,swingY=0;
 function draw(now){
  scheduled=false;if(document.hidden||!visible){last=0;return;}
  const moving=!paused&&!reduced.matches,dt=last?Math.min((now-last)/1000,.06):0;
  if(moving&&last&&now-last<32){invalidate();return;}
  last=now;if(moving)time+=dt;
  let settling=false;
  if(!explore&&!reduced.matches){
   const ease=1-Math.exp(-6*(dt||1/30));
   swingX+=(wantX-swingX)*ease;swingY+=(wantY-swingY)*ease;
   settling=Math.abs(wantX-swingX)>1e-4||Math.abs(wantY-swingY)>1e-4;
   aim();
  }
  city.update(time,dt||1/30,!moving);renderer.render(scene,camera);
  onLabels?.(Object.fromEntries(Object.entries(city.locations).map(([id,at])=>{const p=new T.Vector3(...at);p.y+=3;p.project(camera);return[id,[(p.x*.5+.5)*100,(-p.y*.5+.5)*100]];})));
  if(moving||settling)invalidate();
 }
 function invalidate(){if(!scheduled&&!document.hidden&&visible){scheduled=true;requestAnimationFrame(draw);}}
 function resize(){
  const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;
  if(w!==width||h!==height){width=w;height=h;renderer.setSize(w,h);}
  // Fit both axes: landscape explore must not crop the city vertically.
  const horizontal=Math.max(span,minHeight*w/h);
  camera.left=-horizontal/2;camera.right=horizontal/2;camera.top=horizontal/2*h/w;camera.bottom=-camera.top;
  // The narrative scrolls over the right of the same canvas, so the city is
  // pushed left of centre by that much of the frame and the text lands on empty
  // ground. Explore has no narrative over it and keeps the city centred.
  const shift=explore?0:horizontal*bias;
  seat.copy(anchor).addScaledVector(RIGHT,shift);
  lens.copy(anchor).sub(OFFSET).addScaledVector(RIGHT,shift);
  controls.target.copy(lens);
  aim();
  camera.updateProjectionMatrix();invalidate();
 }
 /** Seats the camera, swung by the current parallax. */
 function aim(){
  if(explore)return;                       // OrbitControls owns the camera here
  const arm=seat.clone().sub(lens).applyAxisAngle(UP,swingX*.075);
  arm.y+=swingY*11;
  camera.position.copy(lens).add(arm);
  camera.lookAt(lens);
 }
 function home(){span=104;minHeight=82;bias=.12;controls.target.set(-13,1,2);anchor.copy(controls.target).add(OFFSET);camera.position.copy(anchor);camera.lookAt(controls.target);resize();controls.update();}
 addEventListener('pointermove',e=>{
  if(explore||reduced.matches)return;
  wantX=(e.clientX/innerWidth)*2-1;wantY=(e.clientY/innerHeight)*2-1;
  invalidate();
 },{passive:true});
 addEventListener('pointerleave',()=>{wantX=0;wantY=0;invalidate();},{passive:true});
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
  setExplore(value){explore=value;controls.enabled=value;resize();},home,
  focus(id){const pos=city.locations[id];if(!pos)return;span=id==='command'?58:74;minHeight=span*.7;bias=explore?0:.30;controls.target.set(...pos);anchor.copy(controls.target).add(OFFSET);camera.position.copy(anchor);camera.lookAt(controls.target);resize();controls.update();invalidate();}
 };
}
