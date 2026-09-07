import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createPremiumBuilding } from './building.js';

const canvas = document.querySelector('#scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;
renderer.localClippingEnabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1822);
scene.fog = new THREE.FogExp2(0x0b1822, 0.0085);
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
grid.material.transparent = true; grid.material.opacity = 0.14; scene.add(grid);
const skyline = new THREE.Group(); scene.add(skyline);
for (let i = 0; i < 34; i++) {
  const angle = i / 34 * Math.PI * 2;
  const distance = 70 + Math.random() * 24;
  const height = 5 + Math.random() * 20;
  const block = new THREE.Mesh(new THREE.BoxGeometry(5 + Math.random() * 7, height, 5 + Math.random() * 7), new THREE.MeshStandardMaterial({ color: 0x0b151e, roughness: 0.85 }));
  block.position.set(Math.cos(angle) * distance, height / 2, Math.sin(angle) * distance);
  skyline.add(block);
}
skyline.visible = false;

const hemi = new THREE.HemisphereLight(0xa8d9ee, 0x05080d, 1.5); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xe4f4ff, 4.6); sun.position.set(-26, 62, 34); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -55; sun.shadow.camera.right = 55; sun.shadow.camera.top = 70; sun.shadow.camera.bottom = -20; scene.add(sun);
const cyanRim = new THREE.SpotLight(0x38d9f5, 1800, 140, 0.52, 0.9); cyanRim.position.set(42, 18, -46); cyanRim.target.position.set(0, 18, 0); scene.add(cyanRim, cyanRim.target);
const warmRim = new THREE.SpotLight(0xffa45b, 1400, 120, 0.58, 1); warmRim.position.set(-45, 28, -20); warmRim.target.position.set(0, 16, 0); scene.add(warmRim, warmRim.target);

const tower = new THREE.Group(); tower.name = 'LumenHQ'; scene.add(tower);
const premiumBuilding = createPremiumBuilding();
const architecture = premiumBuilding.architecture;
tower.add(premiumBuilding.group);
const cutPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0.8);
function setArchitectureCutaway(enabled) {
  if (!architecture) return;
  architecture.traverse(object => {
    if (!object.isMesh || !object.material) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach(material => { material.clippingPlanes = enabled ? [cutPlane] : []; material.clipShadows = true; material.needsUpdate = true; });
  });
}
requestAnimationFrame(() => {
  document.querySelector('#loadPercent').textContent = '100%';
  document.querySelector('#loader').classList.add('done');
});

const cyan = new THREE.MeshStandardMaterial({ color: 0x38d9f5, emissive: 0x0aa9c6, emissiveIntensity: 3, roughness: 0.25 });
const cyanGhost = new THREE.MeshBasicMaterial({ color: 0x38d9f5, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false });
const amber = new THREE.MeshStandardMaterial({ color: 0xffb066, emissive: 0xe56e22, emissiveIntensity: 2.2 });
const alert = new THREE.MeshStandardMaterial({ color: 0xff5d62, emissive: 0xe12c34, emissiveIntensity: 3 });

// Furnished interior becomes visible when the facade enters X-ray cutaway mode.
const interior = new THREE.Group(); interior.name = 'InteriorCutaway'; interior.visible = false; scene.add(interior);
const slabMaterial = new THREE.MeshStandardMaterial({ color: 0xd9e3e7, roughness: 0.72 });
const wallMaterial = new THREE.MeshPhysicalMaterial({ color: 0xb9d5df, transparent: true, opacity: 0.24, roughness: 0.28, depthWrite: false });
const deskMaterial = new THREE.MeshStandardMaterial({ color: 0x8e6e52, roughness: 0.62 });
const floorLevels = [4.7, 8.7, 12.7, 16.7, 21, 25, 29, 33, 37.4];
floorLevels.forEach((y, floorIndex) => {
  const width = floorIndex < 4 ? 29 : floorIndex < 7 ? 27 : 28;
  const slab = new THREE.Mesh(new THREE.BoxGeometry(width, 0.22, 20), slabMaterial); slab.position.y = y; slab.receiveShadow = true; interior.add(slab);
  const rearWall = new THREE.Mesh(new THREE.BoxGeometry(width - 1, 3.3, 0.12), wallMaterial); rearWall.position.set(0, y + 1.75, -7.2); interior.add(rearWall);
  const core = new THREE.Mesh(new THREE.BoxGeometry(4.2, 3.5, 4.8), new THREE.MeshStandardMaterial({ color: 0x62727b, roughness: 0.78 })); core.position.set(0, y + 1.75, -1); interior.add(core);
  if (floorIndex === 0) {
    for (const x of [-4, 0, 4]) { const gate = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.1, 1.8), cyan); gate.position.set(x, y + 0.65, 6); interior.add(gate); }
  } else {
    for (const x of [-10, -6.5, 5.5, 9]) for (const z of [-4.8, 3.2]) {
      const desk = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.12, 0.9), deskMaterial); desk.position.set(x, y + 0.76, z); interior.add(desk);
      const screen = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.48, 0.07), floorIndex === 8 ? amber : cyan); screen.position.set(x, y + 1.1, z - 0.15); interior.add(screen);
    }
  }
});

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
function solutionFlow(parent, points, color = 0x38d9f5, packets = 5) {
  const curve = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)));
  line(parent, points, color);
  for (let i = 0; i < packets; i++) {
    const packet = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 10), new THREE.MeshBasicMaterial({ color }));
    packet.userData.flowPath = curve; packet.userData.flowOffset = i / packets; parent.add(packet);
  }
  const platform = new THREE.Mesh(new THREE.OctahedronGeometry(0.8, 1), cyan);
  platform.position.copy(curve.getPointAt(0.5)); platform.userData.pulse = true; platform.userData.platform = true; parent.add(platform);
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
solutionFlow(overlays.energy, [[0, 43, 0], [0, 24, -1], [15.5, 20, 0], [8, 12, 3]], 0x38d9f5, 7);

