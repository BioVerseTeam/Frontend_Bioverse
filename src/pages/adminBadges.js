import gsap from 'gsap';
import { setupNavbarAuth } from '../utils/authNavbar.js';
import { requireAdmin } from '../utils/adminGuard.js';
import { showToast, confirmModal } from '../components/modal.js';
import {
  listAdminBadges,
  createAdminBadge,
  updateAdminBadge,
  toggleAdminBadge,
  deleteAdminBadge
} from '../api/adminBadgeApi.js';

// Fallback 12 default badges if backend server is not running yet
const DEFAULT_BADGES = [
  { id: 1, code: 'badge-starter', name: 'Tân Binh BioVerse', icon: '🌱', categoryName: 'Nhập môn STEM', filterTag: 'starter', description: 'Đăng ký tài khoản và gia nhập phòng nghiên cứu khoa học BioVerse.', criteriaType: 'ALWAYS_UNLOCKED', criteriaValue: 0, rewardXp: 50, sortOrder: 1, isActive: true, bgUnlocked: 'bg-[#e8f5e9]', borderUnlocked: 'border-[#2e7d32]' },
  { id: 2, code: 'badge-profile-ready', name: 'Hồ Sơ Nghiên Cứu', icon: '🪪', categoryName: 'Thông tin cá nhân', filterTag: 'starter', description: 'Cập nhật đầy đủ họ tên, ngày sinh, số điện thoại và ảnh đại diện.', criteriaType: 'PROFILE_COMPLETED', criteriaValue: 3, rewardXp: 50, sortOrder: 2, isActive: true, bgUnlocked: 'bg-[#e0f2fe]', borderUnlocked: 'border-[#0284c7]' },
  { id: 3, code: 'badge-streak-fire', name: 'Ngọn Lửa Kiên Trì', icon: '🔥', categoryName: 'Chuỗi học tập', filterTag: 'streak', description: 'Duy trì thói quen học tập liên tục từ 3 ngày trở lên.', criteriaType: 'STREAK_DAYS', criteriaValue: 3, rewardXp: 100, sortOrder: 3, isActive: true, bgUnlocked: 'bg-[#ffedd5]', borderUnlocked: 'border-[#ea580c]' },
  { id: 4, code: 'badge-streak-week', name: 'Chiến Binh 7 Ngày', icon: '⚡', categoryName: 'Chuỗi học tập', filterTag: 'streak', description: 'Giữ vững nhịp học suốt 7 ngày trong tuần không gián đoạn.', criteriaType: 'STREAK_DAYS', criteriaValue: 7, rewardXp: 150, sortOrder: 4, isActive: true, bgUnlocked: 'bg-[#f3e8ff]', borderUnlocked: 'border-[#9333ea]' },
  { id: 5, code: 'badge-streak-month', name: 'Học Giả Bất Bại', icon: '🏆', categoryName: 'Kỷ lục chuỗi', filterTag: 'streak', description: 'Chinh phục chuỗi học tập bền bỉ đạt mốc 14 ngày liên tiếp.', criteriaType: 'STREAK_DAYS', criteriaValue: 14, rewardXp: 300, sortOrder: 5, isActive: true, bgUnlocked: 'bg-[#fff9c4]', borderUnlocked: 'border-[#ca8a04]' },
  { id: 6, code: 'badge-microscope', name: 'Kính Hiển Vi Vàng', icon: '🔬', categoryName: 'Thực nghiệm 3D', filterTag: 'lab', description: 'Khám phá bài học mô hình 3D sinh học đầu tiên trong phòng thí nghiệm.', criteriaType: 'MODELS_EXPLORED', criteriaValue: 1, rewardXp: 100, sortOrder: 6, isActive: true, bgUnlocked: 'bg-[#fff9c4]', borderUnlocked: 'border-[#ca8a04]' },
  { id: 7, code: 'badge-anatomy-master', name: 'Nhà Giải Phẫu Nhí', icon: '🫀', categoryName: 'Thực nghiệm 3D', filterTag: 'lab', description: 'Tương tác và khám phá từ 3 mô hình cơ quan cơ thể người trở lên.', criteriaType: 'MODELS_EXPLORED', criteriaValue: 3, rewardXp: 150, sortOrder: 7, isActive: true, bgUnlocked: 'bg-[#fee2e2]', borderUnlocked: 'border-[#dc2626]' },
  { id: 8, code: 'badge-chemistry-lab', name: 'Phù Thủy Phản Ứng', icon: '🧪', categoryName: 'Hóa sinh học', filterTag: 'lab', description: 'Thực nghiệm tương tác hoạt ảnh phản ứng phân tử hóa học.', criteriaType: 'REACTION_EXPLORED', criteriaValue: 1, rewardXp: 120, sortOrder: 8, isActive: true, bgUnlocked: 'bg-[#f3e8ff]', borderUnlocked: 'border-[#7c3aed]' },
  { id: 9, code: 'badge-xp-200', name: 'Học Viên Khám Phá', icon: '⭐', categoryName: 'Cấp độ XP', filterTag: 'xp', description: 'Tích lũy từ 200 XP qua các bài học và luyện tập trắc nghiệm.', criteriaType: 'XP_THRESHOLD', criteriaValue: 200, rewardXp: 50, sortOrder: 9, isActive: true, bgUnlocked: 'bg-[#e8f5e9]', borderUnlocked: 'border-[#2e7d32]' },
  { id: 10, code: 'badge-xp-500', name: 'Nhà Di Truyền Học', icon: '🧬', categoryName: 'Cấp độ XP', filterTag: 'xp', description: 'Chinh phục cột mốc 500 XP nghiên cứu khoa học STEM.', criteriaType: 'XP_THRESHOLD', criteriaValue: 500, rewardXp: 100, sortOrder: 10, isActive: true, bgUnlocked: 'bg-[#e0f2fe]', borderUnlocked: 'border-[#0284c7]' },
  { id: 11, code: 'badge-xp-1000', name: 'Chuyên Viên Tài Ba', icon: '🌟', categoryName: 'Cấp độ XP', filterTag: 'xp', description: 'Đạt từ 1.000 XP để khẳng định kỹ năng nghiên cứu xuất sắc.', criteriaType: 'XP_THRESHOLD', criteriaValue: 1000, rewardXp: 200, sortOrder: 11, isActive: true, bgUnlocked: 'bg-[#ffedd5]', borderUnlocked: 'border-[#ea580c]' },
  { id: 12, code: 'badge-xp-2500', name: 'Viện Sĩ BioVerse', icon: '👑', categoryName: 'Huyền thoại STEM', filterTag: 'xp', description: 'Danh hiệu danh giá nhất dành cho nhà khoa học trẻ tích lũy trên 2.500 XP.', criteriaType: 'XP_THRESHOLD', criteriaValue: 2500, rewardXp: 500, sortOrder: 12, isActive: true, bgUnlocked: 'bg-[#fee2e2]', borderUnlocked: 'border-[#dc2626]' }
];

