import {defineConfig} from 'vite';
import {resolve} from 'node:path';
// /supermap passes on to SuperMap's demo iServer, as vercel.json does in production.
const supermap={'/supermap':{target:'https://iserver.supermap.io',changeOrigin:true,rewrite:p=>p.replace(/^\/supermap/,'/iserver')}};
export default defineConfig({server:{proxy:supermap},preview:{proxy:supermap},build:{rollupOptions:{input:{main:resolve(import.meta.dirname,'index.html'),ais:resolve(import.meta.dirname,'ais-smart-building.html'),intelligence:resolve(import.meta.dirname,'city-intelligence.html'),twin:resolve(import.meta.dirname,'digital-twin.html')}}}});
