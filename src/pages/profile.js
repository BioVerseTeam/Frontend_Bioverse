/**
 * Profile Page Logic for BioVerse (Scientific Sketchbook)
 * Handles user profile display, profile updating, avatar upload, streak tracking, and password change
 */

import gsap from 'gsap';
import { AuthService } from '../features/auth/authService.js';
import { setupNavbarAuth } from '../utils/authNavbar.js';
import { getProgress } from '../features/progress/progressService.js';
import { showToast, confirmModal } from '../components/modal.js';
import {
  fetchUserProfile,
  updateUserProfile,
  uploadAvatar,
  requestChangePasswordOtp,
  changeUserPassword
} from '../api/userProfileApi.js';

// 12 Danh Hiệu Khoa Học STEM BioVerse (Thiết kế mở rộng theo chuẩn RPG / Gamification)
const STEM_BADGES = [
  // Nhóm 1: Khởi đầu & Nhập môn (Starter)
  {
    id: 'badge-starter',
    name: 'Tân Binh BioVerse',
    icon: '🌱',
    filterTag: 'starter',
    categoryName: 'Nhập môn STEM',
    desc: 'Đăng ký tài khoản và gia nhập phòng nghiên cứu khoa học BioVerse.',
    bgUnlocked: 'bg-[#e8f5e9]',
    borderUnlocked: 'border-[#2e7d32]',
    checkUnlocked: () => true,
    progressText: () => 'Đã hoàn thành 100%',
    progressPct: () => 100
  },
  {
    id: 'badge-profile-ready',
    name: 'Hồ Sơ Nghiên Cứu',
    icon: '🪪',
    filterTag: 'starter',
    categoryName: 'Thông tin cá nhân',
    desc: 'Cập nhật đầy đủ họ tên, ngày sinh, số điện thoại và ảnh đại diện.',
    bgUnlocked: 'bg-[#e0f2fe]',
    borderUnlocked: 'border-[#0284c7]',
    checkUnlocked: (u) => Boolean(u?.fullName && u?.dateOfBirth && u?.avatarUrl),
    progressText: (u) => {
      let count = 0;
      if (u?.fullName) count++;
      if (u?.dateOfBirth) count++;
      if (u?.avatarUrl) count++;
      return count >= 3 ? 'Hoàn tất hồ sơ 3/3' : `Đã điền ${count}/3 mục`;
    },
    progressPct: (u) => {
      let count = 0;
      if (u?.fullName) count++;
      if (u?.dateOfBirth) count++;
      if (u?.avatarUrl) count++;
      return Math.round((count / 3) * 100);
    }
  },

  // Nhóm 2: Chuỗi ngày học tập (Streak)
  {
    id: 'badge-streak-fire',
    name: 'Ngọn Lửa Kiên Trì',
    icon: '🔥',
    filterTag: 'streak',
    categoryName: 'Chuỗi học tập',
    desc: 'Duy trì thói quen học tập liên tục từ 3 ngày trở lên.',
    bgUnlocked: 'bg-[#ffedd5]',
    borderUnlocked: 'border-[#ea580c]',
    checkUnlocked: (u) => (u?.currentStreak || 0) >= 3 || (u?.longestStreak || 0) >= 3,
    progressText: (u) => {
      const best = Math.max(u?.currentStreak || 0, u?.longestStreak || 0);
      return best >= 3 ? `Đã hoàn thành (${best} ngày)` : `${best}/3 ngày streak`;
    },
    progressPct: (u) => {
      const best = Math.max(u?.currentStreak || 0, u?.longestStreak || 0);
      return Math.min(100, Math.round((best / 3) * 100));
    }
  },
  {
    id: 'badge-streak-week',
    name: 'Chiến Binh 7 Ngày',
    icon: '⚡',
    filterTag: 'streak',
    categoryName: 'Chuỗi học tập',
    desc: 'Giữ vững nhịp học suốt 7 ngày trong tuần không gián đoạn.',
    bgUnlocked: 'bg-[#f3e8ff]',
    borderUnlocked: 'border-[#9333ea]',
    checkUnlocked: (u) => (u?.longestStreak || 0) >= 7,
    progressText: (u) => {
      const best = u?.longestStreak || 0;
      return best >= 7 ? `Đã đạt kỷ lục (${best} ngày)` : `${best}/7 ngày streak`;
    },
    progressPct: (u) => {
      const best = u?.longestStreak || 0;
      return Math.min(100, Math.round((best / 7) * 100));
    }
  },
  {
    id: 'badge-streak-month',
    name: 'Học Giả Bất Bại',
    icon: '🏆',
    filterTag: 'streak',
    categoryName: 'Kỷ lục chuỗi',
    desc: 'Chinh phục chuỗi học tập bền bỉ đạt mốc 14 ngày liên tiếp.',
    bgUnlocked: 'bg-[#fff9c4]',
    borderUnlocked: 'border-[#ca8a04]',
    checkUnlocked: (u) => (u?.longestStreak || 0) >= 14,
    progressText: (u) => {
      const best = u?.longestStreak || 0;
      return best >= 14 ? `Xuất sắc (${best} ngày)` : `${best}/14 ngày streak`;
    },
    progressPct: (u) => {
      const best = u?.longestStreak || 0;
      return Math.min(100, Math.round((best / 14) * 100));
    }
  },

  // Nhóm 3: Thực nghiệm phòng lab 3D (Lab)
  {
    id: 'badge-microscope',
    name: 'Kính Hiển Vi Vàng',
    icon: '🔬',
    filterTag: 'lab',
    categoryName: 'Thực nghiệm 3D',
    desc: 'Khám phá bài học mô hình 3D sinh học đầu tiên trong phòng thí nghiệm.',
    bgUnlocked: 'bg-[#fff9c4]',
    borderUnlocked: 'border-[#ca8a04]',
    checkUnlocked: (u, p) => (p?.modelsExplored?.length || 0) > 0 || (p?.xp || 0) >= 100,
    progressText: (u, p) => {
      const explored = p?.modelsExplored?.length || 0;
      return explored > 0 || (p?.xp || 0) >= 100 ? 'Đã khám phá mô hình' : 'Chưa xem mô hình nào';
    },
    progressPct: (u, p) => ((p?.modelsExplored?.length || 0) > 0 || (p?.xp || 0) >= 100) ? 100 : 0
  },
  {
    id: 'badge-anatomy-master',
    name: 'Nhà Giải Phẫu Nhí',
    icon: '🫀',
    filterTag: 'lab',
    categoryName: 'Thực nghiệm 3D',
    desc: 'Tương tác và khám phá từ 3 mô hình cơ quan cơ thể người trở lên.',
    bgUnlocked: 'bg-[#fee2e2]',
    borderUnlocked: 'border-[#dc2626]',
    checkUnlocked: (u, p) => (p?.modelsExplored?.length || 0) >= 3,
    progressText: (u, p) => {
      const count = p?.modelsExplored?.length || 0;
      return count >= 3 ? `Đã khám phá (${count}/3 mô hình)` : `Đã xem: ${count}/3 mô hình`;
    },
    progressPct: (u, p) => {
      const count = p?.modelsExplored?.length || 0;
      return Math.min(100, Math.round((count / 3) * 100));
    }
  },
  {
    id: 'badge-chemistry-lab',
    name: 'Phù Thủy Phản Ứng',
    icon: '🧪',
    filterTag: 'lab',
    categoryName: 'Hóa sinh học',
    desc: 'Thực nghiệm tương tác hoạt ảnh phản ứng phân tử hóa học.',
    bgUnlocked: 'bg-[#f3e8ff]',
    borderUnlocked: 'border-[#7c3aed]',
    checkUnlocked: (u, p) => (p?.modelsExplored || []).includes('reaction') || (p?.xp || 0) >= 180,
    progressText: (u, p) => {
      const hasReaction = (p?.modelsExplored || []).includes('reaction') || (p?.xp || 0) >= 180;
      return hasReaction ? 'Đã thực hành phản ứng' : 'Chưa thực nghiệm phản ứng';
    },
    progressPct: (u, p) => ((p?.modelsExplored || []).includes('reaction') || (p?.xp || 0) >= 180) ? 100 : 0
  },

  // Nhóm 4: Cột mốc XP & Cấp độ (XP)
  {
    id: 'badge-xp-200',
    name: 'Học Viên Khám Phá',
    icon: '⭐',
    filterTag: 'xp',
    categoryName: 'Cấp độ XP',
    desc: 'Tích lũy từ 200 XP qua các bài học và luyện tập trắc nghiệm.',
    bgUnlocked: 'bg-[#e8f5e9]',
    borderUnlocked: 'border-[#2e7d32]',
    checkUnlocked: (u, p) => (p?.xp || 0) >= 200,
    progressText: (u, p) => {
      const xp = p?.xp || 0;
      return xp >= 200 ? `Đạt mốc (${xp} XP)` : `${xp}/200 XP`;
    },
    progressPct: (u, p) => Math.min(100, Math.round(((p?.xp || 0) / 200) * 100))
  },
  {
    id: 'badge-xp-500',
    name: 'Nhà Di Truyền Học',
    icon: '🧬',
    filterTag: 'xp',
    categoryName: 'Cấp độ XP',
    desc: 'Chinh phục cột mốc 500 XP nghiên cứu khoa học STEM.',
    bgUnlocked: 'bg-[#e0f2fe]',
    borderUnlocked: 'border-[#0284c7]',
    checkUnlocked: (u, p) => (p?.xp || 0) >= 500,
    progressText: (u, p) => {
      const xp = p?.xp || 0;
      return xp >= 500 ? `Đạt mốc (${xp} XP)` : `${xp}/500 XP`;
    },
    progressPct: (u, p) => Math.min(100, Math.round(((p?.xp || 0) / 500) * 100))
  },
  {
    id: 'badge-xp-1000',
    name: 'Chuyên Viên Tài Ba',
    icon: '🌟',
    filterTag: 'xp',
    categoryName: 'Cấp độ XP',
    desc: 'Đạt từ 1.000 XP để khẳng định kỹ năng nghiên cứu xuất sắc.',
    bgUnlocked: 'bg-[#ffedd5]',
    borderUnlocked: 'border-[#ea580c]',
    checkUnlocked: (u, p) => (p?.xp || 0) >= 1000,
    progressText: (u, p) => {
      const xp = p?.xp || 0;
      return xp >= 1000 ? `Đạt mốc (${xp} XP)` : `${xp}/1.000 XP`;
    },
    progressPct: (u, p) => Math.min(100, Math.round(((p?.xp || 0) / 1000) * 100))
  },
  {
    id: 'badge-xp-2500',
    name: 'Viện Sĩ BioVerse',
    icon: '👑',
    filterTag: 'xp',
    categoryName: 'Huyền thoại STEM',
    desc: 'Danh hiệu danh giá nhất dành cho nhà khoa học trẻ tích lũy trên 2.500 XP.',
    bgUnlocked: 'bg-[#fee2e2]',
    borderUnlocked: 'border-[#dc2626]',
    checkUnlocked: (u, p) => (p?.xp || 0) >= 2500,
    progressText: (u, p) => {
      const xp = p?.xp || 0;
      return xp >= 2500 ? `Huyền thoại (${xp} XP)` : `${xp}/2.500 XP`;
    },
    progressPct: (u, p) => Math.min(100, Math.round(((p?.xp || 0) / 2500) * 100))
  }
];

let activeBadgeFilter = 'all';
let activeBookCategory = 'all';
const PINNED_BADGES_KEY = 'bioverse_user_pinned_badges';

function getPinnedBadges(user, progress) {
  try {
    const raw = localStorage.getItem(PINNED_BADGES_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.slice(0, 3);
      }
    }
  } catch (e) {
    console.warn('Error reading pinned badges:', e);
  }

  // Mặc định cho người dùng mới (chưa từng chỉnh sửa cấu hình ghim):
  // Lấy tối đa 3 huy hiệu đã đạt được hoặc 3 huy hiệu đầu tiên
  const unlocked = STEM_BADGES.filter(b => b.checkUnlocked(user, progress)).map(b => b.id);
  if (unlocked.length > 0) {
    return unlocked.slice(0, 3);
  }
  return STEM_BADGES.slice(0, 3).map(b => b.id);
}

function savePinnedBadges(pinnedIds) {
  try {
    localStorage.setItem(PINNED_BADGES_KEY, JSON.stringify(pinnedIds.slice(0, 3)));
  } catch (e) {
    console.warn('Error saving pinned badges:', e);
  }
}

let currentUserData = null;
let pendingAvatarUrl = null;
let otpCountdownTimer = null;
let hasEntranceAnimated = false;

// Avatar interactive cropper state
const cropper = {
  image: null,
  minScale: 1,
  scale: 1,
  zoom: 1,
  rotation: 0, // 0, 90, 180, 270
  offsetX: 0,
  offsetY: 0,
  dragging: false,
  lastX: 0,
  lastY: 0,
  cropDiameter: 440 // diameter of crop circle on 600x600 canvas
};

function initProfilePage() {
  try {
    setupNavbarAuth();
  } catch (navErr) {
    console.warn('Navbar auth setup warning:', navErr);
  }

  // Guard: must be logged in
  if (!AuthService.isLoggedIn()) {
    showToast('Vui lòng đăng nhập để xem trang hồ sơ cá nhân.', 'warning');
    setTimeout(() => {
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
    }, 1200);
    return;
  }

  // 1. Render tức thì từ bộ nhớ đệm (localStorage) - Không để UI bị treo ở trạng thái "Đang tải..."
  const cachedUser = AuthService.getUser();
  if (cachedUser) {
    currentUserData = cachedUser;
    pendingAvatarUrl = cachedUser.avatarUrl || null;
    try {
      renderProfile(cachedUser);
      triggerPageEntranceOnce();
    } catch (renderErr) {
      console.warn('Lỗi hiển thị dữ liệu lưu tạm:', renderErr);
    }
  }

  // 2. Khởi tạo an toàn các module tương tác
  try { initTabSwitching(); } catch (e) { console.error('initTabSwitching error:', e); }
  try { initStemBadges(); } catch (e) { console.error('initStemBadges error:', e); }
  try { initAvatarUpload(); } catch (e) { console.error('initAvatarUpload error:', e); }
  try { initAvatarCropper(); } catch (e) { console.error('initAvatarCropper error:', e); }
  try { initEditForm(); } catch (e) { console.error('initEditForm error:', e); }
  try { initPasswordForm(); } catch (e) { console.error('initPasswordForm error:', e); }

  // 3. Đồng bộ dữ liệu mới nhất từ máy chủ ngầm trong nền
  loadUserProfile();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initProfilePage);
} else {
  initProfilePage();
}

/**
 * Tải dữ liệu hồ sơ cá nhân từ API
 */
async function loadUserProfile() {
  try {
    const data = await fetchUserProfile();
    if (!data) throw new Error('Không nhận được dữ liệu người dùng');

    currentUserData = data;
    pendingAvatarUrl = data.avatarUrl || null;
    renderProfile(data);
    triggerPageEntranceOnce();
  } catch (err) {
    console.warn('Lỗi tải hồ sơ cá nhân mới từ API:', err);
    // Fallback to local stored user if network fails
    const localUser = AuthService.getUser();
    if (localUser) {
      currentUserData = localUser;
      pendingAvatarUrl = localUser.avatarUrl || null;
      renderProfile(localUser);
      triggerPageEntranceOnce();
    } else {
      showToast(err.message || 'Không thể tải thông tin cá nhân', 'error');
      triggerPageEntranceOnce();
    }
  }
}

/**
 * Hiển thị dữ liệu hồ sơ lên giao diện
 */
