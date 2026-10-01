// Copies SuperMap iClient3D for WebGL (a Cesium build) out of node_modules into
// public/vendor/supermap3d, where the digital twin page loads it with a script
// tag. Cesium finds its Workers, Assets and ThirdParty files next to Cesium.js,
// so they have to be served as plain files, not bundled. The copy is generated
// (see .gitignore) and refreshed by `npm run assets`.
//
// Left out: the ES-module build and its typings (the page uses the classic
// global build), and the OSGB-to-S3M converter, which only matters for
// converting OSGB data in the browser - 39 MB the page never asks for.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const from = path.join(root, 'node_modules', '@supermap', 'iclient3d-webgl', 'Cesium');
const to = path.join(root, 'public', 'vendor', 'supermap3d');
const skip = new Set(['Cesium-es6.js', 'Cesium-es6.d.ts', 'OSGBToS3M.wasm']);

if (!fs.existsSync(from)) {
  console.error(`copy-supermap: ${from} is missing - run npm install`);
  process.exit(1);
}
fs.rmSync(to, {recursive: true, force: true});
let files = 0, bytes = 0;
(function copy(src, dst) {
  fs.mkdirSync(dst, {recursive: true});
  for (const entry of fs.readdirSync(src, {withFileTypes: true})) {
    if (skip.has(entry.name)) continue;
    const s = path.join(src, entry.name), d = path.join(dst, entry.name);
    if (entry.isDirectory()) copy(s, d);
    else { fs.copyFileSync(s, d); files++; bytes += fs.statSync(s).size; }
  }
})(from, to);
console.log(`copy-supermap: ${files} files, ${(bytes / 1e6).toFixed(1)} MB -> public/vendor/supermap3d`);