const state = {
  items: [],
  selectedId: null,
  activeFilter: 'all',
  searchQuery: '',
  listedOnce: false
};

document.addEventListener('DOMContentLoaded', async () => {
  setupNavbarAuth();
  if (!requireAdmin({ loginNext: '/admin-badges', message: 'Chỉ tài khoản ADMIN mới vào được trang này.' })) {
    return;
  }

  bindControls();
  bindEmojiPalette();
  await loadBadges();
});

function bindControls() {
  // Form submission
  document.getElementById('admin-badge-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    saveBadge();
  });

  // Action buttons
  document.getElementById('admin-badge-new')?.addEventListener('click', () => startCreate());
  document.getElementById('admin-badge-toggle')?.addEventListener('click', () => toggleSelectedStatus());

  // Search input
  document.getElementById('admin-badge-search')?.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.trim().toLowerCase();
    renderList({ animate: false });
  });

  // Filter pills
  document.querySelectorAll('#admin-badge-filters [data-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#admin-badge-filters [data-filter]').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      state.activeFilter = btn.dataset.filter;
      renderList({ animate: true });
    });
  });

  // Live input sync to preview
  [
    'badge-field-name',
    'badge-field-code',
    'badge-field-icon',
    'badge-field-category',
    'badge-field-filterTag',
    'badge-field-desc',
    'badge-field-criteriaType',
    'badge-field-criteriaValue',
    'badge-field-rewardXp'
  ].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', () => {
      syncCriteriaUnit();
      renderLivePreview();
    });
    document.getElementById(id)?.addEventListener('change', () => {
      syncCriteriaUnit();
      renderLivePreview();
    });
  });

  // Status pills in form
  document.querySelectorAll('[data-badge-active]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const active = btn.dataset.badgeActive === 'true';
      setValue('badge-field-active', active, 'checked');
      syncStatusPills();
      renderLivePreview();
    });
  });

  // Rank stepper
  document.getElementById('admin-badge-rank-up')?.addEventListener('click', () => changeRank(1));
  document.getElementById('admin-badge-rank-down')?.addEventListener('click', () => changeRank(-1));
}

