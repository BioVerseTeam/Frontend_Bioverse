/**
 * Shared Navbar Auth Handler for BioVerse Pages
 * Updates user profile, displays login/logout controls, and keeps token fresh.
 */

import { AuthService } from '../features/auth/authService.js';
import { getProgress } from '../features/progress/progressService.js';
import { confirmModal } from '../components/modal.js';

export function setupNavbarAuth() {
  const user = AuthService.getUser();
  const isLoggedIn = AuthService.isLoggedIn();

  // Find navbar user container
  const userContainer = document.querySelector('header .flex.items-center.gap-space-md');
  const nameEl = document.getElementById('header-user-name') || document.querySelector('header .font-label-md.text-label-md.text-on-surface');
  const gradeEl = document.getElementById('header-user-grade') || document.querySelector('header .font-label-sm.text-label-sm.text-tertiary');
  const xpBadgeEl = document.getElementById('header-user-xp') || document.querySelector('header .bg-\\[\\#fff9c4\\] span.font-label-sm');
  const avatarLink = document.querySelector('header a[title*="Tài khoản"], header a[href*="login"]');

  // Update header XP badge from real tracked progress
  if (xpBadgeEl) {
    const progress = getProgress();
    xpBadgeEl.textContent = `${progress.xp.toLocaleString('vi-VN')} XP`;
  }

  // Hero greeting element (on home page)
  const heroGreetingName = document.getElementById('hero-user-name') || document.querySelector('h1 span.text-primary.underline');

  if (isLoggedIn && user) {
    if (nameEl) {
      nameEl.textContent = user.name || user.email?.split('@')[0] || 'Nhà nghiên cứu';
    }
    if (gradeEl) {
      gradeEl.textContent = user.role === 'ADMIN' ? 'Quản Trị Viên' : `Lớp ${user.grade || '8'} • Sinh học`;
    }
    if (heroGreetingName) {
      heroGreetingName.textContent = `${user.name || 'bạn'}!`;
    }

    // Replace login link with account popover / logout button
    if (avatarLink && !document.getElementById('btn-navbar-logout')) {
      avatarLink.title = `Đã đăng nhập: ${user.email}`;
      avatarLink.removeAttribute('href');
      avatarLink.classList.add('cursor-pointer');

      // Add logout button right next to avatar
      const logoutBtn = document.createElement('button');
      logoutBtn.id = 'btn-navbar-logout';
      logoutBtn.type = 'button';
      logoutBtn.title = 'Đăng xuất tài khoản';
      logoutBtn.className = 'w-8 h-8 rounded-full bg-surface-container-high hover:bg-[#ffebee] hover:text-[#b71422] flex items-center justify-center border-2 border-[#2d2d2d] sketch-shadow-sm transition-all cursor-pointer';
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

      if (userContainer) {
        userContainer.appendChild(logoutBtn);
      }
    }

    // Refresh profile in background to get latest server updates
    AuthService.getProfile().then(freshUser => {
      if (freshUser && nameEl) {
        nameEl.textContent = freshUser.name || freshUser.email?.split('@')[0] || 'Nhà nghiên cứu';
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
  }
}
