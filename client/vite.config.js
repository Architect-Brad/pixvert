import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [sveltekit()],
                            optimizeDeps: {
                                exclude: ['vtracer-wasm'],   // keep WASM module happy
                            },
                            worker: {
                                format: 'es',                // Workers as ES modules
                            },
});
