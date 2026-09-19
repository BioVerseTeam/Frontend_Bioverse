/**
 * Admin route guard and chrome. Student notebook and control room stay separate.
 */

import { AuthService } from '../features/auth/authService.js';

export const ADMIN_NAV = [
  {
    label: 'Điều hành',
    items: [
      { href: '/admin.html', path: 'admin', label: 'Điều hành', icon: 'space_dashboard' }
    ]
  },
  {
    label: 'Nhân mẫu',
    items: [
      { href: '/admin-models.html', path: 'admin-models', label: 'Nhân mẫu 3D', icon: 'view_in_ar' },
      { href: '/admin-categories.html', path: 'admin-categories', label: 'Loại mẫu', icon: 'category' },
      { href: '/admin-labs.html', path: 'admin-labs', label: 'Lab', icon: 'science' }
    ]
  },
  {
    label: 'Tài khoản',
    items: [
      { href: '/admin-users.html', path: 'admin-users', label: 'Người dùng', icon: 'group' },
      { href: '/admin-roles.html', path: 'admin-roles', label: 'Vai trò', icon: 'badge' }
    ]
  }
];

export function roleCode(user = AuthService.getUser()) {
  const role = user?.role;
  if (!role) return '';
  const raw = typeof role === 'string'
    ? role
    : String(role.code || role.name || role.authority || '');
  return raw.replace(/^ROLE_/i, '').toUpperCase();
}

export function isAdmin(user = AuthService.getUser()) {
  return roleCode(user) === 'ADMIN';
}

export function isAdminRoute(pathname = window.location.pathname) {
  const path = pathname.replace(/\.html$/, '');
  return path === '/admin' || path.startsWith('/admin-') || path.startsWith('/pages/admin');
}

export function homeAfterLogin(user, nextParam) {
  const next = typeof nextParam === 'string' ? nextParam : new URLSearchParams(window.location.search).get('next');
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : null;
  if (isAdmin(user)) {
    if (safeNext && isAdminRoute(safeNext)) return safeNext;
    return '/admin.html';
  }
  return safeNext || '/index.html';
}

/**
 * @param {{ loginNext?: string, gateId?: string, workspaceId?: string, message?: string }} options
 * @returns {boolean}
 */
export function requireAdmin({
  loginNext = '/admin.html',
  gateId = 'admin-gate',
  workspaceId = 'admin-workspace',
  message = 'Đăng nhập bằng tài khoản ADMIN để vào phòng điều hành.'
} = {}) {
  const gate = document.getElementById(gateId);
  const workspace = document.getElementById(workspaceId);
  const loginLink = document.getElementById('admin-gate-login');
  const text = document.getElementById('admin-gate-text');

  if (loginLink) loginLink.href = `/login.html?next=${encodeURIComponent(loginNext)}`;

  if (!AuthService.isLoggedIn()) {
    showEl(gate, true);
    showEl(workspace, false);
    return false;
  }

  if (!isAdmin()) {
    showEl(gate, true);
    showEl(workspace, false);
    if (text) text.textContent = message;
    return false;
  }

  showEl(gate, false);
  showEl(workspace, true);
  applyAdminChrome();
  return true;
}

export function applyAdminChrome(activePath) {
  try {
    const current = activePath || currentAdminPath();
    document.body.classList.add('admin-app');
    mountSidebar(current);
    slimHeader(current);
    bindSidebarChrome();
  } catch (err) {
    console.warn('Admin chrome failed', err);
    document.body.classList.add('admin-app');
  }
}

export function currentAdminPath() {
  const path = window.location.pathname;
  if (path.includes('admin-categories')) return 'admin-categories';
  if (path.includes('admin-labs')) return 'admin-labs';
  if (path.includes('admin-models')) return 'admin-models';
  if (path.includes('admin-users')) return 'admin-users';
  if (path.includes('admin-roles')) return 'admin-roles';
  return 'admin';
}

function mountSidebar(current) {
  let sidebar = document.getElementById('admin-sidebar');
  if (!sidebar) {
    sidebar = document.createElement('aside');
    sidebar.id = 'admin-sidebar';
    document.body.prepend(sidebar);
  }

  sidebar.className = 'admin-sidebar';
  sidebar.setAttribute('aria-label', 'Mục quản trị');
  sidebar.innerHTML = `
    <a class="admin-sidebar-brand" href="/admin.html">
      <span class="admin-sidebar-mark">
        <span class="material-symbols-outlined">admin_panel_settings</span>
      </span>
      <span class="admin-sidebar-brand-copy">
        <strong>BioVerse</strong>
        <span>Phòng điều hành</span>
      </span>
    </a>
    <nav class="admin-sidebar-nav">
      ${ADMIN_NAV.map((group) => `
        <div class="admin-nav-group">
          ${group.items.length > 1 ? `<p class="admin-nav-label">${group.label}</p>` : ''}
          ${group.items.map((item) => navItem(item, current)).join('')}
        </div>
      `).join('')}
    </nav>
    <div class="admin-sidebar-foot">
      <a class="admin-sidebar-exit" href="/index.html?view=student">
        <span class="material-symbols-outlined">menu_book</span>
        Sổ tay học sinh
      </a>
    </div>
  `;

  let backdrop = document.getElementById('admin-sidebar-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('button');
    backdrop.id = 'admin-sidebar-backdrop';
    backdrop.type = 'button';
    backdrop.className = 'admin-sidebar-backdrop';
    backdrop.setAttribute('aria-label', 'Đóng mục điều hướng');
    sidebar.insertAdjacentElement('afterend', backdrop);
  }
}

