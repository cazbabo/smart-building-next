// Steps scripts/video/film.html through every frame and encodes the film.
//
//   node scripts/video/frames.mjs <work dir> <out.mp4> [first] [last]
//
// <work dir> holds master-day.png and master-dusk.png (scripts/blender/plate.py)
// and master.json (scripts/video/timeline.mjs). Frames are screenshots of the page after
// renderFrame(t), so nothing depends on the machine's frame rate. Needs
// Playwright (PLAYWRIGHT / CHROMIUM env to point at an install) and an ffmpeg
// with libx264 (FFMPEG, or the one imageio-ffmpeg ships).
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {FPS, FRAMES, WIDTH, HEIGHT} from './timeline.mjs';

const [work, output, first = '0', last = String(FRAMES - 1)] = process.argv.slice(2);
const here = path.dirname(new URL(import.meta.url).pathname);
const {chromium} = await import(process.env.PLAYWRIGHT ?? 'playwright');
const types = {'.html': 'text/html', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png'};
const server = http.createServer((req, res) => {
 const name = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '');
 const file = /^master[.-]/.test(name) ? path.join(work, name) : path.join(here, name || 'film.html');
 if (!fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
 res.writeHead(200, {'content-type': types[path.extname(file)] ?? 'application/octet-stream'});
 fs.createReadStream(file).pipe(res);
}).listen(0);
const port = server.address().port;

const browser = await chromium.launch(process.env.CHROMIUM ? {executablePath: process.env.CHROMIUM} : {});
const page = await browser.newPage({viewport: {width: WIDTH, height: HEIGHT}, deviceScaleFactor: 1});
page.on('pageerror', e => console.error('page error:', e.message));
// The web font is fetched by curl rather than the browser: behind a TLS-
// inspecting proxy the system's curl trusts the proxy and Chromium does not,
// and a missing font falls back silently to Arial.
await page.route(/fonts\.(googleapis|gstatic)\.com/, async route => {
 const body = execFileSync('curl', ['-sSfL', '-A', route.request().headers()['user-agent'], route.request().url()], {maxBuffer: 1 << 26});
 const css = route.request().url().includes('googleapis');
 await route.fulfill({body, contentType: css ? 'text/css' : 'font/woff2', headers: {'access-control-allow-origin': '*'}});
});
await page.goto(`http://127.0.0.1:${port}/film.html`);
await page.waitForFunction(() => window.ready === true, null, {timeout: 120000});
const dir = path.join(work, 'frames');
fs.mkdirSync(dir, {recursive: true});
for (let f = +first; f <= +last; f++) {
 await page.evaluate(t => window.renderFrame(t), f / FPS);
 await page.screenshot({path: path.join(dir, `${String(f).padStart(4, '0')}.png`)});
 if (f % 60 === 0) console.log(`frame ${f}/${FRAMES}`);
}
await browser.close();
server.close();

if (output) {
 const ffmpeg = process.env.FFMPEG ?? 'ffmpeg';
 execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(dir, '%04d.png'),
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', output], {stdio: 'inherit'});
 console.log(`film -> ${output} (${(fs.statSync(output).size / 1e6).toFixed(1)} MB)`);
}
