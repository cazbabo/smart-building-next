import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const canvas = document.querySelector('#scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x060b12);
scene.fog = new THREE.FogExp2(0x07101a, 0.0085);
const camera = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, 0.1, 500);
camera.position.set(58, 38, 62);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.target.set(0, 18, 0);
controls.minDistance = 28;
controls.maxDistance = 120;
controls.maxPolarAngle = Math.PI * 0.49;
controls.enabled = false;

const environment = new RoomEnvironment();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(environment, 0.035).texture;
environment.dispose(); pmrem.dispose();

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.42, 0.7, 0.82);
composer.addPass(bloom); composer.addPass(new OutputPass());

// Cinematic environment and site.
const ground = new THREE.Mesh(
  new THREE.CircleGeometry(92, 96),
  new THREE.MeshPhysicalMaterial({ color: 0x111c24, metalness: 0.16, roughness: 0.42, clearcoat: 0.4 })
);
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
const innerCourt = new THREE.Mesh(
  new THREE.RingGeometry(27, 48, 96),
  new THREE.MeshStandardMaterial({ color: 0x15242c, roughness: 0.72, side: THREE.DoubleSide })
);
innerCourt.rotation.x = -Math.PI / 2; innerCourt.position.y = 0.025; scene.add(innerCourt);
for (const radius of [31, 39, 48]) {
  const ring = new THREE.Mesh(new THREE.RingGeometry(radius, radius + 0.035, 128), new THREE.MeshBasicMaterial({ color: 0x294451, transparent: true, opacity: 0.38, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05; scene.add(ring);
}

const grid = new THREE.GridHelper(170, 34, 0x19313c, 0x132631);
grid.material.transparent = true; grid.material.opacity = 0.28; scene.add(grid);
const skyline = new THREE.Group(); scene.add(skyline);
for (let i = 0; i < 34; i++) {
  const angle = i / 34 * Math.PI * 2;
  const distance = 70 + Math.random() * 24;
  const height = 5 + Math.random() * 20;
  const block = new THREE.Mesh(new THREE.BoxGeometry(5 + Math.random() * 7, height, 5 + Math.random() * 7), new THREE.MeshStandardMaterial({ color: 0x0b151e, roughness: 0.85 }));
  block.position.set(Math.cos(angle) * distance, height / 2, Math.sin(angle) * distance);
  skyline.add(block);
}

const hemi = new THREE.HemisphereLight(0xa8d9ee, 0x05080d, 1.5); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xe4f4ff, 4.6); sun.position.set(-26, 62, 34); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -55; sun.shadow.camera.right = 55; sun.shadow.camera.top = 70; sun.shadow.camera.bottom = -20; scene.add(sun);
const cyanRim = new THREE.SpotLight(0x38d9f5, 1800, 140, 0.52, 0.9); cyanRim.position.set(42, 18, -46); cyanRim.target.position.set(0, 18, 0); scene.add(cyanRim, cyanRim.target);
const warmRim = new THREE.SpotLight(0xffa45b, 1400, 120, 0.58, 1); warmRim.position.set(-45, 28, -20); warmRim.target.position.set(0, 16, 0); scene.add(warmRim, warmRim.target);

const tower = new THREE.Group(); tower.name = 'LumenHQ'; scene.add(tower);
let architecture;
new GLTFLoader().load('/assets/lumen-hq.glb', ({ scene: model }) => {
  architecture = model;
  const bounds = new THREE.Box3().setFromObject(model);
  const center = bounds.getCenter(new THREE.Vector3());
  model.position.set(-center.x, -bounds.min.y, -center.z);
  model.traverse(object => {
    if (!object.isMesh) return;
    object.castShadow = true; object.receiveShadow = true;
    if (object.material) {
      object.material.envMapIntensity = 1.35;
      if (/window|glass/i.test(object.material.name)) {
        object.material.metalness = 0.15; object.material.roughness = 0.14;
      }
    }
  });
  tower.add(model);
  document.querySelector('#loader').classList.add('done');
}, (event) => {
  if (event.total) document.querySelector('#loadPercent').textContent = `${Math.round(event.loaded / event.total * 100)}%`;
}, () => {
  document.querySelector('#loader p').textContent = 'ไม่สามารถเปิดโมเดลได้';
});

const cyan = new THREE.MeshStandardMaterial({ color: 0x38d9f5, emissive: 0x0aa9c6, emissiveIntensity: 3, roughness: 0.25 });
const cyanGhost = new THREE.MeshBasicMaterial({ color: 0x38d9f5, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false });
const amber = new THREE.MeshStandardMaterial({ color: 0xffb066, emissive: 0xe56e22, emissiveIntensity: 2.2 });
const alert = new THREE.MeshStandardMaterial({ color: 0xff5d62, emissive: 0xe12c34, emissiveIntensity: 3 });
const overlays = {};
for (const key of ['energy', 'comfort', 'workspace', 'security', 'parking', 'plant']) {
  overlays[key] = new THREE.Group(); overlays[key].visible = false; overlays[key].name = key; scene.add(overlays[key]);
}

function orb(parent, position, radius = 0.3, material = cyan) {
  const object = new THREE.Mesh(new THREE.SphereGeometry(radius, 18, 12), material);
  object.position.set(...position); object.userData.pulse = true; parent.add(object); return object;
}
function line(parent, points, color = 0x38d9f5) {
  const curve = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)));
  const object = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.055, 8, false), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 }));
  object.userData.glow = true; parent.add(object); return object;
}
function floorHalo(parent, y, scale = 1) {
  const halo = new THREE.Mesh(new THREE.RingGeometry(13 * scale, 13.08 * scale, 80), cyanGhost);
  halo.rotation.x = -Math.PI / 2; halo.position.y = y; parent.add(halo); return halo;
}

