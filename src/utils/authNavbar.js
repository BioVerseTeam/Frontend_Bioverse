/**
 * Shared Navbar Auth Handler for BioVerse Pages
 * Updates user profile, displays login/logout controls, and keeps token fresh.
 */

import { AuthService } from '../features/auth/authService.js';
import { getProgress } from '../features/progress/progressService.js';
import { confirmModal } from '../components/modal.js';
import { applyAdminChrome, isAdmin, isAdminRoute } from './adminGuard.js';

export function setupNavbarAuth() {
  const user = AuthService.getUser();
  const isLoggedIn = AuthService.isLoggedIn();

  // Find navbar user container — prefer the stable admin cluster id
  const userContainer = document.getElementById('header-user-cluster')
    || document.querySelector('header .admin-topbar-identity')
    || document.querySelector('header .flex.items-center.gap-space-md');
  const nameEl = document.getElementById('header-user-name')
    || document.querySelector('header .admin-topbar-who #header-user-name')
    || document.querySelector('header .font-label-md.text-label-md.text-on-surface');
  const gradeEl = document.getElementById('header-user-grade');
  const xpBadgeEl = document.getElementById('header-user-xp') || document.querySelector('header .bg-\\[\\#fff9c4\\] span.font-label-sm');
  const avatarLink = document.querySelector('header .admin-avatar, header a[title*="Tài khoản"], header a[href*="login"]');

  // Update header XP badge from real tracked progress
  if (xpBadgeEl) {
    const progress = getProgress();
    xpBadgeEl.textContent = `${progress.xp.toLocaleString('vi-VN')} XP`;
  }

  renderHeaderStreak(isLoggedIn ? user : null);
  if (isLoggedIn && isAdmin(user) && isAdminRoute()) {
    applyAdminChrome();
  } else {
    insertAdminNav(isLoggedIn ? user : null);
  }

  const cluster = document.getElementById('header-user-cluster')
    || document.querySelector('header .admin-topbar-identity')
    || userContainer;

  // Hero greeting element (on home page)
  const heroGreetingName = document.getElementById('hero-user-name') || document.querySelector('h1 span.text-primary.underline');

  if (isLoggedIn && user) {
    if (nameEl) {
      nameEl.textContent = user.name || user.email?.split('@')[0] || 'Nhà nghiên cứu';
    }
    if (gradeEl) {
      gradeEl.textContent = isAdmin(user) ? 'Quản Trị Viên' : `Lớp ${user.grade || '8'} • Sinh học`;
    }
    if (heroGreetingName) {
      heroGreetingName.textContent = `${user.name || 'bạn'}!`;
    }

    // Replace login link with account popover / logout button
    if (avatarLink && !document.getElementById('btn-navbar-logout')) {
      avatarLink.title = `Đã đăng nhập: ${user.email}`;
      avatarLink.removeAttribute('href');
      avatarLink.classList.add('cursor-pointer', 'admin-avatar');

      // Add logout button right next to avatar
      const logoutBtn = document.createElement('button');
      logoutBtn.id = 'btn-navbar-logout';
      logoutBtn.type = 'button';
      logoutBtn.title = 'Đăng xuất tài khoản';
      logoutBtn.className = 'admin-logout-btn w-8 h-8 rounded-full bg-surface-container-high hover:bg-[#ffebee] hover:text-[#b71422] flex items-center justify-center border-2 border-[#2d2d2d] sketch-shadow-sm transition-all cursor-pointer';
      logoutBtn.innerHTML = '<span class="material-symbols-outlined text-[18px]">logout</span>';

      logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const confirmed = await confirmModal({
          title: 'Đăng xuất tài khoản',
          message: `Bạn có chắc muốn đăng xuất tài khoản <strong>${user.email}</strong>?`,
          type: 'confirm',
          confirmText: 'Đăng xuất',
          cancelText: 'Ở lại',
          isDestructive: true,
          washiTag: 'XÁC THỰC PHIÊN'
        });
        if (confirmed) {
          await AuthService.logout();
        }
      });

      if (cluster) {
        cluster.appendChild(logoutBtn);
      }
    }

    // Refresh profile in background — GET /me also records today's streak
    AuthService.getProfile().then(freshUser => {
      if (freshUser && nameEl) {
        nameEl.textContent = freshUser.name || freshUser.email?.split('@')[0] || 'Nhà nghiên cứu';
      }
      if (freshUser) {
        renderHeaderStreak(freshUser);
        window.dispatchEvent(new CustomEvent('bioverse_streak_updated', { detail: freshUser }));
      }
    }).catch(() => {});

  } else {
    // Not logged in
    if (nameEl) {
      nameEl.textContent = 'Khách thăm';
    }
    if (gradeEl) {
      gradeEl.textContent = 'Chưa đăng nhập';
    }
    if (avatarLink) {
      avatarLink.href = '/login.html';
      avatarLink.title = 'Bấm để đăng nhập';
    }
    renderHeaderStreak(null);
  }
}

function insertAdminNav(user) {
  const nav = document.querySelector('header nav');
  if (!nav) return;

  const existing = nav.querySelector('[data-path="admin"], a[href="/admin.html"], a[href*="admin-models"], a[href*="admin-roles"]');
  if (!isAdmin(user)) {
    if (existing && (existing.id === 'nav-admin-home' || existing.id === 'nav-admin-models')) {
      existing.remove();
    }
    return;
  }
  if (existing) return;

  const link = document.createElement('a');
  link.id = 'nav-admin-home';
  link.href = '/admin.html';
  link.dataset.path = 'admin';
  link.className = 'px-space-md py-space-xs rounded-xl font-label-md text-label-md text-on-surface-variant hover:text-on-surface transition-all border-2 border-transparent';
  link.textContent = 'Điều hành';
  nav.appendChild(link);
}

function renderHeaderStreak(user) {
  const current = user?.currentStreak ?? 0;
  const longest = user?.longestStreak ?? 0;
  let badge = document.getElementById('header-user-streak');

  if (!badge) {
    const xpWrap = document.getElementById('header-user-xp')?.parentElement;
    if (!xpWrap || !xpWrap.parentElement) {
      return;
    }
    badge = document.createElement('div');
    badge.id = 'header-user-streak';
    badge.className = 'hidden md:flex items-center gap-space-xs px-space-md py-1.5 bg-[#ffedd5] border-2 border-[#2d2d2d] rounded-full sketch-shadow-sm transform -rotate-1';
    badge.innerHTML = '<span class="text-[15px]" aria-hidden="true">🔥</span><span class="header-streak-label font-label-sm text-label-sm text-on-surface">0 ngày</span>';
    xpWrap.insertAdjacentElement('afterend', badge);
  }

  const label = badge.querySelector('.header-streak-label') || badge;
  if (user) {
    label.textContent = `${current} ngày`;
    badge.title = `Chuỗi học: ${current} ngày liên tiếp • Kỷ lục: ${longest} ngày`;
    badge.classList.remove('opacity-50');
  } else {
    label.textContent = '0 ngày';
    badge.title = 'Đăng nhập để tích chuỗi ngày học';
    badge.classList.add('opacity-50');
  }
}
