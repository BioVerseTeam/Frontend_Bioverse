/**
 * Admin category catalog — independent from specimen labels.
 */

import { setupNavbarAuth } from '../utils/authNavbar.js';
import { requireAdmin } from '../utils/adminGuard.js';
import { showToast } from '../components/modal.js';
import {
  listAdminCategories,
  createAdminCategory,
  updateAdminCategory,
  deleteAdminCategory
} from '../api/adminBioModelApi.js';
import {
  animateEditorSwap,
  stampSelect,
  flashSaved,
  revealList,
  slideRank
} from '../utils/adminMotion.js';

const state = {
  items: [],
  selectedId: null,
  listedOnce: false
};

document.addEventListener('DOMContentLoaded', () => {
  try {
    setupNavbarAuth();
  } catch (err) {
    console.warn('Admin navbar failed', err);
  }
  if (!requireAdmin({
    loginNext: '/admin-categories',
    message: 'Chỉ ADMIN mới quản lý được loại mẫu.'
  })) return;

  bindControls();
  loadList();
});

function applyDeskLink() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('create') === '1') {
    startCreate();
    return;
  }
  const id = params.get('id');
  if (!id) return;
  const item = state.items.find((entry) => String(entry.id) === String(id));
  if (item) fillForm(item);
}

function bindControls() {
  document.getElementById('admin-cat-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    saveForm();
  });
  document.getElementById('admin-cat-new')?.addEventListener('click', () => startCreate());
  document.getElementById('admin-cat-hide')?.addEventListener('click', () => hideSelected());
  document.getElementById('admin-cat-rank-up')?.addEventListener('click', () => moveRank(-1));
  document.getElementById('admin-cat-rank-down')?.addEventListener('click', () => moveRank(1));
  document.getElementById('cat-field-name')?.addEventListener('input', () => {
    renderLive();
    renderRank();
  });
  document.querySelectorAll('[data-cat-active]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setValue('cat-field-active', btn.dataset.catActive === 'true', 'checked');
      syncStatus();
      renderRank();
    });
  });
}

async function loadList() {
  try {
    state.items = await listAdminCategories();
    renderList({ animate: !state.listedOnce });
    state.listedOnce = true;
    applyDeskLink();
    if (!state.selectedId) {
      setValue('cat-field-sort', nextSortOrder());
      renderRank();
      renderLive();
      syncStatus();
    }
  } catch (err) {
    showToast(err.message || 'Không tải được loại mẫu.', 'error');
  }
}

function renderList({ animate = false } = {}) {
  const list = document.getElementById('admin-cat-list');
  const count = document.getElementById('admin-cat-count');
  if (count) count.textContent = `${state.items.length} loại mẫu`;
  if (!list) return;
  list.innerHTML = state.items.map((item) => {
    const selected = String(item.id) === String(state.selectedId) ? ' is-selected' : '';
    const status = item.isActive === false ? 'Ẩn' : 'Hiện';
    return `
      <button type="button" class="admin-model-item${selected}" data-id="${item.id}">
        <span class="min-w-0 flex-1">
          <span class="block font-['Epilogue'] text-sm font-bold truncate">${escapeHtml(item.name)}</span>
          <span class="block font-['Space_Grotesk'] text-[10px] font-bold text-[#00864c] uppercase">${status} · hàng ${rankLabel(item)}</span>
        </span>
      </button>
    `;
  }).join('');
  list.querySelectorAll('[data-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = state.items.find((entry) => String(entry.id) === btn.dataset.id);
      if (item) fillForm(item);
    });
  });
  if (animate) revealList(list);
}

function startCreate() {
  state.selectedId = null;
  setValue('cat-field-id', '');
  setValue('cat-field-name', '');
  setValue('cat-field-sort', nextSortOrder());
  setValue('cat-field-active', true, 'checked');
  setCopy('Thêm loại mẫu', 'Đặt tên chip lọc. Học sinh chỉ thấy loại đang bật.', true);
  show(document.getElementById('admin-cat-hide'), false);
  syncStatus();
  renderList();
  renderRank();
  renderLive();
  animateEditorSwap(document.getElementById('admin-cat-form'), { creating: true });
  document.getElementById('cat-field-name')?.focus();
}

function fillForm(item, { animate = true } = {}) {
  state.selectedId = item.id;
  setValue('cat-field-id', item.id);
  setValue('cat-field-name', item.name || '');
  setValue('cat-field-sort', item.sortOrder ?? 0);
  setValue('cat-field-active', item.isActive !== false, 'checked');
  setCopy(item.name || 'Sửa loại mẫu', 'Đổi tên hoặc ẩn khỏi bộ lọc. Nhân mẫu đã gắn không bị xóa.', false);
  show(document.getElementById('admin-cat-hide'), true);
  syncStatus();
  renderList();
  stampSelect(document.querySelector('#admin-cat-list .is-selected'));
  renderRank();
  renderLive();
  if (animate) animateEditorSwap(document.getElementById('admin-cat-form'), { creating: false });
}

