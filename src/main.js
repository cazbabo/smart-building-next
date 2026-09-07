import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createPremiumBuilding} from './building.js';
import {createSolutionScene} from './solutions.js';
import {stories,solutionSteps,deepDiveScenes} from './content.js';

const $=s=>document.querySelector(s);
const viewport=$('#viewport'), canvas=$('#scene'), experience=$('#experience');
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let renderer, basic=false;
// Keep the experience usable when WebGL is disabled; never leave a loading screen.
const context=canvas.getContext('webgl2',{alpha:true,antialias:true,powerPreference:'high-performance'});
if(context){
 renderer=new THREE.WebGLRenderer({canvas,context,alpha:true,antialias:true});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
}else{
 const {SVGRenderer}=await import('three/addons/renderers/SVGRenderer.js');
 renderer=new SVGRenderer();renderer.setQuality('low');renderer.setPrecision(2);
 canvas.hidden=true;viewport.insertBefore(renderer.domElement,$('#hotspots'));
 basic=true;$('#renderNotice').hidden=false;
 renderer.domElement.setAttribute('role','img');renderer.domElement.setAttribute('aria-label','โมเดลสามมิติแบบพื้นฐานที่หมุนและซูมได้');
}
const scene=new THREE.Scene();
const camera=new THREE.OrthographicCamera(-40,40,30,-30,.1,400);
const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=!basic;controls.dampingFactor=.07;controls.enablePan=false;
controls.minZoom=.65;controls.maxZoom=2.8;controls.minPolarAngle=.2;controls.maxPolarAngle=Math.PI*.48;
controls.enableRotate=false;controls.enableZoom=false;controls.autoRotateSpeed=.65;
scene.add(new THREE.AmbientLight(0xd8e5ee,basic?.6:.7));
scene.add(new THREE.HemisphereLight(0xe4f6ff,0x61717a,basic?.3:1.3));
const sun=new THREE.DirectionalLight(0xffecd2,basic?1.1:3.4);sun.position.set(-30,55,40);sun.castShadow=!basic;
sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-42,right:42,top:48,bottom:-35,near:.5,far:180});sun.shadow.normalBias=.04;sun.shadow.bias=-.00008;scene.add(sun);
const fill=new THREE.DirectionalLight(0xabcce9,basic?.35:1.4);fill.position.set(32,28,-25);scene.add(fill);
if(!basic){const room=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(room,.06).texture;scene.environmentIntensity=.65;room.dispose();pmrem.dispose();}
const building=createPremiumBuilding();scene.add(building.group);
const solutions=new Map();
const overviewNodes=[
 {label:'พลังงานสะอาดบนดาดฟ้า',sub:'Solar + Energy',pos:[7,37,-1],chapter:'energy'},
 {label:'พื้นที่ที่ปรับตามผู้ใช้',sub:'Comfort + Workspace',pos:[-14,21,8],chapter:'comfort'},
 {label:'ทุกการเข้าออก เชื่อมถึงกัน',sub:'Access + Security',pos:[13,4,11],chapter:'security'}
];
const info={
 overview:['ONE Building · สำนักงาน','ออกแบบให้ทุกระบบ ทำงานร่วมกัน','Lobby · 8 ชั้นสำนักงานและห้องประชุม · Rooftop'],
 energy:['Rooftop · Energy centre','พลังงานที่มองเห็นได้ ตั้งแต่ต้นทางถึงโหลด','Solar → Inverter → Smart Meter → Demand control'],
 comfort:['ชั้น 6 · ห้องประชุมและสำนักงาน','เปิดให้เห็นเบื้องหลัง อากาศที่พอดี','Sensor → AHU → VAV → Occupied zone'],
 workspace:['ชั้น 8 · Workplace','พื้นที่พร้อม ก่อนผู้ใช้งานมาถึง','Booking → Presence → Lighting + HVAC'],
 security:['Lobby · Arrival experience','การต้อนรับที่ราบรื่น พร้อมสิทธิ์ที่ชัดเจน','Visitor → Turnstile → Lift → CCTV'],
 parking:['B1 · Parking & EV','เชื่อมการเดินทาง เข้ากับพลังงานอาคาร','LPR → Available bay → EV charging → Exit'],
 plant:['B2 · Chiller plant','เห็นเครื่องจักร วงจรน้ำ และการตอบสนอง','Chiller → Sensors → Plant controller → Backup']
};
stories.overview.headline='อาคารที่เข้าใจ<br><em>ทุกความเป็นไป</em>';
stories.overview.description='เชื่อมพลังงาน พื้นที่ และผู้คนในอาคาร ด้วย Digital Twin ที่ช่วยให้คุณเห็นภาพรวม และเข้าใจทุกระบบที่อยู่เบื้องหลัง';
stories.comfort.headline='อากาศที่ดี<br><em>เริ่มจากความเข้าใจ</em>';
stories.security.headline='ต้อนรับอย่างมั่นใจ<br><em>ทุกการเข้าออก</em>';
let current='overview',detailStage=0,detailOpen=false,explore=false,rotating=false,tourTimer=null;
let nodes=[],hotspotElements=[],activeScene=null,dirty=true,lastRender=0,elapsed=0,lastTime=0;
const fromPosition=new THREE.Vector3(),fromTarget=new THREE.Vector3(),toPosition=new THREE.Vector3(),toTarget=new THREE.Vector3();
let transition=1,viewSpan=54;
function moveCamera(focus=false){
 const overview=current==='overview'&&!detailOpen;
 const target=overview?new THREE.Vector3(0,18,0):new THREE.Vector3(0,1,0);
 const position=overview?new THREE.Vector3(52,41,64):new THREE.Vector3(27,24,32);
 fromPosition.copy(camera.position);fromTarget.copy(controls.target);toPosition.copy(position);toTarget.copy(target);
 viewSpan=overview?53:25;camera.zoom=focus?1.04:1;transition=reduced||basic?1:0;
 if(transition===1){camera.position.copy(position);controls.target.copy(target);}
 resize();dirty=true;
}
function resize(){const w=viewport.clientWidth,h=viewport.clientHeight;const aspect=w/h;const span=viewSpan*Math.max(1,(current==='overview'&&!detailOpen?.95:1.45)/aspect);camera.left=-span*aspect/2;camera.right=span*aspect/2;camera.top=span/2;camera.bottom=-span/2;camera.updateProjectionMatrix();renderer.setSize(w,h);dirty=true;}
new ResizeObserver(resize).observe(viewport);
function updateControls(){controls.enableRotate=explore;controls.enableZoom=explore;controls.autoRotate=rotating&&!reduced;$('#rotateView').setAttribute('aria-pressed',String(rotating));$('#rotateView').innerHTML=rotating?'Ⅱ <span>หยุดหมุน</span>':'↻ <span>หมุนอาคาร</span>';}
function setupScene(){
 building.group.visible=current==='overview'&&!detailOpen;
 solutions.forEach(s=>s.group.visible=false);activeScene=null;
 if(building.group.visible){nodes=overviewNodes;}else{
  if(!solutions.has(current)){const result=createSolutionScene(current);solutions.set(current,result);scene.add(result.group);}
  activeScene=solutions.get(current);activeScene.group.visible=true;activeScene.setStage(detailStage);nodes=activeScene.nodes;
 }
 $('#hotspots').replaceChildren();hotspotElements=nodes.map(n=>{
  const b=document.createElement('button');b.className='hotspot';b.innerHTML=`${n.label}<small>${n.sub}</small>`;b.setAttribute('aria-label',`ดู ${n.label}`);
  b.addEventListener('click',()=>{if(n.chapter)selectChapter(n.chapter);else{if(!detailOpen)openDetail(n.stage);else renderDetail(n.stage);}});$('#hotspots').append(b);return b;
 });
 const [location,caption,subcaption]=info[current];$('#sceneLocation').textContent=location;$('#sceneCaption').textContent=caption;$('#sceneSubcaption').textContent=subcaption;
 moveCamera(detailOpen);
}
function selectChapter(name,manual=true){
 if(manual)stopTour();current=name;detailStage=0;detailOpen=false;experience.classList.remove('detail-open');$('#detailPanel').hidden=true;
 const story=stories[name];
 document.querySelectorAll('.chapter').forEach(b=>{const active=b.dataset.chapter===name;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
 $('#chapterNumber').textContent=story.number;$('#chapterLabel').textContent=story.label;$('#headline').innerHTML=story.headline;$('#description').textContent=story.description;$('#impact').textContent=story.impact;
 $('#statusText').textContent=name==='plant'?'เหตุขัดข้องจำลอง 1 รายการ':'สถานการณ์สาธิต · ระบบเชื่อมต่อ';
 $('#readings').innerHTML=story.readings.map(([label,value,unit])=>`<div><small>${label}</small><strong>${value}</strong><span>${unit}</span></div>`).join('');
 $('#solutionFlow').innerHTML=solutionSteps[name].map(([label,text],i)=>`<div class="flow-step"><span>0${i+1}</span><div><small>${label}</small><b>${text}</b></div></div>`).join('');
 setupScene();
}
function renderDetail(index){
 const stages=deepDiveScenes[current];detailStage=Math.max(0,Math.min(stages.length-1,index));const step=stages[detailStage];
 $('#detailSystem').textContent=stories[current].label;$('#detailStageNumber').textContent=`ขั้นตอน ${detailStage+1} จาก ${stages.length}`;
 $('#detailStageTitle').textContent=step.title;$('#detailStageDescription').textContent=step.description;
 $('#technicalData').innerHTML=step.data.map(([label,value,unit])=>`<div><dt>${label}</dt><dd>${value} <small>${unit}</small></dd></div>`).join('');
 $('#decisionLogic').textContent=step.logic;$('#detailResult').textContent=step.result;
 $('#detailProgress').innerHTML=stages.map((s,i)=>`<button aria-label="ขั้นตอน ${i+1}: ${s.title}" aria-current="${i===detailStage?'step':'false'}" data-step="${i}" class="${i===detailStage?'active':''}">0${i+1}</button>`).join('');
 $('#previousStage').disabled=detailStage===0;$('#nextStage').textContent=detailStage===stages.length-1?'กลับภาพรวมระบบ ↗':'ขั้นตอนถัดไป →';
 activeScene?.setStage(detailStage);hotspotElements.forEach((el,i)=>el.classList.toggle('active',nodes[i].stage===detailStage));dirty=true;
}
function openDetail(index=0){stopTour();detailOpen=true;detailStage=index;experience.classList.add('detail-open');$('#detailPanel').hidden=false;setupScene();renderDetail(index);$('#closeDetail').focus({preventScroll:true});}
function closeDetail(){detailOpen=false;experience.classList.remove('detail-open');$('#detailPanel').hidden=true;setupScene();$('#detailButton').focus({preventScroll:true});}
function stopTour(){clearInterval(tourTimer);tourTimer=null;$('#tourButton').innerHTML='<span class="play">▶</span> เริ่มนำเสนอ <small>2 นาที</small>';}
$('#tourButton').addEventListener('click',()=>{
 if(tourTimer){stopTour();return;}setMode(false);selectChapter('overview',false);let index=0;const order=Object.keys(stories);
 $('#tourButton').textContent='Ⅱ หยุดการนำเสนอ';
 tourTimer=setInterval(()=>{index++;if(index>=order.length){stopTour();return;}selectChapter(order[index],false);},18000);
});
function setMode(value){explore=value;experience.classList.toggle('explore',value);document.querySelectorAll('.mode').forEach(b=>{const active=(b.dataset.mode==='explore')===value;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});updateControls();}
$('.identity').addEventListener('click',e=>{e.preventDefault();selectChapter('overview');});
$('.chapters').addEventListener('click',e=>{const b=e.target.closest('[data-chapter]');if(b)selectChapter(b.dataset.chapter);});
$('.modes').addEventListener('click',e=>{const b=e.target.closest('[data-mode]');if(b){stopTour();setMode(b.dataset.mode==='explore');}});
$('#detailButton').addEventListener('click',()=>openDetail());$('#closeDetail').addEventListener('click',closeDetail);
$('#previousStage').addEventListener('click',()=>renderDetail(detailStage-1));$('#nextStage').addEventListener('click',()=>detailStage===3?closeDetail():renderDetail(detailStage+1));
$('#detailProgress').addEventListener('click',e=>{const b=e.target.closest('[data-step]');if(b)renderDetail(Number(b.dataset.step));});
$('#resetView').addEventListener('click',()=>{rotating=false;updateControls();moveCamera(detailOpen);});
$('#rotateView').addEventListener('click',()=>{stopTour();rotating=!rotating;setMode(true);dirty=true;});
addEventListener('keydown',e=>{if(e.key==='Escape'&&detailOpen)closeDetail();});
controls.addEventListener('change',()=>dirty=true);
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();$('#renderNotice').textContent='การแสดงผล 3D หยุดชั่วคราว · โหลดหน้าใหม่เพื่อเริ่มอีกครั้ง';$('#renderNotice').hidden=false;});
function updateLabels(){
 const w=viewport.clientWidth,h=viewport.clientHeight;
 nodes.forEach((n,i)=>{const v=new THREE.Vector3(...n.pos).project(camera);const b=hotspotElements[i];const visible=v.z>=-1&&v.z<=1&&Math.abs(v.x)<.94&&Math.abs(v.y)<.89;
  b.hidden=!visible;if(visible){const half=b.offsetWidth/2+10;b.style.left=`${Math.max(half,Math.min(w-half,(v.x*.5+.5)*w))}px`;b.style.top=`${Math.max(105,Math.min(h-95,(-v.y*.5+.5)*h))}px`;}
 });
}
function animate(time){
 requestAnimationFrame(animate);if(document.hidden){lastTime=time;return;}
 const dt=Math.min((time-lastTime)/1000,.05);lastTime=time;elapsed+=dt;
 if(transition<1){transition=Math.min(1,transition+dt*1.5);const ease=1-(1-transition)**3;camera.position.lerpVectors(fromPosition,toPosition,ease);controls.target.lerpVectors(fromTarget,toTarget,ease);dirty=true;}
 controls.update(dt);
 if(!basic||dirty||((rotating||activeScene)&&time-lastRender>160)){
  activeScene?.animate(elapsed,reduced);renderer.render(scene,camera);updateLabels();dirty=false;lastRender=time;
  if(!$('#loader').classList.contains('done'))$('#loader').classList.add('done');
 }
}
selectChapter('overview');updateControls();requestAnimationFrame(animate);
