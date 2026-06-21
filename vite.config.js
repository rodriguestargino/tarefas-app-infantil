import { defineConfig } from 'vite';
import fs from 'fs';

const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));

import legacy from '@vitejs/plugin-legacy';

export default defineConfig({
  plugins: [
    legacy({
      targets: ['defaults', 'not IE 11', 'Android >= 6'],
      additionalLegacyPolyfills: ['regenerator-runtime/runtime']
    })
  ],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },

  test: {
    environment: 'jsdom',
    globals: true,
  },
});