function renderProfile(user) {
  const name = user.fullName || user.name || user.email?.split('@')[0] || 'Nhà nghiên cứu';
  const roleName = user.role === 'ADMIN' ? 'Quản Trị Viên' : 'Học Sinh THCS';
  const grade = user.grade ? String(user.grade) : '8';
  const streak = user.currentStreak ?? 0;
  const longest = user.longestStreak ?? 0;

  // Header and Hero elements
  const displayNameEl = document.getElementById('profile-display-name');
  const displayEmailEl = document.getElementById('profile-display-email');
  const roleBadgeEl = document.getElementById('profile-badge-role');
  const verifiedBadgeEl = document.getElementById('profile-badge-verified');

  if (displayNameEl) displayNameEl.textContent = name;
  if (displayEmailEl) {
    displayEmailEl.innerHTML = `
      <span class="material-symbols-outlined text-[18px]">mail</span>
      <span>${escapeHtml(user.email || '')}</span>
    `;
  }
  if (roleBadgeEl) {
    roleBadgeEl.textContent = roleName;
    if (user.role === 'ADMIN') {
      roleBadgeEl.className = 'px-2.5 py-0.5 rounded-full border-2 border-[#2d2d2d] bg-[#ffcdd2] text-[#b71422] font-label-sm text-xs font-bold sketch-shadow-sm transform -rotate-1';
    }
  }
  if (verifiedBadgeEl) {
    verifiedBadgeEl.classList.toggle('hidden', !user.emailVerified);
    verifiedBadgeEl.classList.toggle('inline-flex', !!user.emailVerified);
  }

  // Quick stats
  const statStreak = document.getElementById('stat-current-streak');
  const statLongest = document.getElementById('stat-longest-streak');
  const statXp = document.getElementById('stat-total-xp');
  const statGrade = document.getElementById('stat-current-grade');

  const progress = getProgress();
  animateStatValue(statStreak, Number(streak) || 0);
  animateStatValue(statLongest, Number(longest) || 0);
  animateStatValue(statXp, Number(progress.xp) || 0);
  if (statGrade) statGrade.textContent = String(grade);

  // Avatar image (shows pending avatar if selected, or user.avatarUrl)
  renderAvatarImage(pendingAvatarUrl || user.avatarUrl);
  renderStemBadges(user);
  updateUnsavedUI();

  // Fill Tab 1 Form fields
  const inputName = document.getElementById('input-fullname');
  const inputEmail = document.getElementById('input-email');
  const inputPhone = document.getElementById('input-phone');
  const inputDob = document.getElementById('input-dob');

  if (inputName) inputName.value = user.fullName || user.name || '';
  if (inputEmail) inputEmail.value = user.email || '';
  if (inputPhone) inputPhone.value = user.phone || '';
  if (inputDob) inputDob.value = user.dateOfBirth || '';

  // Grade radio
  const gradeInputs = document.querySelectorAll('input[name="profile-grade"]');
  gradeInputs.forEach(input => {
    input.checked = input.value === grade;
  });

  // Gender radio
  const genderInputs = document.querySelectorAll('input[name="profile-gender"]');
  genderInputs.forEach(input => {
    input.checked = input.value === user.gender;
  });

  // Fill Tab 2: Streak & Level Info
  const detailStreak = document.getElementById('detail-streak-days');
  const detailLongest = document.getElementById('detail-longest-streak');
  const detailLastCheckin = document.getElementById('detail-last-checkin');
  const streakBadge = document.getElementById('streak-today-status-badge');

  if (detailStreak) detailStreak.textContent = streak;
  if (detailLongest) detailLongest.textContent = `${longest} ngày`;
  if (detailLastCheckin) {
    detailLastCheckin.textContent = user.lastCheckInDate ? formatDateVi(user.lastCheckInDate) : 'Hôm nay';
  }
  if (streakBadge) {
    if (user.checkedInToday) {
      streakBadge.className = 'px-3 py-1 rounded-full border-2 border-[#00864c] font-label-sm text-xs bg-[#e8f5e9] text-[#00864c] font-bold';
      streakBadge.textContent = '✅ Đã điểm danh hôm nay';
    } else {
      streakBadge.className = 'px-3 py-1 rounded-full border-2 border-[#d97706] font-label-sm text-xs bg-[#fff9c4] text-[#b45309] font-bold';
      streakBadge.textContent = '⏳ Chưa điểm danh hôm nay';
    }
  }

  renderWeeklyStreak(user);
  renderActivityHeatmap(user);
  initHeatmapControls(user);
  renderLevelProgress(progress.xp);
}

/**
 * Hiển thị avatar ảnh hoặc fallback icon
 */
function renderAvatarImage(avatarUrl) {
  const imgEl = document.getElementById('profile-avatar-img');
  const fallbackEl = document.getElementById('profile-avatar-fallback');
  const lightboxImg = document.getElementById('avatar-lightbox-img');
  const lightboxFallback = document.getElementById('avatar-lightbox-fallback');
  const lightboxName = document.getElementById('avatar-lightbox-name');
  const lightboxRole = document.getElementById('avatar-lightbox-role');

  const fullName = currentUserData?.fullName || currentUserData?.name || currentUserData?.email?.split('@')[0] || 'Nhà nghiên cứu';
  const roleName = currentUserData?.role === 'ADMIN' ? 'Quản Trị Viên' : 'Học Sinh THCS';

  if (avatarUrl && avatarUrl.trim()) {
    if (imgEl) {
      imgEl.src = avatarUrl;
      imgEl.classList.remove('hidden');
    }
    if (fallbackEl) fallbackEl.classList.add('hidden');

    if (lightboxImg) {
      lightboxImg.src = avatarUrl;
      lightboxImg.classList.remove('hidden');
    }
    if (lightboxFallback) lightboxFallback.classList.add('hidden');
  } else {
    if (imgEl) imgEl.classList.add('hidden');
    if (fallbackEl) {
      const initial = fullName.charAt(0).toUpperCase();
      fallbackEl.innerHTML = `<span>${initial}</span>`;
      fallbackEl.classList.remove('hidden');
    }

    if (lightboxImg) lightboxImg.classList.add('hidden');
    if (lightboxFallback) {
      const initial = fullName.charAt(0).toUpperCase();
      lightboxFallback.innerHTML = `<span>${initial}</span>`;
      lightboxFallback.classList.remove('hidden');
    }
  }

  if (lightboxName) lightboxName.textContent = fullName;
  if (lightboxRole) lightboxRole.textContent = roleName;
}

/**
 * Lưu trực tiếp ảnh đại diện vào cơ sở dữ liệu qua API (chốt đổi luôn)
 * Không cần người dùng phải bấm "Lưu Thay Đổi" của form bên dưới
 */
async function saveAndApplyAvatar(url, successMsg = 'Đã cập nhật ảnh đại diện mới thành công!') {
  try {
    await updateUserProfile({ avatarUrl: url });
    if (currentUserData) currentUserData.avatarUrl = url;
    pendingAvatarUrl = url;
    await AuthService.updateProfile({ avatarUrl: url });

    renderAvatarImage(url);
    updateUnsavedUI();

    // Đồng bộ ngay với Navbar
    window.dispatchEvent(new CustomEvent('bioverse_profile_updated', {
      detail: currentUserData
    }));

    // GSAP hiệu ứng nảy vòng tròn avatar
    const avatarCircle = document.getElementById('avatar-circle-display');
    if (avatarCircle) {
      gsap.fromTo(avatarCircle, 
        { scale: 0.86, rotate: -5 }, 
        { scale: 1, rotate: 0, duration: 0.45, ease: 'back.out(2.5)' }
      );
    }

    showToast(successMsg, 'success');
  } catch (err) {
    console.error('Lỗi cập nhật ảnh đại diện:', err);
    showToast(err.message || 'Không thể cập nhật ảnh đại diện lúc này', 'error');
  }
}

/**
 * Mở modal chọn tác vụ: Xem avatar hoặc chỉnh sửa
 */
function openAvatarActionModal() {
  const modal = document.getElementById('avatar-action-modal');
  if (!modal) return;
  modal.hidden = false;
  gsap.fromTo(modal, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2, ease: 'power2.out' });
  const card = modal.querySelector('.avatar-action-card');
  if (card) {
    gsap.fromTo(card, { y: 20, scale: 0.96 }, { y: 0, scale: 1, duration: 0.28, ease: 'back.out(1.5)' });
  }
}

/**
 * Đóng modal chọn tác vụ
 */
function closeAvatarActionModal() {
  const modal = document.getElementById('avatar-action-modal');
  if (!modal || modal.hidden) return;
  gsap.to(modal, {
    autoAlpha: 0,
    duration: 0.16,
    ease: 'power2.in',
    onComplete: () => {
      modal.hidden = true;
      gsap.set(modal, { clearProps: 'all' });
      const card = modal.querySelector('.avatar-action-card');
      if (card) gsap.set(card, { clearProps: 'all' });
    }
  });
}

/**
 * Mở modal xem avatar phóng to (Lightbox)
 */
function openAvatarLightboxModal() {
  const modal = document.getElementById('avatar-lightbox-modal');
  if (!modal) return;
  renderAvatarImage(currentUserData?.avatarUrl || pendingAvatarUrl);
  modal.hidden = false;
  gsap.fromTo(modal, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2, ease: 'power2.out' });
  const card = modal.querySelector('.avatar-lightbox-card');
  if (card) {
    gsap.fromTo(card, { y: 20, scale: 0.95 }, { y: 0, scale: 1, duration: 0.3, ease: 'back.out(1.5)' });
  }
}

/**
 * Đóng modal xem avatar phóng to
 */
function closeAvatarLightboxModal() {
  const modal = document.getElementById('avatar-lightbox-modal');
  if (!modal || modal.hidden) return;
  gsap.to(modal, {
    autoAlpha: 0,
    duration: 0.16,
    ease: 'power2.in',
    onComplete: () => {
      modal.hidden = true;
      gsap.set(modal, { clearProps: 'all' });
      const card = modal.querySelector('.avatar-lightbox-card');
      if (card) gsap.set(card, { clearProps: 'all' });
    }
  });
}



/**
 * Cập nhật nhãn báo thay đổi chưa lưu
 */
function updateUnsavedUI() {
  const originalUrl = currentUserData?.avatarUrl || null;
  const isAvatarChanged = (pendingAvatarUrl || null) !== (originalUrl || null);

  const heroBadge = document.getElementById('hero-avatar-unsaved-badge');
  if (heroBadge) {
    if (isAvatarChanged) {
      if (heroBadge.classList.contains('hidden')) {
        heroBadge.classList.remove('hidden');
        heroBadge.classList.add('flex');
        gsap.fromTo(heroBadge, 
          { scale: 0, autoAlpha: 0, rotation: -15 }, 
          { scale: 1, autoAlpha: 1, rotation: 0, duration: 0.35, ease: 'back.out(2.5)' }
        );
      }
    } else {
      if (!heroBadge.classList.contains('hidden')) {
        gsap.to(heroBadge, {
          scale: 0,
          autoAlpha: 0,
          duration: 0.2,
          onComplete: () => {
            heroBadge.classList.add('hidden');
            heroBadge.classList.remove('flex');
            gsap.set(heroBadge, { clearProps: 'all' });
          }
        });
      }
    }
  }

  const tabBadge = document.getElementById('avatar-unsaved-badge');
  if (tabBadge) {
    if (isAvatarChanged) {
      if (tabBadge.classList.contains('hidden')) {
        tabBadge.classList.remove('hidden');
        tabBadge.classList.add('inline-flex');
        gsap.fromTo(tabBadge, 
          { scale: 0, autoAlpha: 0 }, 
          { scale: 1, autoAlpha: 1, duration: 0.3, ease: 'back.out(2)' }
        );
      }
    } else {
      if (!tabBadge.classList.contains('hidden')) {
        gsap.to(tabBadge, {
          scale: 0,
          autoAlpha: 0,
          duration: 0.2,
          onComplete: () => {
            tabBadge.classList.add('hidden');
            tabBadge.classList.remove('inline-flex');
            gsap.set(tabBadge, { clearProps: 'all' });
          }
        });
      }
    }
  }

  const hint = document.getElementById('profile-unsaved-hint');
  if (hint) {
    if (isAvatarChanged) {
      if (hint.classList.contains('hidden')) {
        hint.classList.remove('hidden');
        hint.classList.add('flex');
        gsap.fromTo(hint, 
          { y: -8, autoAlpha: 0 }, 
          { y: 0, autoAlpha: 1, duration: 0.28, ease: 'power2.out' }
        );
      }
    } else {
      hint.classList.add('hidden');
      hint.classList.remove('flex');
    }
  }
}

/**
 * Khởi tạo chuyển Tab với GSAP mượt mà
 */
function initTabSwitching() {
  const tabs = document.querySelectorAll('.tab-btn');
  let isTransitioning = false;

  // Nút lối tắt trong tab Tổng quan → chuyển sang tab tương ứng
  document.querySelectorAll('[data-goto-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = document.querySelector(`.tab-btn[data-tab="${btn.dataset.gotoTab}"]`);
      target?.click();
    });
  });

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetId = tab.dataset.tab;
      if (tab.classList.contains('active') || isTransitioning) return;

      isTransitioning = true;

      // Nút xúc giác bật nhẹ với GSAP
      gsap.fromTo(tab, 
        { scale: 0.95 }, 
        { scale: 1, duration: 0.22, ease: 'back.out(2)', clearProps: 'transform' }
      );

      // Cập nhật trạng thái active của buttons
      tabs.forEach(t => {
        t.classList.remove('active');
      });
      tab.classList.add('active');

      // Tìm pane hiện tại đang hiển thị
      const currentPane = document.querySelector('.tab-pane:not(.hidden)');
      const targetPane = document.getElementById(targetId);

      if (currentPane && currentPane !== targetPane) {
        gsap.to(currentPane, {
          autoAlpha: 0,
          y: -8,
          duration: 0.16,
          ease: 'power2.in',
          onComplete: () => {
            currentPane.classList.add('hidden');
            currentPane.classList.remove('block');
            gsap.set(currentPane, { clearProps: 'all' });

            if (targetPane) {
              targetPane.classList.remove('hidden');
              targetPane.classList.add('block');
              gsap.fromTo(targetPane, 
                { autoAlpha: 0, y: 12 }, 
                { 
                  autoAlpha: 1, 
                  y: 0, 
                  duration: 0.26, 
                  ease: 'power2.out',
                  onComplete: () => {
                    isTransitioning = false;
                  }
                }
              );

              // Hiệu ứng thanh tiến trình XP khi mở tab Chuỗi học tập hoặc Kho danh hiệu
              if (targetId === 'tab-streak') {
                const progress = getProgress();
                renderLevelProgress(progress.xp, true);
              } else if (targetId === 'tab-overview') {
                animateOverviewPane();
              } else if (targetId === 'tab-badges') {
                renderBadgesGallery(currentUserData || AuthService.getUser(), true);
              }
            } else {
              isTransitioning = false;
            }
          }
        });
      } else if (targetPane) {
        targetPane.classList.remove('hidden');
        targetPane.classList.add('block');
        if (targetId === 'tab-badges') {
          renderBadgesGallery(currentUserData || AuthService.getUser(), true);
        }
        gsap.fromTo(targetPane, 
          { autoAlpha: 0, y: 12 }, 
          { 
            autoAlpha: 1, 
            y: 0, 
            duration: 0.26, 
            ease: 'power2.out',
            onComplete: () => {
              isTransitioning = false;
            }
          }
        );
      } else {
        isTransitioning = false;
      }
    });
  });
}

/**
 * Khởi tạo sự kiện đóng mở Badge Detail Modal, Sổ Tay Danh Hiệu 3D & Bộ lọc
 */
