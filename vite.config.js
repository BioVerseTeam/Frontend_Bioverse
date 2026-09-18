import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Clean URL rewrite middleware for dev server
const cleanUrlPlugin = () => ({
  name: 'clean-url-rewrite',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const url = req.url || '';
      const [pathname, search] = url.split('?');
      const query = search ? `?${search}` : '';

      const routeMap = {
        '/lab': '/pages/lab.html',
        '/lab.html': '/pages/lab.html',
        '/login': '/pages/login.html',
        '/login.html': '/pages/login.html',
        '/register': '/pages/register.html',
        '/register.html': '/pages/register.html',
        '/forgot-password': '/pages/forgot-password.html',
        '/forgot-password.html': '/pages/forgot-password.html',
        '/otp': '/pages/otp.html',
        '/otp.html': '/pages/otp.html',
        '/exams': '/pages/exams.html',
        '/exams.html': '/pages/exams.html',
        '/inspect': '/pages/inspect.html',
        '/inspect.html': '/pages/inspect.html',
      };

      if (routeMap[pathname]) {
        req.url = routeMap[pathname] + query;
      }
      next();
    });
  }
});

export default defineConfig({
  plugins: [cleanUrlPlugin()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        lab: resolve(__dirname, 'pages/lab.html'),
        login: resolve(__dirname, 'pages/login.html'),
        register: resolve(__dirname, 'pages/register.html'),
        forgotPassword: resolve(__dirname, 'pages/forgot-password.html'),
        otp: resolve(__dirname, 'pages/otp.html'),
        exams: resolve(__dirname, 'pages/exams.html'),
        inspect: resolve(__dirname, 'pages/inspect.html'),
      }
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        timeout: 300000
      }
    }
  }
});
