import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createCivicCity} from './civic-model.js';
export async function mountCivicScene(host,{onReady,onSelect,onLabels}){
 let renderer;
 try{renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});}catch{onReady(false);return {setStage(){},setExplore(){},home(){},focus(){}};}
 const scene=new T.Scene(),city=createCivicCity();scene.add(city.root);
 scene.add(new T.HemisphereLight(0xffffff,0x839781,1.6));const sun=new T.DirectionalLight(0xfff5de,2.8);sun.position.set(-45,85,35);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-100,right:100,top:80,bottom:-80,near:1,far:220});sun.shadow.normalBias=.14;sun.shadow.bias=-.0003;scene.add(sun);
 renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;renderer.setClearColor(0xf6f8f6,0);
 const pmrem=new T.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(new RoomEnvironment(),.1).texture;scene.environmentIntensity=.45;pmrem.dispose();
 host.appendChild(renderer.domElement);renderer.domElement.setAttribute('aria-label','Interactive 3D civic district and command center');
 const camera=new T.OrthographicCamera(-79,79,60,-60,.1,400),controls=new OrbitControls(camera,renderer.domElement);
 controls.enabled=false;controls.enableDamping=false;controls.enablePan=false;controls.enableZoom=false;controls.minPolarAngle=Math.PI*.25;controls.maxPolarAngle=Math.PI*.37;controls.minAzimuthAngle=Math.PI*.19;controls.maxAzimuthAngle=Math.PI*.31;
 let width=0,height=0,scheduled=false,explore=false,span=158;
 function draw(){scheduled=false;renderer.render(scene,camera);
  onLabels?.(Object.fromEntries(['command','civic','water'].map(id=>{const point=new T.Vector3(...city.locations[id]);point.y+=3;point.project(camera);return[id,[(point.x*.5+.5)*100,(-point.y*.5+.5)*100]];})));
 }
 function invalidate(){if(!scheduled&&!document.hidden){scheduled=true;requestAnimationFrame(draw);}}
 function resize(){const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;if(w!==width||h!==height){width=w;height=h;renderer.setSize(w,h);}camera.left=-span/2;camera.right=span/2;camera.top=span/2*h/w;camera.bottom=-span/2*h/w;camera.updateProjectionMatrix();invalidate();}
 function home(){span=158;controls.target.set(-17,7,0);camera.position.copy(controls.target).add(new T.Vector3(102,100,102));camera.lookAt(controls.target);resize();controls.update();}
 new ResizeObserver(resize).observe(host);controls.addEventListener('change',invalidate);
 let down=null;const ray=new T.Raycaster();renderer.domElement.addEventListener('pointerdown',e=>{if(explore)down=[e.clientX,e.clientY];});renderer.domElement.addEventListener('pointerup',e=>{if(!explore||!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;const b=renderer.domElement.getBoundingClientRect();ray.setFromCamera(new T.Vector2((e.clientX-b.left)/b.width*2-1,-(e.clientY-b.top)/b.height*2+1),camera);for(const hit of ray.intersectObject(city.root,true)){let o=hit.object;while(o&&!o.userData.asset)o=o.parent;if(o){onSelect(o.userData.asset);break;}}});
 addEventListener('visibilitychange',()=>{if(!document.hidden)invalidate();});home();onReady(true);invalidate();
 return {setStage(id){city.setStage(id);invalidate();},setExplore(value){explore=value;controls.enabled=value;},home,focus(id){const pos=city.locations[id];if(!pos)return;span=id==='command'?65:90;controls.target.set(...pos);camera.position.copy(controls.target).add(new T.Vector3(102,100,102));camera.lookAt(controls.target);resize();controls.update();invalidate();}};
}