function slimHeader(current) {
  const header = document.querySelector('body > header');
  if (!header) return;
  header.classList.add('admin-topbar');

  const bar = header.querySelector('.h-20') || header;
  const title = pageTitle(current);

  const logo = header.querySelector('a[data-path="home"], a[data-path="admin"]');
  if (logo) {
    logo.href = '/admin.html';
    logo.dataset.path = 'admin';
    logo.classList.add('admin-topbar-brand');
    const brandWrap = logo.parentElement;
    if (brandWrap && brandWrap !== bar) {
      brandWrap.classList.add('admin-topbar-brand-wrap');
    }
  }

  const brandSubtitle = header.querySelector('.admin-topbar-brand .font-label-sm');
  if (brandSubtitle) brandSubtitle.textContent = title;

  const nav = header.querySelector('nav');
  if (nav) {
    nav.hidden = true;
    nav.innerHTML = '';
  }

  let lead = header.querySelector('.admin-topbar-lead');
  if (!lead) {
    lead = document.createElement('div');
    lead.className = 'admin-topbar-lead';
    bar.prepend(lead);
  }

  let toggle = header.querySelector('#admin-nav-toggle');
  if (!toggle) {
    toggle = document.createElement('button');
    toggle.id = 'admin-nav-toggle';
    toggle.type = 'button';
    toggle.className = 'admin-nav-toggle';
    toggle.setAttribute('aria-controls', 'admin-sidebar');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Mở mục điều hướng');
    toggle.innerHTML = '<span class="material-symbols-outlined">menu</span>';
  }
  if (toggle.parentElement !== lead) lead.prepend(toggle);

  let pageHeading = header.querySelector('#admin-page-title');
  if (!pageHeading) {
    pageHeading = document.createElement('p');
    pageHeading.id = 'admin-page-title';
    pageHeading.className = 'admin-page-title';
  }
  if (pageHeading.parentElement !== lead) lead.appendChild(pageHeading);
  pageHeading.textContent = title;

  const identity = document.getElementById('header-user-cluster')
    || document.getElementById('header-user-name')?.closest('.flex.items-center')
    || bar.querySelector(':scope > .flex.items-center:last-child');
  if (identity && identity !== lead && !identity.classList.contains('admin-topbar-brand-wrap')) {
    identity.id = identity.id || 'header-user-cluster';
    identity.classList.add('admin-topbar-identity');
    const who = identity.querySelector('#header-user-name')?.parentElement;
    if (who && who !== identity) {
      who.classList.add('admin-topbar-who');
      who.classList.remove('hidden');
    }
    const avatar = identity.querySelector('a[title*="Tài khoản"], a[href*="login"], .admin-avatar');
    if (avatar) avatar.classList.add('admin-avatar');
  }

  const xpEl = document.getElementById('header-user-xp');
  const xpWrap = xpEl?.parentElement;
  if (xpWrap && !xpWrap.matches('header, main, body')) {
    xpWrap.style.display = 'none';
  }
  const streak = document.getElementById('header-user-streak');
  if (streak) streak.style.display = 'none';
}

function bindSidebarChrome() {
  const toggle = document.getElementById('admin-nav-toggle');
  const backdrop = document.getElementById('admin-sidebar-backdrop');
  if (toggle && !toggle.dataset.bound) {
    toggle.dataset.bound = '1';
    toggle.addEventListener('click', () => setSidebarOpen(!document.body.classList.contains('admin-nav-open')));
  }
  if (backdrop && !backdrop.dataset.bound) {
    backdrop.dataset.bound = '1';
    backdrop.addEventListener('click', () => setSidebarOpen(false));
  }
  if (!document.documentElement.dataset.adminEscBound) {
    document.documentElement.dataset.adminEscBound = '1';
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') setSidebarOpen(false);
    });
  }
}

function setSidebarOpen(open) {
  document.body.classList.toggle('admin-nav-open', open);
  const toggle = document.getElementById('admin-nav-toggle');
  if (toggle) {
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Đóng mục điều hướng' : 'Mở mục điều hướng');
  }
}

function navItem(item, current) {
  const active = item.path === current;
  const aria = active ? ' aria-current="page"' : '';
  return `
    <a href="${item.href}" data-path="${item.path}" class="admin-nav-link${active ? ' is-active' : ''}"${aria}>
      <span class="material-symbols-outlined">${item.icon}</span>
      ${item.label}
    </a>
  `;
}

function pageTitle(current) {
  const titles = {
    admin: 'Điều hành',
    'admin-models': 'Nhân mẫu 3D',
    'admin-categories': 'Loại mẫu',
    'admin-labs': 'Lab',
    'admin-users': 'Người dùng',
    'admin-roles': 'Vai trò'
  };
  return titles[current] || 'Phòng điều hành';
}

function showEl(el, visible) {
  if (!el) return;
  el.hidden = !visible;
}
