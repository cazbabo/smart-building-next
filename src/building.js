import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export function createPremiumBuilding() {
  const group = new THREE.Group();
  group.name = 'ONE_PremiumOfficeTower';
  const architecture = new THREE.Group();
  const interior = new THREE.Group();
  group.add(architecture, interior);

  const materials = {
    glass: new THREE.MeshPhysicalMaterial({ color: 0x78adc0, metalness: 0.05, roughness: 0.12, transmission: 0.58, transparent: true, opacity: 0.72, thickness: 0.7, ior: 1.45, envMapIntensity: 1.7 }),
    lobbyGlass: new THREE.MeshPhysicalMaterial({ color: 0xa9d3df, metalness: 0.02, roughness: 0.08, transmission: 0.76, transparent: true, opacity: 0.62, thickness: 0.45, envMapIntensity: 1.9 }),
    concrete: new THREE.MeshStandardMaterial({ color: 0xe3e6e5, roughness: 0.58, metalness: 0.02 }),
    stone: new THREE.MeshStandardMaterial({ color: 0xb8c0c1, roughness: 0.72 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x263945, roughness: 0.2, metalness: 0.86 }),
    warm: new THREE.MeshStandardMaterial({ color: 0xffc783, emissive: 0xf18c3d, emissiveIntensity: 0.85, roughness: 0.55 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x9b7352, roughness: 0.66 }),
    green: new THREE.MeshStandardMaterial({ color: 0x3d745a, roughness: 0.82 }),
    solar: new THREE.MeshStandardMaterial({ color: 0x173f59, roughness: 0.18, metalness: 0.72 }),
    water: new THREE.MeshPhysicalMaterial({ color: 0x3b8ca3, roughness: 0.08, metalness: 0.12, transmission: 0.35, transparent: true, opacity: 0.72 })
  };

  const addMesh = (name, geometry, material, position, parent = architecture) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name; mesh.position.set(...position); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  };
  const box = (name, size, position, material, parent = architecture, radius = 0.08) => addMesh(name, new RoundedBoxGeometry(size[0], size[1], size[2], 4, Math.min(radius, ...size.map(v => v / 4))), material, position, parent);
  const cylinder = (name, radius, height, position, material, parent = architecture, segments = 24) => addMesh(name, new THREE.CylinderGeometry(radius, radius, height, segments), material, position, parent);

  // Plaza, reflecting pool and a genuinely open double-height arrival.
  box('Arrival_Plinth', [38, 0.6, 29], [0, 0.3, 0], materials.stone, architecture, 0.35);
  box('Reflecting_Pool', [22, 0.12, 4.5], [-3, 0.68, 15], materials.water, architecture, 0.28);
  box('Lobby_Glass_Volume', [31, 5.7, 21.5], [0, 3.45, 0], materials.lobbyGlass, architecture, 0.75);
  for (const x of [-15.1, 15.1]) box('Lobby_Stone_Pier', [0.8, 6.2, 22.2], [x, 3.6, 0], materials.concrete, architecture, 0.18);
  box('Lobby_Roof_Frame', [32.8, 0.55, 22.8], [0, 6.25, 0], materials.concrete, architecture, 0.22);
  box('Floating_Entrance_Canopy', [17.5, 0.34, 5.8], [0, 5.4, 12.4], materials.concrete, architecture, 0.14);
  for (const x of [-7.6, 7.6]) cylinder('Canopy_Column', 0.14, 4.8, [x, 3, 14.5], materials.metal);
  box('Lobby_Revolving_Door', [4.8, 3.7, 0.28], [0, 2.6, 10.85], materials.metal, architecture, 0.08);
  for (const x of [-10.5, -6.8, 6.8, 10.5]) box('Lobby_Mullion', [0.14, 5.2, 0.18], [x, 3.5, 10.88], materials.metal, architecture, 0.04);

  const floorData = [
    { y: 6.6, width: 29.2, depth: 19.2, shift: 0 },
    { y: 10.5, width: 29.2, depth: 19.2, shift: 0 },
    { y: 14.4, width: 29.2, depth: 19.2, shift: 0 },
    { y: 18.7, width: 31.4, depth: 21, shift: -0.8, terrace: true },
    { y: 22.8, width: 26.8, depth: 17.2, shift: 1.2 },
    { y: 26.7, width: 26.8, depth: 17.2, shift: 1.2 },
    { y: 30.6, width: 26.8, depth: 17.2, shift: 1.2 },
    { y: 34.9, width: 29.6, depth: 19.4, shift: 0.4, terrace: true }
  ];

  floorData.forEach((floor, index) => {
    const slabY = floor.y;
    box(`Floor_${index + 1}_Slab`, [floor.width + 0.7, 0.28, floor.depth + 0.7], [floor.shift, slabY, 0], materials.concrete, architecture, 0.18);
    box(`Floor_${index + 1}_Glass`, [floor.width, 3.62, floor.depth], [floor.shift, slabY + 1.95, 0], materials.glass, architecture, 0.62);
    box(`Floor_${index + 1}_Warm_Core`, [8.2, 2.85, 8.2], [floor.shift, slabY + 1.75, -1.5], materials.warm, interior, 0.3);

    // Deliberate 1.45 m curtain-wall rhythm; no random windows.
    const frontZ = floor.depth / 2 + 0.08;
    const backZ = -frontZ;
    const bayCount = Math.floor((floor.width - 1.2) / 1.45);
    for (let bay = 0; bay <= bayCount; bay++) {
      const x = floor.shift - floor.width / 2 + 0.6 + bay * ((floor.width - 1.2) / bayCount);
      box('Curtainwall_Vertical_Fin', [0.095, 3.78, 0.38], [x, slabY + 1.96, frontZ], materials.metal, architecture, 0.03);
      box('Curtainwall_Vertical_Fin', [0.095, 3.78, 0.38], [x, slabY + 1.96, backZ], materials.metal, architecture, 0.03);
    }
    for (const side of [-1, 1]) {
      const sideX = floor.shift + side * (floor.width / 2 + 0.08);
      for (let z = -floor.depth / 2 + 0.8; z < floor.depth / 2; z += 1.8) box('Curtainwall_Side_Fin', [0.38, 3.78, 0.095], [sideX, slabY + 1.96, z], materials.metal, architecture, 0.03);
    }
    box('Facade_Shadow_Line', [floor.width + 0.2, 0.13, floor.depth + 0.2], [floor.shift, slabY + 3.76, 0], materials.metal, architecture, 0.05);

    // Interior scale cues: desks, screens and meeting tables.
    for (const xOffset of [-9, -5.5, 5.5, 9]) for (const z of [-5.2, 3.4]) {
      if (Math.abs(xOffset) > floor.width / 2 - 1) continue;
      box('Office_Desk', [2.1, 0.12, 0.85], [floor.shift + xOffset, slabY + 0.78, z], materials.wood, interior, 0.06);
      box('Office_Task_Screen', [0.85, 0.52, 0.08], [floor.shift + xOffset, slabY + 1.15, z - 0.2], materials.warm, interior, 0.04);
    }

    if (floor.terrace) {
      box('Skygarden_Terrace', [floor.width + 2.1, 0.32, floor.depth + 2.4], [floor.shift, slabY - 0.02, 0], materials.concrete, architecture, 0.28);
      for (const x of [-10, -5, 5, 10]) {
        if (Math.abs(x) > floor.width / 2 - 1) continue;
        box('Skygarden_Planter', [3, 0.7, 1.4], [floor.shift + x, slabY + 0.48, floor.depth / 2 + 0.25], materials.stone, architecture, 0.16);
        cylinder('Skygarden_Trunk', 0.12, 1.8, [floor.shift + x, slabY + 1.45, floor.depth / 2 + 0.25], materials.wood);
        const tree = addMesh('Skygarden_Tree', new THREE.IcosahedronGeometry(0.85, 2), materials.green, [floor.shift + x, slabY + 2.65, floor.depth / 2 + 0.25]);
        tree.scale.set(1.1, 1.4, 0.9);
      }
    }
  });

  // A vertical atrium blade gives the tower one memorable gesture.
  box('Atrium_Glass_Blade', [5.8, 29.5, 1.1], [-8.9, 21.5, 10.1], materials.lobbyGlass, architecture, 0.46);
  for (let y = 8; y < 36; y += 3.9) box('Atrium_Bridge', [5.2, 0.16, 2], [-8.9, y, 8.8], materials.concrete, architecture, 0.08);

  // Roof: screened plant and solar pergola with believable supports.
  box('Roof_Deck', [30.5, 0.34, 20.4], [0.4, 39, 0], materials.concrete, architecture, 0.2);
  box('Mechanical_Screen', [11, 3.4, 8], [3, 40.8, -2.8], materials.metal, architecture, 0.34);
  for (const x of [-10.5, -5.2, 0.1, 5.4, 10.7]) {
    for (const z of [3.2, 7]) {
      cylinder('Solar_Pergola_Post', 0.09, 2.3, [x, 40.2, z], materials.metal);
      const panel = box('Solar_Panel', [4.2, 0.12, 2.25], [x, 41.55, z], materials.solar, architecture, 0.07);
      panel.rotation.x = -0.18;
    }
  }

  // Landscape beds at the arrival soften the site and communicate scale.
  for (const x of [-15, -11, 11, 15]) {
    box('Arrival_Planter', [2.6, 0.65, 2.6], [x, 0.78, 12.8], materials.stone, architecture, 0.28);
    cylinder('Arrival_Tree_Trunk', 0.14, 2.3, [x, 2, 12.8], materials.wood);
    const crown = addMesh('Arrival_Tree_Crown', new THREE.IcosahedronGeometry(1.2, 2), materials.green, [x, 3.45, 12.8]); crown.scale.y = 1.35;
  }

  return { group, architecture, interior, materials };
}
