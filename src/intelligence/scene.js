import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {SVGRenderer} from 'three/addons/renderers/SVGRenderer.js';
import {createCity} from './model.js';
import {chapters,useCases} from './content.js';
export async function mountScene(host,{select,manual,ready}){
 const scene=new T.Scene();const tagLayer=document.createElement('div');tagLayer.className='map-tags';host.appendChild(tagLayer);const tags=['water','office','hub'].map(id=>{const el=document.createElement('span');el.className='map-tag';tagLayer.appendChild(el);return {id,el};});const city=createCity();scene.add(city.root);
 scene.add(new T.HemisphereLight(0xffffff,0x9c8fa5,2.5));const sun=new T.DirectionalLight(0xfff8f1,3.4);sun.position.set(-40,85,45);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-70,right:70,top:70,bottom:-70,near:1,far:180});sun.shadow.bias=-.0003;sun.shadow.normalBias=.1;sun.shadow.radius=3;scene.add(sun);
 let renderer,webgl=true,pmrem;
 try{renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.18;pmrem=new T.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(new RoomEnvironment(),.08).texture;pmrem.dispose();}
 catch{webgl=false;renderer=new SVGRenderer();renderer.setQuality('low');sun.intensity=.65;scene.add(new T.AmbientLight(0xffffff,.78));}
 renderer.setClearColor(0xfaf8fc,0);host.appendChild(renderer.domElement);
 renderer.domElement.setAttribute('aria-label','Interactive isometric city. Use the location buttons to inspect solutions.');
 const camera=new T.OrthographicCamera(-60,60,50,-50,.1,400);const angle=Math.PI/4,polar=55*Math.PI/180;
 const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=false;controls.enablePan=false;controls.enableZoom=false;controls.minAzimuthAngle=angle-12*Math.PI/180;controls.maxAzimuthAngle=angle+12*Math.PI/180;controls.minPolarAngle=polar-5*Math.PI/180;controls.maxPolarAngle=polar+5*Math.PI/180;
 let state=null,span=112,frame=0,isManual=false,dirty=true,point=new T.Vector3(0,6,0),last=0,low=false;
 const targets={all:[0,10,0],hub:[0,5,3],office:[-16,12,-18],water:[21,4,3],traffic:[5,4,-3],park:[0,3,21],residence:[-29,7,8]};
 function resize(){const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.left=-span/2;camera.right=span/2;camera.top=span/2*h/w;camera.bottom=-span/2*h/w;camera.updateProjectionMatrix();dirty=true;}
 function canonical(focus,desiredSpan,previous=null,t=1){point.fromArray(targets[focus]||targets.all);if(previous)point.lerpVectors(new T.Vector3(...(targets[previous]||targets.all)),point,t);controls.target.copy(point);const dir=new T.Vector3(Math.sin(polar)*Math.sin(angle),Math.cos(polar),Math.sin(polar)*Math.cos(angle));camera.position.copy(point).addScaledVector(dir,145);camera.lookAt(point);span=desiredSpan;camera.zoom=1;resize();controls.update();isManual=false;}
 controls.addEventListener('start',()=>{isManual=true;manual();});controls.addEventListener('change',()=>{dirty=true;});
 const ray=new T.Raycaster();let down;
 renderer.domElement.addEventListener('pointerdown',e=>down=[e.clientX,e.clientY]);
 renderer.domElement.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;const b=renderer.domElement.getBoundingClientRect();ray.setFromCamera(new T.Vector2((e.clientX-b.left)/b.width*2-1,-(e.clientY-b.top)/b.height*2+1),camera);for(const hit of ray.intersectObject(city.root,true)){let o=hit.object;while(o&&!o.userData.asset)o=o.parent;if(o){select(o.userData.asset);break;}}});
 new ResizeObserver(resize).observe(host);
 function update(s,reduced=false){state=s;city.update(s);const c=chapters[s.index];const f=s.focus;const nextSpan=s.index===5?98:c.span;const before=s.index===5?(s.useIndex?useCases[s.useIndex-1].focus:chapters[4].focus):s.index===6?useCases[4].focus:chapters[Math.max(0,s.index-1)].focus;const local=s.index===5?s.u:s.local;const t=reduced?1:Math.min(1,local/.2);const eased=t*t*(3-2*t);const prevSpan=s.index===5?(s.useIndex?98:chapters[4].span):s.index===6?98:chapters[Math.max(0,s.index-1)].span;canonical(f,prevSpan+(nextSpan-prevSpan)*eased,before,eased);dirty=true;}
 function render(now){frame=requestAnimationFrame(render);if(document.hidden||!dirty||now-last<(webgl?16:110))return;last=now;const begin=performance.now();renderer.render(scene,camera);if(state){const labels={water:state.index===6?'Predicted impact · +30 min':state.flood>.3?`Water level · ${state.water.toFixed(2)} m`:'Waterway / Environmental data',office:state.index===5&&state.useIndex===3?`Building demand · ${state.energy} kW`:'Workplace / Energy data',hub:state.index===1?'Shared view missing':'Operations / Shared context'};for(const {id,el} of tags){const pos=new T.Vector3(...city.locations[id]);pos.y+=4;pos.project(camera);const x=(pos.x+1)/2*host.clientWidth,y=(1-pos.y)/2*host.clientHeight;el.hidden=x<50||x>host.clientWidth-100||y<30||y>host.clientHeight-35||(state.index>2&&state.index<7&&state.focus!==id);el.style.transform=`translate(${x}px,${y}px)`;el.textContent=labels[id];}}dirty=false;if(webgl&&!low&&performance.now()-begin>45){renderer.setPixelRatio(1);renderer.shadowMap.enabled=false;low=true;dirty=true;}}
 canonical('all',136);render(0);ready(webgl?'3D ready':'Lightweight 3D view');
 return {update,focus(id){canonical(id,75);dirty=true;},restore(){if(state)update(state);},resize,dispose(){cancelAnimationFrame(frame);controls.dispose();renderer.dispose?.();}};
}
