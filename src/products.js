// Product-specific 3D layers for presales storytelling.
const productLayers = {};
for (const key of ['energy', 'comfort', 'workspace', 'security', 'parking', 'plantProduct']) {
  productLayers[key] = new THREE.Group();
  productLayers[key].name = `Product_${key}`;
  building.add(productLayers[key]);
}

function pBox(name, size, pos, material, layer) { return box(name, size, pos, material, productLayers[layer]); }
function pCyl(name, radius, depth, pos, material, layer) { return cyl(name, radius, depth, pos, material, productLayers[layer]); }
function pSphere(name, radius, pos, material, layer) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 18, 12), material);
  mesh.name = name; mesh.position.set(...pos); productLayers[layer].add(mesh); return mesh;
}
function pLine(points, layer, color = 0x38d9f5) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points.map(point => new THREE.Vector3(...point)));
  const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 }));
  line.userData.pulse = true; productLayers[layer].add(line); return line;
}
function pLabel(text, pos, layer) {
  const surface = document.createElement('canvas'); surface.width = 512; surface.height = 112;
  const ctx = surface.getContext('2d');
  ctx.fillStyle = 'rgba(7,17,30,.9)'; ctx.fillRect(0, 0, 512, 112);
  ctx.strokeStyle = '#38d9f5'; ctx.lineWidth = 4; ctx.strokeRect(2, 2, 508, 108);
  ctx.fillStyle = '#ecfaff'; ctx.font = '500 32px sans-serif'; ctx.fillText(text, 24, 68);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(surface), transparent: true }));
  sprite.position.set(...pos); sprite.scale.set(6.5, 1.42, 1); productLayers[layer].add(sprite);
}

const cyanGlass = new THREE.MeshPhysicalMaterial({ color: 0x38d9f5, emissive: 0x079ab8, emissiveIntensity: 1, transparent: true, opacity: 0.34, depthWrite: false });
const whiteProduct = new THREE.MeshStandardMaterial({ color: 0xe8f0f4, roughness: 0.4 });
const warningProduct = new THREE.MeshStandardMaterial({ color: 0xff5d62, emissive: 0xdd2028, emissiveIntensity: 2.4 });

// 01 Energy: active solar array, meter and electrical riser.
for (let x = -6; x <= 6; x += 3) for (let z = -3; z <= 3; z += 2) {
  const panel = pBox('Active PV panel', [2.28, 0.12, 1.32], [x, roofY + 0.68, z], M.cyan, 'energy');
  panel.rotation.x = -0.18; panel.userData.pulse = true;
}
pBox('Main smart meter', [1.25, 1.8, 0.45], [8.4, 2.1, 4.8], M.cyan, 'energy');
pLine([[0, roofY + 0.6, 0], [8.9, roofY + 0.6, 0], [8.9, 1.2, 0]], 'energy');
for (let i = 1; i < COUNT; i++) pSphere('Sub-meter', 0.19, [8.9, 0.65 + i * FH + 1.1, 0], M.cyan, 'energy').userData.pulse = true;
pLabel('ENERGY FLOW  •  286 kW', [10.6, roofY - 2, 1], 'energy');

// 02 HVAC & IAQ: AHU, supply ducts, sensors and moving airflow.
for (const floorIndex of [2, 4, 6, 8]) {
  const y = 0.65 + floorIndex * FH + 1.65;
  pBox('Air handling unit', [2.2, 0.72, 1], [-5.8, y, -3.5], M.cyan, 'comfort');
  pBox('Supply air duct', [10.5, 0.22, 0.35], [0, y, -3.5], cyanGlass, 'comfort');
  for (const x of [-5, -1.5, 2, 5.5]) {
    pSphere('IAQ sensor', 0.16, [x, y - 0.55, 3.9], M.cyan, 'comfort').userData.pulse = true;
    for (let j = 0; j < 3; j++) {
      const air = pSphere('Air flow', 0.07, [x, y - j * 0.28, -2.9], cyanGlass, 'comfort');
      air.userData.airflow = { top: y, offset: j * 0.75 };
    }
  }
}
pLabel('CO₂ 612 ppm  •  PM2.5 8', [10.6, 17, 1], 'comfort');

