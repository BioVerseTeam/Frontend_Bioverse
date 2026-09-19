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
        '/sinh-hoc': '/pages/sinh-hoc.html',
        '/sinh-hoc.html': '/pages/sinh-hoc.html',
        '/admin': '/pages/admin.html',
        '/admin.html': '/pages/admin.html',
        '/admin-models': '/pages/admin-models.html',
        '/admin-models.html': '/pages/admin-models.html',
        '/admin-categories': '/pages/admin-categories.html',
        '/admin-categories.html': '/pages/admin-categories.html',
        '/admin-labs': '/pages/admin-labs.html',
        '/admin-labs.html': '/pages/admin-labs.html',
        '/admin-users': '/pages/admin-users.html',
        '/admin-users.html': '/pages/admin-users.html',
        '/admin-roles': '/pages/admin-roles.html',
        '/admin-roles.html': '/pages/admin-roles.html',
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
        sinhHoc: resolve(__dirname, 'pages/sinh-hoc.html'),
        admin: resolve(__dirname, 'pages/admin.html'),
        adminModels: resolve(__dirname, 'pages/admin-models.html'),
        adminCategories: resolve(__dirname, 'pages/admin-categories.html'),
        adminLabs: resolve(__dirname, 'pages/admin-labs.html'),
        adminUsers: resolve(__dirname, 'pages/admin-users.html'),
        adminRoles: resolve(__dirname, 'pages/admin-roles.html'),
      }
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        timeout: 300000,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            // Tránh Spring CORS 403 khi Vite chạy cổng khác 5173.
            proxyReq.removeHeader('origin');
          });
        }
      }
    }
  }
});