function bindEmojiPalette() {
  document.querySelectorAll('#quick-emoji-palette [data-emoji]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const emoji = btn.dataset.emoji;
      setValue('badge-field-icon', emoji);
      document.querySelectorAll('#quick-emoji-palette [data-emoji]').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');

      // GSAP bounce preview
      gsap.fromTo(btn, { scale: 0.8 }, { scale: 1.15, duration: 0.2, yoyo: true, repeat: 1 });
      renderLivePreview();
    });
  });
}

async function loadBadges() {
  try {
    const data = await listAdminBadges();
    state.items = Array.isArray(data) && data.length > 0 ? data : DEFAULT_BADGES;
  } catch (err) {
    console.warn('API error, using default badge set:', err);
    state.items = DEFAULT_BADGES;
  }

  updateMetrics();
  renderList({ animate: !state.listedOnce });
  state.listedOnce = true;

  // Auto-select first badge or URL parameter
  const params = new URLSearchParams(window.location.search);
  const paramId = params.get('id');
  const target = paramId ? state.items.find(b => String(b.id) === paramId) : state.items[0];

  if (target) {
    fillForm(target);
  } else {
    startCreate();
  }
}

function updateMetrics() {
  const total = state.items.length;
  const activeCount = state.items.filter(b => b.isActive !== false).length;
  const maxReward = Math.max(0, ...state.items.map(b => b.rewardXp || 0));

  animateStatNumber('metric-total', total);
  animateStatNumber('metric-active', activeCount);
  const rewardEl = document.getElementById('metric-max-xp');
  if (rewardEl) rewardEl.textContent = `${maxReward} XP`;

  const countEl = document.getElementById('admin-badge-count');
  if (countEl) countEl.textContent = `${total} huy hiệu`;
}

function animateStatNumber(id, targetVal) {
  const el = document.getElementById(id);
  if (!el) return;
  const startVal = Number(el.textContent) || 0;
  if (startVal === targetVal) {
    el.textContent = targetVal;
    return;
  }
  const obj = { val: startVal };
  gsap.to(obj, {
    val: targetVal,
    duration: 0.6,
    ease: 'power2.out',
    onUpdate: () => {
      el.textContent = Math.round(obj.val);
    }
  });
}

function filterBadges() {
  return state.items.filter((item) => {
    // Filter by tag
    if (state.activeFilter === 'inactive') {
      if (item.isActive !== false) return false;
    } else if (state.activeFilter !== 'all') {
      if (item.filterTag !== state.activeFilter) return false;
    }

    // Filter by search query
    if (state.searchQuery) {
      const q = state.searchQuery;
      const matchName = item.name?.toLowerCase().includes(q);
      const matchCode = item.code?.toLowerCase().includes(q);
      const matchCat = item.categoryName?.toLowerCase().includes(q);
      if (!matchName && !matchCode && !matchCat) return false;
    }

    return true;
  });
}

