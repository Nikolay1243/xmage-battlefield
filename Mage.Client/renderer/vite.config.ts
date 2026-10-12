import { defineConfig } from 'vite';
export default defineConfig({base:'./',preview:{headers:{'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self'; frame-ancestors 'none'"}},build:{outDir:'../src/main/resources/mage/client/game/renderer',emptyOutDir:true,target:'es2022'}});
