/**
 * Mobile Navigation & Responsive System for BioVerse (UI/UX Pro Max)
 * Injects Neo-Brutalist Mobile Hamburger Drawer & Bottom App Bar across pages.
 */

import { getProgress } from '../features/progress/progressService.js';
import { isAdmin } from './adminGuard.js';
import { confirmModal } from '../components/modal.js';
import { AuthService } from '../features/auth/authService.js';

let isDrawerOpen = false;

export function setupMobileNavigation(user, isLoggedIn) {
  insertMobileHeaderToggle();
  createMobileDrawer(user, isLoggedIn);
  createMobileBottomBar();
}

/**
 * Inserts the animated Neo-Brutalist hamburger toggle into the header
 */
function insertMobileHeaderToggle() {
  const header = document.querySelector('header');
  if (!header) return;

  if (document.getElementById('btn-mobile-nav-toggle')) {
    return;
  }

  // Find the right cluster in header
  const cluster = document.getElementById('header-user-cluster')
    || document.querySelector('header .admin-topbar-identity')
    || document.querySelector('header .flex.items-center.gap-space-md')
    || document.querySelector('header .flex.items-center.gap-3')
    || document.querySelector('header > div > div:last-child');

  if (!cluster) return;

  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'btn-mobile-nav-toggle';
  toggleBtn.type = 'button';
  toggleBtn.setAttribute('aria-label', 'Mở sổ tay điều hướng');
  toggleBtn.setAttribute('aria-expanded', 'false');
  toggleBtn.className = 'mobile-nav-hamburger-btn lg:hidden';
  toggleBtn.innerHTML = `
    <span class="hamburger-bar top"></span>
    <span class="hamburger-bar middle"></span>
    <span class="hamburger-bar bottom"></span>
  `;

  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMobileDrawer();
  });

  cluster.appendChild(toggleBtn);
}

/**
 * Creates the slide-out Mobile Navigation Drawer
 */