function renderList({ animate = false } = {}) {
  const list = document.getElementById('admin-badge-list');
  if (!list) return;

  const filtered = filterBadges();

  if (filtered.length === 0) {
    list.innerHTML = `
      <div class="p-6 text-center text-sm font-['Be_Vietnam_Pro'] text-[#76716a] border-2 border-dashed border-[#2d2d2d]/30 rounded-xl">
        <span class="block text-2xl mb-1">🔍</span>
        Không tìm thấy danh hiệu nào phù hợp.
      </div>
    `;
    return;
  }

  list.innerHTML = filtered.map((b) => {
    const isSelected = String(b.id) === String(state.selectedId);
    const statusText = b.isActive === false ? 'Ẩn' : 'Hiện';
    const statusClass = b.isActive === false ? 'bg-[#ffdad6] text-[#b71422]' : 'bg-[#e8f5e9] text-[#166534]';
    const selectedClass = isSelected ? ' ring-2 ring-[#2d2d2d] bg-[#fff9c4] translate-x-1 shadow-md' : ' bg-white hover:bg-[#fdfbf7]';

    return `
      <button type="button" class="admin-badge-item w-full p-2.5 rounded-xl border-2 border-[#2d2d2d] sketch-shadow-xs flex items-center gap-3 text-left transition-all ${selectedClass}" data-id="${b.id}">
        <div class="w-10 h-10 rounded-lg border border-[#2d2d2d] flex items-center justify-center text-xl shrink-0 ${b.bgUnlocked || 'bg-[#e8f5e9]'}">
          ${b.icon || '🌱'}
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center justify-between gap-1">
            <span class="font-['Epilogue'] text-xs font-bold text-on-surface truncate">${escapeHtml(b.name)}</span>
            <span class="font-['Space_Grotesk'] text-[9px] font-bold px-1.5 py-0.2 rounded border border-[#2d2d2d]/30 ${statusClass}">${statusText}</span>
          </div>
          <div class="flex items-center gap-1.5 mt-0.5 text-[10px] font-['Space_Grotesk'] text-[#76716a]">
            <span>${escapeHtml(b.categoryName || 'STEM')}</span>
            <span>•</span>
            <span class="font-mono">#${b.sortOrder || 1}</span>
            <span>•</span>
            <span class="text-[#ca8a04] font-bold">+${b.rewardXp || 50}XP</span>
          </div>
        </div>
      </button>
    `;
  }).join('');

  // Attach click listener
  list.querySelectorAll('[data-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const item = state.items.find(b => String(b.id) === String(id));
      if (item) fillForm(item);
    });
  });

  if (animate) {
    gsap.from('#admin-badge-list .admin-badge-item', {
      opacity: 0,
      y: 12,
      stagger: 0.03,
      duration: 0.25,
      ease: 'power2.out'
    });
  }
}

function fillForm(badge) {
  state.selectedId = badge.id;

  setValue('badge-field-id', badge.id);
  setValue('badge-field-name', badge.name || '');
  setValue('badge-field-code', badge.code || '');
  setValue('badge-field-icon', badge.icon || '🌱');
  setValue('badge-field-category', badge.categoryName || '');
  setValue('badge-field-filterTag', badge.filterTag || 'starter');
  setValue('badge-field-desc', badge.description || '');
  setValue('badge-field-criteriaType', badge.criteriaType || 'ALWAYS_UNLOCKED');
  setValue('badge-field-criteriaValue', badge.criteriaValue ?? 0);
  setValue('badge-field-rewardXp', badge.rewardXp ?? 50);
  setValue('badge-field-sort', badge.sortOrder ?? 1);
  setValue('badge-field-active', badge.isActive !== false, 'checked');

  // UI state
  setFormMode(false);
  syncStatusPills();
  syncCriteriaUnit();
  renderRankValue();
  renderLivePreview();
  renderList({ animate: false });

  // GSAP subtle pulse on active card
  gsap.fromTo('#badge-live-card', { scale: 0.98 }, { scale: 1, duration: 0.25, ease: 'back.out(2)' });
}