// Energy — roof generation and a visible electrical nervous system.
for (const [x, z] of [[-8, -5], [-3, -5], [2, -5], [7, -5], [-8, 1], [-3, 1], [2, 1], [7, 1]]) {
  const panel = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.14, 2.2), cyan);
  panel.position.set(x, 43.2, z); panel.rotation.x = -0.18; overlays.energy.add(panel);
}
line(overlays.energy, [[0, 43, 0], [15.5, 43, 0], [15.5, 4, 0]]);
for (const y of [5, 9, 13, 17, 21, 25, 29, 33, 37]) orb(overlays.energy, [15.5, y, 0], 0.25);

// Comfort — floor slices and moving air particles.
for (const y of [9, 17, 25, 33]) {
  floorHalo(overlays.comfort, y);
  for (let x = -9; x <= 9; x += 3) {
    const particle = orb(overlays.comfort, [x, y + 0.8, 4], 0.11);
    particle.userData.air = { origin: y + 0.8, offset: Math.random() * 3 };
  }
}

// Workspace — occupied points distributed by floor.
for (const y of [7, 11, 15, 23, 27, 31, 35]) {
  for (let x = -9; x <= 9; x += 3) for (const z of [-5, 2]) {
    const person = orb(overlays.workspace, [x, y, z], 0.14, Math.random() > 0.25 ? amber : cyan);
    person.userData.float = Math.random() * Math.PI * 2;
  }
}
floorHalo(overlays.workspace, 35, 1.08);

// Security — lobby control ring, readers and camera fields.
floorHalo(overlays.security, 0.3, 1.28);
for (const x of [-4, 0, 4]) {
  const gate = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.15, 1.8), cyan); gate.position.set(x, 0.65, 13); overlays.security.add(gate);
}
for (const [x, y, z] of [[-15, 4, 12], [15, 4, 12], [-14, 20, 10], [14, 32, 8]]) {
  orb(overlays.security, [x, y, z], 0.24);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(3.5, 9, 24, 1, true), cyanGhost);
  cone.position.set(x, y - 3.5, z); cone.rotation.x = Math.PI; overlays.security.add(cone);
}

// Parking — an illuminated B1 section beneath the tower.
const parkingPlate = new THREE.Mesh(new THREE.BoxGeometry(34, 2.8, 25), new THREE.MeshPhysicalMaterial({ color: 0x10222c, transparent: true, opacity: 0.62, roughness: 0.45 }));
parkingPlate.position.y = -2; overlays.parking.add(parkingPlate);
for (const x of [-11, -5, 1, 7]) for (const z of [-6, 5]) {
  const bay = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.025, 2.2), cyanGhost); bay.position.set(x, -0.55, z); overlays.parking.add(bay);
}
for (const x of [-10, -4, 2]) {
  const car = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1, 1.8), x === 2 ? cyan : amber); car.position.set(x, -0.05, -6); overlays.parking.add(car);
}

// Plant — B2 equipment, pipe network and warning on Chiller-03.
const plantPlate = new THREE.Mesh(new THREE.BoxGeometry(34, 4.5, 25), new THREE.MeshPhysicalMaterial({ color: 0x0c1b24, transparent: true, opacity: 0.72, roughness: 0.55 }));
plantPlate.position.y = -6; overlays.plant.add(plantPlate);
for (const x of [-10, 0, 10]) {
  const chiller = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 5.4, 32), x === 10 ? alert : cyan);
  chiller.rotation.z = Math.PI / 2; chiller.position.set(x, -5, 0); chiller.userData.pulse = x === 10; overlays.plant.add(chiller);
  line(overlays.plant, [[x, -3, -3], [x, -3, 4], [0, -3, 7]], x === 10 ? 0xff5d62 : 0x38d9f5);
}