// Comfort — floor slices and moving air particles.
for (const y of [9, 17, 25, 33]) {
  floorHalo(overlays.comfort, y);
  for (let x = -9; x <= 9; x += 3) {
    const particle = orb(overlays.comfort, [x, y + 0.8, 4], 0.11);
    particle.userData.air = { origin: y + 0.8, offset: Math.random() * 3 };
  }
}
solutionFlow(overlays.comfort, [[-9, 25, 4], [0, 24, -1], [-8, 21, -4], [7, 21, 3]], 0x38d9f5, 6);

// Workspace — occupied points distributed by floor.
for (const y of [7, 11, 15, 23, 27, 31, 35]) {
  for (let x = -9; x <= 9; x += 3) for (const z of [-5, 2]) {
    const person = orb(overlays.workspace, [x, y, z], 0.14, Math.random() > 0.25 ? amber : cyan);
    person.userData.float = Math.random() * Math.PI * 2;
  }
}
floorHalo(overlays.workspace, 35, 1.08);
solutionFlow(overlays.workspace, [[-9, 31, 2], [0, 24, -1], [8, 35, 2]], 0xffb066, 6);

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
solutionFlow(overlays.security, [[0, 4.8, 13], [0, 8, -1], [8, 16, 4]], 0x38d9f5, 5);

// Parking — an illuminated B1 section beneath the tower.
const parkingPlate = new THREE.Mesh(new THREE.BoxGeometry(34, 2.8, 25), new THREE.MeshPhysicalMaterial({ color: 0x10222c, transparent: true, opacity: 0.62, roughness: 0.45 }));
parkingPlate.position.y = -2; overlays.parking.add(parkingPlate);
for (const x of [-11, -5, 1, 7]) for (const z of [-6, 5]) {
  const bay = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.025, 2.2), cyanGhost); bay.position.set(x, -0.55, z); overlays.parking.add(bay);
}
for (const x of [-10, -4, 2]) {
  const car = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1, 1.8), x === 2 ? cyan : amber); car.position.set(x, -0.05, -6); overlays.parking.add(car);
}
solutionFlow(overlays.parking, [[-15, -1, 8], [0, -1, -1], [9, -1, -6]], 0x38d9f5, 5);

// Plant — B2 equipment, pipe network and warning on Chiller-03.
const plantPlate = new THREE.Mesh(new THREE.BoxGeometry(34, 4.5, 25), new THREE.MeshPhysicalMaterial({ color: 0x0c1b24, transparent: true, opacity: 0.72, roughness: 0.55 }));
plantPlate.position.y = -6; overlays.plant.add(plantPlate);
for (const x of [-10, 0, 10]) {
  const chiller = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 5.4, 32), x === 10 ? alert : cyan);
  chiller.rotation.z = Math.PI / 2; chiller.position.set(x, -5, 0); chiller.userData.pulse = x === 10; overlays.plant.add(chiller);
  line(overlays.plant, [[x, -3, -3], [x, -3, 4], [0, -3, 7]], x === 10 ? 0xff5d62 : 0x38d9f5);
}
solutionFlow(overlays.plant, [[10, -5, 0], [0, -5, -1], [0, 12, -1], [8, 21, 2]], 0xff5d62, 7);