function startCreate() {
  state.selectedId = null;
  const form = document.getElementById('admin-badge-form');
  form?.reset();

  setValue('badge-field-id', '');
  setValue('badge-field-name', '');
  setValue('badge-field-code', '');
  setValue('badge-field-icon', '🌱');
  setValue('badge-field-category', 'Nhập môn STEM');
  setValue('badge-field-filterTag', 'starter');
  setValue('badge-field-desc', '');
  setValue('badge-field-criteriaType', 'ALWAYS_UNLOCKED');
  setValue('badge-field-criteriaValue', 0);
  setValue('badge-field-rewardXp', 50);
  setValue('badge-field-sort', nextSortOrder());
  setValue('badge-field-active', true, 'checked');

  setFormMode(true);
  syncStatusPills();
  syncCriteriaUnit();
  renderRankValue();
  renderLivePreview();
  renderList({ animate: false });

  document.getElementById('badge-field-name')?.focus();
  gsap.fromTo(form, { opacity: 0.8, y: 8 }, { opacity: 1, y: 0, duration: 0.25 });
}

function setFormMode(isCreate) {
  const statusBadge = document.getElementById('admin-badge-status-badge');
  const formTitle = document.getElementById('admin-badge-form-title');
  const formHint = document.getElementById('admin-badge-form-hint');
  const toggleBtn = document.getElementById('admin-badge-toggle');

  if (isCreate) {
    if (statusBadge) statusBadge.textContent = 'Thêm mới';
    if (formTitle) formTitle.textContent = 'Thêm danh hiệu STEM';
    if (formHint) formHint.textContent = 'Thiết lập biểu tượng, tên gọi và điều kiện mở khóa tự động.';
    if (toggleBtn) toggleBtn.hidden = true;
  } else {
    if (statusBadge) statusBadge.textContent = `Sửa #${state.selectedId}`;
    if (formTitle) formTitle.textContent = 'Chỉnh sửa danh hiệu';
    if (formHint) formHint.textContent = 'Cập nhật tiêu chí hoặc điều chỉnh điểm thưởng XP của danh hiệu.';
    if (toggleBtn) {
      toggleBtn.hidden = false;
      const current = state.items.find(b => String(b.id) === String(state.selectedId));
      toggleBtn.textContent = current?.isActive === false ? 'Hiện danh hiệu' : 'Ẩn danh hiệu';
      toggleBtn.className = current?.isActive === false
        ? 'neo-btn rounded-xl px-3.5 py-2 text-xs font-bold bg-[#e8f5e9] text-[#166534] border-2 border-[#2d2d2d]'
        : 'neo-btn rounded-xl px-3.5 py-2 text-xs font-bold bg-[#fee2e2] text-[#991b1b] border-2 border-[#2d2d2d]';
    }
  }
}

function syncStatusPills() {
  const isActive = Boolean(document.getElementById('badge-field-active')?.checked);
  document.getElementById('btn-status-active')?.classList.toggle('is-active', isActive);
  document.getElementById('btn-status-inactive')?.classList.toggle('is-active', !isActive);

  const prevStatus = document.getElementById('preview-badge-status');
  if (prevStatus) {
    prevStatus.textContent = isActive ? 'Đang bật' : 'Đang ẩn';
    prevStatus.className = isActive
      ? 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#dcfce7] text-[#166534] border border-[#2d2d2d]'
      : 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#fee2e2] text-[#991b1b] border border-[#2d2d2d]';
  }
}