function initStemBadges() {
  // 1. Detail Modal
  const detailModal = document.getElementById('badge-detail-modal');
  const detailCloseBtn = document.getElementById('badge-modal-close-btn');
  const detailOkBtn = document.getElementById('badge-modal-ok-btn');

  const closeDetailModal = () => {
    if (!detailModal || detailModal.hidden) return;
    document.body.style.overflow = '';
    if (typeof gsap !== 'undefined') {
      gsap.to(detailModal, {
        autoAlpha: 0,
        duration: 0.16,
        ease: 'power2.in',
        onComplete: () => {
          detailModal.setAttribute('hidden', '');
          detailModal.hidden = true;
          detailModal.style.display = 'none';
          gsap.set(detailModal, { clearProps: 'all' });
        }
      });
    } else {
      detailModal.setAttribute('hidden', '');
      detailModal.hidden = true;
      detailModal.style.display = 'none';
    }
  };

  detailCloseBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    closeDetailModal();
  });
  detailOkBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    closeDetailModal();
  });
  detailModal?.addEventListener('click', (e) => {
    if (e.target === detailModal) closeDetailModal();
  });

  // 2. 3D Open Book Modal Controls
  const bookModal = document.getElementById('badge-book-modal');
  const bookCloseBtn = document.getElementById('badge-book-close-btn');
  const openBookPillBtn = document.getElementById('btn-open-badge-book-pill');
  const openBookBtn = document.getElementById('btn-open-badge-book');
  const openBookFromTabBtn = document.getElementById('btn-open-book-from-tab');

  openBookPillBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    openBadgeBookModal();
  });
  openBookBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    openBadgeBookModal();
  });
  openBookFromTabBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    openBadgeBookModal();
  });
  bookCloseBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    closeBadgeBookModal();
  });
  bookModal?.addEventListener('click', (e) => {
    if (e.target === bookModal) closeBadgeBookModal();
  });

  // Global ESC key listener to close modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const bookModalEl = document.getElementById('badge-book-modal');
      if (bookModalEl && !bookModalEl.hidden && bookModalEl.style.display !== 'none') {
        closeBadgeBookModal();
        return;
      }
      const detailModalEl = document.getElementById('badge-detail-modal');
      if (detailModalEl && !detailModalEl.hidden && detailModalEl.style.display !== 'none') {
        closeDetailModal();
        return;
      }
    }
  });

  // Category filter tabs inside the book
  const bookTabs = document.querySelectorAll('#book-filter-tabs .book-filter-tab');
  bookTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      bookTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeBookCategory = tab.dataset.filter || 'all';
      renderBadgeBookContent(currentUserData || AuthService.getUser(), true);
    });
  });

  // Mobile page switcher inside the book (< 768px)
  const mobileTabLeft = document.getElementById('btn-mobile-book-tab-left');
  const mobileTabRight = document.getElementById('btn-mobile-book-tab-right');
  const pageLeft = document.getElementById('book-page-left');
  const pageRight = document.getElementById('book-page-right');

  mobileTabLeft?.addEventListener('click', () => {
    mobileTabLeft.classList.add('bg-[#fff9c4]');
    mobileTabLeft.classList.remove('bg-white/70');
    mobileTabRight?.classList.add('bg-white/70');
    mobileTabRight?.classList.remove('bg-[#fff9c4]');
    if (window.innerWidth < 768) {
      if (pageLeft) pageLeft.style.display = 'flex';
      if (pageRight) pageRight.style.display = 'none';
    }
  });

  mobileTabRight?.addEventListener('click', () => {
    mobileTabRight.classList.add('bg-[#fff9c4]');
    mobileTabRight.classList.remove('bg-white/70');
    mobileTabLeft?.classList.add('bg-white/70');
    mobileTabLeft?.classList.remove('bg-[#fff9c4]');
    if (window.innerWidth < 768) {
      if (pageLeft) pageLeft.style.display = 'none';
      if (pageRight) pageRight.style.display = 'flex';
    }
  });

  // 3. Filter pills trong tab kho danh hiệu (bento grid)
  const filterBtns = document.querySelectorAll('#badges-filter-bar .badge-filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeBadgeFilter = btn.dataset.filter || 'all';
      renderBadgesGallery(currentUserData || AuthService.getUser(), true);
    });
  });
}

/**
 * Hiển thị tối đa 3 danh hiệu do người dùng ghim lên thẻ căn cước (1 hàng / huy hiệu theo chiều ngang)
 */
function renderPinnedBadges(user) {
  const container = document.getElementById('pinned-badges-grid');
  const counterEl = document.getElementById('badges-unlocked-counter');
  const tabPill = document.getElementById('tab-badge-counter-pill');

  const progress = getProgress();
  const unlockedBadges = STEM_BADGES.filter(b => b.checkUnlocked(user, progress));
  const unlockedCount = unlockedBadges.length;

  if (counterEl) {
    counterEl.textContent = `${unlockedCount}/${STEM_BADGES.length} Đạt`;
  }
  if (tabPill) {
    tabPill.textContent = `${unlockedCount}/${STEM_BADGES.length}`;
  }

  if (!container) return;

  const pinnedIds = getPinnedBadges(user, progress);

  let slotsHtml = '';
  for (let i = 0; i < 3; i++) {
    const badgeId = pinnedIds[i];
    const badge = badgeId ? STEM_BADGES.find(b => b.id === badgeId) : null;

    if (badge) {
      const isUnlocked = badge.checkUnlocked(user, progress);
      slotsHtml += `
        <div class="pinned-badge-slot ${isUnlocked ? badge.bgUnlocked : 'bg-[#f6f3f2] opacity-80'} group relative flex items-center justify-between p-2.5 sm:p-3 rounded-2xl border-2 border-[#2d2d2d] sketch-shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all cursor-pointer" data-badge-id="${badge.id}">
          <div class="flex items-center gap-3 min-w-0 flex-1">
            <!-- Icon Medallion with Rank Badge ON TOP (Thứ tự 1, 2, 3 gắn trực tiếp trên icon) -->
            <div class="relative flex-shrink-0">
              <div class="pinned-icon-badge order-${i + 1}" title="Vị trí ghim #${i + 1}">
                <span class="text-[9.5px]">📌</span>
                <span>#${i + 1}</span>
              </div>
              <div class="w-12 h-12 rounded-2xl bg-white border-2 border-[#2d2d2d] sketch-shadow-xs flex items-center justify-center text-2xl transition-transform duration-200 group-hover:scale-105 group-hover:rotate-2 shadow-2xs">
                ${badge.icon}
              </div>
            </div>

            <!-- Badge Full Details (Tự động marquee khi di chuột nếu tên dài bị tràn) -->
            <div class="min-w-0 flex-1 pr-1">
              <div class="flex items-center gap-1.5 min-w-0">
                <div class="pinned-badge-title-wrap min-w-0 flex-1 overflow-hidden relative" title="${escapeHtml(badge.name)}">
                  <h5 class="font-headline font-black text-xs sm:text-[13px] text-on-surface leading-snug group-hover:text-primary transition-colors">
                    <span class="pinned-badge-static truncate block">${escapeHtml(badge.name)}</span>
                    <span class="pinned-badge-marquee" aria-hidden="true">
                      <span class="marquee-text">${escapeHtml(badge.name)}</span>
                      <span class="marquee-sep">•</span>
                      <span class="marquee-text">${escapeHtml(badge.name)}</span>
                      <span class="marquee-sep">•</span>
                    </span>
                  </h5>
                </div>
                ${isUnlocked ? `<span class="w-2 h-2 rounded-full bg-[#10b981] shrink-0" title="Đã đạt được"></span>` : ''}
              </div>
              <div class="flex items-center gap-1.5 text-[10px] text-on-surface-variant font-medium mt-1">
                <span class="font-bold text-[#b45309] bg-[#fff9c4] px-1.5 py-0.5 rounded border border-[#2d2d2d]/20 shrink-0 leading-none text-[9.5px]">
                  ${escapeHtml(badge.categoryName || 'STEM')}
                </span>
                <span class="truncate text-[10.5px] text-on-surface-variant/85 font-medium">
                  ${escapeHtml(badge.desc || '')}
                </span>
              </div>
            </div>
          </div>

          <!-- Status Pill & Chevron Indicator -->
          <div class="flex-shrink-0 flex items-center gap-1.5 pl-2">
            ${isUnlocked 
              ? `<span class="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/95 border border-[#2d2d2d]/30 text-[10px] font-extrabold text-[#00864c] shadow-2xs whitespace-nowrap">
                   ✓ Đã đạt
                 </span>`
              : `<span class="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-200/90 border border-[#2d2d2d]/20 text-[10px] font-bold text-gray-600 shadow-2xs whitespace-nowrap">
                   🔒 Khóa
                 </span>`
            }
            <span class="w-7 h-7 rounded-xl bg-white border border-[#2d2d2d]/30 flex items-center justify-center text-on-surface-variant group-hover:text-primary group-hover:border-primary group-hover:bg-[#fff9c4] transition-all shadow-2xs">
              <span class="material-symbols-outlined text-[16px]">chevron_right</span>
            </span>
          </div>
        </div>
      `;
    } else {
      slotsHtml += `
        <button type="button" class="pinned-badge-slot is-empty w-full flex items-center justify-between p-2.5 sm:p-3 rounded-2xl border-2 border-dashed border-[#2d2d2d]/30 bg-[#fbf9f6] hover:bg-[#fff9c4]/40 hover:border-[#2d2d2d] transition-all cursor-pointer group text-left">
          <div class="flex items-center gap-3 min-w-0 flex-1">
            <div class="relative flex-shrink-0">
              <div class="pinned-icon-badge is-empty">
                <span class="text-[9.5px] opacity-40">📌</span>
                <span>#${i + 1}</span>
              </div>
              <div class="w-12 h-12 rounded-2xl border-2 border-dashed border-[#2d2d2d]/40 group-hover:border-[#2d2d2d] group-hover:bg-white flex items-center justify-center text-lg font-black text-on-surface-variant group-hover:text-primary transition-transform group-hover:scale-105">
                +
              </div>
            </div>
            <div class="min-w-0 flex-1 pr-1">
              <span class="font-bold text-xs text-on-surface-variant group-hover:text-on-surface block leading-tight truncate">Chưa ghim danh hiệu</span>
              <p class="text-[10px] text-on-surface-variant/70 font-medium mt-1 truncate">Vị trí #${i + 1} • Bấm để ghim</p>
            </div>
          </div>
          <span class="flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white border border-[#2d2d2d]/30 text-[11px] font-bold text-on-surface group-hover:bg-[#2d2d2d] group-hover:text-white transition-all shadow-2xs">
            <span>+ Ghim</span>
          </span>
        </button>
      `;
    }
  }

  container.innerHTML = slotsHtml;

  // Kích hoạt tính năng Marquee tự động cuộn chữ từ phải sang trái khi rê chuột ~3s
  const checkMarqueeEligibility = () => {
    container.querySelectorAll('.pinned-badge-title-wrap').forEach(wrap => {
      const staticEl = wrap.querySelector('.pinned-badge-static');
      if (staticEl && staticEl.scrollWidth > wrap.clientWidth + 1) {
        wrap.classList.add('can-marquee');
      } else {
        wrap.classList.remove('can-marquee');
      }
    });
  };

  requestAnimationFrame(checkMarqueeEligibility);
  setTimeout(checkMarqueeEligibility, 200);

  // Lắng nghe mouseenter để luôn phát hiện chính xác trạng thái tràn chữ
  container.querySelectorAll('.pinned-badge-slot').forEach(slot => {
    slot.addEventListener('mouseenter', () => {
      const wrap = slot.querySelector('.pinned-badge-title-wrap');
      if (!wrap) return;
      const staticEl = wrap.querySelector('.pinned-badge-static');
      if (staticEl && staticEl.scrollWidth > wrap.clientWidth + 1) {
        wrap.classList.add('can-marquee');
      }
    }, { passive: true });
  });

  if (!window._hasPinnedBadgeMarqueeResize) {
    window._hasPinnedBadgeMarqueeResize = true;
    window.addEventListener('resize', () => {
      const c = document.getElementById('pinned-badges-grid');
      if (!c) return;
      c.querySelectorAll('.pinned-badge-title-wrap').forEach(wrap => {
        const staticEl = wrap.querySelector('.pinned-badge-static');
        if (staticEl && staticEl.scrollWidth > wrap.clientWidth + 1) {
          wrap.classList.add('can-marquee');
        } else {
          wrap.classList.remove('can-marquee');
        }
      });
    }, { passive: true });
  }

  // GSAP Entrance Stagger & Hover Micro-Interactions
  if (typeof gsap !== 'undefined') {
    const slots = container.querySelectorAll('.pinned-badge-slot');
    gsap.fromTo(
      slots,
      { opacity: 0, y: 14, scale: 0.96 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.35,
        stagger: 0.08,
        ease: 'back.out(1.5)',
        clearProps: 'transform,opacity'
      }
    );

    // Interactive hover micro-physics on the icon badge & icon
    slots.forEach(slot => {
      const pinBadge = slot.querySelector('.pinned-icon-badge');
      const iconBox = slot.querySelector('.w-12');

      slot.addEventListener('mouseenter', () => {
        if (pinBadge) gsap.to(pinBadge, { y: -2, rotate: -8, scale: 1.12, duration: 0.22, ease: 'power2.out' });
        if (iconBox) gsap.to(iconBox, { y: -1, rotate: 3, scale: 1.05, duration: 0.25, ease: 'power2.out' });
      });

      slot.addEventListener('mouseleave', () => {
        if (pinBadge) gsap.to(pinBadge, { y: 0, rotate: 0, scale: 1, duration: 0.25, ease: 'power2.inOut' });
        if (iconBox) gsap.to(iconBox, { y: 0, rotate: 0, scale: 1, duration: 0.25, ease: 'power2.inOut' });
      });
    });
  }

  // Bấm vào bất kỳ ô nào trên thẻ cũng mở Sổ Tay Danh Hiệu 3D
  container.querySelectorAll('.pinned-badge-slot').forEach(slot => {
    slot.addEventListener('click', (e) => {
      e.preventDefault();
      openBadgeBookModal();
    });
  });

  // Đồng bộ kho danh hiệu đầy đủ ở tab bên phải
  renderBadgesGallery(user, false);
}

function renderStemBadges(user) {
  renderPinnedBadges(user);
}

/**
 * Render nội dung 2 trang của Sổ Tay Danh Hiệu STEM (Đã đạt & Chưa mở)
 */