const stories = {
  overview: { number: '01', label: 'THE LIVING BUILDING', headline: 'อาคารที่มองเห็น<br><em>อนาคต</em>', description: 'ทุกพื้นที่ ทุกระบบ และทุกเหตุการณ์ เชื่อมอยู่บน Digital Twin เดียว เพื่อให้ทีมอาคารตัดสินใจก่อนที่ปัญหาจะเกิด', impact: 'ลดพลังงาน 18%', status: 'ALL SYSTEMS OPTIMAL', camera: [58, 38, 62], target: [0, 18, 0], readings: [['ENERGY NOW', '286', 'kW'], ['OCCUPANCY', '428', 'people'], ['AIR QUALITY', '612', 'ppm CO₂']] },
  energy: { number: '02', label: 'ENERGY FLOW', headline: 'เห็นพลังงาน<br><em>ทุกเส้นทาง</em>', description: 'Solar, Main Meter และมิเตอร์รายชั้นถูกวางกลับลงบนตัวอาคาร เพื่อเห็นว่าโหลดเกิดที่ไหนและควบคุม Peak อย่างไร', impact: 'ลดค่าไฟ 4.2 ล้านบาท/ปี', status: 'ENERGY OPTIMIZATION ACTIVE', camera: [47, 52, 48], target: [3, 29, 0], readings: [['BUILDING LOAD', '286', 'kW'], ['SOLAR OUTPUT', '74', 'kW'], ['PEAK AVOIDED', '42', 'kW']] },
  comfort: { number: '03', label: 'HVAC & AIR QUALITY', headline: 'อากาศที่ปรับตาม<br><em>คนจริง</em>', description: 'ระบบวิเคราะห์จำนวนคน CO₂ และ PM2.5 รายชั้น ก่อนสั่ง AHU และ Fresh Air ให้ทำงานเท่าที่จำเป็น', impact: 'เพิ่ม Comfort Score 14%', status: '96% ZONES WITHIN TARGET', camera: [52, 27, 40], target: [0, 20, 0], readings: [['CO₂ AVERAGE', '612', 'ppm'], ['PM2.5', '8', 'μg/m³'], ['COMFORT', '96', '%']] },
  workspace: { number: '04', label: 'PEOPLE & WORKSPACE', headline: 'พื้นที่พร้อม<br><em>ก่อนคนมาถึง</em>', description: 'เห็นการใช้โต๊ะ ห้องประชุม และความหนาแน่นจริง เพื่อปรับพื้นที่ บริการ และพลังงานตามรูปแบบการทำงาน', impact: 'ใช้พื้นที่เพิ่มขึ้น 22%', status: '428 PEOPLE IN BUILDING', camera: [42, 24, 44], target: [0, 20, 1], readings: [['OCCUPANCY', '72', '%'], ['ROOMS FREE', '3', 'rooms'], ['NO-SHOW', '−31', '%']] },
  security: { number: '05', label: 'ACCESS & CCTV', headline: 'ทุกการเข้าออก<br><em>เชื่อมเป็นเหตุการณ์</em>', description: 'Visitor, Access Control และ CCTV ทำงานบนบริบทเดียวกัน ตั้งแต่ทางเข้าจนถึงพื้นที่ปลายทาง', impact: 'ลดเวลาลงทะเบียน 43%', status: 'PERIMETER SECURE', camera: [46, 11, 49], target: [0, 5, 5], readings: [['ENTRIES TODAY', '428', 'people'], ['VISITORS', '36', 'people'], ['INCIDENTS', '0', 'events']] },
  parking: { number: '06', label: 'PARKING & EV', headline: 'จากทางเข้า<br><em>ถึงช่องจอด</em>', description: 'LPR, ช่องจอด และ EV Charger เชื่อมกัน เพื่อพารถไปยังจุดหมายและบริหารพลังงานการชาร์จ', impact: 'ลดเวลาหาที่จอด 6 นาที', status: '11 BAYS AVAILABLE', camera: [47, 4, 46], target: [0, -1.5, 0], readings: [['AVAILABLE', '11', 'bays'], ['EV CHARGING', '4', 'cars'], ['VEHICLES', '312', 'today']] },
  plant: { number: '07', label: 'PLANT INTELLIGENCE', headline: 'รู้ก่อนเครื่องจักร<br><em>หยุดทำงาน</em>', description: 'Digital Twin ชี้ Chiller-03 ที่ค่า ΔT ผิดปกติ เชื่อมผลกระทบกับพื้นที่และจัดลำดับการตรวจสอบให้ทีมอาคาร', impact: 'เลี่ยง Downtime 4 ชั่วโมง', status: '1 SIMULATED ALERT', camera: [43, -1, 40], target: [0, -5, 0], readings: [['CHILLER ΔT', '9.8', '°C'], ['EFFICIENCY', '0.71', 'kW/RT'], ['ACTION', '2', 'hours']] }
};