function syncCriteriaUnit() {
  const type = valueOf('badge-field-criteriaType') || 'ALWAYS_UNLOCKED';
  const unitLabel = document.getElementById('criteria-unit-label');
  const helpText = document.getElementById('criteria-help-text');
  const valInput = document.getElementById('badge-field-criteriaValue');

  switch (type) {
    case 'ALWAYS_UNLOCKED':
      if (unitLabel) unitLabel.textContent = 'mặc định';
      if (helpText) helpText.textContent = 'Luôn mở khóa ngay khi học sinh đăng ký tài khoản.';
      if (valInput) valInput.disabled = true;
      break;
    case 'PROFILE_COMPLETED':
      if (unitLabel) unitLabel.textContent = 'mục hồ sơ';
      if (helpText) helpText.textContent = 'Số mục thông tin cá nhân cần điền (3 mục: tên, ngày sinh, avatar).';
      if (valInput) { valInput.disabled = false; if (!valInput.value || Number(valInput.value) === 0) valInput.value = 3; }
      break;
    case 'STREAK_DAYS':
      if (unitLabel) unitLabel.textContent = 'ngày liên tiếp';
      if (helpText) helpText.textContent = 'Số ngày học tập liên tục (Streak) cần duy trì.';
      if (valInput) valInput.disabled = false;
      break;
    case 'MODELS_EXPLORED':
      if (unitLabel) unitLabel.textContent = 'mô hình 3D';
      if (helpText) helpText.textContent = 'Số lượng bài học mô hình 3D cần khám phá và tương tác.';
      if (valInput) valInput.disabled = false;
      break;
    case 'REACTION_EXPLORED':
      if (unitLabel) unitLabel.textContent = 'bài thực nghiệm';
      if (helpText) helpText.textContent = 'Số lượng hoạt ảnh phản ứng phân tử hóa học cần làm.';
      if (valInput) valInput.disabled = false;
      break;
    case 'XP_THRESHOLD':
      if (unitLabel) unitLabel.textContent = 'điểm XP';
      if (helpText) helpText.textContent = 'Tổng số điểm kinh nghiệm XP tích lũy trong tài khoản.';
      if (valInput) valInput.disabled = false;
      break;
    default:
      if (unitLabel) unitLabel.textContent = 'giá trị';
      if (valInput) valInput.disabled = false;
      break;
  }
}

function renderLivePreview() {
  const name = valueOf('badge-field-name') || 'Tên danh hiệu';
  const icon = valueOf('badge-field-icon') || '🌱';
  const category = valueOf('badge-field-category') || 'Nhóm danh hiệu';
  const desc = valueOf('badge-field-desc') || 'Mô tả ý nghĩa và hướng dẫn học sinh cách chinh phục.';
  const reward = Number(valueOf('badge-field-rewardXp')) || 0;
  const tag = valueOf('badge-field-filterTag') || 'starter';
  const type = valueOf('badge-field-criteriaType') || 'ALWAYS_UNLOCKED';
  const val = Number(valueOf('badge-field-criteriaValue')) || 0;

  setText('preview-name', name);
  setText('preview-icon', icon);
  setText('preview-category', category);
  setText('preview-desc', desc);
  setText('preview-reward', `+${reward} XP`);

  // Icon container background by tag
  const iconBox = document.getElementById('preview-icon-box');
  if (iconBox) {
    iconBox.className = `w-14 h-14 rounded-2xl border-2 border-[#2d2d2d] flex items-center justify-center text-3xl sketch-shadow-sm shrink-0 transform -rotate-1 ${getBgByTag(tag)}`;
  }

  // Criteria summary text
  let criteriaDesc = 'Điều kiện: Luôn mở khóa';
  if (type === 'PROFILE_COMPLETED') criteriaDesc = `Điều kiện: Điền đủ ${val || 3}/3 mục hồ sơ`;
  else if (type === 'STREAK_DAYS') criteriaDesc = `Điều kiện: Đạt chuỗi streak ${val} ngày`;
  else if (type === 'MODELS_EXPLORED') criteriaDesc = `Điều kiện: Khám phá ${val} mô hình 3D`;
  else if (type === 'REACTION_EXPLORED') criteriaDesc = `Điều kiện: Thực nghiệm ${val} phản ứng hóa học`;
  else if (type === 'XP_THRESHOLD') criteriaDesc = `Điều kiện: Tích lũy đạt ${val.toLocaleString('vi-VN')} XP`;

  setText('preview-criteria-desc', criteriaDesc);
}

function getBgByTag(tag) {
  switch (tag) {
    case 'streak': return 'bg-[#ffedd5]';
    case 'lab': return 'bg-[#f3e8ff]';
    case 'xp': return 'bg-[#fee2e2]';
    default: return 'bg-[#e8f5e9]';
  }
}

function nextSortOrder() {
  const max = state.items.reduce((acc, curr) => Math.max(acc, Number(curr.sortOrder) || 0), 0);
  return max + 1;
}

