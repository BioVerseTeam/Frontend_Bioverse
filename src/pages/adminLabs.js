/**
 * Admin lab catalog — independent from specimen labels.
 */

import { setupNavbarAuth } from '../utils/authNavbar.js';
import { requireAdmin } from '../utils/adminGuard.js';
import { showToast } from '../components/modal.js';
import {
  listAdminLabs,
  createAdminLab,
  updateAdminLab,
  deleteAdminLab
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
    loginNext: '/admin-labs.html',
    message: 'Chỉ ADMIN mới quản lý được lab.'
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
  document.getElementById('admin-lab-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    saveForm();
  });
  document.getElementById('admin-lab-new')?.addEventListener('click', () => startCreate());
  document.getElementById('admin-lab-hide')?.addEventListener('click', () => hideSelected());
  document.getElementById('admin-lab-rank-up')?.addEventListener('click', () => moveRank(-1));
  document.getElementById('admin-lab-rank-down')?.addEventListener('click', () => moveRank(1));
  ['lab-field-name', 'lab-field-code'].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', () => {
      renderLive();
      renderRank();
    });
  });
  document.querySelectorAll('[data-lab-active]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setValue('lab-field-active', btn.dataset.labActive === 'true', 'checked');
      syncStatus();
    });
  });
}

async function loadList() {
  try {
    state.items = await listAdminLabs();
    renderList({ animate: !state.listedOnce });
    state.listedOnce = true;
    applyDeskLink();
    if (!state.selectedId) {
      setValue('lab-field-sort', nextSortOrder());
      renderRank();
      renderLive();
      syncStatus();
    }
  } catch (err) {
    showToast(err.message || 'Không tải được lab.', 'error');
  }
}