// 03 Workspace: desks, people and a meeting-room display.
for (let floorIndex = 1; floorIndex < COUNT; floorIndex++) {
  const y = 0.65 + floorIndex * FH;
  for (const x of [-5.8, -2.7, 3, 6]) {
    pBox('Connected desk', [1.45, 0.1, 0.72], [x, y + 0.58, 1.2], M.wood, 'workspace');
    pCyl('Occupant', 0.13, 0.52, [x, y + 0.91, 0.58], whiteProduct, 'workspace');
    pSphere('Occupant head', 0.17, [x, y + 1.3, 0.58], M.warm, 'workspace');
  }
}
pBox('Meeting room display', [4.5, 1.4, 0.15], [0, 0.65 + 8 * FH + 1.25, -5.3], M.cyan, 'workspace');
pLabel('72% OCCUPIED  •  3 ROOMS FREE', [10.6, 20, 1], 'workspace');

// 04 Access & CCTV: turnstiles, readers, cameras and visitor route.
for (const x of [-2.4, 0, 2.4]) {
  pBox('Turnstile', [0.35, 1, 1.8], [x, 0.8, 4.2], M.dark, 'security');
  pBox('Access reader', [0.25, 0.36, 0.18], [x, 1.35, 5.0], M.cyan, 'security');
}
for (const [x, y, z] of [[-7.5, 2.2, 5], [7.5, 2.2, 5], [-7.5, 12, 5], [7.5, 19, 5]]) {
  const body = pCyl('CCTV camera', 0.2, 0.7, [x, y, z], whiteProduct, 'security'); body.rotation.z = Math.PI / 2;
  const cone = new THREE.Mesh(new THREE.ConeGeometry(1.7, 5, 24, 1, true), cyanGlass);
  cone.position.set(x, y - 1.2, z); cone.rotation.x = Math.PI; productLayers.security.add(cone);
}
pLine([[0, 0.4, 9], [0, 1, 4.2], [4, 1, 0], [4, 4, 0]], 'security');
pLabel('428 VERIFIED  •  0 EVENTS', [10.6, 5, 1], 'security');

// 05 Parking & EV: B1 section, vehicles, bays, chargers and LPR gate.
pBox('B1 room', [17, 2.7, 11], [0, -2.45, 0], new THREE.MeshStandardMaterial({ color: 0x152536, roughness: 0.72, side: THREE.BackSide }), 'parking');
pBox('B1 floor', [17, 0.22, 11], [0, -3.75, 0], M.concrete, 'parking');
for (const [x, z, material] of [[-5.8, -2.7, whiteProduct], [-1.8, -2.7, M.dark], [2.2, -2.7, whiteProduct], [6.2, -2.7, M.dark]]) {
  pBox('Vehicle', [2.4, 0.75, 1.2], [x, -3, z], material, 'parking');
  for (const dx of [-0.75, 0.75]) for (const dz of [-0.55, 0.55]) {
    const wheel = pCyl('Wheel', 0.2, 0.15, [x + dx, -3.35, z + dz], M.dark, 'parking'); wheel.rotation.x = Math.PI / 2;
  }
}
for (const x of [-6, -2, 2, 6]) pBox('Available bay', [2.8, 0.03, 1.5], [x, -3.58, 2.9], cyanGlass, 'parking').userData.pulse = true;
for (const x of [-6.7, -2.7]) pBox('EV charger', [0.35, 0.9, 0.25], [x, -3, -4.3], M.cyan, 'parking');
pBox('LPR gate', [6, 0.12, 0.18], [0, -2.4, 5], M.cyan, 'parking');
pLabel('37/48 BAYS  •  4 EV CHARGING', [10.6, -1.5, 1], 'parking');