function renderBadgeBookContent(user, animateStagger = false) {
  const modal = document.getElementById('badge-book-modal');
  if (!modal) return;

  const progress = getProgress();
  const pinnedIds = getPinnedBadges(user, progress);

  // Lọc theo category
  let badges = STEM_BADGES;
  if (['starter', 'streak', 'lab', 'xp'].includes(activeBookCategory)) {
    badges = STEM_BADGES.filter(b => b.filterTag === activeBookCategory);
  }

  const unlockedList = badges.filter(b => b.checkUnlocked(user, progress));
  const lockedList = badges.filter(b => !b.checkUnlocked(user, progress));

  // Cập nhật counters
  const totalUnlockedAll = STEM_BADGES.filter(b => b.checkUnlocked(user, progress)).length;
  const countDisplayEl = document.getElementById('book-unlocked-badge-count');
  if (countDisplayEl) countDisplayEl.textContent = `${totalUnlockedAll}/${STEM_BADGES.length} Đạt`;

  const leftCountEl = document.getElementById('book-left-count');
  if (leftCountEl) leftCountEl.textContent = unlockedList.length;

  const rightCountEl = document.getElementById('book-right-count');
  if (rightCountEl) rightCountEl.textContent = lockedList.length;

  const mobileUnlockedEl = document.getElementById('mobile-unlocked-count');
  if (mobileUnlockedEl) mobileUnlockedEl.textContent = unlockedList.length;

  const mobileLockedEl = document.getElementById('mobile-locked-count');
  if (mobileLockedEl) mobileLockedEl.textContent = lockedList.length;

  const pinnedDisplayEl = document.getElementById('book-pinned-count-display');
  if (pinnedDisplayEl) pinnedDisplayEl.textContent = `${pinnedIds.length}/3`;

  // Render Trang Trái: Đã Đạt Được
  const leftListEl = document.getElementById('book-unlocked-list');
  if (leftListEl) {
    if (unlockedList.length === 0) {
      leftListEl.innerHTML = `
        <div class="py-10 text-center border-2 border-dashed border-[#2d2d2d]/25 rounded-2xl bg-white/60">
          <div class="text-3xl mb-1.5">🌱</div>
          <p class="font-bold text-xs text-on-surface">Chưa có danh hiệu nào thuộc mục này</p>
          <p class="text-[11px] text-on-surface-variant mt-0.5">Hãy tiếp tục học tập để mở khóa nhé!</p>
        </div>
      `;
    } else {
      leftListEl.innerHTML = unlockedList.map(badge => {
        const isPinned = pinnedIds.includes(badge.id);
        return `
          <div class="book-badge-stamp ${isPinned ? 'is-pinned' : ''}" data-badge-id="${badge.id}">
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-start gap-3 flex-1 min-w-0">
                <div class="w-11 h-11 rounded-xl border-2 border-[#2d2d2d] flex items-center justify-center text-2xl flex-shrink-0 ${badge.bgUnlocked} shadow-xs">
                  <span>${badge.icon}</span>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <h5 class="font-bold text-xs sm:text-sm text-on-surface leading-tight">${escapeHtml(badge.name)}</h5>
                    <span class="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[#e8f5e9] text-[#00864c] border border-[#00864c]/30">Đã đạt</span>
                  </div>
                  <p class="text-[11px] text-on-surface-variant mt-1 leading-snug line-clamp-2">${escapeHtml(badge.desc)}</p>
                </div>
              </div>

              <!-- Pin Toggle Button -->
              <button type="button" class="btn-badge-pin-toggle ${isPinned ? 'is-active' : ''} flex-shrink-0" data-pin-id="${badge.id}" title="${isPinned ? 'Bỏ ghim khỏi thẻ' : 'Ghim lên thẻ căn cước'}">
                <span>${isPinned ? '📌 Đang ghim' : '📌 Ghim'}</span>
              </button>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // Render Trang Phải: Chưa Mở Khóa
  const rightListEl = document.getElementById('book-locked-list');
  if (rightListEl) {
    if (lockedList.length === 0) {
      rightListEl.innerHTML = `
        <div class="py-10 text-center border-2 border-dashed border-[#2d2d2d]/25 rounded-2xl bg-white/60">
          <div class="text-3xl mb-1.5">🎉</div>
          <p class="font-bold text-xs text-on-surface">Xuất sắc! Đã hoàn thành tất cả danh hiệu mục này!</p>
        </div>
      `;
    } else {
      rightListEl.innerHTML = lockedList.map(badge => {
        const progText = badge.progressText(user, progress);
        const progPct = badge.progressPct(user, progress);
        return `
          <div class="book-badge-stamp is-locked" data-badge-id="${badge.id}">
            <div class="flex items-start gap-3">
              <div class="w-11 h-11 rounded-xl border-2 border-[#2d2d2d]/30 flex items-center justify-center text-2xl flex-shrink-0 bg-white/80 grayscale opacity-80 shadow-2xs">
                <span>${badge.icon}</span>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-1">
                  <h5 class="font-bold text-xs sm:text-sm text-on-surface-variant leading-tight">${escapeHtml(badge.name)}</h5>
                  <span class="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[#f6f3f2] text-on-surface-variant border border-[#2d2d2d]/20 flex items-center gap-0.5">
                    <span class="material-symbols-outlined text-[11px]">lock</span> Khóa
                  </span>
                </div>
                <p class="text-[11px] text-on-surface-variant/90 mt-1 leading-snug line-clamp-2">${escapeHtml(badge.desc)}</p>
                <!-- Mini Progress -->
                <div class="mt-2.5 pt-1.5 border-t border-[#2d2d2d]/10">
                  <div class="flex items-center justify-between text-[10.5px] mb-1">
                    <span class="text-on-surface-variant font-medium">Tiến độ</span>
                    <span class="font-mono font-bold text-[#b45309]">${escapeHtml(progText)}</span>
                  </div>
                  <div class="w-full h-1.5 rounded-full bg-black/10 overflow-hidden">
                    <div class="h-full bg-gradient-to-r from-[#d97706] to-[#f59e0b] rounded-full transition-all duration-500" style="width: ${progPct}%;"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // Gắn sự kiện click toggle ghim
  modal.querySelectorAll('.btn-badge-pin-toggle').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const badgeId = btn.dataset.pinId;
      const currentPinned = getPinnedBadges(user, progress);
      const isAlreadyPinned = currentPinned.includes(badgeId);

      if (isAlreadyPinned) {
        const nextPinned = currentPinned.filter(id => id !== badgeId);
        savePinnedBadges(nextPinned);
        showToast('Đã bỏ ghim danh hiệu khỏi thẻ căn cước', 'info');
      } else {
        if (currentPinned.length >= 3) {
          showToast('Bạn đã ghim tối đa 3 danh hiệu! Hãy bỏ ghim 1 danh hiệu trước.', 'error');
          if (typeof gsap !== 'undefined') {
            gsap.fromTo(btn, { x: -6 }, { x: 6, duration: 0.08, repeat: 3, yoyo: true, ease: 'power1.inOut', clearProps: 'x' });
            gsap.fromTo('#book-pinned-count-display', { scale: 1.3, color: '#ef4444' }, { scale: 1, color: '#ffedd5', duration: 0.5, ease: 'back.out(2)' });
          }
          return;
        }
        currentPinned.push(badgeId);
        savePinnedBadges(currentPinned);
        const bObj = STEM_BADGES.find(b => b.id === badgeId);
        showToast(`Đã ghim danh hiệu "${bObj?.name || 'mới'}" lên thẻ căn cước!`, 'success');
      }

      // Re-render
      renderPinnedBadges(currentUserData || AuthService.getUser());
      renderBadgeBookContent(currentUserData || AuthService.getUser(), false);
    });
  });

  // Stagger animation on cards if requested
  if (animateStagger && typeof gsap !== 'undefined') {
    gsap.fromTo(
      modal.querySelectorAll('.book-badge-stamp'),
      { y: 12, opacity: 0, scale: 0.96 },
      { y: 0, opacity: 1, scale: 1, duration: 0.22, stagger: 0.02, ease: 'power2.out' }
    );
  }
}

/**
 * Mở Sổ Tay Danh Hiệu STEM với hiệu ứng 3D mở sách sống động
 */
function openBadgeBookModal() {
  const modal = document.getElementById('badge-book-modal');
  if (!modal) {
    console.error('Badge book modal (#badge-book-modal) not found in DOM!');
    return;
  }

  // Luôn re-render nội dung sổ tay trước khi mở
  renderBadgeBookContent(currentUserData || AuthService.getUser());

  modal.removeAttribute('hidden');
  modal.hidden = false;
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  // Responsive page display check for mobile
  const pageLeft = document.getElementById('book-page-left');
  const pageRight = document.getElementById('book-page-right');
  if (window.innerWidth < 768) {
    if (pageLeft) pageLeft.style.display = 'flex';
    if (pageRight) pageRight.style.display = 'none';
  } else {
    if (pageLeft) pageLeft.style.display = 'flex';
    if (pageRight) pageRight.style.display = 'flex';
  }

  const container = modal.querySelector('.sketch-book-container');
  const ribbon = modal.querySelector('#book-ribbon');
  const stamps = modal.querySelectorAll('.book-badge-stamp');

  if (typeof gsap !== 'undefined') {
    gsap.killTweensOf([modal, container, pageLeft, pageRight, ribbon, stamps]);
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    // 1. Fade in backdrop
    tl.fromTo(modal, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.22 });

    // 2. Book opens from center with 3D perspective
    tl.fromTo(
      container,
      { scale: 0.85, y: 30, rotationX: 10 },
      { scale: 1, y: 0, rotationX: 0, duration: 0.45, ease: 'back.out(1.15)' },
      '-=0.15'
    );

    // 3. Pages unfold
    if (pageLeft && window.innerWidth >= 768) {
      tl.fromTo(
        pageLeft,
        { rotationY: -35, transformOrigin: 'right center', autoAlpha: 0.6 },
        { rotationY: 0, autoAlpha: 1, duration: 0.38 },
        '-=0.32'
      );
    }
    if (pageRight && window.innerWidth >= 768) {
      tl.fromTo(
        pageRight,
        { rotationY: 35, transformOrigin: 'left center', autoAlpha: 0.6 },
        { rotationY: 0, autoAlpha: 1, duration: 0.38 },
        '-=0.35'
      );
    }

    // 4. Ribbon drops down
    if (ribbon) {
      tl.fromTo(
        ribbon,
        { y: -30, rotation: -10 },
        { y: 0, rotation: 0, duration: 0.5, ease: 'elastic.out(1, 0.4)' },
        '-=0.25'
      );
    }

    // 5. Badges cards reveal with stagger
    if (stamps && stamps.length > 0) {
      tl.fromTo(
        stamps,
        { y: 12, opacity: 0, scale: 0.96 },
        { y: 0, opacity: 1, scale: 1, duration: 0.22, stagger: 0.02, ease: 'power2.out' },
        '-=0.25'
      );
    }
  } else {
    modal.style.opacity = '1';
    modal.style.visibility = 'visible';
  }
}

/**
 * Đóng Sổ Tay Danh Hiệu STEM với hiệu ứng gấp sách lại
 */
function closeBadgeBookModal() {
  const modal = document.getElementById('badge-book-modal');
  if (!modal || modal.hidden) return;

  const container = modal.querySelector('.sketch-book-container');
  const pageLeft = modal.querySelector('.book-page-left');
  const pageRight = modal.querySelector('.book-page-right');

  document.body.style.overflow = '';

  if (typeof gsap !== 'undefined') {
    gsap.killTweensOf([modal, container, pageLeft, pageRight]);
    const tl = gsap.timeline({
      onComplete: () => {
        modal.setAttribute('hidden', '');
        modal.hidden = true;
        modal.style.display = 'none';
        gsap.set([modal, container, pageLeft, pageRight], { clearProps: 'all' });
      }
    });

    if (pageLeft && pageRight && window.innerWidth >= 768) {
      tl.to(pageLeft, { rotationY: -25, duration: 0.18, ease: 'power2.in' }, 0);
      tl.to(pageRight, { rotationY: 25, duration: 0.18, ease: 'power2.in' }, 0);
    }
    tl.to(container, { scale: 0.88, y: 18, autoAlpha: 0, duration: 0.2, ease: 'power2.in' }, 0);
    tl.to(modal, { autoAlpha: 0, duration: 0.16 }, '-=0.08');
  } else {
    modal.setAttribute('hidden', '');
    modal.hidden = true;
    modal.style.display = 'none';
  }
}

/**
 * Hiển thị kho danh hiệu đầy đủ trong Tab Kho Danh Hiệu (Scalable Bento Gallery)
 */
