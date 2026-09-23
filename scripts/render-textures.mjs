// Renders the landmark textures that are drawn in HTML rather than painted:
// at present the command center's video wall. Chromium does the layout, the
// type and the anti-aliasing, which is the point of drawing it this way.
//   node scripts/render-textures.mjs
import {chromium} from 'playwright';
import path from 'node:path';
const browser = await chromium.launch(process.env.CHROMIUM ? {executablePath: process.env.CHROMIUM} : {});
const page = await browser.newPage({viewport: {width: 2100, height: 1320}, deviceScaleFactor: 1});
await page.goto('file://' + path.resolve('scripts/blender/textures/dashboard.html'));
await page.screenshot({path: 'public/landmarks/dashboard.jpg', type: 'jpeg', quality: 88});
await browser.close();
console.log('dashboard -> public/landmarks/dashboard.jpg');
