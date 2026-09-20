/**
 * Admin reaction equations — upload .chemx ahead of class,
 * with molecule crop preview (pan / zoom) for upload UX.
 */

import gsap from 'gsap';
import { setupNavbarAuth } from '../utils/authNavbar.js';
import { requireAdmin } from '../utils/adminGuard.js';
import { showToast } from '../components/modal.js';
import {
  listAdminReactions,
  createAdminReaction,
  updateAdminReaction,
  deleteAdminReaction,
} from '../api/adminReactionApi.js';
import {
  animateEditorSwap,
  stampSelect,
  flashSaved,
  revealList,
  slideRank,
  prefersReducedMotion,
  popIn,
} from '../utils/adminMotion.js';
import { createChemxCropper } from '../features/reactionAnim/chemxPreview.js';

const state = {
  items: [],
  selectedId: null,
  listedOnce: false,
  pendingChemx: null,
  hasStoredChemx: false,
  cropper: null,
};

document.addEventListener('DOMContentLoaded', () => {
  try {
    setupNavbarAuth();
  } catch (err) {
    console.warn('Admin navbar failed', err);
  }
  if (!requireAdmin({
    loginNext: '/admin-reactions',
    message: 'Chỉ ADMIN mới cấu hình được phương trình hoá học.',
  })) return;

  const canvas = document.getElementById('rx-crop-canvas');
  if (canvas) state.cropper = createChemxCropper(canvas);

  bindControls();
  bindChemxDrop();
  bindCropperUi();
  entranceMotion();
  loadList();
});

function entranceMotion() {
  if (prefersReducedMotion()) return;
  const hero = document.querySelector('#admin-workspace > .relative');
  const aside = document.querySelector('#admin-workspace aside');
  const form = document.getElementById('admin-rx-form');
  const tl = gsap.timeline({ defaults: { ease: 'power2.out', overwrite: 'auto' } });
  if (hero) {
    tl.fromTo(hero, { y: 14, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.32 }, 0);
  }
  if (aside) {
    tl.fromTo(aside, { y: 16, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.34 }, 0.06);
  }
  if (form) {
    tl.fromTo(form, { y: 18, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.36 }, 0.1);
  }
}

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
  document.getElementById('admin-rx-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    saveForm();
  });
  document.getElementById('admin-rx-new')?.addEventListener('click', () => startCreate());
  document.getElementById('admin-rx-hide')?.addEventListener('click', () => hideSelected());
  document.getElementById('admin-rx-rank-up')?.addEventListener('click', () => moveRank(-1));
  document.getElementById('admin-rx-rank-down')?.addEventListener('click', () => moveRank(1));
  document.getElementById('rx-field-file')?.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) await loadChemxFile(file);
  });
  ['rx-field-title', 'rx-field-subtitle', 'rx-field-grade'].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', () => {
      renderLive();
      renderRank();
    });
  });
  document.querySelectorAll('[data-rx-active]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setValue('rx-field-active', btn.dataset.rxActive === 'true', 'checked');
      syncStatus();
    });
  });
}

function bindChemxDrop() {
  const zone = document.getElementById('rx-chemx-drop');
  const input = document.getElementById('rx-field-file');
  if (!zone || !input) return;

  const openPicker = () => input.click();
  zone.addEventListener('click', openPicker);
  zone.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openPicker();
    }
  });

  ['dragenter', 'dragover'].forEach((type) => {
    zone.addEventListener(type, (event) => {
      event.preventDefault();
      event.stopPropagation();
      zone.classList.add('is-drag');
    });
  });
  ['dragleave', 'dragend'].forEach((type) => {
    zone.addEventListener(type, (event) => {
      event.preventDefault();
      zone.classList.remove('is-drag');
    });
  });
  zone.addEventListener('drop', async (event) => {
    event.preventDefault();
    event.stopPropagation();
    zone.classList.remove('is-drag');
    const file = [...(event.dataTransfer?.files || [])]
      .find((item) => /\.(chemx|json)$/i.test(item.name));
    if (!file) {
      showToast('Hãy thả file .chemx hoặc .json.', 'warning');
      return;
    }
    await loadChemxFile(file);
  });
}