function renderBadgesGallery(user, animateStagger = false) {
  const container = document.getElementById('badges-gallery-grid');
  if (!container) return;

  const progress = getProgress();
  const unlockedCount = STEM_BADGES.filter(b => b.checkUnlocked(user, progress)).length;
  const totalBadges = STEM_BADGES.length;
  const pct = Math.round((unlockedCount / totalBadges) * 100);

  // Cập nhật header thống kê
  const statCountEl = document.getElementById('badges-gallery-stat-count');
  if (statCountEl) statCountEl.textContent = `${unlockedCount} / ${totalBadges} Huy hiệu`;

  const pctEl = document.getElementById('badges-gallery-percent');
  if (pctEl) pctEl.textContent = `${pct}%`;

  const barEl = document.getElementById('badges-gallery-progress-bar');
  if (barEl) barEl.style.width = `${pct}%`;

  const bonusEl = document.getElementById('badges-gallery-xp-bonus');
  if (bonusEl) bonusEl.textContent = `Thưởng: +${unlockedCount * 50} XP`;

  const motivateEl = document.getElementById('badges-gallery-motivate');
  if (motivateEl) {
    if (pct === 100) {
      motivateEl.textContent = '🎉 Tuyệt đỉnh! Bạn đã hoàn thành toàn bộ kho báu danh hiệu STEM!';
    } else if (pct >= 50) {
      motivateEl.textContent = `🔥 Rất xuất sắc! Đã chinh phục quá nửa chặng đường (${unlockedCount}/${totalBadges} danh hiệu).`;
    } else {
      motivateEl.textContent = '🌱 Tiếp tục khám phá mô hình 3D và luyện tập trắc nghiệm để mở khóa thêm danh hiệu!';
    }
  }

  // Lọc danh hiệu theo bộ lọc hiện tại
  let filtered = STEM_BADGES;
  if (activeBadgeFilter === 'unlocked') {
    filtered = STEM_BADGES.filter(b => b.checkUnlocked(user, progress));
  } else if (activeBadgeFilter === 'locked') {
    filtered = STEM_BADGES.filter(b => !b.checkUnlocked(user, progress));
  } else if (['starter', 'streak', 'lab', 'xp'].includes(activeBadgeFilter)) {
    filtered = STEM_BADGES.filter(b => b.filterTag === activeBadgeFilter);
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-12 text-center border-2 border-dashed border-[#2d2d2d]/30 rounded-2xl bg-[#fdfbf7]">
        <div class="text-4xl mb-2">🔍</div>
        <p class="font-bold text-sm text-on-surface">Không có danh hiệu nào phù hợp bộ lọc</p>
        <p class="text-xs text-on-surface-variant mt-1">Hãy thử chọn bộ lọc khác để khám phá bộ sưu tập.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(badge => {
    const isUnlocked = badge.checkUnlocked(user, progress);
    const progText = badge.progressText(user, progress);
    const progPct = badge.progressPct(user, progress);

    const cardClasses = isUnlocked
      ? `gallery-badge-card is-unlocked ${badge.bgUnlocked}`
      : `gallery-badge-card is-locked`;

    return `
      <div class="${cardClasses} p-4 sm:p-5 rounded-2xl border-2 border-[#2d2d2d] sketch-shadow-xs flex flex-col justify-between cursor-pointer transition-all hover:-translate-y-1 hover:sketch-shadow-sm group" data-badge-id="${badge.id}">
        <div>
          <!-- Top Row: Category & Status -->
          <div class="flex items-center justify-between gap-2 pb-2.5 mb-3 border-b border-[#2d2d2d]/10 min-w-0">
            <div class="flex items-center gap-1.5 min-w-0 flex-1">
              <span class="text-xs flex-shrink-0">${badge.icon}</span>
              <span class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider truncate whitespace-nowrap">
                ${escapeHtml(badge.categoryName || 'STEM')}
              </span>
            </div>
            ${isUnlocked 
              ? `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-[#e8f5e9] text-[#00864c] border border-[#00864c]/30 shadow-2xs whitespace-nowrap flex-shrink-0">
                   <span>✅</span><span>Đã đạt</span>
                 </span>`
              : `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-[#f6f3f2] text-on-surface-variant border border-[#2d2d2d]/25 shadow-2xs whitespace-nowrap flex-shrink-0">
                   <span class="material-symbols-outlined text-[13px]">lock</span><span>Khóa</span>
                 </span>`
            }
          </div>

          <!-- Middle: Icon, Title & Desc -->
          <div class="flex items-start gap-3.5">
            <div class="w-12 h-12 rounded-xl border-2 border-[#2d2d2d] flex items-center justify-center text-2xl flex-shrink-0 sketch-shadow-xs bg-white ${isUnlocked ? '' : 'grayscale opacity-75'}">
              <span>${badge.icon}</span>
            </div>
            <div class="flex-1 min-w-0">
              <h4 class="font-headline font-bold text-sm sm:text-base text-on-surface leading-snug">
                ${escapeHtml(badge.name)}
              </h4>
              <p class="font-body text-xs text-on-surface-variant mt-1 leading-relaxed line-clamp-2" title="${escapeHtml(badge.desc)}">
                ${escapeHtml(badge.desc)}
              </p>
            </div>
          </div>
        </div>

        <!-- Bottom: Progress & Action -->
        <div class="mt-4 pt-2.5 border-t border-[#2d2d2d]/10 space-y-1.5">
          <div class="flex items-center justify-between gap-2 text-xs min-w-0">
            <span class="text-on-surface-variant font-semibold whitespace-nowrap flex-shrink-0">Tiến độ</span>
            <span class="font-mono font-bold text-xs truncate text-right ${isUnlocked ? 'text-[#00864c]' : 'text-primary'}" title="${escapeHtml(progText)}">
              ${escapeHtml(progText)}
            </span>
          </div>
          <div class="w-full h-2 rounded-full bg-white border border-[#2d2d2d]/30 overflow-hidden p-0.5">
            <div class="h-full rounded-full ${isUnlocked ? 'bg-[#00864c]' : 'bg-primary'} transition-all duration-500" style="width: ${progPct}%;"></div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Gắn sự kiện click vào các thẻ trong gallery để mở Modal chi tiết
  container.querySelectorAll('.gallery-badge-card').forEach(card => {
    card.addEventListener('click', () => {
      const badgeId = card.dataset.badgeId;
      const badge = STEM_BADGES.find(b => b.id === badgeId);
      if (badge) openBadgeDetailModal(badge, user, progress);
    });
  });

  // Hiệu ứng GSAP Stagger khi filter hoặc chuyển tab
  if (animateStagger && typeof gsap !== 'undefined') {
    gsap.fromTo(
      container.querySelectorAll('.gallery-badge-card'),
      { opacity: 0, y: 15, scale: 0.96 },
      { opacity: 1, y: 0, scale: 1, duration: 0.25, stagger: 0.03, ease: 'power2.out' }
    );
  }
}

function openBadgeDetailModal(badge, user, progress) {
  const modal = document.getElementById('badge-detail-modal');
  if (!modal) return;

  const isUnlocked = badge.checkUnlocked(user, progress);
  const progText = badge.progressText(user, progress);

  const titleEl = document.getElementById('badge-modal-title');
  const catEl = document.getElementById('badge-modal-category');
  const catIconEl = document.getElementById('badge-modal-category-icon');
  const iconWrap = document.getElementById('badge-modal-icon-wrap');
  const iconEl = document.getElementById('badge-modal-icon');
  const statusEl = document.getElementById('badge-modal-status');
  const descEl = document.getElementById('badge-modal-desc');
  const progValEl = document.getElementById('badge-modal-progress-val');

  if (titleEl) titleEl.textContent = badge.name;
  if (catEl) catEl.textContent = `Huy Hiệu ${badge.categoryName || 'STEM'}`;
  if (catIconEl) catIconEl.textContent = badge.icon;
  if (iconEl) iconEl.textContent = badge.icon;
  if (descEl) descEl.textContent = badge.desc;
  if (progValEl) progValEl.textContent = progText;

  if (iconWrap) {
    iconWrap.className = `w-20 h-20 rounded-2xl border-3 border-[#2d2d2d] sketch-shadow-sm flex items-center justify-center text-4xl mb-3 ${isUnlocked ? badge.bgUnlocked : 'bg-[#f0eded] grayscale'}`;
  }

  if (statusEl) {
    if (isUnlocked) {
      statusEl.className = 'mt-1 px-3 py-0.5 rounded-full font-label-sm text-[11px] font-bold border border-[#2d2d2d] bg-[#e8f5e9] text-[#00864c]';
      statusEl.textContent = '✅ Đã Đạt Được';
    } else {
      statusEl.className = 'mt-1 px-3 py-0.5 rounded-full font-label-sm text-[11px] font-bold border border-[#2d2d2d] bg-[#f6f3f2] text-[#8f6f6d]';
      statusEl.textContent = '🔒 Chưa Mở Khóa';
    }
  }

  modal.removeAttribute('hidden');
  modal.hidden = false;
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  if (typeof gsap !== 'undefined') {
    gsap.fromTo(modal, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2, ease: 'power2.out' });
    const card = modal.querySelector('.avatar-action-card');
    if (card) {
      gsap.fromTo(card, { y: 20, scale: 0.95 }, { y: 0, scale: 1, duration: 0.28, ease: 'back.out(1.5)' });
    }
  } else {
    modal.style.opacity = '1';
    modal.style.visibility = 'visible';
  }
}

/**
 * Khởi tạo tính năng xem & tải lên Avatar qua Modal Lựa Chọn, File Dialog và Drag & Drop
 */
function initAvatarUpload() {
  const avatarCircle = document.getElementById('avatar-circle-display');
  const cameraBadge = document.getElementById('avatar-camera-badge');
  const quickViewBtn = document.getElementById('btn-quick-view-avatar');
  const quickEditBtn = document.getElementById('btn-quick-edit-avatar');
  const heroContainer = document.getElementById('avatar-container');
  const heroInput = document.getElementById('avatar-file-input');

  const actionModal = document.getElementById('avatar-action-modal');
  const actionCloseBtn = document.getElementById('avatar-action-close-btn');
  const actionCancelBtn = document.getElementById('avatar-action-cancel-btn');
  const optViewBtn = document.getElementById('modal-opt-view-avatar');
  const modalDropzone = document.getElementById('modal-avatar-dropzone');
  const modalFileInput = document.getElementById('modal-avatar-file-input');

  const lightboxModal = document.getElementById('avatar-lightbox-modal');
  const lightboxCloseBtn = document.getElementById('avatar-lightbox-close-btn');
  const lightboxBtnClose = document.getElementById('avatar-lightbox-btn-close');
  const lightboxBtnEdit = document.getElementById('avatar-lightbox-btn-edit');

  // 1. Triggers mở modal lựa chọn (Xem hay Sửa)
  avatarCircle?.addEventListener('click', openAvatarActionModal);
  cameraBadge?.addEventListener('click', (e) => {
    e.stopPropagation();
    openAvatarActionModal();
  });

  // 2. Nút nhanh trên Hover
  quickViewBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    openAvatarLightboxModal();
  });
  quickEditBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    openAvatarActionModal();
  });

  // 3. Xử lý trong Action Modal
  actionCloseBtn?.addEventListener('click', closeAvatarActionModal);
  actionCancelBtn?.addEventListener('click', closeAvatarActionModal);
  actionModal?.addEventListener('click', (e) => {
    if (e.target === actionModal) closeAvatarActionModal();
  });

  optViewBtn?.addEventListener('click', () => {
    closeAvatarActionModal();
    openAvatarLightboxModal();
  });

  modalDropzone?.addEventListener('click', () => {
    modalFileInput?.click();
  });

  modalFileInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) {
      closeAvatarActionModal();
      handleAvatarFileSelected(file);
    }
    modalFileInput.value = '';
  });

  // 4. Xử lý trong Lightbox Modal
  lightboxCloseBtn?.addEventListener('click', closeAvatarLightboxModal);
  lightboxBtnClose?.addEventListener('click', closeAvatarLightboxModal);
  lightboxModal?.addEventListener('click', (e) => {
    if (e.target === lightboxModal) closeAvatarLightboxModal();
  });
  lightboxBtnEdit?.addEventListener('click', () => {
    closeAvatarLightboxModal();
    openAvatarActionModal();
  });

  // 5. File picker ngoài
  heroInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) handleAvatarFileSelected(file);
    heroInput.value = '';
  });

  // 6. Kéo thả trực tiếp
  setupDragAndDrop(heroContainer, (file) => handleAvatarFileSelected(file));
  setupDragAndDrop(modalDropzone, (file) => {
    closeAvatarActionModal();
    handleAvatarFileSelected(file);
  });

  // Drag and drop setup helper
  function setupDragAndDrop(el, onDropFile) {
    if (!el) return;
    ['dragenter', 'dragover'].forEach(name => {
      el.addEventListener(name, (e) => {
        e.preventDefault();
        e.stopPropagation();
        el.classList.add('is-dragover');
      });
    });

    ['dragleave', 'drop'].forEach(name => {
      el.addEventListener(name, (e) => {
        e.preventDefault();
        e.stopPropagation();
        el.classList.remove('is-dragover');
      });
    });

    el.addEventListener('drop', (e) => {
      const file = e.dataTransfer?.files?.[0];
      if (file) onDropFile(file);
    });
  }
}

/**
 * Xử lý file ảnh được người dùng chọn hoặc thả vào
 */
function handleAvatarFileSelected(file) {
  if (!file) return;

  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type.toLowerCase())) {
    showToast('Chỉ hỗ trợ file ảnh định dạng JPG, PNG hoặc WebP', 'warning');
    return;
  }

  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    showToast('Dung lượng ảnh tối đa là 5MB', 'warning');
    return;
  }

  openCropperModal(file);
}

/**
 * Khởi tạo tương tác điều khiển trên Canvas Crop Modal
 */
function initAvatarCropper() {
  const canvas = document.getElementById('avatar-crop-canvas');
  const zoomInput = document.getElementById('avatar-crop-zoom');
  const rotateBtn = document.getElementById('avatar-crop-rotate-btn');
  const resetBtn = document.getElementById('avatar-crop-reset-btn');
  const cancelBtn = document.getElementById('avatar-crop-cancel-btn');
  const closeBtn = document.getElementById('avatar-crop-close-btn');
  const applyBtn = document.getElementById('avatar-crop-apply-btn');

  cancelBtn?.addEventListener('click', closeCropperModal);
  closeBtn?.addEventListener('click', closeCropperModal);
  applyBtn?.addEventListener('click', applyCropAndUpload);

  rotateBtn?.addEventListener('click', () => {
    if (!cropper.image) return;
    cropper.rotation = (cropper.rotation + 90) % 360;
    recalculateMinScale();
    cropper.scale = cropper.minScale * cropper.zoom;
    clampCrop();
    drawCrop();
  });

  resetBtn?.addEventListener('click', () => {
    if (!cropper.image) return;
    cropper.rotation = 0;
    cropper.zoom = 1;
    if (zoomInput) zoomInput.value = '1';
    recalculateMinScale();
    cropper.scale = cropper.minScale;
    cropper.offsetX = 0;
    cropper.offsetY = 0;
    drawCrop();
  });

  zoomInput?.addEventListener('input', () => {
    if (!cropper.image) return;
    cropper.zoom = Number(zoomInput.value || 1);
    cropper.scale = cropper.minScale * cropper.zoom;
    clampCrop();
    drawCrop();
  });

  if (!canvas) return;

  canvas.addEventListener('pointerdown', (e) => {
    if (!cropper.image) return;
    cropper.dragging = true;
    cropper.lastX = e.clientX;
    cropper.lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!cropper.dragging || !cropper.image) return;
    const dx = e.clientX - cropper.lastX;
    const dy = e.clientY - cropper.lastY;
    cropper.offsetX += dx;
    cropper.offsetY += dy;
    cropper.lastX = e.clientX;
    cropper.lastY = e.clientY;
    clampCrop();
    drawCrop();
  });

  const stopDrag = () => {
    cropper.dragging = false;
  };
  canvas.addEventListener('pointerup', stopDrag);
  canvas.addEventListener('pointercancel', stopDrag);

  canvas.addEventListener('wheel', (e) => {
    if (!cropper.image) return;
    e.preventDefault();
    if (!zoomInput) return;
    const delta = e.deltaY < 0 ? 0.08 : -0.08;
    const nextVal = Math.min(4, Math.max(1, Number(zoomInput.value) + delta));
    zoomInput.value = nextVal.toFixed(2);
    cropper.zoom = nextVal;
    cropper.scale = cropper.minScale * nextVal;
    clampCrop();
    drawCrop();
  }, { passive: false });
}

/**
 * Mở modal crop với ảnh đã chọn
 */
function openCropperModal(file) {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    URL.revokeObjectURL(url);
    cropper.image = img;
    cropper.rotation = 0;
    cropper.zoom = 1;
    const zoomInput = document.getElementById('avatar-crop-zoom');
    if (zoomInput) zoomInput.value = '1';

    recalculateMinScale();
    cropper.scale = cropper.minScale;
    cropper.offsetX = 0;
    cropper.offsetY = 0;

    const modal = document.getElementById('avatar-crop-modal');
    if (modal) {
      modal.hidden = false;
      gsap.fromTo(modal, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2, ease: 'power2.out' });
      const card = modal.querySelector('.avatar-crop-card');
      if (card) {
        gsap.fromTo(card, { y: 20, scale: 0.96 }, { y: 0, scale: 1, duration: 0.28, ease: 'power3.out' });
      }
    }
    drawCrop();
  };
  img.onerror = () => {
    URL.revokeObjectURL(url);
    showToast('Không thể tải hoặc xử lý ảnh đã chọn.', 'error');
  };
  img.src = url;
}

/**
 * Đóng modal crop
 */
function closeCropperModal() {
  const modal = document.getElementById('avatar-crop-modal');
  if (!modal || modal.hidden) return;

  const hide = () => {
    modal.hidden = true;
    cropper.image = null;
    gsap.set(modal, { clearProps: 'all' });
    const card = modal.querySelector('.avatar-crop-card');
    if (card) gsap.set(card, { clearProps: 'all' });
  };

  gsap.to(modal, {
    autoAlpha: 0,
    duration: 0.16,
    ease: 'power2.in',
    onComplete: hide
  });
}

function recalculateMinScale() {
  if (!cropper.image) return;
  const isRotated = cropper.rotation === 90 || cropper.rotation === 270;
  const effW = isRotated ? cropper.image.height : cropper.image.width;
  const effH = isRotated ? cropper.image.width : cropper.image.height;
  cropper.minScale = Math.max(cropper.cropDiameter / effW, cropper.cropDiameter / effH);
}

function clampCrop() {
  if (!cropper.image) return;
  const isRotated = cropper.rotation === 90 || cropper.rotation === 270;
  const effW = isRotated ? cropper.image.height : cropper.image.width;
  const effH = isRotated ? cropper.image.width : cropper.image.height;
  const renderW = effW * cropper.scale;
  const renderH = effH * cropper.scale;
  const maxOffsetX = Math.max(0, (renderW - cropper.cropDiameter) / 2);
  const maxOffsetY = Math.max(0, (renderH - cropper.cropDiameter) / 2);
  cropper.offsetX = Math.min(maxOffsetX, Math.max(-maxOffsetX, cropper.offsetX));
  cropper.offsetY = Math.min(maxOffsetY, Math.max(-maxOffsetY, cropper.offsetY));
}

function drawCrop() {
  const canvas = document.getElementById('avatar-crop-canvas');
  if (!canvas || !cropper.image) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const d = cropper.cropDiameter;
  const r = d / 2;

  ctx.clearRect(0, 0, w, h);

  // Background
  ctx.fillStyle = '#18191a';
  ctx.fillRect(0, 0, w, h);

  // Draw transformed image
  ctx.save();
  ctx.translate(cx + cropper.offsetX, cy + cropper.offsetY);
  ctx.rotate((cropper.rotation * Math.PI) / 180);
  ctx.scale(cropper.scale, cropper.scale);
  ctx.drawImage(cropper.image, -cropper.image.width / 2, -cropper.image.height / 2);
  ctx.restore();

  // Darkened mask outside crop circle
  ctx.save();
  ctx.fillStyle = 'rgba(15, 17, 19, 0.65)';
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.arc(cx, cy, r, 0, Math.PI * 2, true);
  ctx.fill();

  // Circular guideline border
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.5;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  // Center crosshair notches
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 3]);
  ctx.beginPath();
  ctx.moveTo(cx - 16, cy);
  ctx.lineTo(cx + 16, cy);
  ctx.moveTo(cx, cy - 16);
  ctx.lineTo(cx, cy + 16);
  ctx.stroke();
  ctx.restore();

  drawMiniPreview();
}