const solutionSteps = {
  overview: [['COLLECT', 'รับข้อมูลจากทุกระบบ'], ['UNDERSTAND', 'เชื่อมเหตุการณ์กับพื้นที่'], ['ACT', 'สั่งการและติดตามผล']],
  energy: [['SENSE', 'อ่าน Solar และ Smart Meter'], ['OPTIMIZE', 'คาดการณ์โหลดและ Peak'], ['CONTROL', 'ปรับโหลดและกักเก็บพลังงาน']],
  comfort: [['SENSE', 'วัดคน CO₂ และ PM2.5'], ['DECIDE', 'คำนวณอากาศที่ต้องใช้'], ['RESPOND', 'สั่ง AHU และ Fresh Air']],
  workspace: [['DETECT', 'เห็นโต๊ะและห้องที่ใช้งาน'], ['PREDICT', 'คาดการณ์ความหนาแน่น'], ['PREPARE', 'เตรียมห้อง แสง และอากาศ']],
  security: [['IDENTIFY', 'อ่าน QR ใบหน้า และบัตร'], ['VERIFY', 'ตรวจสิทธิ์และเส้นทาง'], ['PROTECT', 'เปิดประตูและติดตามด้วย CCTV']],
  parking: [['RECOGNIZE', 'อ่านป้ายทะเบียนที่ทางเข้า'], ['GUIDE', 'เลือกช่องและเส้นทางที่เหมาะ'], ['CHARGE', 'จัดคิวและกำลัง EV Charger']],
  plant: [['MONITOR', 'อ่านค่า Chiller และ Pump'], ['DETECT', 'พบ ΔT เบี่ยงเบนจากปกติ'], ['RESOLVE', 'แจ้งงานและปรับระบบสำรอง']]
};