function bindCropperUi() {
  const zoom = document.getElementById('rx-crop-zoom');
  zoom?.addEventListener('input', () => {
    state.cropper?.setZoomFactor(Number(zoom.value || 1));
  });
  document.getElementById('rx-crop-canvas')?.addEventListener('chemx-zoom', (event) => {
    if (zoom) zoom.value = String(event.detail?.factor || 1);
  });
  document.getElementById('rx-crop-fit')?.addEventListener('click', () => {
    if (!state.pendingChemx && !state.hasStoredChemx) return;
    const data = state.pendingChemx || currentStoredChemx();
    if (!data) return;
    const info = state.cropper?.setChemx(data);
    if (zoom) zoom.value = '1';
    updateCropFrameLabel(info);
    pulseCrop();
  });
  document.getElementById('rx-crop-clear')?.addEventListener('click', () => {
    state.pendingChemx = null;
    state.cropper?.clear();
    show(document.getElementById('rx-chemx-crop'), false);
    document.getElementById('rx-chemx-drop')?.classList.remove('is-ready');
    if (state.selectedId && state.hasStoredChemx) {
      const item = state.items.find((entry) => entry.id === state.selectedId);
      setChemxStatus(
        item?.keyframeCount != null
          ? `${item.keyframeCount} trạng thái đã lưu · chọn file mới nếu muốn thay`
          : 'Đã có hoạt ảnh · chọn file mới nếu muốn thay'
      );
      showStoredCrop(item);
    } else {
      setChemxStatus(state.selectedId ? 'Chưa có file mới' : 'Chưa có file — bắt buộc khi thêm mới');
    }
    showToast('Đã bỏ file vừa chọn.', 'success');
  });
  document.getElementById('rx-crop-prev')?.addEventListener('click', () => stepCropFrame(-1));
  document.getElementById('rx-crop-next')?.addEventListener('click', () => stepCropFrame(1));
}

function stepCropFrame(delta) {
  if (!state.cropper?.frameCount) return;
  const next = state.cropper.frameIndex + delta;
  state.cropper.setFrameIndex(next);
  const zoom = document.getElementById('rx-crop-zoom');
  if (zoom) zoom.value = '1';
  updateCropFrameLabel({
    frameIndex: state.cropper.frameIndex,
    frameCount: state.cropper.frameCount,
  });
}

function updateCropFrameLabel(info) {
  const el = document.getElementById('rx-crop-frame-label');
  if (!el || !info?.frameCount) return;
  el.textContent = `KF ${info.frameIndex + 1}/${info.frameCount}`;
}

function pulseCrop() {
  const stage = document.querySelector('.rx-chemx-stage');
  if (!stage || prefersReducedMotion()) return;
  gsap.fromTo(stage, { scale: 0.985 }, {
    scale: 1,
    duration: 0.28,
    ease: 'power2.out',
    overwrite: true,
  });
}

function currentStoredChemx() {
  const item = state.items.find((entry) => entry.id === state.selectedId);
  return item?.chemx || null;
}

function showStoredCrop(item) {
  const panel = document.getElementById('rx-chemx-crop');
  if (!item?.chemx || !state.cropper) {
    show(panel, false);
    return;
  }
  const info = state.cropper.setChemx(item.chemx);
  const zoom = document.getElementById('rx-crop-zoom');
  if (zoom) zoom.value = '1';
  updateCropFrameLabel(info);
  show(panel, true);
}

