import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'node:path';

export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: { '@': resolve(__dirname, 'src') },
    },
    server: { port: 3030 },
    build: {
        // Source maps are small here and make the published bundle readable,
        // which matters more than bytes for a repo whose job is to be read.
        sourcemap: true,
        rollupOptions: {
            output: {
                /**
                 * Split the bundle along the axis that actually changes.
                 *
                 * ⚠️ This is the BUNDLER half of the split-chunk story. The other
                 * half — the one that matters more — is that translations are
                 * split per namespace and fetched on demand by
                 * `src/i18n/otaBackend.ts`, so opening one screen downloads that
                 * screen's copy and nothing else.
                 *
                 * Route chunks are produced by `React.lazy` in `App.tsx` and need
                 * no configuration here; Rollup emits one per dynamic import.
                 *
                 * Vendors are pinned into named chunks so a copy change or an
                 * app-code change never invalidates them in a visitor's cache.
                 * Grouping i18next separately from React is deliberate: it is the
                 * dependency most likely to move on its own.
                 */
                manualChunks(id) {
                    if (!id.includes('node_modules')) return;

                    // ⚠️ Order matters, and so does `scheduler`. React depends on
                    // it, so leaving it in `vendor` makes `react` import `vendor`
                    // while `vendor` imports `react` — Rollup warns
                    // "Circular chunk: vendor -> react -> vendor" and the two can
                    // no longer be cached or loaded independently. Anything React
                    // itself pulls in belongs in the React chunk.
                    if (/[\\/]node_modules[\\/].*i18next/.test(id)) return 'i18n';
                    if (/[\\/]react-router/.test(id)) return 'router';
                    if (/[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'react';
                    return 'vendor';
                },
            },
        },
    },
});