const stories = {
  overview: { number: '01', label: 'THE LIVING BUILDING', headline: 'อาคารที่มองเห็น<br><em>อนาคต</em>', description: 'ทุกพื้นที่ ทุกระบบ และทุกเหตุการณ์ เชื่อมอยู่บน Digital Twin เดียว เพื่อให้ทีมอาคารตัดสินใจก่อนที่ปัญหาจะเกิด', impact: 'ลดพลังงาน 18%', status: 'ALL SYSTEMS OPTIMAL', camera: [58, 38, 62], target: [0, 18, 0], readings: [['ENERGY NOW', '286', 'kW'], ['OCCUPANCY', '428', 'people'], ['AIR QUALITY', '612', 'ppm CO₂']] },
  energy: { number: '02', label: 'ENERGY FLOW', headline: 'เห็นพลังงาน<br><em>ทุกเส้นทาง</em>', description: 'Solar, Main Meter และมิเตอร์รายชั้นถูกวางกลับลงบนตัวอาคาร เพื่อเห็นว่าโหลดเกิดที่ไหนและควบคุม Peak อย่างไร', impact: 'ลดค่าไฟ 4.2 ล้านบาท/ปี', status: 'ENERGY OPTIMIZATION ACTIVE', camera: [47, 52, 48], target: [3, 29, 0], readings: [['BUILDING LOAD', '286', 'kW'], ['SOLAR OUTPUT', '74', 'kW'], ['PEAK AVOIDED', '42', 'kW']] },
  comfort: { number: '03', label: 'HVAC & AIR QUALITY', headline: 'อากาศที่ปรับตาม<br><em>คนจริง</em>', description: 'ระบบวิเคราะห์จำนวนคน CO₂ และ PM2.5 รายชั้น ก่อนสั่ง AHU และ Fresh Air ให้ทำงานเท่าที่จำเป็น', impact: 'เพิ่ม Comfort Score 14%', status: '96% ZONES WITHIN TARGET', camera: [52, 27, 40], target: [0, 20, 0], readings: [['CO₂ AVERAGE', '612', 'ppm'], ['PM2.5', '8', 'μg/m³'], ['COMFORT', '96', '%']] },
  workspace: { number: '04', label: 'PEOPLE & WORKSPACE', headline: 'พื้นที่พร้อม<br><em>ก่อนคนมาถึง</em>', description: 'เห็นการใช้โต๊ะ ห้องประชุม และความหนาแน่นจริง เพื่อปรับพื้นที่ บริการ และพลังงานตามรูปแบบการทำงาน', impact: 'ใช้พื้นที่เพิ่มขึ้น 22%', status: '428 PEOPLE IN BUILDING', camera: [42, 24, 44], target: [0, 20, 1], readings: [['OCCUPANCY', '72', '%'], ['ROOMS FREE', '3', 'rooms'], ['NO-SHOW', '−31', '%']] },
  security: { number: '05', label: 'ACCESS & CCTV', headline: 'ทุกการเข้าออก<br><em>เชื่อมเป็นเหตุการณ์</em>', description: 'Visitor, Access Control และ CCTV ทำงานบนบริบทเดียวกัน ตั้งแต่ทางเข้าจนถึงพื้นที่ปลายทาง', impact: 'ลดเวลาลงทะเบียน 43%', status: 'PERIMETER SECURE', camera: [46, 11, 49], target: [0, 5, 5], readings: [['ENTRIES TODAY', '428', 'people'], ['VISITORS', '36', 'people'], ['INCIDENTS', '0', 'events']] },
  parking: { number: '06', label: 'PARKING & EV', headline: 'จากทางเข้า<br><em>ถึงช่องจอด</em>', description: 'LPR, ช่องจอด และ EV Charger เชื่อมกัน เพื่อพารถไปยังจุดหมายและบริหารพลังงานการชาร์จ', impact: 'ลดเวลาหาที่จอด 6 นาที', status: '11 BAYS AVAILABLE', camera: [47, 4, 46], target: [0, -1.5, 0], readings: [['AVAILABLE', '11', 'bays'], ['EV CHARGING', '4', 'cars'], ['VEHICLES', '312', 'today']] },
  plant: { number: '07', label: 'PLANT INTELLIGENCE', headline: 'รู้ก่อนเครื่องจักร<br><em>หยุดทำงาน</em>', description: 'Digital Twin ชี้ Chiller-03 ที่ค่า ΔT ผิดปกติ เชื่อมผลกระทบกับพื้นที่และจัดลำดับการตรวจสอบให้ทีมอาคาร', impact: 'เลี่ยง Downtime 4 ชั่วโมง', status: '1 SIMULATED ALERT', camera: [43, -1, 40], target: [0, -5, 0], readings: [['CHILLER ΔT', '9.8', '°C'], ['EFFICIENCY', '0.71', 'kW/RT'], ['ACTION', '2', 'hours']] }
};