async function loadChemxFile(file) {
  const name = (file?.name || '').toLowerCase();
  if (!name.endsWith('.chemx') && !name.endsWith('.json')) {
    showToast('Hãy chọn file .chemx hoặc .json.', 'warning');
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    showToast('File lớn hơn 10MB.', 'error');
    return;
  }
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (!Array.isArray(data?.keyframes) || !data.keyframes.length) {
      showToast('File thiếu danh sách keyframe.', 'error');
      return;
    }
    state.pendingChemx = data;
    setChemxStatus(`${data.keyframes.length} trạng thái · ${file.name}`);
    if (!valueOf('rx-field-title') && data.metadata?.name) {
      setValue('rx-field-title', data.metadata.name);
    }
    if (!valueOf('rx-field-name') && data.metadata?.name) {
      setValue('rx-field-name', data.metadata.name);
    }
    if (!valueOf('rx-field-desc') && data.metadata?.description) {
      setValue('rx-field-desc', data.metadata.description);
    }
    const zone = document.getElementById('rx-chemx-drop');
    zone?.classList.add('is-ready');
    const panel = document.getElementById('rx-chemx-crop');
    show(panel, true);
    const info = state.cropper?.setChemx(data);
    const zoom = document.getElementById('rx-crop-zoom');
    if (zoom) zoom.value = '1';
    updateCropFrameLabel(info);
    renderLive();
    if (panel && !prefersReducedMotion()) {
      popIn(panel);
      pulseCrop();
    }
    showToast('Đã đọc file .chemx — crop khung phân tử bên dưới.', 'success');
  } catch {
    showToast('File không phải JSON hợp lệ.', 'error');
  }
}

function setChemxStatus(text) {
  const el = document.getElementById('rx-chemx-status');
  if (el) el.textContent = text;
}

async function loadList() {
  try {
    state.items = await listAdminReactions();
    renderList({ animate: !state.listedOnce });
    state.listedOnce = true;
    applyDeskLink();
    if (!state.selectedId) {
      setValue('rx-field-sort', nextSortOrder());
      renderRank();
      renderLive();
      syncStatus();
    }
  } catch (err) {
    showToast(err.message || 'Không tải được phương trình.', 'error');
  }
}

