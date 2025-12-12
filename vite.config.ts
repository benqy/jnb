import { defineConfig } from 'vite';

export default defineConfig({
  base: '/jnb/',
  server: {
    port: 2334,
    strictPort: true,
  },
});