// 06 Plant room: detailed B2 machinery and a simulated alert.
pBox('B2 room', [17, 4.2, 11], [0, -6.3, 0], new THREE.MeshStandardMaterial({ color: 0x101e2c, roughness: 0.75, side: THREE.BackSide }), 'plantProduct');
pBox('B2 floor', [17, 0.3, 11], [0, -8.35, 0], M.concrete, 'plantProduct');
for (let x = -5.3; x <= 4.9; x += 5.1) {
  const chiller = pCyl('Chiller', 1.05, 3.4, [x, -6.3, 0], M.dark, 'plantProduct'); chiller.rotation.z = Math.PI / 2;
  for (const z of [-1.1, 1.1]) { const pipe = pCyl('CHW pipe', 0.18, 9, [x, -4.75, z], M.cyan, 'plantProduct'); pipe.rotation.z = Math.PI / 2; }
  pCyl('Pump', 0.45, 0.8, [x, -7.4, 2.8], M.cyan, 'plantProduct').userData.spin = true;
}
pSphere('Chiller-03 warning', 0.35, [5, -5, 1.3], warningProduct, 'plantProduct').userData.pulse = true;
pLabel('CHILLER-03  •  ΔT ABOVE TARGET', [10.6, -5.2, 1], 'plantProduct');

const productStories = {
  overview: { cam: [33, 23, 39], target: [3, 11, 0], title: 'อาคารที่คิด<br>และตอบสนองได้', kicker: 'Digital Twin · Building overview', desc: 'ทุกระบบเชื่อมกับโมเดลเดียว เห็นสถานะ เหตุการณ์ และผลต่อธุรกิจในบริบทของพื้นที่จริง', impact: '−18% ค่าใช้พลังงาน', metrics: [['พลังงานวันนี้', '1,284 <small>kWh</small>'], ['ผู้ใช้อาคาร', '428 <small>คน</small>'], ['สถานะระบบ', 'ปกติ <small>18/19 ระบบ</small>']] },
  energy: { cam: [31, 30, 31], target: [4, 18, 0], title: 'พลังงานไหล<br>มองเห็นได้', kicker: 'พลังงาน · Energy management', desc: 'โซลาร์ มิเตอร์หลัก และมิเตอร์ย่อยรายชั้นแสดงเส้นทางพลังงานที่สัมพันธ์กับอาคาร', impact: '−18% ค่าไฟต่อปี', metrics: [['กำลังใช้', '286 <small>kW</small>'], ['Solar', '74 <small>kW</small>'], ['Peak avoided', '42 <small>kW</small>']] },
  comfort: { cam: [28, 19, 28], target: [3, 13, 0], title: 'อากาศดี<br>ตามการใช้งานจริง', kicker: 'คุณภาพอากาศ · HVAC & IAQ', desc: 'AHU ท่อลม และเซนเซอร์แต่ละชั้นปรับตามจำนวนคน พร้อมชี้พื้นที่ที่ต้องแก้ไข', impact: '+14% คะแนนความสบาย', metrics: [['CO₂', '612 <small>ppm</small>'], ['PM2.5', '8 <small>μg/m³</small>'], ['ผ่านเกณฑ์', '96 <small>%</small>']] },
  workspace: { cam: [25, 15, 24], target: [2, 13, 1], title: 'พื้นที่พร้อม<br>ก่อนคนมาถึง', kicker: 'พื้นที่ทำงาน · Smart workspace', desc: 'เห็นการใช้งานโต๊ะ ห้องประชุม และความหนาแน่น เพื่อจัดพื้นที่ให้เหมาะกับผู้ใช้', impact: '+22% การใช้พื้นที่', metrics: [['Occupancy', '72 <small>%</small>'], ['ห้องว่าง', '3 <small>ห้อง</small>'], ['No-show ลด', '31 <small>%</small>']] },
  security: { cam: [23, 8, 27], target: [1, 3, 3], title: 'ทุกการเข้าออก<br>อยู่ในเหตุการณ์เดียว', kicker: 'ความปลอดภัย · Access & CCTV', desc: 'ประตู กล้อง และ Visitor Management เชื่อมเส้นทางผู้มาติดต่อจากทางเข้าไปยังปลายทาง', impact: '−43% เวลาลงทะเบียน', metrics: [['ผู้ผ่านวันนี้', '428 <small>คน</small>'], ['Visitors', '36 <small>คน</small>'], ['เหตุผิดปกติ', '0 <small>events</small>']] },
  parking: { cam: [24, 1, 24], target: [2, -2.5, 0], title: 'ตั้งแต่ป้ายทะเบียน<br>ถึงจุดชาร์จ', kicker: 'ที่จอดรถ · Parking & EV', desc: 'แสดงช่องว่าง รถเข้าออก ป้ายทะเบียน และ EV Charger บนแบบจำลองชั้น B1', impact: '−6 นาที เวลาหาที่จอด', metrics: [['ช่องว่าง', '11 <small>ช่อง</small>'], ['EV charging', '4 <small>คัน</small>'], ['รถวันนี้', '312 <small>คัน</small>']] },
  plant: { cam: [22, -3, 19], target: [3, -6, 0], title: 'พบความผิดปกติ<br>ก่อนหยุดทำงาน', kicker: 'ห้องเครื่อง B2 · Plant room', desc: 'Chiller-03 มีค่า ΔT สูงกว่าปกติ โมเดลชี้อุปกรณ์และผลกระทบที่สัมพันธ์กับสำนักงาน', impact: 'เลี่ยง Downtime 4 ชม.', metrics: [['Chiller ΔT', '9.8 <small>°C</small>'], ['Efficiency', '0.71 <small>kW/RT</small>'], ['สถานะ', 'เตือน <small>ภายใน 2 ชม.</small>']] }
};