function drawMiniPreview() {
  const mini = document.getElementById('avatar-crop-mini-preview');
  if (!mini || !cropper.image) return;
  const ctx = mini.getContext('2d');
  const size = mini.width;
  const cx = size / 2;
  const cy = size / 2;
  const d = cropper.cropDiameter;
  const factor = size / d;

  ctx.clearRect(0, 0, size, size);

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, cx, 0, Math.PI * 2);
  ctx.clip();

  ctx.translate(cx + cropper.offsetX * factor, cy + cropper.offsetY * factor);
  ctx.rotate((cropper.rotation * Math.PI) / 180);
  ctx.scale(cropper.scale * factor, cropper.scale * factor);
  ctx.drawImage(cropper.image, -cropper.image.width / 2, -cropper.image.height / 2);
  ctx.restore();
}

/**
 * Cắt ảnh theo khung tròn, upload lên Cloudflare R2 và CHỐT ĐỔI LUÔN vào Database
 * Không cần người dùng phải bấm "Lưu Thay Đổi" của form bên dưới nữa.
 */
async function applyCropAndUpload() {
  if (!cropper.image) return;

  const applyBtn = document.getElementById('avatar-crop-apply-btn');
  const originalBtnContent = applyBtn ? applyBtn.innerHTML : '';

  try {
    if (applyBtn) {
      applyBtn.disabled = true;
      applyBtn.innerHTML = `
        <span class="inline-block animate-spin material-symbols-outlined text-[16px]">progress_activity</span>
        <span>Đang xử lý & lưu...</span>
      `;
    }

    const out = document.createElement('canvas');
    out.width = 512;
    out.height = 512;
    const outCtx = out.getContext('2d');
    const d = cropper.cropDiameter;
    const factor = 512 / d;

    // Draw white background in case of transparent PNG
    outCtx.fillStyle = '#ffffff';
    outCtx.fillRect(0, 0, 512, 512);

    outCtx.save();
    outCtx.translate(256 + cropper.offsetX * factor, 256 + cropper.offsetY * factor);
    outCtx.rotate((cropper.rotation * Math.PI) / 180);
    outCtx.scale(cropper.scale * factor, cropper.scale * factor);
    outCtx.drawImage(cropper.image, -cropper.image.width / 2, -cropper.image.height / 2);
    outCtx.restore();

    const blob = await new Promise(resolve => out.toBlob(resolve, 'image/jpeg', 0.92));
    if (!blob) throw new Error('Không thể xuất ảnh sau khi cắt');

    const file = new File([blob], `avatar_${Date.now()}.jpg`, { type: 'image/jpeg' });
    const uploadedUrl = await uploadAvatar(file);

    closeCropperModal();
    // Chốt đổi luôn trực tiếp vào database không cần nhấn "Lưu Thay Đổi"
    await saveAndApplyAvatar(uploadedUrl, 'Đã cắt và cập nhật ảnh đại diện thành công!');
  } catch (err) {
    console.error('Lỗi khi tải ảnh đại diện:', err);
    showToast(err.message || 'Không thể tải ảnh đại diện lên máy chủ', 'error');
  } finally {
    if (applyBtn) {
      applyBtn.disabled = false;
      applyBtn.innerHTML = originalBtnContent;
    }
  }
}

/**
 * Khởi tạo form chỉnh sửa thông tin cá nhân với phản hồi tức thì và hoạt ảnh GSAP
 */
function initEditForm() {
  const form = document.getElementById('profile-edit-form');
  const btnReset = document.getElementById('btn-reset-profile');
  const btnSubmit = document.getElementById('btn-save-profile');
  const inputFullName = document.getElementById('input-fullname');

  if (!form) return;

  // Phản hồi thời gian thực: Cập nhật tên vào Thẻ Nghiên cứu sinh khi gõ
  inputFullName?.addEventListener('input', () => {
    const displayNameEl = document.getElementById('profile-display-name');
    if (displayNameEl) {
      displayNameEl.textContent = inputFullName.value.trim() || 'Nhà nghiên cứu';
    }
  });

  // Tương tác Khối Lớp THCS: Hiệu ứng bấm và đồng bộ ngay với Thẻ Căn Cước
  const gradeInputs = document.querySelectorAll('input[name="profile-grade"]');
  gradeInputs.forEach(input => {
    input.addEventListener('change', () => {
      const statGrade = document.getElementById('stat-current-grade');
      if (statGrade) {
        statGrade.textContent = String(input.value);
        gsap.fromTo(statGrade, 
          { scale: 1.28, color: '#b71422' }, 
          { scale: 1, color: '#1b1c1c', duration: 0.35, ease: 'back.out(2)' }
        );
      }
      const labelCard = input.closest('label')?.querySelector('.grade-card-item');
      if (labelCard) {
        gsap.fromTo(labelCard, 
          { scale: 0.92 }, 
          { scale: 1, duration: 0.25, ease: 'back.out(2)' }
        );
      }
    });
  });

  // Tương tác Giới tính: Nảy nhẹ nút lựa chọn
  const genderInputs = document.querySelectorAll('input[name="profile-gender"]');
  genderInputs.forEach(input => {
    input.addEventListener('change', () => {
      const pill = input.closest('label')?.querySelector('.gender-pill-btn');
      if (pill) {
        gsap.fromTo(pill, 
          { scale: 0.92 }, 
          { scale: 1, duration: 0.22, ease: 'back.out(2)' }
        );
      }
    });
  });

  btnReset?.addEventListener('click', () => {
    if (currentUserData) {
      pendingAvatarUrl = currentUserData.avatarUrl || null;
      renderProfile(currentUserData);
      
      // Hiệu ứng khôi phục form nhẹ nhàng
      gsap.fromTo('.profile-subcard', 
        { scale: 0.98 }, 
        { scale: 1, duration: 0.25, ease: 'power2.out', stagger: 0.05 }
      );
      showToast('Đã khôi phục thông tin ban đầu.', 'info');
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fullName = inputFullName?.value?.trim();
    const phone = document.getElementById('input-phone')?.value?.trim();
    const dateOfBirth = document.getElementById('input-dob')?.value || null;
    const grade = document.querySelector('input[name="profile-grade"]:checked')?.value;
    const gender = document.querySelector('input[name="profile-gender"]:checked')?.value || null;

    if (!fullName) {
      showToast('Họ và tên học sinh không được để trống', 'warning');
      if (inputFullName) {
        gsap.fromTo(inputFullName, { x: -8 }, { x: 0, duration: 0.3, ease: 'power2.out' });
        inputFullName.focus();
      }
      return;
    }

    if (phone && !/^[0-9+() -]{9,15}$/.test(phone)) {
      showToast('Số điện thoại không hợp lệ (từ 9 đến 15 chữ số)', 'warning');
      const inputPhone = document.getElementById('input-phone');
      if (inputPhone) {
        gsap.fromTo(inputPhone, { x: -8 }, { x: 0, duration: 0.3, ease: 'power2.out' });
        inputPhone.focus();
      }
      return;
    }

    const payload = {
      fullName,
      phone: phone || null,
      dateOfBirth,
      grade: grade ? Number(grade) : 8,
      gender,
      avatarUrl: pendingAvatarUrl || null
    };

    const originalBtnText = btnSubmit.innerHTML;
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = `
      <span class="inline-block animate-spin material-symbols-outlined text-[18px]">progress_activity</span>
      <span>Đang lưu...</span>
    `;

    try {
      const updated = await updateUserProfile(payload);
      currentUserData = { ...currentUserData, ...updated, ...payload, avatarUrl: pendingAvatarUrl || null };
      pendingAvatarUrl = currentUserData.avatarUrl || null;

      // Update AuthService storage
      await AuthService.updateProfile({ ...payload, avatarUrl: pendingAvatarUrl });

      // Re-render UI
      renderProfile(currentUserData);

      // Hiệu ứng ăn mừng lưu thành công trên thẻ Căn Cước
      const passportCard = document.querySelector('.profile-passport-card');
      if (passportCard) {
        gsap.fromTo(passportCard, 
          { scale: 0.98 }, 
          { scale: 1, duration: 0.38, ease: 'back.out(2)' }
        );
      }

      // Notify Navbar in real time
      window.dispatchEvent(new CustomEvent('bioverse_profile_updated', {
        detail: currentUserData
      }));

      showToast('Cập nhật thông tin cá nhân thành công!', 'success');
    } catch (err) {
      showToast(err.message || 'Không thể cập nhật hồ sơ', 'error');
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = originalBtnText;
    }
  });
}

/**
 * Khởi tạo form đổi mật khẩu với OTP dạng Popup Modal
 */
function initPasswordForm() {
  const form = document.getElementById('change-password-form');
  const btnRequestOtp = document.getElementById('btn-request-otp');
  const btnSubmit = document.getElementById('btn-submit-pass');
  const countdownEl = document.getElementById('otp-countdown-hint');
  const timerSpan = document.getElementById('otp-timer');

  const passModal = document.getElementById('change-password-modal');
  const btnOpenModal = document.getElementById('btn-open-password-modal');
  const btnCloseModal = document.getElementById('btn-close-password-modal');
  const btnCancelModal = document.getElementById('btn-cancel-password-modal');

  const openPasswordModal = () => {
    if (!passModal) return;
    document.body.style.overflow = 'hidden';
    passModal.removeAttribute('hidden');
    passModal.hidden = false;
    passModal.style.display = 'flex';

    const card = passModal.querySelector('.avatar-action-card');
    if (typeof gsap !== 'undefined' && card) {
      gsap.fromTo(passModal, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 });
      gsap.fromTo(card, { scale: 0.94, opacity: 0, y: 15 }, { scale: 1, opacity: 1, y: 0, duration: 0.28, ease: 'back.out(1.4)' });
    }

    // Reset fields if empty/fresh
    const inputCurr = document.getElementById('input-curr-pass');
    if (inputCurr) inputCurr.focus();
  };

  const closePasswordModal = () => {
    if (!passModal || passModal.hidden) return;
    document.body.style.overflow = '';

    if (typeof gsap !== 'undefined') {
      gsap.to(passModal, {
        autoAlpha: 0,
        duration: 0.16,
        ease: 'power2.in',
        onComplete: () => {
          passModal.setAttribute('hidden', '');
          passModal.hidden = true;
          passModal.style.display = 'none';
          gsap.set(passModal, { clearProps: 'all' });
        }
      });
    } else {
      passModal.setAttribute('hidden', '');
      passModal.hidden = true;
      passModal.style.display = 'none';
    }
  };

  // Open & Close triggers
  btnOpenModal?.addEventListener('click', openPasswordModal);
  btnCloseModal?.addEventListener('click', closePasswordModal);
  btnCancelModal?.addEventListener('click', closePasswordModal);

  // Click backdrop outside
  passModal?.addEventListener('click', (e) => {
    if (e.target === passModal) closePasswordModal();
  });

  // ESC key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && passModal && !passModal.hidden) {
      closePasswordModal();
    }
  });

  // Toggle password visibility
  document.querySelectorAll('.btn-toggle-pass').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      const input = document.getElementById(targetId);
      if (!input) return;

      const icon = btn.querySelector('.material-symbols-outlined');
      if (input.type === 'password') {
        input.type = 'text';
        if (icon) icon.textContent = 'visibility_off';
      } else {
        input.type = 'password';
        if (icon) icon.textContent = 'visibility';
      }
    });
  });

  // Request OTP
  btnRequestOtp?.addEventListener('click', async () => {
    btnRequestOtp.disabled = true;
    const oldText = btnRequestOtp.textContent;
    btnRequestOtp.textContent = 'Đang gửi...';

    try {
      const res = await requestChangePasswordOtp();
      const cooldown = res?.resendAfterSeconds || 60;

      showToast(`Mã OTP đã được gửi đến email ${currentUserData?.email || 'của bạn'}. Vui lòng kiểm tra hộp thư!`, 'success');

      startOtpCountdown(cooldown, btnRequestOtp, countdownEl, timerSpan);
    } catch (err) {
      btnRequestOtp.disabled = false;
      btnRequestOtp.textContent = oldText;
      showToast(err.message || 'Không thể gửi mã OTP lúc này', 'error');
    }
  });

  // Submit Password Change
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const currentPassword = document.getElementById('input-curr-pass')?.value;
    const newPassword = document.getElementById('input-new-pass')?.value;
    const confirmPassword = document.getElementById('input-confirm-pass')?.value;
    const otp = document.getElementById('input-otp')?.value?.trim();

    if (!currentPassword) {
      showToast('Vui lòng nhập mật khẩu hiện tại', 'warning');
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      showToast('Mật khẩu mới phải có ít nhất 8 ký tự', 'warning');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Mật khẩu xác nhận không trùng khớp với mật khẩu mới', 'warning');
      return;
    }
    if (!otp) {
      showToast('Vui lòng nhấn "Gửi mã OTP" và nhập mã xác thực từ email', 'warning');
      return;
    }

    const originalBtnText = btnSubmit.innerHTML;
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = `
      <span class="inline-block animate-spin material-symbols-outlined text-[18px]">progress_activity</span>
      <span>Đang xác thực...</span>
    `;

    try {
      await changeUserPassword({
        currentPassword,
        newPassword,
        confirmPassword,
        otp
      });

      closePasswordModal();

      await confirmModal({
        title: 'Đổi mật khẩu thành công!',
        message: 'Mật khẩu của bạn đã được cập nhật an toàn. Vui lòng đăng nhập lại với mật khẩu mới.',
        type: 'success',
        confirmText: 'Đăng nhập ngay',
        washiTag: 'BẢO MẬT HOÀN TẤT'
      });

      // Clear auth & redirect to login
      await AuthService.logout();
    } catch (err) {
      showToast(err.message || 'Không thể đổi mật khẩu', 'error');
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = originalBtnText;
    }
  });
}

function startOtpCountdown(seconds, btn, hintEl, timerSpan) {
  if (otpCountdownTimer) clearInterval(otpCountdownTimer);

  let remaining = seconds;
  if (hintEl) hintEl.classList.remove('hidden');
  if (timerSpan) timerSpan.textContent = remaining;

  otpCountdownTimer = setInterval(() => {
    remaining--;
    if (timerSpan) timerSpan.textContent = remaining;

    if (remaining <= 0) {
      clearInterval(otpCountdownTimer);
      otpCountdownTimer = null;
      btn.disabled = false;
      btn.textContent = 'Gửi lại mã OTP';
      if (hintEl) hintEl.classList.add('hidden');
    }
  }, 1000);
}

// ===================================================================
// DYNAMIC STUDY ACTIVITY & GITHUB-STYLE HEATMAP LOGIC
// ===================================================================
let currentHeatmapYear = new Date().getFullYear();
let currentHeatmapMonth = new Date().getMonth(); // 0-indexed (9 is Oct)
let heatmapControlsInitialized = false;

function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Lấy hoặc khởi tạo bản đồ lịch sử hoạt động học tập của người dùng
 */
