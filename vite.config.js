import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      },
      '/tripoapi': {
        target: 'https://api.tripo3d.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/tripoapi/, '')
      }
    }
  }
});