let productTour = null, productTourIndex = 0;
const productOrder = ['energy', 'comfort', 'workspace', 'security', 'parking', 'plant', 'overview'];
function stopProductTour() {
  clearInterval(productTour); productTour = null;
  document.querySelector('#guidedTour').textContent = 'เริ่มชม 3 นาที';
}
function selectProduct(name, manual = true) {
  const story = productStories[name];
  transition = 0; controls.enabled = false; startCam.copy(camera.position); startTarget.copy(controls.target);
  goalCam.fromArray(story.cam); goalTarget.fromArray(story.target);
  const overview = name === 'overview';
  Object.entries(productLayers).forEach(([key, layer]) => layer.visible = overview || key === name || (name === 'plant' && key === 'plantProduct'));
  floors.forEach(floor => { const glass = floor.children.find(child => child.name === 'glass-shell'); if (glass) glass.visible = overview || name === 'energy'; });
  plant.visible = false;
  document.querySelectorAll('.product').forEach(button => button.classList.toggle('active', button.dataset.product === name));
  document.querySelector('#systemTitle').innerHTML = story.title;
  document.querySelector('#systemKicker').textContent = story.kicker;
  document.querySelector('#systemDescription').textContent = story.desc;
  document.querySelector('#systemState').textContent = name === 'plant' ? 'จำลองเหตุการณ์ 1 รายการ' : 'ข้อมูลจำลองสัมพันธ์กับฉาก';
  document.querySelector('#impactValue').textContent = story.impact;
  document.querySelector('#metrics').innerHTML = story.metrics.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('');
  if (manual && productTour) stopProductTour();
}

document.querySelectorAll('.product').forEach(button => button.addEventListener('click', () => selectProduct(button.dataset.product)));
document.querySelectorAll('.view').forEach(button => button.addEventListener('click', () => {
  if (button.dataset.view === 'plant') selectProduct('plant');
  else if (button.dataset.view === 'cutaway') selectProduct('workspace');
  else selectProduct('overview');
}));
document.querySelector('#guidedTour').addEventListener('click', () => {
  if (productTour) { stopProductTour(); return; }
  productTourIndex = 0; selectProduct(productOrder[0], false);
  document.querySelector('#guidedTour').textContent = 'หยุดการนำเสนอ';
  productTour = setInterval(() => { productTourIndex = (productTourIndex + 1) % productOrder.length; selectProduct(productOrder[productTourIndex], false); }, 18000);
});

selectProduct('overview', false);
function animateProductLayers() {
  const elapsed = clock.elapsedTime;
  Object.values(productLayers).forEach(layer => layer.traverse(object => {
    if (object.userData.pulse && object.material) {
      const pulse = 0.72 + 0.28 * Math.sin(elapsed * 2.2 + object.id);
      if ('opacity' in object.material) object.material.opacity = Math.max(0.22, pulse);
      object.scale.setScalar(0.97 + pulse * 0.03);
    }
    if (object.userData.spin) object.rotation.y += 0.035;
    if (object.userData.airflow) object.position.y = object.userData.airflow.top - ((elapsed * 0.7 + object.userData.airflow.offset) % 1.1);
  }));
  requestAnimationFrame(animateProductLayers);
}
animateProductLayers();