function createMobileDrawer(user, isLoggedIn) {
  if (document.getElementById('mobile-nav-drawer')) {
    updateDrawerUser(user, isLoggedIn);
    return;
  }

  const currentPath = window.location.pathname;
  const isHome = currentPath === '/' || currentPath.endsWith('index.html');
  const isBiology = currentPath.includes('/sinh-hoc') || currentPath.includes('sinh-hoc.html') || currentPath.includes('mo-hinh');
  const isPhysics = currentPath.includes('/vat-ly') || currentPath.includes('vat-ly.html');
  const isReactions = currentPath.includes('/phan-ung') || currentPath.includes('phan-ung.html');
  const isExams = currentPath.includes('/exams') || currentPath.includes('exams.html');
  const isPricing = currentPath.includes('/pricing') || currentPath.includes('pricing.html');
  const isProfile = currentPath.includes('/profile') || currentPath.includes('profile.html');
  const isAdminPage = currentPath.includes('/admin');

  const progress = getProgress();
  const xp = progress?.xp || 0;
  const streak = user?.currentStreak || 0;
  const userName = user?.name || user?.fullName || (isLoggedIn ? 'Nhà nghiên cứu' : 'Khách thăm');
  const userGrade = user?.grade ? `Lớp ${user.grade} THCS` : (isLoggedIn ? 'Học viên BioVerse' : 'Khám phá tự do');
  const userRole = isAdmin(user) ? 'Quản Trị Viên' : 'Học sinh';

  // Backdrop
  const backdrop = document.createElement('div');
  backdrop.id = 'mobile-nav-backdrop';
  backdrop.className = 'mobile-drawer-backdrop';
  backdrop.addEventListener('click', closeMobileDrawer);

  // Drawer Panel
  const drawer = document.createElement('aside');
  drawer.id = 'mobile-nav-drawer';
  drawer.className = 'mobile-nav-drawer sketch-paper';
  drawer.setAttribute('aria-label', 'Sổ tay điều hướng di động');
  drawer.innerHTML = `
    <!-- Washi Tape Accent -->
    <div class="mobile-drawer-washi">
      <span>SỔ TAY ĐIỀU HƯỚNG 📓</span>
    </div>

    <!-- Header & Close -->
    <div class="mobile-drawer-head">
      <div class="flex items-center gap-2">
        <div class="w-9 h-9 rounded-lg bg-white border-2 border-[#2d2d2d] sketch-shadow-sm flex items-center justify-center p-1 -rotate-2">
          <img src="/logo-icon.png" alt="BioVerse Logo" class="w-full h-full object-contain" />
        </div>
        <div class="flex flex-col">
          <span class="font-['Epilogue'] text-lg font-bold text-[#b71422] uppercase leading-tight">BioVerse</span>
          <span class="font-['Space_Grotesk'] text-[10px] text-[#5b403e] font-semibold">STEM THCS</span>
        </div>
      </div>
      <button type="button" id="btn-close-mobile-drawer" class="mobile-drawer-close-btn" aria-label="Đóng menu">
        <span class="material-symbols-outlined text-[20px]">close</span>
      </button>
    </div>

    <!-- User Identity Card -->
    <div class="mobile-drawer-user-card" id="mobile-drawer-user-card">
      <div class="flex items-center gap-3">
        <div class="w-12 h-12 rounded-full bg-[#ffe8d6] border-2 border-[#2d2d2d] sketch-shadow-sm flex items-center justify-center overflow-hidden shrink-0">
          ${user?.avatarUrl 
            ? `<img src="${user.avatarUrl}" alt="Avatar" class="w-full h-full object-cover" />`
            : `<span class="material-symbols-outlined text-[#b71422] text-[26px]">person</span>`
          }
        </div>
        <div class="flex flex-col min-w-0 flex-1">
          <span class="font-['Epilogue'] text-sm font-bold text-[#1b1c1c] truncate" id="drawer-user-name">${userName}</span>
          <span class="font-['Space_Grotesk'] text-[11px] text-[#00864c] font-bold" id="drawer-user-grade">${userGrade}</span>
          <span class="font-['Space_Grotesk'] text-[10px] text-[#76716a]">${userRole}</span>
        </div>
      </div>
      <div class="flex items-center gap-2 mt-3 pt-2.5 border-t border-dashed border-[#2d2d2d]/20">
        <div class="flex items-center gap-1 px-2.5 py-1 bg-[#fff9c4] border border-[#2d2d2d] rounded-full sketch-shadow-xs text-xs font-['Space_Grotesk'] font-bold">
          <span class="text-amber-500">⭐</span>
          <span id="drawer-user-xp">${xp.toLocaleString('vi-VN')} XP</span>
        </div>
        <div class="flex items-center gap-1 px-2.5 py-1 bg-[#ffedd5] border border-[#2d2d2d] rounded-full sketch-shadow-xs text-xs font-['Space_Grotesk'] font-bold">
          <span>🔥</span>
          <span id="drawer-user-streak">${streak} ngày</span>
        </div>
      </div>
    </div>

    <!-- Navigation Links -->
    <nav class="mobile-drawer-nav" aria-label="Liên kết chính">
      <a href="/" class="drawer-nav-item ${isHome ? 'is-active' : ''}">
        <div class="drawer-icon-wrap bg-[#fff1f2] text-[#b71422]">
          <span class="material-symbols-outlined">explore</span>
        </div>
        <div class="flex flex-col">
          <span class="drawer-nav-title">Khám Phá</span>
          <span class="drawer-nav-sub">Trang chủ & Mục tiêu học</span>
        </div>
      </a>

      <a href="/sinh-hoc" class="drawer-nav-item ${isBiology ? 'is-active' : ''}">
        <div class="drawer-icon-wrap bg-[#e8f5e9] text-[#00864c]">
          <span class="material-symbols-outlined">biotech</span>
        </div>
        <div class="flex flex-col">
          <span class="drawer-nav-title">Sinh Học 3D</span>
          <span class="drawer-nav-sub">Giải phẫu người & tế bào</span>
        </div>
      </a>

      <a href="/vat-ly" class="drawer-nav-item ${isPhysics ? 'is-active' : ''}">
        <div class="drawer-icon-wrap bg-[#fffaf0] text-[#dd6b20]">
          <span class="material-symbols-outlined">bolt</span>
        </div>
        <div class="flex flex-col">
          <span class="drawer-nav-title">Vật Lý 3D</span>
          <span class="drawer-nav-sub">Quang phổ, mạch điện & đòn bẩy</span>
        </div>
      </a>

      <a href="/phan-ung" class="drawer-nav-item ${isReactions ? 'is-active' : ''}">
        <div class="drawer-icon-wrap bg-[#f3e8ff] text-[#7c3aed]">
          <span class="material-symbols-outlined">science</span>
        </div>
        <div class="flex flex-col">
          <span class="drawer-nav-title">Phân Tử Hóa Học</span>
          <span class="drawer-nav-sub">Mô phỏng phản ứng 3D</span>
        </div>
      </a>

      <a href="/exams" class="drawer-nav-item ${isExams ? 'is-active' : ''}">
        <div class="drawer-icon-wrap bg-[#fef3c7] text-[#b45309]">
          <span class="material-symbols-outlined">edit_note</span>
        </div>
        <div class="flex flex-col">
          <span class="drawer-nav-title">Góc Học Tập</span>
          <span class="drawer-nav-sub">Luyện đề trắc nghiệm chuẩn KHTN</span>
        </div>
      </a>

      <a href="/pricing" class="drawer-nav-item ${isPricing ? 'is-active' : ''}">
        <div class="drawer-icon-wrap bg-[#e0f2fe] text-[#0284c7]">
          <span class="material-symbols-outlined">loyalty</span>
        </div>
        <div class="flex flex-col">
          <span class="drawer-nav-title">Gói Cước & Bản Quyền</span>
          <span class="drawer-nav-sub">Mở khóa mô hình 3D cao cấp</span>
        </div>
      </a>

      <a href="${isLoggedIn ? '/profile' : '/login'}" class="drawer-nav-item ${isProfile ? 'is-active' : ''}">
        <div class="drawer-icon-wrap bg-[#f3f4f6] text-[#374151]">
          <span class="material-symbols-outlined">account_circle</span>
        </div>
        <div class="flex flex-col">
          <span class="drawer-nav-title">${isLoggedIn ? 'Hồ Sơ Cá Nhân' : 'Đăng Nhập / Đăng Ký'}</span>
          <span class="drawer-nav-sub">${isLoggedIn ? 'Xem thành tích, đổi avatar' : 'Lưu tiến trình học tập'}</span>
        </div>
      </a>

      ${isAdmin(user) ? `
        <a href="/admin" class="drawer-nav-item ${isAdminPage ? 'is-active' : ''}">
          <div class="drawer-icon-wrap bg-[#ffedd5] text-[#c2410c]">
            <span class="material-symbols-outlined">admin_panel_settings</span>
          </div>
          <div class="flex flex-col">
            <span class="drawer-nav-title">Quản Trị Hệ Thống</span>
            <span class="drawer-nav-sub">Bảng điều hành giáo viên/admin</span>
          </div>
        </a>
      ` : ''}
    </nav>

    <!-- Drawer Footer Actions -->
    <div class="mobile-drawer-footer">
      ${isLoggedIn ? `
        <button type="button" id="btn-drawer-logout" class="drawer-logout-btn">
          <span class="material-symbols-outlined text-[18px]">logout</span>
          <span>Đăng xuất tài khoản</span>
        </button>
      ` : `
        <a href="/login" class="drawer-login-btn">
          <span class="material-symbols-outlined text-[18px]">login</span>
          <span>Đăng nhập ngay</span>
        </a>
      `}
      <p class="text-[10px] text-center text-[#76716a] font-['Space_Grotesk'] mt-2">
        BioVerse Sổ Tay STEM THCS • Bản quyền 2026
      </p>
    </div>
  `;

  document.body.appendChild(backdrop);
  document.body.appendChild(drawer);

  // Close handlers
  document.getElementById('btn-close-mobile-drawer')?.addEventListener('click', closeMobileDrawer);

  // Logout handler inside drawer
  document.getElementById('btn-drawer-logout')?.addEventListener('click', async () => {
    closeMobileDrawer();
    const confirmed = await confirmModal({
      title: 'Đăng xuất tài khoản',
      message: `Bạn có chắc muốn đăng xuất khỏi BioVerse?`,
      type: 'confirm',
      confirmText: 'Đăng xuất',
      cancelText: 'Ở lại',
      isDestructive: true,
      washiTag: 'XÁC THỰC'
    });
    if (confirmed) {
      await AuthService.logout();
    }
  });

  // Handle ESC key
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isDrawerOpen) {
      closeMobileDrawer();
    }
  });
}

