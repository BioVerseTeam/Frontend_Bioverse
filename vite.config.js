import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

/** Clean path → built HTML under /pages (and index at /). */
const CLEAN_ROUTES = {
  '/lab': '/pages/lab.html',
  '/login': '/pages/login.html',
  '/register': '/pages/register.html',
  '/forgot-password': '/pages/forgot-password.html',
  '/otp': '/pages/otp.html',
  '/exams': '/pages/exams.html',
  '/inspect': '/pages/inspect.html',
  '/sinh-hoc': '/pages/sinh-hoc.html',
  '/vat-ly': '/pages/vat-ly.html',
  '/mo-hinh': '/pages/mo-hinh.html',
  '/phan-ung': '/pages/phan-ung.html',
  '/admin': '/pages/admin.html',
  '/admin-models': '/pages/admin-models.html',
  '/admin-categories': '/pages/admin-categories.html',
  '/admin-labs': '/pages/admin-labs.html',
  '/admin-reactions': '/pages/admin-reactions.html',
  '/admin-users': '/pages/admin-users.html',
  '/admin-roles': '/pages/admin-roles.html',
  '/admin-exams': '/pages/admin-exams.html',
  '/admin-academic': '/pages/admin-academic.html',
  '/pricing': '/pages/pricing.html',
  '/checkout': '/pages/checkout.html',
  '/profile': '/pages/profile.html',
  '/admin-plans': '/pages/admin-plans.html',
  '/admin-payments': '/pages/admin-payments.html',
  '/admin-badges': '/pages/admin-badges.html',
};

/** Legacy *.html URLs → clean paths (browser address bar). */
const HTML_REDIRECTS = {
  '/index.html': '/',
  '/lab.html': '/lab',
  '/login.html': '/login',
  '/register.html': '/register',
  '/forgot-password.html': '/forgot-password',
  '/otp.html': '/otp',
  '/exams.html': '/exams',
  '/inspect.html': '/inspect',
  '/sinh-hoc.html': '/sinh-hoc',
  '/vat-ly.html': '/vat-ly',
  '/mo-hinh.html': '/mo-hinh',
  '/phan-ung.html': '/phan-ung',
  '/admin.html': '/admin',
  '/admin-models.html': '/admin-models',
  '/admin-categories.html': '/admin-categories',
  '/admin-labs.html': '/admin-labs',
  '/admin-reactions.html': '/admin-reactions',
  '/admin-users.html': '/admin-users',
  '/admin-roles.html': '/admin-roles',
  '/admin-exams.html': '/admin-exams',
  '/admin-academic.html': '/admin-academic',
  '/pricing.html': '/pricing',
  '/checkout.html': '/checkout',
  '/profile.html': '/profile',
  '/admin-plans.html': '/admin-plans',
  '/admin-payments.html': '/admin-payments',
  '/admin-badges.html': '/admin-badges',
  // Built multi-page assets live under /pages/*.html — redirect if opened directly.
  '/pages/lab.html': '/lab',
  '/pages/login.html': '/login',
  '/pages/register.html': '/register',
  '/pages/forgot-password.html': '/forgot-password',
  '/pages/otp.html': '/otp',
  '/pages/exams.html': '/exams',
  '/pages/inspect.html': '/inspect',
  '/pages/sinh-hoc.html': '/sinh-hoc',
  '/pages/vat-ly.html': '/vat-ly',
  '/pages/mo-hinh.html': '/mo-hinh',
  '/pages/phan-ung.html': '/phan-ung',
  '/pages/admin.html': '/admin',
  '/pages/admin-models.html': '/admin-models',
  '/pages/admin-categories.html': '/admin-categories',
  '/pages/admin-labs.html': '/admin-labs',
  '/pages/admin-reactions.html': '/admin-reactions',
  '/pages/admin-users.html': '/admin-users',
  '/pages/admin-roles.html': '/admin-roles',
  '/pages/admin-exams.html': '/admin-exams',
  '/pages/admin-academic.html': '/admin-academic',
  '/pages/pricing.html': '/pricing',
  '/pages/checkout.html': '/checkout',
  '/pages/profile.html': '/profile',
  '/pages/admin-plans.html': '/admin-plans',
  '/pages/admin-payments.html': '/admin-payments',
  '/pages/admin-badges.html': '/admin-badges',
};

function cleanUrlMiddleware(req, res, next) {
  const url = req.url || '';
  const [pathname, search] = url.split('?');
  const query = search ? `?${search}` : '';

  if (HTML_REDIRECTS[pathname]) {
    res.statusCode = 301;
    res.setHeader('Location', HTML_REDIRECTS[pathname] + query);
    res.end();
    return;
  }

  if (CLEAN_ROUTES[pathname]) {
    req.url = CLEAN_ROUTES[pathname] + query;
  }
  next();
}

const cleanUrlPlugin = () => ({
  name: 'clean-url-rewrite',
  configureServer(server) {
    server.middlewares.use(cleanUrlMiddleware);
  },
  configurePreview(server) {
    server.middlewares.use(cleanUrlMiddleware);
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
        vatLy: resolve(__dirname, 'pages/vat-ly.html'),
        moHinh: resolve(__dirname, 'pages/mo-hinh.html'),
        phanUng: resolve(__dirname, 'pages/phan-ung.html'),
        pricing: resolve(__dirname, 'pages/pricing.html'),
        checkout: resolve(__dirname, 'pages/checkout.html'),
        profile: resolve(__dirname, 'pages/profile.html'),
        admin: resolve(__dirname, 'pages/admin.html'),
        adminModels: resolve(__dirname, 'pages/admin-models.html'),
        adminCategories: resolve(__dirname, 'pages/admin-categories.html'),
        adminLabs: resolve(__dirname, 'pages/admin-labs.html'),
        adminReactions: resolve(__dirname, 'pages/admin-reactions.html'),
        adminUsers: resolve(__dirname, 'pages/admin-users.html'),
        adminRoles: resolve(__dirname, 'pages/admin-roles.html'),
        adminExams: resolve(__dirname, 'pages/admin-exams.html'),
        adminAcademic: resolve(__dirname, 'pages/admin-academic.html'),
        adminPlans: resolve(__dirname, 'pages/admin-plans.html'),
        adminPayments: resolve(__dirname, 'pages/admin-payments.html'),
        adminBadges: resolve(__dirname, 'pages/admin-badges.html'),
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
