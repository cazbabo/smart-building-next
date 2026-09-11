import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createCivicCity} from './civic-model.js';
import {loadKenneyKit} from './kenney-kit.js';
export async function mountCivicScene(host,{onReady,onSelect,onLabels}) {
 let renderer;
 try {renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});}
 catch {onReady(false);return {setStage(){},setExplore(){},setPaused(){},setCentred(){},setNight(){},home(){},focus(){}};}
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

 // Motes drifting through the opening. A still isometric city gives the eye no
 // evidence that the scene has any air in it, which is most of what made the
 // reference hero feel like a place rather than a render. They belong to the
 // dark opening alone: over the pale story the same specks read as dust on the
 // screen, so they fade out with the night behind them.
 const spark=(()=>{
  const canvas=document.createElement('canvas');canvas.width=canvas.height=32;
  const ctx=canvas.getContext('2d'),grad=ctx.createRadialGradient(16,16,0,16,16,16);
  grad.addColorStop(0,'#ffffff');grad.addColorStop(.3,'#ffffffbb');grad.addColorStop(1,'#ffffff00');
  ctx.fillStyle=grad;ctx.fillRect(0,0,32,32);
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;return texture;
 })();
 const RISE=86,motes=[];
 // Three layers rather than one: a single point size reads as a regular
 // pattern, and depth is what makes the drift look like air moving. They are
 // tinted rather than white because a white speck on a night sky is a star, and
 // the sky behind is already full of them; lime and orchid are the site's own
 // colours and read as its data layer drifting over the city.
 // They add light rather than paint over it, so a large one crossing a white
 // roof blows out to a smudge. More of them, smaller, keeps the presence and
 // loses the smudge.
 for(const [count,size,strength,speed,tint] of [
  [74,5.4,.85,2.1,[.94,.42,.78]],  // orchid, nearest
  [96,3.8,.52,1.5,[.78,1,.31]],    // lime
  [112,2.4,.3,1,[.9,.86,1]],       // cool white, furthest
 ]) {
  const position=new Float32Array(count*3),colour=new Float32Array(count*3),seeds=[];
  for(let i=0;i<count;i++) seeds.push({
   x:-98+Math.random()*150,z:-64+Math.random()*128,y:Math.random()*RISE,
   rise:speed*(.55+Math.random()*.9),phase:Math.random()*Math.PI*2,sway:1.5+Math.random()*3.6,
  });
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.BufferAttribute(position,3));
  geometry.setAttribute('color',new T.BufferAttribute(colour,3));
  const cloud=new T.Points(geometry,new T.PointsMaterial({
   map:spark,size,sizeAttenuation:false,vertexColors:true,transparent:true,
   opacity:0,depthWrite:false,blending:T.AdditiveBlending,
  }));
  // They drift outside the city's own bounds, and the bounding sphere is never
  // recomputed after the first frame, so culling would drop the whole layer.
  cloud.frustumCulled=false;cloud.visible=false;scene.add(cloud);
  motes.push({cloud,position,colour,seeds,strength,tint});
 }
 /** Drifts the motes and dims them to the night behind them. */
 function drift(t){
  for(const layer of motes) {
   layer.cloud.material.opacity=layer.strength*night;
   layer.cloud.visible=night>.02;
   if(!layer.cloud.visible)continue;
   for(const [i,s] of layer.seeds.entries()) {
    const climb=(s.y+s.rise*t)%RISE;
    layer.position[i*3]=s.x+Math.sin(t*.19+s.phase)*s.sway;
    layer.position[i*3+1]=climb-4;
    layer.position[i*3+2]=s.z+Math.cos(t*.15+s.phase*1.7)*s.sway*.7;
    // Each one materialises and dissolves over its own climb, so nothing pops
    // at the top of the band. Additive blending makes dimming the colour a
    // fade, which is the only per-point fade a shared material allows.
    const fade=Math.sin(Math.PI*climb/RISE)**.55;
    layer.colour[i*3]=fade*layer.tint[0];layer.colour[i*3+1]=fade*layer.tint[1];layer.colour[i*3+2]=fade*layer.tint[2];
   }
   layer.cloud.geometry.attributes.position.needsUpdate=true;
   layer.cloud.geometry.attributes.color.needsUpdate=true;
  }
 }
 renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
 renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;renderer.setClearColor(0xfaf8fc,0);
 const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment();scene.environment=pmrem.fromScene(room,.1).texture;scene.environmentIntensity=.42;room.dispose();pmrem.dispose();
 host.appendChild(renderer.domElement);renderer.domElement.setAttribute('aria-label','Animated 3D civic district and command center');
 const camera=new T.OrthographicCamera(-70,70,60,-60,.1,400),controls=new OrbitControls(camera,renderer.domElement);
 controls.enabled=false;controls.enableDamping=false;controls.enablePan=false;controls.enableZoom=false;
 controls.minPolarAngle=Math.PI*.25;controls.maxPolarAngle=Math.PI*.37;controls.minAzimuthAngle=Math.PI*.19;controls.maxAzimuthAngle=Math.PI*.31;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const OFFSET=new T.Vector3(102,100,102),RIGHT=new T.Vector3(1,0,-1).normalize();
 // A frame per chapter. Every chapter used to look identical apart from the
 // overlays laid on it, which gave the eye no reason to stay; the camera now
 // moves to what the chapter is about. It eases on the change of chapter only
 // and never follows the scroll, because a camera driven by the scrollbar is
 // what makes this kind of page unreadable.
 const FRAMES={
  overview:  [-13, 1,  2, 104],
  fragmented:[ -8, 1,  2,  94],   // in among the districts, before they connect
  foundation:[-30, 6,  2, 108],   // the routes and the command center they run to
  iot:       [ -4, 4,  2,  84],   // close enough for the sensor markers to read
  // Close on the waterway put the command center off-frame, so the seven data
  // routes crossed the whole view as diagonal streaks with nothing to converge
  // on - and this chapter's text is precisely about the reading reaching the
  // command center. Far enough back to hold both, close enough to read a gate.
  flood:     [-16,10, 11,  96],
  priorities:[ -6, 2,  6,  92],
  ai:        [-24, 4,  8, 116],   // city and command center in one frame
  roadmap:   [-13, 1,  2, 110],
  // The opening carries the headline under the city rather than beside it, so
  // the frame looks at a point below the model and lifts it clear of the type.
  hero:      [-13,-17,  2, 116],
 };
 const FIT=.79;                   // vertical extent as a share of the frame width
 const goal=new T.Vector3(),look=new T.Vector3();
 let centred=false,chapter='overview',night=0;
 let width=0,height=0,scheduled=false,explore=false,span=104,goalSpan=104,paused=false,last=0,time=0,visible=true,bias=.12;
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
   const step=dt||1/30;
   const glide=1-Math.exp(-2.6*step);
   look.lerp(goal,glide);span+=(goalSpan-span)*glide;
   const swing=1-Math.exp(-6*step);
   swingX+=(wantX-swingX)*swing;swingY+=(wantY-swingY)*swing;
   settling=look.distanceTo(goal)>.04||Math.abs(goalSpan-span)>.04
    ||Math.abs(wantX-swingX)>1e-4||Math.abs(wantY-swingY)>1e-4;
   frame();
  }
  city.update(time,dt||1/30,!moving);drift(time);renderer.render(scene,camera);
  onLabels?.(Object.fromEntries(Object.entries(city.locations).map(([id,at])=>{const p=new T.Vector3(...at);p.y+=3;p.project(camera);return[id,[(p.x*.5+.5)*100,(-p.y*.5+.5)*100]];})));
  if(moving||settling)invalidate();
 }
 function invalidate(){if(!scheduled&&!document.hidden&&visible){scheduled=true;requestAnimationFrame(draw);}}
 function resize(){
  const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;
  if(w!==width||h!==height){width=w;height=h;renderer.setSize(w,h);}
  frame();invalidate();
 }
 /** Rebuilds the projection and seats the camera from the current framing. */
 function frame(){
  const w=width||host.clientWidth,h=height||host.clientHeight;if(!w||!h)return;
  // Fit both axes: landscape explore must not crop the city vertically.
  const horizontal=Math.max(span,span*FIT*w/h);
  camera.left=-horizontal/2;camera.right=horizontal/2;camera.top=horizontal/2*h/w;camera.bottom=-camera.top;
  // The narrative scrolls over the right of the same canvas, so the city is
  // pushed left of centre by that much of the frame and the text lands on empty
  // ground. Explore has no narrative over it and keeps the city centred.
  const shift=explore?0:horizontal*bias;
  lens.copy(look).addScaledVector(RIGHT,shift);
  seat.copy(lens).add(OFFSET);
  controls.target.copy(lens);
  aim();
  camera.updateProjectionMatrix();
 }
 /** Seats the camera, swung by the current parallax. */
 function aim(){
  if(explore)return;                       // OrbitControls owns the camera here
  const arm=seat.clone().sub(lens).applyAxisAngle(UP,swingX*.075);
  arm.y+=swingY*11;
  camera.position.copy(lens).add(arm);
  camera.lookAt(lens);
 }
 function home(){bias=.12;aimAt('overview',true);controls.update();}
 /** Points the camera at a chapter's frame; `now` snaps instead of gliding. */
 function aimAt(id,now=false){
  const [x,y,z,width]=FRAMES[id]??FRAMES.overview;
  goal.set(x,y,z);goalSpan=width;
  if(now||reduced.matches){look.copy(goal);span=goalSpan;}
  resize();
 }
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
  setStage(id,progress=0){chapter=id;city.setStage(id,progress);if(!explore&&!centred)aimAt(id);invalidate();},
  setPaused(value){paused=value;last=0;invalidate();},
  setExplore(value){explore=value;controls.enabled=value;resize();},home,
  // The opening has no narrative beside the city, so nothing to make room for,
  // and its own framing lifts the model above the headline.
  setCentred(value){
   if(value===centred)return;
   centred=value;bias=value?0:.12;
   if(value)aimAt('hero');else aimAt(chapter);
  },
  // How much of the opening is still on screen, so the motes go with the night
  // layer they drift against rather than switching off at a threshold.
  setNight(value){const next=Math.max(0,Math.min(1,value));if(Math.abs(next-night)<.004)return;night=next;invalidate();},
  focus(id){const pos=city.locations[id];if(!pos)return;goalSpan=span=id==='command'?58:74;bias=explore?0:.12;goal.set(...pos);look.copy(goal);resize();controls.update();invalidate();}
 };
}