function changeRank(delta) {
  const current = Number(valueOf('badge-field-sort') || 1);
  const next = Math.max(1, current + delta);
  setValue('badge-field-sort', next);
  renderRankValue();
}

function renderRankValue() {
  const val = valueOf('badge-field-sort') || 1;
  setText('admin-badge-rank-value', `#${val}`);
}

async function saveBadge() {
  const name = valueOf('badge-field-name');
  if (!name) {
    showToast('Vui lòng nhập tên danh hiệu', 'error');
    return;
  }

  const payload = {
    name,
    code: valueOf('badge-field-code'),
    icon: valueOf('badge-field-icon') || '🌱',
    categoryName: valueOf('badge-field-category') || 'Nhập môn STEM',
    filterTag: valueOf('badge-field-filterTag') || 'starter',
    description: valueOf('badge-field-desc'),
    criteriaType: valueOf('badge-field-criteriaType') || 'ALWAYS_UNLOCKED',
    criteriaValue: Number(valueOf('badge-field-criteriaValue')) || 0,
    rewardXp: Number(valueOf('badge-field-rewardXp')) || 50,
    sortOrder: Number(valueOf('badge-field-sort')) || 1,
    isActive: Boolean(document.getElementById('badge-field-active')?.checked)
  };

  const saveBtn = document.getElementById('admin-badge-save');
  if (saveBtn) saveBtn.disabled = true;

  try {
    let saved;
    if (state.selectedId) {
      saved = await updateAdminBadge(state.selectedId, payload);
      // Update in local state
      const idx = state.items.findIndex(b => String(b.id) === String(state.selectedId));
      if (idx !== -1) state.items[idx] = { ...state.items[idx], ...saved };
      showToast(`Đã lưu danh hiệu "${name}"`, 'success');
    } else {
      saved = await createAdminBadge(payload);
      state.items.push(saved);
      state.selectedId = saved.id;
      showToast(`Đã tạo danh hiệu mới "${name}"`, 'success');
    }

    updateMetrics();
    fillForm(saved);
    renderList({ animate: true });
  } catch (err) {
    // If backend is not available, simulate locally for smooth UI preview
    if (!state.selectedId) {
      const mockSaved = { ...payload, id: Date.now() };
      state.items.push(mockSaved);
      state.selectedId = mockSaved.id;
      fillForm(mockSaved);
      showToast(`[Thử nghiệm cục bộ] Đã tạo "${name}"`, 'info');
    } else {
      const idx = state.items.findIndex(b => String(b.id) === String(state.selectedId));
      if (idx !== -1) state.items[idx] = { ...state.items[idx], ...payload };
      fillForm(state.items[idx]);
      showToast(`[Thử nghiệm cục bộ] Đã cập nhật "${name}"`, 'info');
    }
    updateMetrics();
    renderList({ animate: false });
  } finally {
    if (saveBtn) saveBtn.disabled = false;
  }
}

async function toggleSelectedStatus() {
  if (!state.selectedId) return;
  const current = state.items.find(b => String(b.id) === String(state.selectedId));
  if (!current) return;

  const nextActive = !Boolean(current.isActive);
  try {
    await toggleAdminBadge(state.selectedId);
    current.isActive = nextActive;
    fillForm(current);
    updateMetrics();
    renderList({ animate: false });
    showToast(nextActive ? `Đã bật hiển thị danh hiệu` : `Đã ẩn danh hiệu`, 'info');
  } catch {
    current.isActive = nextActive;
    fillForm(current);
    updateMetrics();
    renderList({ animate: false });
    showToast(`Đã đổi trạng thái (cục bộ)`, 'info');
  }
}

function valueOf(id) {
  const el = document.getElementById(id);
  if (!el) return '';
  return el.value?.trim?.() ?? el.value ?? '';
}

function setValue(id, value, prop = 'value') {
  const el = document.getElementById(id);
  if (!el) return;
  if (prop === 'checked') {
    el.checked = Boolean(value);
  } else {
    el.value = value ?? '';
  }
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
