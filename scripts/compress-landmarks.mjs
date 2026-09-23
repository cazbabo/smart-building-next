// Meshopt compression and quantisation for the Blender landmarks, in place.
// Cuts the meshes to under a third of their exported size; three decodes them
// with the MeshoptDecoder it ships, so the page fetches nothing extra.
//   node scripts/compress-landmarks.mjs
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
for (const file of fs.readdirSync('public/landmarks').filter(f => f.endsWith('.glb'))) {
 const path = `public/landmarks/${file}`, before = fs.statSync(path).size;
 execFileSync('npx', ['--yes', '@gltf-transform/cli@4', 'meshopt', path, path, '--level', 'medium'], {stdio: 'ignore'});
 console.log(`${file}: ${(before / 1024).toFixed(0)} KB -> ${(fs.statSync(path).size / 1024).toFixed(0)} KB`);
}