function renderList({ animate = false } = {}) {
  const list = document.getElementById('admin-lab-list');
  const count = document.getElementById('admin-lab-count');
  if (count) count.textContent = `${state.items.length} lab`;
  if (!list) return;
  list.innerHTML = state.items.map((item) => {
    const selected = String(item.id) === String(state.selectedId) ? ' is-selected' : '';
    const status = item.isActive === false ? 'Ẩn' : 'Hiện';
    const kind = item.isSystem ? 'Hệ thống' : item.code;
    return `
      <button type="button" class="admin-model-item${selected}" data-id="${item.id}">
        <span class="min-w-0 flex-1">
          <span class="block font-['Epilogue'] text-sm font-bold truncate">${escapeHtml(item.name)}</span>
          <span class="block font-['Space_Grotesk'] text-[10px] font-bold text-[#00864c] uppercase">${escapeHtml(kind)} · ${status}</span>
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
  setValue('lab-field-id', '');
  setValue('lab-field-name', '');
  setValue('lab-field-code', '');
  setValue('lab-field-desc', '');
  setValue('lab-field-sort', nextSortOrder());
  setValue('lab-field-active', true, 'checked');
  const code = document.getElementById('lab-field-code');
  if (code) code.disabled = false;
  setCopy('Thêm lab', 'Đặt tên và mã. Mã gắn vào nhân mẫu khi học sinh bấm thẻ.', true);
  show(document.getElementById('admin-lab-hide'), false);
  syncStatus();
  renderList();
  renderRank();
  renderLive();
  animateEditorSwap(document.getElementById('admin-lab-form'), { creating: true });
  document.getElementById('lab-field-name')?.focus();
}

function fillForm(item, { animate = true } = {}) {
  state.selectedId = item.id;
  setValue('lab-field-id', item.id);
  setValue('lab-field-name', item.name || '');
  setValue('lab-field-code', item.code || '');
  setValue('lab-field-desc', item.description || '');
  setValue('lab-field-sort', item.sortOrder ?? 0);
  setValue('lab-field-active', item.isActive !== false, 'checked');
  const code = document.getElementById('lab-field-code');
  if (code) code.disabled = Boolean(item.isSystem);
  setCopy(
    item.isSystem ? item.name || 'Lab hệ thống' : item.name || 'Sửa lab',
    item.isSystem ? 'Lab hệ thống không đổi mã, không ẩn được.' : 'Đổi tên hoặc mã. Lab chưa có viewer sẽ mở hộp sọ.',
    false
  );
  show(document.getElementById('admin-lab-hide'), !item.isSystem);
  syncStatus();
  renderList();
  stampSelect(document.querySelector('#admin-lab-list .is-selected'));
  renderRank();
  renderLive();
  if (animate) animateEditorSwap(document.getElementById('admin-lab-form'), { creating: false });
}

function setCopy(title, hint, creating) {
  const form = document.getElementById('admin-lab-form');
  const badge = document.getElementById('admin-lab-badge');
  const titleEl = document.getElementById('admin-lab-title');
  const hintEl = document.getElementById('admin-lab-hint');
  form?.setAttribute('data-mode', creating ? 'create' : 'edit');
  if (badge) {
    badge.textContent = creating ? 'Thêm mới' : 'Đang sửa';
    badge.classList.toggle('is-active', creating);
  }
  if (titleEl) titleEl.textContent = title;
  if (hintEl) hintEl.textContent = hint;
}

function syncStatus() {
  const active = Boolean(document.getElementById('lab-field-active')?.checked);
  document.querySelectorAll('[data-lab-active]').forEach((btn) => {
    btn.classList.toggle('is-active', (btn.dataset.labActive === 'true') === active);
  });
}

function rankedPeers() {
  const peers = state.items.filter((item) => String(item.id) !== String(state.selectedId));
  const draft = {
    id: state.selectedId || 'draft',
    name: valueOf('lab-field-name') || 'Lab đang soạn',
    sortOrder: Number(valueOf('lab-field-sort') || 0),
    isDraft: true
  };
  return [...peers, draft].sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0) || String(a.name).localeCompare(String(b.name)));
}

function renderRank() {
  const queue = document.getElementById('admin-lab-rank-queue');
  const valueEl = document.getElementById('admin-lab-rank-value');
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
  const current = Number(valueOf('lab-field-sort') || 0);
  const target = Number(neighbor.sortOrder) || current + delta;
  setValue('lab-field-sort', delta < 0 ? Math.max(0, target - 1) : target + 1);
  renderRank();
  slideRank(document.querySelector('#admin-lab-rank-queue .admin-rank-item.is-current'), delta);
}

function renderLive() {
  const name = document.getElementById('admin-lab-live-name');
  const code = document.getElementById('admin-lab-live-code');
  if (name) name.textContent = valueOf('lab-field-name') || 'Tên lab';
  if (code) {
    const raw = valueOf('lab-field-code').trim() || 'tự tạo từ tên khi lưu';
    code.textContent = `lab.html?mode=${raw}`;
  }
}

function nextSortOrder() {
  return state.items.reduce((acc, item) => Math.max(acc, Number(item.sortOrder) || 0), -1) + 1;
}

async function saveForm() {
  const name = valueOf('lab-field-name').trim();
  if (!name) {
    showToast('Nhập tên lab.', 'warning');
    document.getElementById('lab-field-name')?.focus();
    return;
  }
  const payload = {
    name,
    code: valueOf('lab-field-code').trim() || undefined,
    description: valueOf('lab-field-desc').trim(),
    sortOrder: Number(valueOf('lab-field-sort') || 0),
    isActive: Boolean(document.getElementById('lab-field-active')?.checked)
  };
  try {
    const saved = state.selectedId
      ? await updateAdminLab(state.selectedId, payload)
      : await createAdminLab(payload);
    upsert(saved);
    showToast(state.selectedId ? 'Đã cập nhật lab.' : 'Đã thêm lab.', 'success');
    fillForm(saved, { animate: false });
    flashSaved(document.getElementById('admin-lab-form'));
  } catch (err) {
    showToast(err.message || 'Không lưu được lab.', 'error');
  }
}

async function hideSelected() {
  if (!state.selectedId) return;
  const current = state.items.find((item) => item.id === state.selectedId);
  if (current?.isSystem) {
    showToast('Lab hệ thống không ẩn được.', 'warning');
    return;
  }
  try {
    await deleteAdminLab(state.selectedId);
    if (current) upsert({ ...current, isActive: false });
    showToast('Đã ẩn lab.', 'success');
    startCreate();
  } catch (err) {
    showToast(err.message || 'Không ẩn được lab.', 'error');
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
