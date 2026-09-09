import {defineConfig} from 'vite';
import {resolve} from 'node:path';
export default defineConfig({build:{rollupOptions:{input:{main:resolve(import.meta.dirname,'index.html'),ais:resolve(import.meta.dirname,'ais-smart-building.html')}}}});