const deepDiveScenes = {
  overview: [
    { title: 'เชื่อมต่อทุกระบบ', description: 'Gateway รับข้อมูลจาก BMS, Meter, Access, Parking และอุปกรณ์ IoT ด้วย timestamp เดียวกัน', data: [['CONNECTED POINTS', '12,480', 'points'], ['PROTOCOLS', '7', 'types'], ['UPDATE', '5', 'sec']], logic: 'Normalize tag และผูก Device ID เข้ากับชั้น ห้อง และอุปกรณ์ใน Digital Twin', result: 'ข้อมูลจากทุกระบบอ่านร่วมกันได้', camera: [38, 26, 36], target: [0, 19, 0] },
    { title: 'สร้างบริบทของอาคาร', description: 'สถานะไม่ได้แสดงเป็นตารางอย่างเดียว แต่ผูกกลับไปยังพื้นที่ คน และระบบที่ได้รับผลกระทบ', data: [['FLOORS', '9', 'levels'], ['ASSETS', '326', 'units'], ['RELATIONS', '1,842', 'links']], logic: 'Knowledge graph เชื่อม Sensor → Equipment → Zone → Occupant → Business service', result: 'รู้ว่าค่าที่เปลี่ยนกระทบอะไรต่อ', camera: [34, 23, 31], target: [0, 20, 0] },
    { title: 'วิเคราะห์เหตุการณ์', description: 'ระบบเปรียบเทียบค่าปัจจุบันกับ baseline, schedule และความสัมพันธ์ของอุปกรณ์ใกล้เคียง', data: [['RULES', '48', 'active'], ['ANOMALY', '1', 'event'], ['CONFIDENCE', '94', '%']], logic: 'รวม Rule engine กับ anomaly detection เพื่อลด alarm ที่ไม่เกี่ยวข้อง', result: 'เหลือเฉพาะเหตุการณ์ที่ทีมต้องทำ', camera: [31, 18, 29], target: [0, 15, -1] },
    { title: 'สั่งการและยืนยันผล', description: 'Platform ส่งคำสั่งกลับไปยังระบบต้นทางและติดตามค่าหลังสั่งการ เพื่อยืนยันว่าอาคารตอบสนองจริง', data: [['ACTIONS', '16', 'today'], ['AUTO RESOLVED', '12', 'events'], ['SLA', '99.2', '%']], logic: 'ใช้ policy และ approval level กำหนดว่าเหตุการณ์ใดสั่งอัตโนมัติหรือส่งให้คนอนุมัติ', result: 'ปิดวงจรจากข้อมูลไปสู่ผลลัพธ์', camera: [40, 18, 34], target: [5, 13, 0] }
  ],
  energy: [
    { title: 'Solar และ Smart Meter', description: 'อ่านกำลังผลิตจาก Inverter, Main Meter และ Sub-meter ทุกชั้นในช่วงเวลาเดียวกัน', data: [['SOLAR', '74', 'kW'], ['GRID IMPORT', '212', 'kW'], ['POWER FACTOR', '0.97', 'PF']], logic: 'ตรวจสมดุลพลังงานระหว่างแหล่งผลิต โหลด และการนำเข้าจาก Grid', result: 'เห็น Energy balance แบบเรียลไทม์', camera: [31, 52, 27], target: [0, 42, 0] },
    { title: 'แยกโหลดรายพื้นที่', description: 'Sub-meter แยก HVAC, Lighting, Plug load และ EV เพื่อระบุชั้นที่ใช้เกิน baseline', data: [['HVAC LOAD', '142', 'kW'], ['LIGHTING', '51', 'kW'], ['PLUG LOAD', '46', 'kW']], logic: 'เทียบ kWh/m² กับ occupancy และตารางใช้งานของแต่ละชั้น', result: 'พบชั้น 7 ใช้สูงกว่าปกติ 12%', camera: [35, 30, 27], target: [12, 24, 0] },
    { title: 'คาดการณ์ Peak', description: 'รวมพยากรณ์อากาศ ตารางประชุม และโหลดปัจจุบัน เพื่อคาดการณ์ Demand ใน 30 นาทีข้างหน้า', data: [['FORECAST PEAK', '328', 'kW'], ['CONTRACT LIMIT', '310', 'kW'], ['WINDOW', '30', 'min']], logic: 'Optimization engine เลือกโหลดที่เลื่อนได้โดยไม่กระทบ Comfort', result: 'เตรียมลด Peak 18 kW ก่อนเกิดจริง', camera: [31, 27, 29], target: [0, 24, -1] },
    { title: 'สั่งลดโหลดและวัดผล', description: 'ปรับ AHU setpoint, เลื่อน EV charging และใช้ Solar ให้มากขึ้น แล้ววัด Peak หลังดำเนินการ', data: [['LOAD SHED', '21', 'kW'], ['COMFORT CHANGE', '0.3', '°C'], ['SAVING', '11,600', 'THB']], logic: 'Guardrail ป้องกันไม่ให้อุณหภูมิหรือคุณภาพอากาศหลุดเกณฑ์ระหว่างลดโหลด', result: 'Peak อยู่ต่ำกว่า Contract limit', camera: [38, 18, 31], target: [8, 13, 2] }
  ],
  comfort: [
    { title: 'ตรวจสภาพแต่ละ Zone', description: 'เซนเซอร์วัด CO₂, PM2.5, อุณหภูมิ, ความชื้น และจำนวนคนในทุกพื้นที่ใช้งาน', data: [['CO₂', '612', 'ppm'], ['PM2.5', '8', 'μg/m³'], ['RH', '54', '%']], logic: 'ตรวจคุณภาพข้อมูลและใช้ค่าเฉลี่ยหลาย Sensor เพื่อลด false reading', result: 'ชั้น 6 ห้องประชุมเริ่มมี CO₂ สูงขึ้น', camera: [37, 25, 29], target: [-7, 24, 3] },
    { title: 'คำนวณอากาศที่ต้องใช้', description: 'Platform คำนวณ Fresh Air และ Cooling demand จากจำนวนคนจริงแทนการเดินเครื่องเต็มตลอดวัน', data: [['PEOPLE', '24', 'persons'], ['FRESH AIR', '480', 'm³/h'], ['COOLING', '18.2', 'kW']], logic: 'Demand-controlled ventilation รักษา CO₂ ต่ำกว่า 800 ppm โดยใช้พลังงานต่ำสุด', result: 'เพิ่ม Fresh Air เฉพาะ Zone ที่ต้องการ', camera: [32, 26, 28], target: [0, 24, -1] },
    { title: 'สั่ง AHU และ VAV', description: 'BMS ปรับ Damper, Fan speed และ VAV setpoint พร้อมแสดงเส้นทางลมเข้าสู่พื้นที่', data: [['DAMPER', '68', '%'], ['FAN SPEED', '54', 'Hz'], ['SAT', '13.5', '°C']], logic: 'PID setpoint ถูกจำกัดด้วย Comfort policy และสถานะ Chiller plant', result: 'ปริมาณลมเพิ่มโดยไม่เปิดทั้งชั้น', camera: [35, 22, 25], target: [-7, 21, -3] },
    { title: 'ยืนยันคุณภาพอากาศ', description: 'ระบบติดตามค่า CO₂ หลังสั่งการและลด Fan speed เมื่อค่ากลับเข้าเป้าหมาย', data: [['CO₂ AFTER', '684', 'ppm'], ['RESPONSE', '7', 'min'], ['ENERGY SAVED', '8.4', '%']], logic: 'Closed-loop verification เปรียบเทียบผลจริงกับผลที่คาดการณ์ไว้', result: 'Comfort กลับสู่เป้าหมายภายใน 7 นาที', camera: [40, 25, 32], target: [5, 21, 3] }
  ],
  workspace: [
    { title: 'รวม Booking และ Occupancy', description: 'ข้อมูลจองห้องถูกตรวจสอบกับ Presence sensor เพื่อรู้ว่าห้องถูกใช้งานจริงหรือเป็น No-show', data: [['BOOKED', '18', 'rooms'], ['OCCUPIED', '15', 'rooms'], ['NO-SHOW', '3', 'rooms']], logic: 'หากไม่พบคนภายใน 15 นาที ระบบคืนห้องเข้าสู่ inventory อัตโนมัติ', result: 'คืนห้องว่างให้พนักงาน 3 ห้อง', camera: [34, 40, 29], target: [0, 35, 2] },
    { title: 'วิเคราะห์ความหนาแน่น', description: 'Heatmap แสดงจำนวนคนราย Zone และแนวโน้มการย้ายพื้นที่ในช่วงถัดไป', data: [['FLOOR 7', '82', '%'], ['FLOOR 5', '48', '%'], ['FORECAST', '+36', 'people']], logic: 'คาดการณ์จาก Calendar, access event และรูปแบบการใช้งานย้อนหลัง', result: 'แนะนำพื้นที่ชั้น 5 ที่ยังรองรับได้', camera: [35, 29, 27], target: [0, 29, 1] },
    { title: 'เตรียมพื้นที่อัตโนมัติ', description: 'ก่อนการประชุม ระบบเปิดไฟ ปรับอากาศ และเตรียมอุปกรณ์เฉพาะห้องที่ถูกยืนยันว่าจะใช้งาน', data: [['PRE-COOL', '10', 'min'], ['LIGHT', '65', '%'], ['AV STATUS', 'READY', '']], logic: 'Orchestration เรียก Lighting, HVAC และ Room control ด้วย workflow เดียว', result: 'ห้องพร้อมก่อนผู้ใช้มาถึง', camera: [32, 37, 24], target: [0, 35, -2] },
    { title: 'สรุปการใช้พื้นที่', description: 'Dashboard เปรียบเทียบพื้นที่ที่มี พื้นที่ที่ใช้จริง และต้นทุนต่อคนสำหรับวางแผนสำนักงาน', data: [['UTILIZATION', '72', '%'], ['COST / SEAT', '8,420', 'THB'], ['TREND', '+22', '%']], logic: 'ตัดข้อมูลส่วนบุคคลออกและเก็บเฉพาะสถิติระดับ Zone', result: 'ตัดสินใจจัดพื้นที่จากข้อมูลจริง', camera: [43, 28, 37], target: [0, 23, 0] }
  ],
  security: [
    { title: 'ลงทะเบียนผู้มาติดต่อ', description: 'ลูกค้าได้รับ QR ก่อนมาถึง พร้อม Host, ช่วงเวลา และพื้นที่ที่ได้รับอนุญาต', data: [['VISITOR', 'V-036', ''], ['VALID', '09:30–11:30', ''], ['DESTINATION', 'L8', '']], logic: 'ตรวจ watchlist, invitation และ policy ของผู้รับเหมาแต่ละประเภท', result: 'สร้างสิทธิ์ชั่วคราวที่ใช้ได้ตามเวลา', camera: [34, 10, 31], target: [0, 5, 8] },
    { title: 'ยืนยันตัวตนที่ Lobby', description: 'QR Reader ตรวจสิทธิ์ เปิด Turnstile และบันทึกการเข้าอาคารในเหตุการณ์เดียว', data: [['SCAN', 'VALID', ''], ['GATE', 'G-02', ''], ['LATENCY', '180', 'ms']], logic: 'Identity service ตอบกลับ Access controller โดยไม่เปิดสิทธิ์เกินพื้นที่ที่กำหนด', result: 'ผ่านประตูภายใน 0.18 วินาที', camera: [28, 8, 27], target: [0, 5, 7] },
    { title: 'จำกัดชั้นปลายทาง', description: 'Elevator destination control เปิดเฉพาะชั้น 8 และกำหนดเส้นทางจาก Lobby', data: [['ELEVATOR', 'CAR 03', ''], ['AUTHORIZED', 'L8', ''], ['ETA', '42', 'sec']], logic: 'Access profile ถูกส่งไปยัง Lift system และยกเลิกเมื่อหมดเวลา', result: 'ผู้มาติดต่อไปได้เฉพาะพื้นที่อนุญาต', camera: [30, 21, 24], target: [0, 18, -1] },
    { title: 'เชื่อม CCTV กับเหตุการณ์', description: 'ถ้าเดินออกนอกเส้นทาง กล้องที่เกี่ยวข้องถูกเรียกขึ้นมาพร้อม timeline เข้าออก', data: [['CAMERA', 'C-18', ''], ['MATCH', '96', '%'], ['INCIDENT', 'NONE', '']], logic: 'Correlation engine รวม Access event, camera zone และ visitor identity โดยไม่ต้องค้นกล้องทีละตัว', result: 'Security เห็นบริบทครบในหน้าจอเดียว', camera: [39, 20, 31], target: [8, 17, 5] }
  ],
  parking: [
    { title: 'อ่านป้ายทะเบียน', description: 'LPR ตรวจทะเบียนที่ทางเข้าและเชื่อมกับพนักงาน ผู้มาติดต่อ หรือรถที่จองล่วงหน้า', data: [['PLATE', '9กข 1337', ''], ['CONFIDENCE', '98.7', '%'], ['TYPE', 'VISITOR', '']], logic: 'ตรวจสิทธิ์ วันหมดอายุ และ blacklist ก่อนเปิดไม้กั้น', result: 'ยืนยันรถโดยไม่ต้องรับบัตร', camera: [34, 2, 31], target: [-14, -1, 7] },
    { title: 'เลือกช่องจอด', description: 'ระบบเลือกช่องตามประเภทผู้ใช้ จุดหมาย และสถานะจริงของเซนเซอร์แต่ละช่อง', data: [['FREE BAYS', '11', ''], ['ASSIGNED', 'B1-27', ''], ['WALK', '68', 'm']], logic: 'Routing ลดการวนรถและสำรอง EV/Accessible bay ตาม policy', result: 'ส่งเส้นทางไปยังป้ายและ Mobile link', camera: [31, 1, 27], target: [0, -1, 0] },
    { title: 'จัดการ EV Charging', description: 'Charger อ่านรถ ระดับแบตเตอรี่ และเวลาที่คาดว่าจะออก เพื่อจัดคิวกำลังไฟ', data: [['CHARGERS', '4/8', ''], ['DEMAND', '38', 'kW'], ['DEPARTURE', '17:30', '']], logic: 'กระจายกำลังโดยไม่ทำให้ Building Peak เกิน Contract limit', result: 'รถทุกคันได้พลังงานก่อนเวลาออก', camera: [28, 0, 24], target: [7, -1, -6] },
    { title: 'ปิด Journey ตอนออก', description: 'ระบบคำนวณเวลาใช้งาน ชาร์จไฟ และเปิดไม้กั้น พร้อมคืนช่องจอดเป็น Available', data: [['DURATION', '2:14', 'hr'], ['ENERGY', '18.6', 'kWh'], ['EXIT', 'CLEARED', '']], logic: 'ส่ง transaction ไป Billing และอัปเดต occupancy ในเวลาเดียวกัน', result: 'ข้อมูล Parking และ Energy ตรงกันทั้งระบบ', camera: [39, 3, 34], target: [0, -1, 2] }
  ],
  plant: [
    { title: 'อ่านค่าจาก Chiller Plant', description: 'เก็บ Supply/Return temperature, Flow, Power และสถานะ Pump ทุก 5 วินาที', data: [['CHWS', '6.8', '°C'], ['CHWR', '16.6', '°C'], ['FLOW', '118', 'L/s']], logic: 'คำนวณ ΔT, Cooling load และ kW/RT จากค่าที่เกิดในเวลาเดียวกัน', result: 'เห็นประสิทธิภาพจริงของ Chiller-03', camera: [28, -1, 25], target: [9, -5, 0] },
    { title: 'ตรวจพบ ΔT ผิดปกติ', description: 'ΔT สูงขึ้นต่อเนื่อง ขณะที่ Flow และ Load ไม่ได้เพิ่มตาม จึงไม่ใช่ความต้องการจากอาคาร', data: [['ΔT', '9.8', '°C'], ['BASELINE', '6.2', '°C'], ['CONFIDENCE', '94', '%']], logic: 'Anomaly model เปรียบเทียบกับ Chiller ตัวอื่นและสภาพโหลดเดียวกัน', result: 'จัดประเภทเป็น Heat-transfer degradation', camera: [25, -2, 22], target: [10, -5, 0] },
    { title: 'ประเมินผลกระทบ', description: 'Digital Twin เชื่อม Chiller-03 กับ AHU และพื้นที่ปลายทาง เพื่อหาชั้นที่จะได้รับผลก่อน', data: [['AFFECTED AHU', '6', 'units'], ['ZONES', '18', ''], ['TIME TO IMPACT', '47', 'min']], logic: 'จำลอง capacity ที่หายไปเทียบกับ Cooling demand ของแต่ละ Zone', result: 'ชั้น 6–8 มีความเสี่ยงสูงสุด', camera: [31, 10, 25], target: [0, 8, -1] },
    { title: 'สลับระบบและสร้างงาน', description: 'เพิ่มโหลด Chiller-02 ลดโหลด Chiller-03 และสร้าง Work order พร้อมข้อมูลตรวจสอบ', data: [['BACKUP LOAD', '+22', '%'], ['WORK ORDER', 'WO-1842', ''], ['SLA', '2', 'hr']], logic: 'Sequencing ป้องกัน Surge และยืนยันว่าอุณหภูมิ Supply กลับสู่เป้าหมายก่อนปิดเหตุการณ์', result: 'อาคารทำงานต่อโดยไม่มี Downtime', camera: [36, 5, 29], target: [0, 3, 0] }
  ]
};