function getUserActivityMap(user) {
  const userId = user?.id || user?.email || 'default_stem_user';
  const storageKey = `bioverse_stem_activity_v3_${userId}`;
  let history = {};

  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) history = JSON.parse(raw);
  } catch (e) {
    console.warn('Không thể đọc lịch sử học tập:', e);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = toDateKey(today);

  // 1. Xác định Thứ 2 đầu tuần hiện tại
  const currentDayOfWeek = today.getDay(); // 0 is Sun, 1 is Mon...
  const diffToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  const mondayKey = toDateKey(monday);

  // 2. Xóa sạch mọi hoạt động của các ngày trong tuần này
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const k = toDateKey(d);
    delete history[k];
  }

  // 3. CHỈ ghi nhận hoạt động cho các ngày THỰC SỰ NẰM TRONG currentStreak
  const currentStreak = Number(user?.currentStreak) || 0;
  let anchorDate = new Date(today);
  if (!user?.checkedInToday && user?.lastCheckInDate) {
    const parsedLast = new Date(user.lastCheckInDate);
    if (!isNaN(parsedLast.getTime())) {
      anchorDate = parsedLast;
      anchorDate.setHours(0, 0, 0, 0);
    }
  }

  if (currentStreak > 0 && anchorDate) {
    for (let i = 0; i < currentStreak; i++) {
      const d = new Date(anchorDate);
      d.setDate(anchorDate.getDate() - i);
      const k = toDateKey(d);
      
      if (k <= todayKey) {
        history[k] = true;
      }
    }
  }

  // 4. Nếu hôm nay đã điểm danh
  if (user?.checkedInToday) {
    history[todayKey] = true;
  }

  // 5. Khởi tạo lịch sử cho các tháng trước (CHỈ CHO CÁC NGÀY TRƯỚC THỨ HAI TUẦN NÀY: < mondayKey)
  const existingKeys = Object.keys(history).filter(k => k < mondayKey);
  if (existingKeys.length < 15) {
    const seed = typeof userId === 'string'
      ? userId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
      : Number(userId) || 77;

    for (let i = 1; i <= 120; i++) {
      const pastDate = new Date(today);
      pastDate.setDate(pastDate.getDate() - i);
      const k = toDateKey(pastDate);

      // BỎ QUA HOÀN TOÀN tuần hiện tại
      if (k >= mondayKey) continue;

      if (!history[k]) {
        const dayVal = pastDate.getDate() * 19 + pastDate.getMonth() * 37 + seed + i;
        const hasStudied = (dayVal % 10) >= 5; // ~50% ngày trong quá khứ có đăng nhập
        if (hasStudied) {
          history[k] = true;
        }
      }
    }
  }

  try {
    localStorage.setItem(storageKey, JSON.stringify(history));
  } catch (e) {}

  return history;
}

/**
 * Vẽ nhịp học các ngày trong tuần (T2 - CN) — CHÍNH XÁC TUYỆT ĐỐI THEO STREAK THẬT
 */
function renderWeeklyStreak(user) {
  const container = document.getElementById('weekly-streak-days');
  const rangeLabel = document.getElementById('weekly-streak-range-label');
  if (!container) return;

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const todayKey = toDateKey(now);

  // Xác định Thứ 2 đầu tuần hiện tại
  const currentDayOfWeek = now.getDay(); // 0 is Sun, 1 is Mon...
  const diffToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(0, 0, 0, 0);

  if (rangeLabel) {
    const startStr = `${String(monday.getDate()).padStart(2, '0')}/${String(monday.getMonth() + 1).padStart(2, '0')}`;
    const endStr = `${String(sunday.getDate()).padStart(2, '0')}/${String(sunday.getMonth() + 1).padStart(2, '0')}`;
    rangeLabel.textContent = `Tuần: ${startStr} - ${endStr}`;
  }

  // Chuỗi streak thực tế từ user
  const currentStreak = Number(user?.currentStreak) || 0;
  const checkedInToday = !!user?.checkedInToday;

  let anchorDate = new Date(now);
  if (!checkedInToday && user?.lastCheckInDate) {
    const parsedLast = new Date(user.lastCheckInDate);
    if (!isNaN(parsedLast.getTime())) {
      anchorDate = parsedLast;
      anchorDate.setHours(0, 0, 0, 0);
    }
  }

  const daysLabel = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  let html = '';

  for (let i = 0; i < 7; i++) {
    const curDate = new Date(monday);
    curDate.setDate(monday.getDate() + i);
    curDate.setHours(0, 0, 0, 0);
    const dateKey = toDateKey(curDate);
    const dayLabel = daysLabel[i];
    const dayMonth = `${curDate.getDate()}/${curDate.getMonth() + 1}`;

    const isToday = (dateKey === todayKey);
    const isFuture = (dateKey > todayKey);

    // Tính toán chính xác ngày có nằm trong streak hay không
    let isDone = false;
    if (isToday) {
      isDone = checkedInToday;
    } else if (!isFuture) {
      // Ngày quá khứ: tính khoảng cách ngày so với anchorDate
      const diffDays = Math.round((anchorDate.getTime() - curDate.getTime()) / (1000 * 60 * 60 * 24));
      if (checkedInToday) {
        // Nếu hôm nay đã checkin, các ngày trước là diffDays = 1, 2, ... < currentStreak
        isDone = (diffDays > 0 && diffDays < currentStreak);
      } else {
        // Nếu hôm nay chưa checkin, anchorDate là hôm qua: diffDays = 0, 1, ... < currentStreak
        isDone = (diffDays >= 0 && diffDays < currentStreak);
      }
    }

    let icon = '⚪';
    let statusText = 'Nghỉ';
    let cardClass = 'bg-[#f6f3f2] border-[#2d2d2d]/20 text-on-surface-variant/70';

    if (isFuture) {
      icon = '⚪';
      statusText = 'Chưa tới';
      cardClass = 'bg-[#fbf9f6] border-[#2d2d2d]/15 text-on-surface-variant/40 opacity-70';
    } else if (isToday) {
      if (isDone) {
        icon = '🔥';
        statusText = 'Đã học';
        cardClass = 'bg-[#e8f5e9] border-[#00864c] text-[#00864c] ring-2 ring-primary sketch-shadow-xs font-bold';
      } else {
        icon = '⏳';
        statusText = 'Hôm nay';
        cardClass = 'bg-[#fff9c4] border-[#d97706] text-[#b45309] ring-2 ring-primary animate-pulse font-bold';
      }
    } else {
      // Ngày đã qua trong tuần
      if (isDone) {
        icon = '🔥';
        statusText = 'Đã học';
        cardClass = 'bg-[#e8f5e9] border-[#00864c] text-[#00864c] font-bold';
      } else {
        icon = '💤';
        statusText = 'Nghỉ';
        cardClass = 'bg-[#f6f3f2] border-[#2d2d2d]/25 text-on-surface-variant/70';
      }
    }

    html += `
      <div class="flex flex-col items-center gap-1 p-2 sm:p-2.5 rounded-xl border-2 ${cardClass} transition-all">
        <span class="font-label-sm text-xs font-bold">${dayLabel}</span>
        <span class="text-[10px] opacity-75 font-mono">${dayMonth}</span>
        <span class="text-base sm:text-lg my-0.5 select-none">${icon}</span>
        <span class="text-[10px] font-bold tracking-tight">${statusText}</span>
      </div>
    `;
  }

  container.innerHTML = html;
}

/**
 * Hiển thị Ma trận Lịch Sử Học Tập dạng GitHub Activity Heatmap theo tháng (Chuẩn UI/UX Pro Max 7 cột)
 */