/**
 * Updates user profile details inside drawer if already created
 */
function updateDrawerUser(user, isLoggedIn) {
  const nameEl = document.getElementById('drawer-user-name');
  const gradeEl = document.getElementById('drawer-user-grade');
  const xpEl = document.getElementById('drawer-user-xp');
  const streakEl = document.getElementById('drawer-user-streak');

  if (nameEl) nameEl.textContent = user?.name || user?.fullName || (isLoggedIn ? 'Nhà nghiên cứu' : 'Khách thăm');
  if (gradeEl) gradeEl.textContent = user?.grade ? `Lớp ${user.grade} THCS` : (isLoggedIn ? 'Học viên BioVerse' : 'Khám phá tự do');
  if (xpEl) {
    const progress = getProgress();
    xpEl.textContent = `${(progress?.xp || 0).toLocaleString('vi-VN')} XP`;
  }
  if (streakEl) streakEl.textContent = `${user?.currentStreak || 0} ngày`;
}

/**
 * Creates the thumb-friendly Mobile Bottom Navigation Bar
 */
function createMobileBottomBar() {
  const currentPath = window.location.pathname;

  // Suppress bottom bar on immersive 3D viewer (mo-hinh.html) to maximize canvas real-estate!
  if (currentPath.includes('mo-hinh') || currentPath.includes('moHinh')) {
    const existing = document.getElementById('mobile-bottom-bar');
    if (existing) existing.style.display = 'none';
    return;
  }

  if (document.getElementById('mobile-bottom-bar')) {
    return;
  }

  const isHome = currentPath === '/' || currentPath.endsWith('index.html');
  const isBiology = currentPath.includes('/sinh-hoc') || currentPath.includes('sinh-hoc.html');
  const isPhysics = currentPath.includes('/vat-ly') || currentPath.includes('vat-ly.html');
  const isReactions = currentPath.includes('/phan-ung') || currentPath.includes('phan-ung.html');
  const isExams = currentPath.includes('/exams') || currentPath.includes('exams.html');

  const bar = document.createElement('nav');
  bar.id = 'mobile-bottom-bar';
  bar.className = 'mobile-bottom-bar lg:hidden';
  bar.setAttribute('aria-label', 'Điều hướng nhanh thanh dưới');
  bar.innerHTML = `
    <a href="/" class="mobile-bottom-tab ${isHome ? 'is-active' : ''}" title="Trang chủ">
      <span class="material-symbols-outlined">explore</span>
      <span class="tab-label">Khám Phá</span>
    </a>

    <a href="/sinh-hoc" class="mobile-bottom-tab ${isBiology ? 'is-active' : ''}" title="Sinh Học 3D">
      <span class="material-symbols-outlined">biotech</span>
      <span class="tab-label">Sinh Học</span>
    </a>

    <a href="/vat-ly" class="mobile-bottom-tab ${isPhysics ? 'is-active' : ''}" title="Vật Lý 3D">
      <span class="material-symbols-outlined">bolt</span>
      <span class="tab-label">Vật Lý</span>
    </a>

    <a href="/phan-ung" class="mobile-bottom-tab ${isReactions ? 'is-active' : ''}" title="Phân Tử Hóa Học">
      <span class="material-symbols-outlined">science</span>
      <span class="tab-label">Phân Tử</span>
    </a>

    <a href="/exams" class="mobile-bottom-tab ${isExams ? 'is-active' : ''}" title="Góc Học Tập">
      <span class="material-symbols-outlined">edit_note</span>
      <span class="tab-label">Luyện Đề</span>
    </a>
  `;

  document.body.appendChild(bar);

  // If inside an active exam session, hide the bottom bar to avoid distraction
  const takeExamView = document.getElementById('view-take-exam');
  if (takeExamView) {
    const observer = new MutationObserver(() => {
      const isTaking = !takeExamView.hidden && takeExamView.style.display !== 'none';
      bar.style.display = isTaking ? 'none' : '';
    });
    observer.observe(takeExamView, { attributes: true, attributeFilter: ['style', 'hidden'] });
  }
}

export function openMobileDrawer() {
  const drawer = document.getElementById('mobile-nav-drawer');
  const backdrop = document.getElementById('mobile-nav-backdrop');
  const toggleBtn = document.getElementById('btn-mobile-nav-toggle');

  if (!drawer || !backdrop) return;

  isDrawerOpen = true;
  drawer.classList.add('is-open');
  backdrop.classList.add('is-open');
  toggleBtn?.classList.add('is-active');
  toggleBtn?.setAttribute('aria-expanded', 'true');
  document.body.classList.add('mobile-drawer-locked');
}

export function closeMobileDrawer() {
  const drawer = document.getElementById('mobile-nav-drawer');
  const backdrop = document.getElementById('mobile-nav-backdrop');
  const toggleBtn = document.getElementById('btn-mobile-nav-toggle');

  if (!drawer || !backdrop) return;

  isDrawerOpen = false;
  drawer.classList.remove('is-open');
  backdrop.classList.remove('is-open');
  toggleBtn?.classList.remove('is-active');
  toggleBtn?.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('mobile-drawer-locked');
}

export function toggleMobileDrawer() {
  if (isDrawerOpen) {
    closeMobileDrawer();
  } else {
    openMobileDrawer();
  }
}
