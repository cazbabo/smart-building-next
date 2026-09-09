import * as THREE from 'three';
import {box, cylinder, tree, mat} from '../model-kit.js';

// An architectural envelope, separate from floor/device data and cutaway interiors.
// All facade pieces belong to their floor so exploded views remain coherent.
export function createModernEnvelope() {
  const stone = mat(0xc9ccbf, {roughness: .7});
  const porcelain = mat(0xdce0d5, {roughness: .52});
  const graphite = mat(0x25393b, {metalness: .38, roughness: .35});
  const bronze = mat(0x8c8b71, {metalness: .65, roughness: .31});
  const darkGlass = mat(0x284750, {metalness: .78, roughness: .16});
  const blueGlass = mat(0x35565f, {metalness: .75, roughness: .19});
  const silverGlass = mat(0x56727a, {metalness: .72, roughness: .2});
  const foliage = mat(0x436442, {roughness: .92});
  const wood = mat(0x917b5e, {roughness: .7});
  const water = mat(0x6a9992, {metalness: .45, roughness: .14});
  const warm = mat(0xdbcc9e, {emissive: 0xa78238, emissiveIntensity: .22});
  const glazing = [darkGlass, blueGlass, darkGlass, silverGlass, blueGlass, darkGlass];

  function planter(parent, x, z, width, depth, y = .3, trees = false) {
    box(parent, [width, .5, depth], [x, y + .25, z], stone);
    box(parent, [width - .22, .15, depth - .22], [x, y + .55, z], foliage);
    // Rounded shrubs soften the otherwise precise architectural geometry.
    for (let dx = -width / 2 + .6; dx < width / 2; dx += 1.1) {
      const shrub = new THREE.Mesh(new THREE.IcosahedronGeometry(.48, 1), foliage);
      shrub.position.set(x + dx, y + .9, z);
      shrub.scale.set(1, .7, .8);
      parent.add(shrub);
    }
    if (trees) tree(parent, x, y + .5, z, .85);
  }

  function facade(parent, id) {
    const lobby = id === 1;
    const penthouse = id === 5;
    const front = lobby ? 6.5 : penthouse ? 5.8 : 8.65;
    const side = lobby ? 10.2 : 11.65;
    // Dark slab recesses join the glazing into a continuous curtain wall.
    box(parent, [24, .17, 18], [0, .23, 0], graphite);
    if (lobby) {
      box(parent, [20.6, .11, 15.3], [0, .35, -.8], stone);
    }
    for (let i = 0; i < 6; i++) {
      const x = -10 + i * 4;
      box(parent, [3.93, 3.95, .12], [x, 2.28, front], glazing[i]);
      box(parent, [.045, 3.97, .2], [x - 2, 2.28, front + .04], graphite);
      box(parent, [3.85, .07, .03], [x, 3.47, front + .08], bronze);
      // Broad, muted reflection band gives a readable glass surface in both renderers.
      box(parent, [3.85, .28, .025], [x, 2.9, front + .08], i % 3 === 0 ? silverGlass : blueGlass);
    }
    for (let i = 0; i < 6; i++) {
      const z = -7.3 + i * 2.65;
      box(parent, [.12, 3.95, 2.57], [side, 2.28, z], glazing[(i + 2) % 6]);
      box(parent, [.2, 3.95, .055], [side + .05, 2.28, z - 1.31], graphite);
      if (!lobby) {
        box(parent, [.68, 4.03, .1], [12.02, 2.25, z - 1.3], bronze);
      }
    }
    box(parent, [23.3, 3.95, .14], [0, 2.28, -8.66], blueGlass);
    box(parent, [.14, 3.95, 17.3], [-11.67, 2.28, 0], darkGlass);
    for (let x = -10; x <= 10; x += 4) box(parent, [.07, 4, .2], [x, 2.25, -8.8], graphite);

    // Two calm, full-height mineral piers and a warm service spine.
    box(parent, [1.1, 4.3, 1.2], [-11.5, 2.15, 8.7], porcelain);
    box(parent, [.85, 4.3, 1.1], [11.65, 2.15, 8.7], porcelain);
    box(parent, [3.4, 4.3, .5], [-7.5, 2.15, 8.94], stone);
    for (let x = -8.85; x < -6.1; x += .32) box(parent, [.06, 4.22, .09], [x, 2.15, 9.23], bronze);

    if (id === 2 || id === 4) {
      // Deep brise-soleil, every second storey rather than repetitive white floor stripes.
      box(parent, [18.5, .28, 1.55], [2.4, .42, 9.08], porcelain);
      box(parent, [.9, .28, 18.1], [12.08, .42, .3], porcelain);
      box(parent, [17.8, .045, .3], [2.5, .24, 9.7], wood);
    }
    if (id === 3) {
      box(parent, [7.4, .26, 2.7], [7.8, .3, 9.2], stone);
      planter(parent, 7.8, 9.75, 6.8, 1.15, .4);
      box(parent, [7.2, .08, .06], [7.8, 1.6, 10.52], bronze);
      for (const x of [4.3, 7.8, 11.3]) box(parent, [.045, 1.2, .045], [x, 1, 10.52], bronze);
    }
    if (penthouse) {
      // Recessed top storey opens a long planted sky terrace below the floating roof.
      box(parent, [22.3, .12, 3.6], [0, .37, 7.4], wood);
      planter(parent, 2.3, 8.28, 14.6, 1.2, .43);
      tree(parent, -4.4, .95, 7.9, .85);
      tree(parent, 8.7, .95, 7.9, .85);
      box(parent, [22.3, .08, .08], [0, 1.48, 9.18], bronze);
      for (let x = -10; x <= 10; x += 4) box(parent, [.045, 1, .045], [x, 1, 9.18], bronze);
    }
    if (lobby) {
      // A sheltered transparent entrance below a cantilevered canopy.
      box(parent, [12.8, .32, 5], [2.8, 3.78, 9.4], porcelain);
      box(parent, [12.4, .07, 4.6], [2.8, 3.57, 9.4], wood);
      for (const x of [-2.8, 8.4]) box(parent, [.17, 3.6, .17], [x, 1.85, 11.25], bronze);
      box(parent, [4.2, 3.3, .12], [1.9, 1.95, 6.61], darkGlass);
      for (const x of [.1, 1.9, 3.7]) box(parent, [.045, 3.3, .07], [x, 1.95, 6.72], bronze);
      box(parent, [3.4, .06, .06], [1.9, 3.45, 6.75], warm);
    }
  }

  function rooftop(parent) {
    // Floating L-shaped crown, offset from the solar array, keeps it visible and selectable.
    box(parent, [25.6, .48, 2.7], [0, .25, 8.4], porcelain);
    box(parent, [1.8, .48, 20.2], [-11.9, .25, -.35], porcelain);
    box(parent, [24.9, .1, 2.25], [0, -.03, 8.4], graphite);
    for (const z of [-8.8, 8.4]) box(parent, [23.3, .18, .12], [0, .7, z], bronze);
    for (const x of [-11.5, 11.5]) box(parent, [.12, .18, 17.4], [x, .7, 0], bronze);
    box(parent, [3.7, .13, 12], [9.25, .36, -.4], wood);
    planter(parent, 9.25, 6, 3.4, 2.1, .42, true);
    planter(parent, 9.25, -6.3, 3.4, 2.1, .42, true);
    // Solar pergola structure is a functional roof feature rather than rooftop decoration.
    for (const x of [-7.9, 1.8]) for (const z of [-3.4, 3.4]) box(parent, [.12, 1.15, .12], [x, .75, z], graphite);
    for (const z of [-3.4, 3.4]) box(parent, [10, .14, .16], [-3, 1.35, z], graphite);
  }

  function landscape(parent) {
    box(parent, [35, .52, 31], [0, -.72, 1], stone);
    box(parent, [32.7, .18, 28.7], [0, -.37, 1], porcelain);
    // A shallow reflecting pool and planted islands frame a precise arrival path.
    box(parent, [10.4, .12, 4], [-8.6, -.22, 12.3], graphite);
    box(parent, [10, .05, 3.6], [-8.6, -.14, 12.3], water);
    for (let x = -2.4; x <= 6; x += 2.05) box(parent, [1.78, .09, 5], [x, -.19, 12.1], stone);
    for (const [x, z] of [[-15, -8], [-15, 1], [14.6, -7], [14.6, 2]]) {
      planter(parent, x, z, 2.5, 3.2, -.25, true);
    }
    planter(parent, 11.4, 12.4, 6, 2.6, -.2, true);
    box(parent, [4.7, .44, .7], [10.6, .13, 10.5], wood);
    box(parent, [1.55, 2.7, .45], [-3.4, 1.1, 11], graphite);
    box(parent, [1.05, .1, .04], [-3.4, 2.13, 11.26], warm);
    const shadow = cylinder(parent, 20.5, .015, [0, -1, 1], mat(0xafbdb3), 48);
    shadow.scale.z = .8;
    shadow.renderOrder = -100;
  }
  return {facade, rooftop, landscape, slabMaterial: graphite};
}