let current = 'overview', tween = 1, tourTimer, tourIndex = 0;
const fromCamera = new THREE.Vector3(), fromTarget = new THREE.Vector3(), toCamera = new THREE.Vector3(), toTarget = new THREE.Vector3();
function selectChapter(name, manual = true) {
  current = name; const story = stories[name];
  fromCamera.copy(camera.position); fromTarget.copy(controls.target); toCamera.fromArray(story.camera); toTarget.fromArray(story.target); tween = 0; controls.enabled = false;
  Object.entries(overlays).forEach(([key, group]) => group.visible = key === name);
  document.querySelectorAll('.chapter').forEach(button => button.classList.toggle('active', button.dataset.chapter === name));
  document.querySelector('#chapterNumber').textContent = story.number;
  document.querySelector('#chapterLabel').textContent = story.label;
  document.querySelector('#headline').innerHTML = story.headline;
  document.querySelector('#description').textContent = story.description;
  document.querySelector('#impact').textContent = story.impact;
  document.querySelector('#statusText').textContent = story.status;
  document.querySelector('#readings').innerHTML = story.readings.map(([label, value, unit]) => `<div><small>${label}</small><strong>${value}</strong><span>${unit}</span></div>`).join('');
  document.querySelector('#floorProgress').style.height = `${22 + Number(story.number) * 10}%`;
  if (manual && tourTimer) stopTour();
}
function stopTour() { clearInterval(tourTimer); tourTimer = null; document.querySelector('#tourButton').innerHTML = 'เริ่มนำเสนอ <i></i>'; }
document.querySelectorAll('.chapter').forEach(button => button.addEventListener('click', () => selectChapter(button.dataset.chapter)));
document.querySelector('#tourButton').addEventListener('click', () => {
  if (tourTimer) { stopTour(); return; }
  const order = Object.keys(stories); tourIndex = 0; selectChapter(order[0], false);
  document.querySelector('#tourButton').textContent = 'หยุดการนำเสนอ';
  tourTimer = setInterval(() => { tourIndex = (tourIndex + 1) % order.length; selectChapter(order[tourIndex], false); }, 16000);
});
document.querySelectorAll('.mode').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('.mode').forEach(item => item.classList.toggle('active', item === button));
  const explore = button.dataset.mode === 'explore';
  document.querySelector('#experience').classList.toggle('explore', explore);
  controls.enabled = explore; controls.autoRotate = false;
  document.querySelector('#interactionHint').textContent = explore ? 'ลาก หมุน ซูม และสำรวจอาคารได้อย่างอิสระ' : 'ลากเพื่อหมุน · Scroll เพื่อซูม';
  if (!explore) selectChapter(current, false);
}));

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.04), elapsed = clock.elapsedTime;
  if (tween < 1) {
    tween = Math.min(1, tween + delta * 0.72);
    const ease = 1 - Math.pow(1 - tween, 4);
    camera.position.lerpVectors(fromCamera, toCamera, ease); controls.target.lerpVectors(fromTarget, toTarget, ease);
    if (tween === 1 && document.querySelector('#experience').classList.contains('explore')) controls.enabled = true;
  }
  Object.values(overlays).forEach(group => group.traverse(object => {
    if (object.userData.pulse) object.scale.setScalar(0.82 + Math.sin(elapsed * 2.5 + object.id) * 0.18);
    if (object.userData.glow && object.material) object.material.opacity = 0.58 + Math.sin(elapsed * 2 + object.id) * 0.3;
    if (object.userData.air) object.position.y = object.userData.air.origin - ((elapsed * 0.55 + object.userData.air.offset) % 1.4);
    if (object.userData.float) object.position.y += Math.sin(elapsed * 1.8 + object.userData.float) * 0.0015;
  }));
  if (current === 'overview' && !controls.enabled) tower.rotation.y = Math.sin(elapsed * 0.12) * 0.035;
  controls.update(); composer.render();
}
animate();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight); renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6)); composer.setSize(innerWidth, innerHeight);
});