function renderActivityHeatmap(user) {
  const matrixGrid = document.getElementById('heatmap-matrix-grid');
  const monthLabel = document.getElementById('heatmap-month-label');
  const totalActiveBadge = document.getElementById('heatmap-total-active-badge');
  const monthActiveDaysEl = document.getElementById('heatmap-month-active-days');
  const monthRateEl = document.getElementById('heatmap-month-attendance-rate');
  const monthStreakEl = document.getElementById('heatmap-month-max-streak');
  const monthXpEl = document.getElementById('heatmap-month-total-xp');

  if (!matrixGrid) return;

  const activityMap = getUserActivityMap(user);
  const now = new Date();
  const todayKey = toDateKey(now);

  const displayYear = currentHeatmapYear;
  const displayMonth = currentHeatmapMonth; // 0-indexed

  const monthDisplay = document.getElementById('heatmap-month-display');
  const yearDisplay = document.getElementById('heatmap-year-display');

  const MONTH_SHORT_LABELS = ['Thg 1','Thg 2','Thg 3','Thg 4','Thg 5','Thg 6','Thg 7','Thg 8','Thg 9','Thg 10','Thg 11','Thg 12'];

  if (monthDisplay) {
    monthDisplay.textContent = String(displayMonth + 1);
  }
  if (yearDisplay) {
    yearDisplay.textContent = String(displayYear);
  }

  if (monthLabel) {
    monthLabel.textContent = `Tháng ${displayMonth + 1}, ${displayYear}`;
  }

  // Ngày đầu và ngày cuối của tháng được chọn
  const firstDayOfMonth = new Date(displayYear, displayMonth, 1);
  const lastDayOfMonth = new Date(displayYear, displayMonth + 1, 0);
  const totalDaysInMonth = lastDayOfMonth.getDate();

  // Xác định số ngày đệm trước ngày 1 (Thứ 2 = cột 0, Chủ Nhật = cột 6)
  // getDay(): 0 là CN, 1 là T2, 2 là T3... 6 là T7
  const startDayOfWeek = firstDayOfMonth.getDay();
  const padBefore = (startDayOfWeek + 6) % 7;

  // Xác định số ngày đệm sau ngày cuối tháng để đủ tròn tuần (7 cột)
  const endDayOfWeek = lastDayOfMonth.getDay();
  const padAfter = (7 - ((endDayOfWeek === 0 ? 7 : endDayOfWeek))) % 7;

  // Tính thống kê chuyên cần cho tháng đang xem
  // Tính thống kê chuyên cần cho tháng đang xem
  let monthActiveDays = 0;
  let monthCurrentStreak = 0;
  let monthMaxStreak = 0;

  for (let d = 1; d <= totalDaysInMonth; d++) {
    const k = `${displayYear}-${String(displayMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const hasLoggedIn = !!activityMap[k];
    if (hasLoggedIn) {
      monthActiveDays++;
      monthCurrentStreak++;
      if (monthCurrentStreak > monthMaxStreak) monthMaxStreak = monthCurrentStreak;
    } else {
      monthCurrentStreak = 0;
    }
  }

  const attendanceRate = totalDaysInMonth > 0 ? Math.round((monthActiveDays / totalDaysInMonth) * 100) : 0;
  const monthTotalXp = monthActiveDays * 80;

  // Cập nhật các chỉ số tháng với hiệu ứng số mượt mà
  const totalDaysSub = document.getElementById('heatmap-month-total-days-sub');
  if (totalDaysSub) totalDaysSub.textContent = `/ ${totalDaysInMonth} ngày`;

  if (monthActiveDaysEl) {
    animateStatValue(monthActiveDaysEl, monthActiveDays);
  }
  if (monthRateEl) {
    animateStatValue(monthRateEl, attendanceRate, '%');
  }
  if (monthStreakEl) {
    animateStatValue(monthStreakEl, monthMaxStreak);
  }
  if (monthXpEl) {
    animateStatValue(monthXpEl, monthTotalXp, '', '+');
  }
  if (totalActiveBadge) {
    totalActiveBadge.textContent = `${monthActiveDays} ngày đăng nhập`;
  }

  // Render lưới 7 cột
  let matrixHtml = '';

  // 1. Các ô đệm từ tháng trước
  for (let i = padBefore - 1; i >= 0; i--) {
    const padDate = new Date(displayYear, displayMonth, 0 - i);
    matrixHtml += `
      <div class="heatmap-day-card out-of-month" aria-hidden="true">
        <span class="heatmap-day-number">${padDate.getDate()}</span>
        <span class="w-1.5 h-1.5 opacity-0"></span>
      </div>
    `;
  }

  // 2. Các ngày trong tháng hiện tại (Chỉ kiểm tra có đăng nhập hay không)
  for (let d = 1; d <= totalDaysInMonth; d++) {
    const curDate = new Date(displayYear, displayMonth, d);
    const dateKey = toDateKey(curDate);
    const isToday = (dateKey === todayKey);
    const hasLoggedIn = !!activityMap[dateKey];

    const levelClass = hasLoggedIn ? 'day-active' : 'day-inactive';
    const todayClass = isToday ? 'is-today' : '';
    const dayFormatted = `${String(d).padStart(2, '0')}/${String(displayMonth + 1).padStart(2, '0')}/${displayYear}`;
    const titleAttr = isToday
      ? `Hôm nay (${dayFormatted}): ${hasLoggedIn ? 'Đã điểm danh' : 'Chưa điểm danh'}`
      : `${dayFormatted}: ${hasLoggedIn ? 'Đã đăng nhập' : 'Chưa đăng nhập'}`;

    let bottomIndicator = `<span class="w-1.5 h-1.5 opacity-0"></span>`;
    if (hasLoggedIn) {
      bottomIndicator = `<span class="text-[12px] font-black text-[#059669] leading-none select-none">✓</span>`;
    } else if (isToday) {
      bottomIndicator = `<span class="text-[9px] font-black uppercase text-primary leading-none tracking-tight">Nay</span>`;
    }

    matrixHtml += `
      <div class="heatmap-day-card ${levelClass} ${todayClass}"
           data-date="${dateKey}"
           data-formatted="${dayFormatted}"
           data-logged-in="${hasLoggedIn ? '1' : '0'}"
           data-in-month="1"
           tabindex="0"
           role="button"
           aria-label="${titleAttr}"
           title="${titleAttr}">
        <span class="heatmap-day-number">${d}</span>
        ${bottomIndicator}
      </div>
    `;
  }

  // 3. Các ô đệm sang tháng tiếp theo
  for (let j = 1; j <= padAfter; j++) {
    matrixHtml += `
      <div class="heatmap-day-card out-of-month" aria-hidden="true">
        <span class="heatmap-day-number">${j}</span>
        <span class="w-1.5 h-1.5 opacity-0"></span>
      </div>
    `;
  }

  matrixGrid.innerHTML = matrixHtml;

  // GSAP: Hiệu ứng xuất hiện stagger cho các ô lịch
  if (typeof gsap !== 'undefined') {
    gsap.killTweensOf(matrixGrid.children);
    gsap.fromTo(
      matrixGrid.children,
      { scale: 0.8, opacity: 0, y: 8 },
      {
        scale: 1,
        opacity: 1,
        y: 0,
        duration: 0.28,
        stagger: 0.012,
        ease: 'back.out(1.5)',
        clearProps: 'transform,opacity'
      }
    );
  }

  // Lắng nghe tương tác click vào từng ô ngày
  matrixGrid.querySelectorAll('.heatmap-day-card[data-in-month="1"]').forEach(cell => {
    const triggerSelect = () => {
      matrixGrid.querySelectorAll('.heatmap-day-card').forEach(c => c.classList.remove('is-selected'));
      cell.classList.add('is-selected');

      // GSAP micro-bounce khi chọn ô
      if (typeof gsap !== 'undefined') {
        gsap.fromTo(cell, { scale: 0.9 }, { scale: 1, duration: 0.22, ease: 'back.out(2)' });
      }
    };

    cell.addEventListener('click', triggerSelect);
    cell.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        triggerSelect();
      }
    });
  });
}

/**
 * Gắn sự kiện nút chuyển tháng cho Heatmap
 */
function initHeatmapControls(user) {
  if (heatmapControlsInitialized) return;
  heatmapControlsInitialized = true;

  const btnPrev = document.getElementById('btn-heatmap-prev-month');
  const btnNext = document.getElementById('btn-heatmap-next-month');
  const btnToday = document.getElementById('btn-heatmap-today');

  btnPrev?.addEventListener('click', () => {
    currentHeatmapMonth--;
    if (currentHeatmapMonth < 0) {
      currentHeatmapMonth = 11;
      currentHeatmapYear--;
    }
    renderActivityHeatmap(currentUserData || user);
  });

  btnNext?.addEventListener('click', () => {
    currentHeatmapMonth++;
    if (currentHeatmapMonth > 11) {
      currentHeatmapMonth = 0;
      currentHeatmapYear++;
    }
    renderActivityHeatmap(currentUserData || user);
  });

  btnToday?.addEventListener('click', () => {
    const now = new Date();
    currentHeatmapYear = now.getFullYear();
    currentHeatmapMonth = now.getMonth();
    renderActivityHeatmap(currentUserData || user);
  });

  const selectMonth = document.getElementById('heatmap-select-month'); // legacy fallback

  // ── Month Grid Picker ──
  const monthTrigger = document.getElementById('heatmap-month-trigger');
  const monthPanel = document.getElementById('heatmap-month-panel');
  const monthGrid = document.getElementById('month-panel-grid');
  const monthDisplayEl = document.getElementById('heatmap-month-display');

  const MONTH_LABELS = ['Thg 1','Thg 2','Thg 3','Thg 4','Thg 5','Thg 6','Thg 7','Thg 8','Thg 9','Thg 10','Thg 11','Thg 12'];

  function renderMonthGrid(animate = true) {
    if (!monthGrid) return;
    monthGrid.innerHTML = '';

    const monthYearIndicator = document.getElementById('month-panel-year-indicator');
    if (monthYearIndicator) {
      monthYearIndicator.textContent = `Năm ${currentHeatmapYear}`;
    }

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    for (let m = 0; m < 12; m++) {
      const monthNum = m + 1;
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'month-cell';
      cell.textContent = String(monthNum);
      cell.dataset.month = String(m);
      cell.setAttribute('role', 'option');
      cell.setAttribute('aria-label', `Tháng ${monthNum}`);
      cell.title = `Tháng ${monthNum}`;

      if (m === currentHeatmapMonth) {
        cell.classList.add('is-selected');
        cell.setAttribute('aria-selected', 'true');
      } else {
        cell.setAttribute('aria-selected', 'false');
      }

      if (m === currentMonth && currentHeatmapYear === currentYear) {
        cell.classList.add('is-current');
        cell.title = `Tháng ${monthNum} (Tháng hiện tại)`;
      }

      cell.addEventListener('click', () => {
        currentHeatmapMonth = m;
        if (monthDisplayEl) monthDisplayEl.textContent = String(monthNum);
        const monthSrLabel = document.getElementById('heatmap-month-label');
        if (monthSrLabel) monthSrLabel.textContent = `Tháng ${monthNum}, ${currentHeatmapYear}`;
        closeMonthPanel();
        renderActivityHeatmap(currentUserData || user);
      });

      monthGrid.appendChild(cell);
    }

    if (animate && typeof gsap !== 'undefined') {
      gsap.from(monthGrid.querySelectorAll('.month-cell'), {
        opacity: 0,
        y: 6,
        duration: 0.22,
        stagger: 0.02,
        ease: 'power1.out',
        clearProps: 'all'
      });
    }
  }

  function openMonthPanel() {
    if (!monthPanel) return;
    closeYearPanel(); // Đóng year panel nếu đang mở

    monthPanel.hidden = false;
    monthPanel.setAttribute('aria-hidden', 'false');
    monthTrigger?.setAttribute('aria-expanded', 'true');
    renderMonthGrid(true);

    if (typeof gsap !== 'undefined') {
      gsap.fromTo(monthPanel, {
        opacity: 0, y: -6, scale: 0.97
      }, {
        opacity: 1, y: 0, scale: 1,
        duration: 0.2,
        ease: 'power2.out'
      });
    }
  }

  function closeMonthPanel() {
    if (!monthPanel || monthPanel.hidden) return;
    if (typeof gsap !== 'undefined') {
      gsap.to(monthPanel, {
        opacity: 0, y: -4, scale: 0.97,
        duration: 0.14,
        ease: 'power2.in',
        onComplete: () => {
          monthPanel.hidden = true;
          monthPanel.setAttribute('aria-hidden', 'true');
          monthTrigger?.setAttribute('aria-expanded', 'false');
        }
      });
    } else {
      monthPanel.hidden = true;
      monthPanel.setAttribute('aria-hidden', 'true');
      monthTrigger?.setAttribute('aria-expanded', 'false');
    }
  }

  monthTrigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = monthPanel && !monthPanel.hidden;
    if (isOpen) closeMonthPanel();
    else openMonthPanel();
  });

  // ── Year Grid Picker ──
  const yearTrigger = document.getElementById('heatmap-year-trigger');
  const yearPanel = document.getElementById('heatmap-year-panel');
  const yearGrid = document.getElementById('year-panel-grid');
  const yearRangeLabel = document.getElementById('year-panel-range');
  const yearPanelPrev = document.getElementById('year-panel-prev');
  const yearPanelNext = document.getElementById('year-panel-next');
  const yearDisplay = document.getElementById('heatmap-year-display');

  const YEAR_MIN = 2000;
  const YEAR_MAX = new Date().getFullYear();
  const YEARS_PER_PAGE = 12;
  let yearPageStart = Math.max(YEAR_MIN, YEAR_MAX - YEARS_PER_PAGE + 1);

  function renderYearGrid(pageStart, animate = true) {
    if (!yearGrid) return;
    yearGrid.innerHTML = '';
    const pageEnd = pageStart + YEARS_PER_PAGE - 1;
    if (yearRangeLabel) {
      yearRangeLabel.textContent = `${pageStart} – ${Math.min(pageEnd, YEAR_MAX)}`;
    }

    // Vô hiệu hóa nút prev/next ở ranh giới
    if (yearPanelPrev) yearPanelPrev.disabled = (pageStart <= YEAR_MIN);
    if (yearPanelNext) yearPanelNext.disabled = (pageEnd >= YEAR_MAX);

    const currentYear = new Date().getFullYear();
    for (let y = pageStart; y <= pageEnd; y++) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'year-cell';
      cell.textContent = String(y);
      cell.dataset.year = String(y);

      if (y === currentHeatmapYear) cell.classList.add('is-selected');
      if (y === currentYear) cell.classList.add('is-current');
      if (y > YEAR_MAX) cell.classList.add('is-disabled');

      cell.addEventListener('click', () => {
        currentHeatmapYear = y;
        if (yearDisplay) yearDisplay.textContent = String(y);
        const monthSrLabel = document.getElementById('heatmap-month-label');
        if (monthSrLabel) monthSrLabel.textContent = `Tháng ${currentHeatmapMonth + 1}, ${y}`;
        closeYearPanel();
        renderActivityHeatmap(currentUserData || user);
      });

      yearGrid.appendChild(cell);
    }

    // GSAP stagger animation
    if (animate && typeof gsap !== 'undefined') {
      gsap.from(yearGrid.querySelectorAll('.year-cell'), {
        opacity: 0,
        y: 6,
        duration: 0.22,
        stagger: 0.02,
        ease: 'power1.out',
        clearProps: 'all'
      });
    }
  }

  function openYearPanel() {
    if (!yearPanel) return;
    closeMonthPanel(); // Đóng month panel nếu đang mở

    yearPageStart = Math.max(YEAR_MIN, currentHeatmapYear - Math.floor(YEARS_PER_PAGE / 2));
    yearPageStart = Math.min(yearPageStart, Math.max(YEAR_MIN, YEAR_MAX - YEARS_PER_PAGE + 1));

    yearPanel.hidden = false;
    yearPanel.setAttribute('aria-hidden', 'false');
    yearTrigger?.setAttribute('aria-expanded', 'true');
    renderYearGrid(yearPageStart, true);

    if (typeof gsap !== 'undefined') {
      gsap.fromTo(yearPanel, {
        opacity: 0, y: -6, scale: 0.97
      }, {
        opacity: 1, y: 0, scale: 1,
        duration: 0.2,
        ease: 'power2.out'
      });
    }
  }

  function closeYearPanel() {
    if (!yearPanel || yearPanel.hidden) return;
    if (typeof gsap !== 'undefined') {
      gsap.to(yearPanel, {
        opacity: 0, y: -4, scale: 0.97,
        duration: 0.14,
        ease: 'power2.in',
        onComplete: () => {
          yearPanel.hidden = true;
          yearPanel.setAttribute('aria-hidden', 'true');
          yearTrigger?.setAttribute('aria-expanded', 'false');
        }
      });
    } else {
      yearPanel.hidden = true;
      yearPanel.setAttribute('aria-hidden', 'true');
      yearTrigger?.setAttribute('aria-expanded', 'false');
    }
  }

  yearTrigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = yearPanel && !yearPanel.hidden;
    if (isOpen) closeYearPanel();
    else openYearPanel();
  });

  yearPanelPrev?.addEventListener('click', (e) => {
    e.stopPropagation();
    yearPageStart = Math.max(YEAR_MIN, yearPageStart - YEARS_PER_PAGE);
    renderYearGrid(yearPageStart, true);
  });

  yearPanelNext?.addEventListener('click', (e) => {
    e.stopPropagation();
    yearPageStart = Math.min(YEAR_MAX - YEARS_PER_PAGE + 1, yearPageStart + YEARS_PER_PAGE);
    renderYearGrid(yearPageStart, true);
  });

  // Khởi tạo text hiển thị ban đầu
  if (monthDisplayEl) monthDisplayEl.textContent = String(currentHeatmapMonth + 1);
  if (yearDisplay) yearDisplay.textContent = String(currentHeatmapYear);

  // Click ngoài để đóng cả hai panels
  document.addEventListener('click', (e) => {
    if (monthPanel && !monthPanel.hidden) {
      const wrapper = monthTrigger?.closest('.heatmap-month-picker-wrapper');
      if (wrapper && !wrapper.contains(e.target)) {
        closeMonthPanel();
      }
    }
    if (yearPanel && !yearPanel.hidden) {
      const wrapper = yearTrigger?.closest('.heatmap-year-picker-wrapper');
      if (wrapper && !wrapper.contains(e.target)) {
        closeYearPanel();
      }
    }
  });

  // Keyboard: Escape để đóng
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (monthPanel && !monthPanel.hidden) {
        closeMonthPanel();
        monthTrigger?.focus();
      }
      if (yearPanel && !yearPanel.hidden) {
        closeYearPanel();
        yearTrigger?.focus();
      }
    }
  });

  selectMonth?.addEventListener('change', (e) => {
    currentHeatmapMonth = parseInt(e.target.value, 10);
    renderActivityHeatmap(currentUserData || user);
  });
}

/**
 * Tính toán cấp độ nghiên cứu dựa trên điểm XP
 */
function renderLevelProgress(xp, animate = false) {
  const levelTitle = document.getElementById('account-level-title');
  const levelBar = document.getElementById('level-progress-bar');
  const currentXpEl = document.getElementById('level-current-xp');
  const targetXpEl = document.getElementById('level-target-xp');

  let title = 'Tập Sự STEM';
  let target = 1000;

  if (xp >= 5000) {
    title = 'Bậc Thầy Khoa Học BioVerse 🌟';
    target = 10000;
  } else if (xp >= 2500) {
    title = 'Chuyên Viên Nghiên Cứu 🔬';
    target = 5000;
  } else if (xp >= 1000) {
    title = 'Nhà Thí Nghiệm Tài Ba ⚡';
    target = 2500;
  } else if (xp >= 500) {
    title = 'Học Viên Khám Phá 🌱';
    target = 1000;
  }

  const pct = Math.min(100, Math.round((xp / target) * 100));

  if (levelTitle) levelTitle.textContent = title;
  if (levelBar) {
    if (animate) {
      gsap.fromTo(levelBar, 
        { width: '0%' }, 
        { width: `${pct}%`, duration: 0.85, ease: 'power2.out' }
      );
    } else {
      levelBar.style.width = `${pct}%`;
    }
  }
  if (currentXpEl) currentXpEl.textContent = `${xp.toLocaleString('vi-VN')} XP`;
  if (targetXpEl) targetXpEl.textContent = `${target.toLocaleString('vi-VN')} XP`;

  // Đồng bộ thanh cấp độ trong tab Tổng quan
  const ovTitle = document.getElementById('overview-level-title');
  const ovBar = document.getElementById('overview-level-bar');
  const ovCurrent = document.getElementById('overview-level-current');
  const ovTarget = document.getElementById('overview-level-target');
  const ovRemaining = document.getElementById('overview-level-remaining');
  const ovPct = document.getElementById('overview-level-pct');
  if (ovTitle) ovTitle.textContent = title;
  if (ovCurrent) ovCurrent.textContent = `${xp.toLocaleString('vi-VN')} XP`;
  if (ovTarget) ovTarget.textContent = `${target.toLocaleString('vi-VN')} XP`;
  if (ovRemaining) ovRemaining.textContent = `${Math.max(0, target - xp).toLocaleString('vi-VN')} XP`;
  if (ovPct) ovPct.textContent = `Tiến độ: ${pct}%`;
  if (ovBar) {
    ovBar.dataset.pct = String(pct);
    if (!hasEntranceAnimated || typeof gsap === 'undefined') {
      ovBar.style.width = `${pct}%`;
    } else {
      gsap.to(ovBar, { width: `${pct}%`, duration: 0.6, ease: 'power2.out' });
    }
  }
}

/**
 * Đếm số tăng dần bằng GSAP (chỉ chạy khi giá trị thay đổi)
 */
function animateStatValue(el, value, suffix = '', prefix = '') {
  if (!el) return;
  const from = Number(el.dataset.value || 0);
  el.dataset.value = String(value);
  const format = (n) => `${prefix}${Math.round(n).toLocaleString('vi-VN')}${suffix}`;
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (typeof gsap === 'undefined' || reduceMotion || from === value) {
    el.textContent = format(value);
    return;
  }
  const counter = { n: from };
  gsap.killTweensOf(counter);
  gsap.to(counter, {
    n: value,
    duration: 1.1,
    ease: 'power2.out',
    onUpdate: () => { el.textContent = format(counter.n); }
  });
}

/**
 * Hiệu ứng xuất hiện cho tab Tổng quan (thẻ chỉ số, thanh cấp độ, lối tắt)
 */
function animateOverviewPane() {
  if (typeof gsap === 'undefined') return;
  const pane = document.getElementById('tab-overview');
  if (!pane || pane.classList.contains('hidden')) return;
  const bar = document.getElementById('overview-level-bar');
  const pct = bar?.dataset.pct || '0';
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  tl.fromTo(pane.querySelectorAll('.overview-metric'),
    { y: 18, autoAlpha: 0, scale: 0.96 },
    { y: 0, autoAlpha: 1, scale: 1, duration: 0.45, stagger: 0.07, ease: 'back.out(1.6)', clearProps: 'transform' })
    .fromTo(pane.querySelectorAll('.overview-metric-icon'),
      { rotate: -20, scale: 0.6 },
      { rotate: 0, scale: 1, duration: 0.4, stagger: 0.07, ease: 'back.out(2.2)' }, '<0.1');
  if (bar) {
    tl.fromTo(bar, { width: '0%' }, { width: `${pct}%`, duration: 0.9, ease: 'power2.out' }, '-=0.3');
  }
  tl.fromTo(pane.querySelectorAll('.overview-shortcut'),
    { y: 10, autoAlpha: 0 },
    { y: 0, autoAlpha: 1, duration: 0.3, stagger: 0.05, clearProps: 'transform' }, '-=0.6');
}

/**
 * Kích hoạt hoạt ảnh mở màn giao diện hồ sơ một lần duy nhất khi dữ liệu sẵn sàng
 */
function triggerPageEntranceOnce() {
  if (hasEntranceAnimated) return;
  hasEntranceAnimated = true;
  requestAnimationFrame(() => {
    animatePageEntrance();
  });
}

/**
 * Hiệu ứng chuyển động mở màn trang Hồ Sơ Cá Nhân BioVerse bằng GSAP
 */
function animatePageEntrance() {
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  // 1. Breadcrumbs & Tiêu đề trang
  tl.from('main > div:first-child', {
    y: -16,
    autoAlpha: 0,
    duration: 0.45
  })
  // 2. Thẻ Nghiên cứu sinh Passport (Cột trái)
  .from('#profile-identity-column', {
    x: -28,
    autoAlpha: 0,
    duration: 0.55
  }, '-=0.25')
  // 3. Khối nội dung Tabs Workspace (Cột phải)
  .from('#profile-content-column', {
    x: 28,
    autoAlpha: 0,
    duration: 0.55
  }, '-=0.45')
  // 4. Tab Tổng quan (mặc định)
  .add(() => animateOverviewPane(), '-=0.35')
  // 5. Danh sách huy hiệu STEM
  .from('.stem-badge-item', {
    scale: 0.6,
    autoAlpha: 0,
    duration: 0.35,
    stagger: 0.05,
    ease: 'back.out(2)'
  }, '-=0.25');
}

function formatDateVi(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(value) {
  return escapeHtml(value);
}