let current = 'overview', tween = 1, tourTimer, tourIndex = 0, detailStageIndex = 0;
const fromCamera = new THREE.Vector3(), fromTarget = new THREE.Vector3(), toCamera = new THREE.Vector3(), toTarget = new THREE.Vector3();
function moveCamera(cameraPosition, targetPosition) {
  fromCamera.copy(camera.position); fromTarget.copy(controls.target);
  toCamera.fromArray(cameraPosition); toTarget.fromArray(targetPosition); tween = 0; controls.enabled = false;
}
function renderDetail(index) {
  const scenes = deepDiveScenes[current];
  detailStageIndex = (index + scenes.length) % scenes.length;
  const detail = scenes[detailStageIndex];
  document.querySelector('#detailSystem').textContent = stories[current].label;
  document.querySelector('#detailTitle').textContent = `Deep-dive · ${stories[current].number}`;
  document.querySelector('#detailStageNumber').textContent = `${String(detailStageIndex + 1).padStart(2, '0')} / ${String(scenes.length).padStart(2, '0')}`;
  document.querySelector('#detailStageTitle').textContent = detail.title;
  document.querySelector('#detailStageDescription').textContent = detail.description;
  document.querySelector('#technicalData').innerHTML = detail.data.map(([label, value, unit]) => `<div><dt>${label}</dt><dd>${value} <small>${unit}</small></dd></div>`).join('');
  document.querySelector('#decisionLogic').textContent = detail.logic;
  document.querySelector('#detailResult').textContent = detail.result;
  document.querySelector('#detailProgress').innerHTML = scenes.map((_, sceneIndex) => `<button class="${sceneIndex === detailStageIndex ? 'active' : sceneIndex < detailStageIndex ? 'done' : ''}" data-detail-index="${sceneIndex}" aria-label="ขั้นตอน ${sceneIndex + 1}"></button>`).join('');
  document.querySelectorAll('[data-detail-index]').forEach(button => button.addEventListener('click', () => renderDetail(Number(button.dataset.detailIndex))));
  moveCamera(detail.camera, detail.target);
}
function openDetail() {
  if (tourTimer) stopTour();
  document.querySelector('#experience').classList.add('detail-open');
  setArchitectureCutaway(true);
  interior.visible = current !== 'parking' && current !== 'plant';
  renderDetail(0);
}
function closeDetail() {
  document.querySelector('#experience').classList.remove('detail-open');
  selectChapter(current, false);
}
function selectChapter(name, manual = true) {
  current = name; const story = stories[name];
  moveCamera(story.camera, story.target);
  Object.entries(overlays).forEach(([key, group]) => group.visible = key === name);
  const cutaway = name !== 'overview';
  interior.visible = cutaway && name !== 'parking' && name !== 'plant';
  setArchitectureCutaway(cutaway);
  ground.visible = name !== 'parking' && name !== 'plant';
  innerCourt.visible = ground.visible; grid.visible = ground.visible;
  document.querySelectorAll('.chapter').forEach(button => button.classList.toggle('active', button.dataset.chapter === name));
  document.querySelector('#chapterNumber').textContent = story.number;
  document.querySelector('#chapterLabel').textContent = story.label;
  document.querySelector('#headline').innerHTML = story.headline;
  document.querySelector('#description').textContent = story.description;
  document.querySelector('#impact').textContent = story.impact;
  document.querySelector('#statusText').textContent = story.status;
  document.querySelector('#readings').innerHTML = story.readings.map(([label, value, unit]) => `<div><small>${label}</small><strong>${value}</strong><span>${unit}</span></div>`).join('');
  document.querySelector('#solutionFlow').innerHTML = solutionSteps[name].map(([label, text], index) => `${index ? '<i></i>' : ''}<div class="flow-step${index === 0 ? ' active' : ''}"><span>0${index + 1}</span><div><small>${label}</small><b>${text}</b></div></div>`).join('');
  document.querySelector('#floorProgress').style.height = `${22 + Number(story.number) * 10}%`;
  if (manual && tourTimer) stopTour();
}
function stopTour() { clearInterval(tourTimer); tourTimer = null; document.querySelector('#tourButton').innerHTML = 'เริ่มนำเสนอ <i></i>'; }
document.querySelectorAll('.chapter').forEach(button => button.addEventListener('click', () => selectChapter(button.dataset.chapter)));
document.querySelector('#detailButton').addEventListener('click', openDetail);
document.querySelector('#closeDetail').addEventListener('click', closeDetail);
document.querySelector('#previousStage').addEventListener('click', () => renderDetail(detailStageIndex - 1));
document.querySelector('#nextStage').addEventListener('click', () => renderDetail(detailStageIndex + 1));
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
    if (object.userData.flowPath) object.position.copy(object.userData.flowPath.getPointAt((elapsed * 0.11 + object.userData.flowOffset) % 1));
  }));
  const activeFlowStep = Math.floor(elapsed / 3.2) % 3;
  document.querySelectorAll('.flow-step').forEach((step, index) => step.classList.toggle('active', index === activeFlowStep));
  if (current === 'overview' && !controls.enabled) tower.rotation.y = Math.sin(elapsed * 0.12) * 0.035;
  controls.update(); composer.render();
}
animate();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight); renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6)); composer.setSize(innerWidth, innerHeight);
});