function renderList({ animate = false } = {}) {
  const list = document.getElementById('admin-rx-list');
  const count = document.getElementById('admin-rx-count');
  if (count) count.textContent = `${state.items.length} phương trình`;
  if (!list) return;
  list.innerHTML = state.items.map((item) => {
    const selected = String(item.id) === String(state.selectedId) ? ' is-selected' : '';
    const status = item.isActive === false ? 'Ẩn' : 'Hiện';
    const kind = item.isSystem ? 'Hệ thống' : 'Tự thêm';
    const frames = item.keyframeCount != null ? `${item.keyframeCount} KF` : '';
    return `
      <button type="button" class="admin-model-item${selected}" data-id="${item.id}">
        <span class="min-w-0 flex-1">
          <span class="block font-['Epilogue'] text-sm font-bold truncate">${escapeHtml(item.title)}</span>
          <span class="block font-['Space_Grotesk'] text-[10px] font-bold text-[#00864c] uppercase">${escapeHtml(kind)} · ${status}${frames ? ` · ${frames}` : ''}</span>
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
  state.pendingChemx = null;
  state.hasStoredChemx = false;
  setValue('rx-field-id', '');
  setValue('rx-field-title', '');
  setValue('rx-field-code', '');
  setValue('rx-field-subtitle', '');
  setValue('rx-field-grade', '');
  setValue('rx-field-name', '');
  setValue('rx-field-desc', '');
  setValue('rx-field-sort', nextSortOrder());
  setValue('rx-field-active', true, 'checked');
  const code = document.getElementById('rx-field-code');
  if (code) code.disabled = false;
  setChemxStatus('Chưa có file — bắt buộc khi thêm mới');
  document.getElementById('rx-chemx-drop')?.classList.remove('is-ready');
  state.cropper?.clear();
  show(document.getElementById('rx-chemx-crop'), false);
  setCopy('Thêm phương trình', 'Đặt tiêu đề rồi tải file .chemx đã xuất từ bàn dựng phản ứng.', true);
  show(document.getElementById('admin-rx-hide'), false);
  syncStatus();
  renderList();
  renderRank();
  renderLive();
  animateEditorSwap(document.getElementById('admin-rx-form'), { creating: true });
  document.getElementById('rx-field-title')?.focus();
}

function fillForm(item, { animate = true } = {}) {
  state.selectedId = item.id;
  state.pendingChemx = null;
  state.hasStoredChemx = Boolean(item.chemx);
  setValue('rx-field-id', item.id);
  setValue('rx-field-title', item.title || '');
  setValue('rx-field-code', item.code || '');
  setValue('rx-field-subtitle', item.subtitle || '');
  setValue('rx-field-grade', item.gradeLabel || '');
  setValue('rx-field-name', item.name || '');
  setValue('rx-field-desc', item.description || '');
  setValue('rx-field-sort', item.sortOrder ?? 0);
  setValue('rx-field-active', item.isActive !== false, 'checked');
  const code = document.getElementById('rx-field-code');
  if (code) code.disabled = Boolean(item.isSystem);
  setChemxStatus(
    item.keyframeCount != null
      ? `${item.keyframeCount} trạng thái đã lưu · chọn file mới nếu muốn thay`
      : 'Đã có hoạt ảnh · chọn file mới nếu muốn thay'
  );
  document.getElementById('rx-chemx-drop')?.classList.toggle('is-ready', Boolean(item.chemx));
  showStoredCrop(item);
  setCopy(
    item.isSystem ? item.title || 'Bài hệ thống' : item.title || 'Sửa phương trình',
    item.isSystem
      ? 'Bài hệ thống không đổi mã, không ẩn được. Có thể cập nhật nhãn hoặc thay .chemx.'
      : 'Đổi nhãn hoặc tải lại file .chemx. Học sinh thấy ngay khi bài đang hiện.',
    false
  );
  show(document.getElementById('admin-rx-hide'), !item.isSystem);
  syncStatus();
  renderList();
  stampSelect(document.querySelector('#admin-rx-list .is-selected'));
  renderRank();
  renderLive();
  if (animate) animateEditorSwap(document.getElementById('admin-rx-form'), { creating: false });
}

function setCopy(title, hint, creating) {
  const form = document.getElementById('admin-rx-form');
  const badge = document.getElementById('admin-rx-badge');
  const titleEl = document.getElementById('admin-rx-title');
  const hintEl = document.getElementById('admin-rx-hint');
  form?.setAttribute('data-mode', creating ? 'create' : 'edit');
  if (badge) {
    badge.textContent = creating ? 'Thêm mới' : 'Đang sửa';
    badge.classList.toggle('is-active', creating);
  }
  if (titleEl) titleEl.textContent = title;
  if (hintEl) hintEl.textContent = hint;
}

function syncStatus() {
  const active = Boolean(document.getElementById('rx-field-active')?.checked);
  document.querySelectorAll('[data-rx-active]').forEach((btn) => {
    btn.classList.toggle('is-active', (btn.dataset.rxActive === 'true') === active);
  });
}

function rankedPeers() {
  const peers = state.items.filter((item) => String(item.id) !== String(state.selectedId));
  const draft = {
    id: state.selectedId || 'draft',
    title: valueOf('rx-field-title') || 'Bài đang soạn',
    name: valueOf('rx-field-name'),
    sortOrder: Number(valueOf('rx-field-sort') || 0),
    isDraft: true,
  };
  return [...peers.map((item) => ({ ...item, isDraft: false })), draft]
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || String(a.title).localeCompare(String(b.title)));
}

function renderRank() {
  const queue = document.getElementById('admin-rx-rank-queue');
  const valueEl = document.getElementById('admin-rx-rank-value');
  const rows = rankedPeers();
  const index = Math.max(0, rows.findIndex((item) => item.isDraft));
  if (valueEl) valueEl.textContent = `#${index + 1}`;
  if (!queue) return;
  queue.innerHTML = rows.map((item, i) => `
    <li class="admin-rank-item${item.isDraft ? ' is-current' : ''}">
      <em>#${i + 1}</em>
      <span>${escapeHtml(item.title || item.name)}</span>
      ${item.isDraft ? '<span class="font-[\'Space_Grotesk\'] text-[10px] font-bold uppercase text-[#00864c]">Đang xếp</span>' : ''}
    </li>
  `).join('');
}

function moveRank(delta) {
  const rows = rankedPeers();
  const index = rows.findIndex((item) => item.isDraft);
  if (index < 0) return;
  const next = Math.max(0, Math.min(rows.length - 1, index + delta));
  if (next === index) return;
  const reordered = rows.slice();
  const [draft] = reordered.splice(index, 1);
  reordered.splice(next, 0, draft);
  setValue('rx-field-sort', next);
  renderRank();
  slideRank(document.querySelector('#admin-rx-rank-queue .admin-rank-item.is-current'), delta);
}

function renderLive() {
  const title = document.getElementById('admin-rx-live-title');
  const meta = document.getElementById('admin-rx-live-meta');
  if (title) title.textContent = valueOf('rx-field-title') || 'Tiêu đề phương trình';
  if (meta) {
    const parts = [valueOf('rx-field-subtitle'), valueOf('rx-field-grade')].filter(Boolean);
    meta.textContent = parts.length ? parts.join(' · ') : 'phụ đề · lớp';
  }
}

function nextSortOrder() {
  return state.items.reduce((acc, item) => Math.max(acc, Number(item.sortOrder) || 0), -1) + 1;
}

async function saveForm() {
  const title = valueOf('rx-field-title').trim();
  if (!title) {
    showToast('Nhập tiêu đề phương trình.', 'warning');
    document.getElementById('rx-field-title')?.focus();
    return;
  }
  if (!state.selectedId && !state.pendingChemx) {
    showToast('Tải file .chemx trước khi lưu bài mới.', 'warning');
    document.getElementById('rx-chemx-drop')?.focus();
    return;
  }
  if (state.selectedId && !state.pendingChemx && !state.hasStoredChemx) {
    showToast('Bài này thiếu hoạt ảnh. Hãy tải file .chemx.', 'warning');
    return;
  }

  const payload = {
    title,
    code: valueOf('rx-field-code').trim() || undefined,
    subtitle: valueOf('rx-field-subtitle').trim(),
    gradeLabel: valueOf('rx-field-grade').trim(),
    name: valueOf('rx-field-name').trim() || title,
    description: valueOf('rx-field-desc').trim(),
    sortOrder: Number(valueOf('rx-field-sort') || 0),
    isActive: Boolean(document.getElementById('rx-field-active')?.checked),
  };
  if (state.pendingChemx) {
    payload.chemx = state.pendingChemx;
  }

  try {
    const saved = state.selectedId
      ? await updateAdminReaction(state.selectedId, payload)
      : await createAdminReaction(payload);
    upsert(saved);
    state.pendingChemx = null;
    state.hasStoredChemx = Boolean(saved.chemx);
    showToast(state.selectedId ? 'Đã cập nhật phương trình.' : 'Đã thêm phương trình.', 'success');
    fillForm(saved, { animate: false });
    flashSaved(document.getElementById('admin-rx-form'));
  } catch (err) {
    showToast(err.message || 'Không lưu được phương trình.', 'error');
  }
}

async function hideSelected() {
  if (!state.selectedId) return;
  const current = state.items.find((item) => item.id === state.selectedId);
  if (current?.isSystem) {
    showToast('Bài hệ thống không ẩn được.', 'warning');
    return;
  }
  try {
    await deleteAdminReaction(state.selectedId);
    if (current) upsert({ ...current, isActive: false });
    showToast('Đã ẩn phương trình.', 'success');
    startCreate();
  } catch (err) {
    showToast(err.message || 'Không ẩn được phương trình.', 'error');
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