function setCopy(title, hint, creating) {
  const form = document.getElementById('admin-cat-form');
  const badge = document.getElementById('admin-cat-badge');
  const titleEl = document.getElementById('admin-cat-title');
  const hintEl = document.getElementById('admin-cat-hint');
  form?.setAttribute('data-mode', creating ? 'create' : 'edit');
  if (badge) {
    badge.textContent = creating ? 'Thêm mới' : 'Đang sửa';
    badge.classList.toggle('is-active', creating);
  }
  if (titleEl) titleEl.textContent = title;
  if (hintEl) hintEl.textContent = hint;
}

function syncStatus() {
  const active = Boolean(document.getElementById('cat-field-active')?.checked);
  document.querySelectorAll('[data-cat-active]').forEach((btn) => {
    btn.classList.toggle('is-active', (btn.dataset.catActive === 'true') === active);
  });
}

function rankedPeers() {
  const peers = state.items.filter((item) => String(item.id) !== String(state.selectedId));
  const draft = {
    id: state.selectedId || 'draft',
    name: valueOf('cat-field-name') || 'Loại đang soạn',
    sortOrder: Number(valueOf('cat-field-sort') || 0),
    isDraft: true
  };
  return [...peers, draft].sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0) || String(a.name).localeCompare(String(b.name)));
}

function renderRank() {
  const queue = document.getElementById('admin-cat-rank-queue');
  const valueEl = document.getElementById('admin-cat-rank-value');
  const rows = rankedPeers();
  const index = Math.max(0, rows.findIndex((item) => item.isDraft));
  if (valueEl) valueEl.textContent = `#${index + 1}`;
  if (!queue) return;
  queue.innerHTML = rows.map((item, i) => `
    <li class="admin-rank-item${item.isDraft ? ' is-current' : ''}">
      <em>#${i + 1}</em>
      <span>${escapeHtml(item.name)}</span>
      ${item.isDraft ? '<span class="font-[\'Space_Grotesk\'] text-[10px] font-bold uppercase text-[#00864c]">Đang xếp</span>' : ''}
    </li>
  `).join('');
}

function moveRank(delta) {
  const rows = rankedPeers();
  const index = rows.findIndex((item) => item.isDraft);
  const neighbor = rows[index + delta];
  if (!neighbor || neighbor.isDraft) return;
  const current = Number(valueOf('cat-field-sort') || 0);
  const target = Number(neighbor.sortOrder) || current + delta;
  setValue('cat-field-sort', delta < 0 ? Math.max(0, target - 1) : target + 1);
  renderRank();
  slideRank(document.querySelector('#admin-cat-rank-queue .admin-rank-item.is-current'), delta);
}

function renderLive() {
  const chip = document.getElementById('admin-cat-live-chip');
  if (chip) chip.textContent = valueOf('cat-field-name') || 'Tên loại';
}

function nextSortOrder() {
  return state.items.reduce((acc, item) => Math.max(acc, Number(item.sortOrder) || 0), -1) + 1;
}

function rankLabel(item) {
  const sorted = [...state.items].sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0));
  return `#${sorted.findIndex((entry) => entry.id === item.id) + 1}`;
}

async function saveForm() {
  const name = valueOf('cat-field-name').trim();
  if (!name) {
    showToast('Nhập tên loại mẫu.', 'warning');
    document.getElementById('cat-field-name')?.focus();
    return;
  }
  const payload = {
    name,
    sortOrder: Number(valueOf('cat-field-sort') || 0),
    isActive: Boolean(document.getElementById('cat-field-active')?.checked)
  };
  try {
    const saved = state.selectedId
      ? await updateAdminCategory(state.selectedId, payload)
      : await createAdminCategory(payload);
    upsert(saved);
    showToast(state.selectedId ? 'Đã cập nhật loại mẫu.' : 'Đã thêm loại mẫu.', 'success');
    fillForm(saved, { animate: false });
    flashSaved(document.getElementById('admin-cat-form'));
  } catch (err) {
    showToast(err.message || 'Không lưu được loại mẫu.', 'error');
  }
}

async function hideSelected() {
  if (!state.selectedId) return;
  try {
    await deleteAdminCategory(state.selectedId);
    const current = state.items.find((item) => item.id === state.selectedId);
    if (current) upsert({ ...current, isActive: false });
    showToast('Đã ẩn loại mẫu.', 'success');
    startCreate();
  } catch (err) {
    showToast(err.message || 'Không ẩn được loại mẫu.', 'error');
  }
}

function upsert(updated) {
  const index = state.items.findIndex((item) => item.id === updated.id);
  if (index >= 0) state.items[index] = updated;
  else state.items.push(updated);
}

function setValue(id, value, type = 'value') {
  const el = document.getElementById(id);
  if (!el) return;
  if (type === 'checked') {
    el.checked = Boolean(value);
    return;
  }
  el.value = value ?? '';
}

function valueOf(id) {
  return document.getElementById(id)?.value || '';
}

function show(el, visible) {
  if (!el) return;
  el.hidden = !visible;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
