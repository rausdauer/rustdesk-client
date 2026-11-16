import {defineConfig} from 'vite';
import {resolve} from 'node:path';
export default defineConfig({base:'./',plugins:[{name:'sodium-resolution',resolveId(id,importer){if(id==='./libsodium.mjs' && importer?.endsWith('libsodium-wrappers/dist/modules-esm/libsodium-wrappers.mjs')) return resolve('node_modules/libsodium/dist/modules-esm/libsodium.mjs');}}],build:{target:'esnext',sourcemap:true,rollupOptions:{input:{main:resolve('index.html'),client:resolve('client.html')}}}});
