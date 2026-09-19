/**
 * Admin specimen labels — metadata on R2 GLBs, managed categories/labs,
 * cropped thumbnails, and a ranked homepage/catalog queue.
 */

import gsap from 'gsap';
import { setupNavbarAuth } from '../utils/authNavbar.js';
import { confirmModal, showToast } from '../components/modal.js';
import { requireAdmin } from '../utils/adminGuard.js';
import {
  animateEditorSwap,
  stampSelect,
  popIn,
  flashSaved,
  revealList,
  slideRank
} from '../utils/adminMotion.js';
import {
  listAdminModels,
  createAdminModel,
  updateAdminModel,
  deleteAdminModel,
  listR2Assets,
  listAdminCategories,
  createAdminCategory,
  updateAdminCategory,
  listAdminLabs,
  createAdminLab,
  uploadAdminThumbnail
} from '../api/adminBioModelApi.js';

const state = {
  items: [],
  selectedId: null,
  grade: null,
  isActiveFilter: null,
  q: '',
  r2Assets: [],
  labeledModels: [],
  categories: [],
  labs: [],
  saving: false,
  deskLinkApplied: false,
  reduceMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
};

const cropper = {
  image: null,
  scale: 1,
  minScale: 1,
  offsetX: 0,
  offsetY: 0,
  dragging: false,
  lastX: 0,
  lastY: 0
};

document.addEventListener('DOMContentLoaded', () => {
  try {
    setupNavbarAuth();
  } catch (err) {
    console.warn('Admin navbar failed', err);
  }
  if (!requireAdmin({
    loginNext: '/admin-models.html',
    message: 'Tài khoản hiện tại không phải ADMIN nên không gắn được nhãn mẫu vật.'
  })) return;
  const tab = new URLSearchParams(window.location.search).get('tab');
  if (tab === 'categories') {
    window.location.replace('/admin-categories.html');
    return;
  }
  if (tab === 'labs') {
    window.location.replace('/admin-labs.html');
    return;
  }
  bindControls();
  bindCropper();
  renderPreview();
  syncCatalogPills();
  Promise.all([loadTaxonomy(), loadR2Assets(), loadList()]);
});

function bindControls() {
  const form = document.getElementById('admin-form');
  const search = document.getElementById('admin-search');
  const newBtn = document.getElementById('admin-new-btn');
  const deleteBtn = document.getElementById('admin-delete-btn');
  const r2Select = document.getElementById('field-r2');

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    saveForm();
  });

  newBtn?.addEventListener('click', () => startCreate());
  deleteBtn?.addEventListener('click', () => hideSelected());

  let searchTimer = null;
  search?.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.q = search.value.trim();
      loadList();
    }, 280);
  });

  document.querySelectorAll('[data-active-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const raw = btn.dataset.activeFilter;
      state.isActiveFilter = raw === '' ? null : raw === 'true';
      document.querySelectorAll('[data-active-filter]').forEach((el) => {
        el.classList.toggle('is-active', el === btn);
      });
      loadList();
    });
  });

  document.querySelectorAll('[data-grade]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const raw = btn.dataset.grade;
      state.grade = raw ? Number(raw) : null;
      syncGradeChips();
      renderPreview();
    });
  });

  r2Select?.addEventListener('change', () => {
    applyR2Selection();
    renderPreview();
  });

  document.getElementById('admin-category-add')?.addEventListener('click', () => addCategoryFromInput());
  document.getElementById('field-category')?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addCategoryFromInput();
    }
  });
  document.getElementById('field-category')?.addEventListener('input', () => {
    syncCategoryChips();
    renderPreview();
  });

  document.getElementById('admin-lab-add')?.addEventListener('click', () => addLabFromInput());
  document.getElementById('field-lab-name')?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addLabFromInput();
    }
  });

  document.getElementById('admin-rank-up')?.addEventListener('click', () => moveRank(-1));
  document.getElementById('admin-rank-down')?.addEventListener('click', () => moveRank(1));

  document.querySelectorAll('[data-catalog-active]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setValue('field-isActive', btn.dataset.catalogActive === 'true', 'checked');
      syncCatalogPills();
      pulse(btn);
    });
  });
  document.querySelectorAll('[data-featured]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setValue('field-isFeatured', btn.dataset.featured === 'true', 'checked');
      syncCatalogPills();
      renderRank();
      pulse(btn);
    });
  });

  document.getElementById('field-thumb-file')?.addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) openCropper(file);
  });
  document.getElementById('admin-thumb-clear')?.addEventListener('click', () => {
    setValue('field-thumbnailUrl', '');
    renderThumbPreview();
    renderPreview();
  });

  ['field-name', 'field-description', 'field-badgeText', 'field-actionText'].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', () => {
      renderPreview();
      if (id === 'field-name') renderRank();
    });
  });
}

function syncCatalogPills() {
  const active = Boolean(document.getElementById('field-isActive')?.checked);
  const featured = Boolean(document.getElementById('field-isFeatured')?.checked);
  document.querySelectorAll('[data-catalog-active]').forEach((btn) => {
    btn.classList.toggle('is-active', (btn.dataset.catalogActive === 'true') === active);
  });
  document.querySelectorAll('[data-featured]').forEach((btn) => {
    btn.classList.toggle('is-active', (btn.dataset.featured === 'true') === featured);
  });
}

function setEditorMode(creating) {
  const form = document.getElementById('admin-form');
  const badge = document.getElementById('admin-mode-badge');
  form?.setAttribute('data-mode', creating ? 'create' : 'edit');
  if (badge) {
    badge.textContent = creating ? 'Thêm mới' : 'Đang sửa';
    badge.classList.toggle('is-active', creating);
  }
}

async function loadTaxonomy() {
  try {
    const [categories, labs] = await Promise.all([listAdminCategories(), listAdminLabs()]);
    state.categories = categories;
    state.labs = labs;
    renderCategoryChips();
    renderLabChips();
  } catch (err) {
    showToast(err.message || 'Không tải được loại mẫu / lab', 'error');
  }
}

function renderCategoryChips() {
  const wrap = document.getElementById('admin-category-chips');
  const list = document.getElementById('admin-category-list');
  const active = state.categories.filter((item) => item.isActive !== false);
  if (wrap) {
    wrap.innerHTML = active.map((item) => (
      `<button type="button" data-preset-category="${escapeAttr(item.name)}" class="catalog-chip">${escapeHtml(item.name)}</button>`
    )).join('');
    wrap.querySelectorAll('[data-preset-category]').forEach((btn) => {
      btn.addEventListener('click', () => {
        setValue('field-category', btn.dataset.presetCategory || '');
        syncCategoryChips();
        renderPreview();
        pulse(btn);
      });
    });
  }
  if (list) {
    list.innerHTML = active.map((item) => `<option value="${escapeAttr(item.name)}"></option>`).join('');
  }
  syncCategoryChips();
}

function syncCategoryChips() {
  const current = document.getElementById('field-category')?.value.trim() || '';
  document.querySelectorAll('[data-preset-category]').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.presetCategory === current);
  });
}

function renderLabChips() {
  const wrap = document.getElementById('admin-lab-chips');
  if (!wrap) return;
  const active = state.labs.filter((item) => item.isActive !== false);
  wrap.innerHTML = [
    `<button type="button" data-lab-code="" class="catalog-chip">Chưa gắn</button>`,
    ...active.map((lab) => (
      `<button type="button" data-lab-code="${escapeAttr(lab.code)}" class="catalog-chip" title="${escapeAttr(lab.description || lab.code)}">${escapeHtml(lab.name)}</button>`
    ))
  ].join('');
  wrap.querySelectorAll('[data-lab-code]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setValue('field-targetMode', btn.dataset.labCode || '');
      syncLabChips();
      pulse(btn);
    });
  });
  syncLabChips();
}

function syncLabChips() {
  const current = valueOf('field-targetMode');
  document.querySelectorAll('[data-lab-code]').forEach((btn) => {
    btn.classList.toggle('is-active', (btn.dataset.labCode || '') === current);
  });
}

function syncGradeChips() {
  document.querySelectorAll('#admin-form [data-grade]').forEach((btn) => {
    const value = btn.dataset.grade ? Number(btn.dataset.grade) : null;
    btn.classList.toggle('is-active', value === state.grade);
  });
}

async function addCategoryFromInput() {
  const name = valueOf('field-category').trim();
  if (!name) {
    showToast('Nhập tên loại mẫu trước.', 'warning');
    return;
  }
  const existing = state.categories.find((item) => item.name.toLowerCase() === name.toLowerCase());
  if (existing) {
    if (existing.isActive === false) {
      try {
        const updated = await updateAdminCategory(existing.id, { isActive: true });
        replaceTaxonomyItem('categories', updated);
        showToast('Đã bật lại loại mẫu.', 'success');
      } catch (err) {
        showToast(err.message || 'Không bật lại được loại mẫu.', 'error');
        return;
      }
    }
    setValue('field-category', existing.name);
    renderCategoryChips();
    renderPreview();
    return;
  }
  try {
    const created = await createAdminCategory({ name });
    state.categories.push(created);
    setValue('field-category', created.name);
    renderCategoryChips();
    renderPreview();
    showToast('Đã thêm loại mẫu vào hệ thống.', 'success');
  } catch (err) {
    showToast(err.message || 'Không tạo được loại mẫu.', 'error');
  }
}

async function addLabFromInput() {
  const name = valueOf('field-lab-name').trim();
  if (!name) {
    showToast('Nhập tên lab trước.', 'warning');
    return;
  }
  const existing = state.labs.find((item) => item.name.toLowerCase() === name.toLowerCase());
  if (existing) {
    setValue('field-targetMode', existing.code);
    setValue('field-lab-name', '');
    syncLabChips();
    return;
  }
  try {
    const created = await createAdminLab({ name });
    state.labs.push(created);
    setValue('field-targetMode', created.code);
    setValue('field-lab-name', '');
    renderLabChips();
    showToast('Đã thêm lab. Lab mô phỏng có sẵn sẽ mở phòng thí nghiệm; còn lại học sinh xem mô hình 3D chi tiết.', 'success');
  } catch (err) {
    showToast(err.message || 'Không tạo được lab.', 'error');
  }
}

function replaceTaxonomyItem(key, updated) {
  const list = state[key];
  const index = list.findIndex((item) => item.id === updated.id);
  if (index >= 0) list[index] = updated;
  else list.push(updated);
}

async function loadR2Assets() {
  const select = document.getElementById('field-r2');
  if (!select) return;
  try {
    const [assets, labeled] = await Promise.all([
      listR2Assets(),
      listAdminModels({ page: 0, size: 200 })
    ]);
    state.labeledModels = labeled?.items || [];
    const raw = Array.isArray(assets) ? assets : [];
    const models = raw.filter(isModelAsset);
    state.r2Assets = models.length
      ? models
      : raw.filter((asset) => !String(asset.key || '').toLowerCase().startsWith('thumbnails/'));
    if (!state.r2Assets.length) {
      select.innerHTML = '<option value="">Không có file 3D trên R2</option>';
      showToast(raw.length
        ? 'Kho R2 không có file .glb/.gltf.'
        : 'Kho R2 chưa trả file nào. Kiểm tra backend / Cloudflare R2.', 'warning');
      return;
    }
    renderR2Options();
  } catch (err) {
    select.innerHTML = '<option value="">Không tải được danh sách R2</option>';
    showToast(err.message || 'Không tải được file R2', 'error');
  }
}

function assetMatchesUrl(asset, url) {
  const raw = String(url || '');
  const key = String(asset?.key || '');
  if (!raw || !key) return false;
  if (asset.url && asset.url === raw) return true;
  if (raw.endsWith(key)) return true;
  try {
    if (decodeURIComponent(raw).endsWith(key)) return true;
  } catch {
    /* ignore malformed percent-encoding */
  }
  const encodedKey = key.split('/').map(encodeURIComponent).join('/');
  return raw.endsWith(encodedKey);
}

function isAssetLabeled(asset, exceptId = null) {
  return state.labeledModels.some((model) => {
    if (exceptId != null && String(model.id) === String(exceptId)) return false;
    return assetMatchesUrl(asset, model.modelUrl);
  });
}

function renderR2Options() {
  const select = document.getElementById('field-r2');
  if (!select || !state.r2Assets.length) return;

  const currentUrl = valueOf('field-modelUrl');
  const available = state.r2Assets.filter((asset) => (
    assetMatchesUrl(asset, currentUrl) || !isAssetLabeled(asset, state.selectedId)
  ));

  if (!available.length) {
    select.innerHTML = '<option value="">Không còn file 3D chưa gắn</option>';
    return;
  }

  const options = ['<option value="">Chọn file 3D chưa gắn...</option>']
    .concat(available.map((asset) => {
      const size = formatBytes(asset.size);
      return `<option value="${escapeAttr(asset.key)}">${escapeHtml(asset.key)}${size ? ` (${size})` : ''}</option>`;
    }));
  select.innerHTML = options.join('');

  const match = available.find((asset) => assetMatchesUrl(asset, currentUrl));
  if (match) select.value = match.key;
}

function isModelAsset(asset) {
  const key = String(asset?.key || '').toLowerCase();
  if (!key || key.endsWith('/')) return false;
  if (key.startsWith('thumbnails/')) return false;
  if (/\.(png|jpe?g|webp|gif|svg|txt|json)$/.test(key)) return false;
  return /\.(glb|gltf)$/.test(key);
}

function applyR2Selection() {
  const key = document.getElementById('field-r2')?.value;
  const asset = state.r2Assets.find((item) => item.key === key);
  const urlInput = document.getElementById('field-modelUrl');
  const meta = document.getElementById('admin-model-file-meta');
  if (asset && urlInput) {
    urlInput.value = asset.url || `/api/models/${key}`;
  } else if (urlInput && !key) {
    urlInput.value = '';
  }
  const nameInput = document.getElementById('field-name');
  if (asset && nameInput && !nameInput.value.trim()) {
    nameInput.value = prettyFileName(key);
  }
  if (meta) {
    if (asset) {
      meta.hidden = false;
      meta.textContent = `Đã chọn ${asset.key}${asset.size ? ` · ${formatBytes(asset.size)}` : ''}. File này là tài sản của thẻ, không phải link học sinh dán.`;
    } else {
      meta.hidden = true;
    }
  }
}

async function loadList({ animate = true } = {}) {
  const list = document.getElementById('admin-list');
  const empty = document.getElementById('admin-list-empty');
  const count = document.getElementById('admin-list-count');
  if (list) {
    list.innerHTML = `<div class="h-16 rounded-xl bg-[#e8f5e9] border-2 border-[#2d2d2d] animate-pulse"></div>`;
  }
  show(empty, false);

  try {
    const data = await listAdminModels({
      q: state.q,
      isActive: state.isActiveFilter,
      page: 0,
      size: 50
    });
    state.items = data?.items || [];
    if (count) {
      count.textContent = state.items.length
        ? `${data.totalElements} mẫu đã gắn nhãn`
        : 'Chưa có nhãn';
    }
    renderList({ animate });
    renderRank();
    if (!state.items.length) show(empty, true);
    applyDeskLink();
  } catch (err) {
    if (list) list.innerHTML = '';
    if (count) count.textContent = 'Không tải được danh sách';
    showToast(err.message || 'Không tải được danh sách mô hình', 'error');
  }
}

function renderList({ animate = false } = {}) {
  const list = document.getElementById('admin-list');
  if (!list) return;
  list.innerHTML = state.items.map((model) => {
    const selected = String(model.id) === String(state.selectedId) ? ' is-selected' : '';
    const grade = model.grade ? `Lớp ${model.grade}` : 'Chưa gắn lớp';
    const status = model.isActive === false ? 'Ẩn' : 'Hiện';
    return `
      <button type="button" class="admin-model-item${selected}" data-id="${model.id}">
        <span class="w-10 h-10 rounded-lg bg-[#e8f5e9] border-2 border-[#2d2d2d] flex items-center justify-center shrink-0 overflow-hidden">
          ${model.thumbnailUrl
            ? `<img src="${escapeAttr(model.thumbnailUrl)}" alt="" class="w-full h-full object-cover">`
            : `<span class="material-symbols-outlined text-[20px]">view_in_ar</span>`}
        </span>
        <span class="min-w-0 flex-1">
          <span class="block font-['Epilogue'] text-sm font-bold truncate">${escapeHtml(model.name)}</span>
          <span class="block font-['Space_Grotesk'] text-[10px] font-bold text-[#00864c] uppercase">
            ${escapeHtml(model.category || 'Chưa gắn loại')} · ${escapeHtml(grade)} · ${status}
          </span>
        </span>
      </button>
    `;
  }).join('');

  list.querySelectorAll('[data-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.id);
      const model = state.items.find((item) => item.id === id);
      if (model) fillForm(model);
    });
  });

  if (animate) revealList(list);
}

function applyDeskLink() {
  if (state.deskLinkApplied) return;
  state.deskLinkApplied = true;
  const params = new URLSearchParams(window.location.search);
  if (params.get('create') === '1') {
    startCreate();
    return;
  }
  const id = Number(params.get('id'));
  if (!id) return;
  const model = state.items.find((item) => Number(item.id) === id);
  if (model) fillForm(model);
}

function startCreate() {
  state.selectedId = null;
  state.grade = null;
  const form = document.getElementById('admin-form');
  form?.reset();
  setValue('field-id', '');
  setValue('field-isActive', true, 'checked');
  setValue('field-isFeatured', false, 'checked');
  setValue('field-sortOrder', nextSortOrder());
  setValue('field-actionText', 'Khám phá ngay');
  setValue('field-subject', 'BIOLOGY');
  setValue('field-targetMode', '');
  setValue('field-thumbnailUrl', '');
  setValue('field-modelUrl', '');
  document.getElementById('admin-form-title').textContent = 'Gắn nhãn mới';
  document.getElementById('admin-form-hint').textContent = 'Chọn file 3D, đặt tên, rồi lưu. Học sinh chỉ thấy thẻ catalog.';
  show(document.getElementById('admin-delete-btn'), false);
  setEditorMode(true);
  syncGradeChips();
  syncCategoryChips();
  syncLabChips();
  syncCatalogPills();
  renderR2Options();
  applyR2Selection();
  renderThumbPreview();
  renderList();
  renderRank();
  renderPreview();
  animateForm(true);
  document.getElementById('field-r2')?.focus();
}

function fillForm(model, { animate = true } = {}) {
  state.selectedId = model.id;
  state.grade = model.grade ?? null;
  setValue('field-id', model.id);
  setValue('field-name', model.name || '');
  setValue('field-scientificName', model.scientificName || '');
  setValue('field-description', model.description || '');
  setValue('field-category', model.category || '');
  setValue('field-subject', model.subject || 'BIOLOGY');
  setValue('field-targetMode', model.targetMode || '');
  setValue('field-sortOrder', model.sortOrder > 0 ? model.sortOrder : 1);
  setValue('field-badgeText', model.badgeText || '');
  setValue('field-actionText', model.actionText || 'Khám phá ngay');
  setValue('field-thumbnailUrl', model.thumbnailUrl || '');
  setValue('field-modelUrl', model.modelUrl || '');
  setValue('field-isActive', model.isActive !== false, 'checked');
  setValue('field-isFeatured', Boolean(model.isFeatured), 'checked');

  renderR2Options();

  document.getElementById('admin-form-title').textContent = model.name || 'Sửa nhãn';
  document.getElementById('admin-form-hint').textContent = 'Đổi tên, loại hoặc lớp — catalog Sinh học cập nhật khi lưu.';
  show(document.getElementById('admin-delete-btn'), true);
  setEditorMode(false);
  syncGradeChips();
  syncCategoryChips();
  syncLabChips();
  syncCatalogPills();
  applyR2Selection();
  renderThumbPreview();
  renderList();
  stampSelect(document.querySelector('#admin-list .is-selected'));
  renderRank();
  renderPreview();
  if (animate) animateForm(false);
}

function nextSortOrder() {
  const max = state.items.reduce((acc, item) => Math.max(acc, Number(item.sortOrder) || 0), 0);
  return max + 1;
}

function rankedPeers() {
  const featuredOnly = Boolean(document.getElementById('field-isFeatured')?.checked);
  const peers = state.items.filter((model) => {
    if (String(model.id) === String(state.selectedId)) return false;
    return featuredOnly ? model.isFeatured : true;
  });
  const draft = {
    id: state.selectedId || 'draft',
    name: valueOf('field-name') || 'Mẫu đang soạn',
    sortOrder: Number(valueOf('field-sortOrder') || 1),
    isDraft: true
  };
  return [...peers, draft].sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0) || String(a.name).localeCompare(String(b.name)));
}

function renderRank() {
  const queue = document.getElementById('admin-rank-queue');
  const valueEl = document.getElementById('admin-rank-value');
  const hint = document.getElementById('admin-rank-hint');
  const featured = Boolean(document.getElementById('field-isFeatured')?.checked);
  const rows = rankedPeers();
  const index = Math.max(0, rows.findIndex((item) => item.isDraft));
  if (valueEl) valueEl.textContent = `#${index + 1}`;
  if (hint) {
    hint.textContent = featured
      ? `Hàng nổi bật trang chủ: vị trí ${index + 1} / ${rows.length}. Số nhỏ hơn đứng trước mặt học sinh.`
      : `Thứ tự trong kho Sinh học: vị trí ${index + 1} / ${rows.length}. Bật nổi bật để cùng thứ tự này lên trang chủ.`;
  }
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
  const current = Number(valueOf('field-sortOrder') || 1);
  const target = Number(neighbor.sortOrder) || current + delta;
  setValue('field-sortOrder', delta < 0 ? Math.max(1, target - 1) : target + 1);
  renderRank();
  slideRank(document.querySelector('.admin-rank-item.is-current'), delta);
}

function renderThumbPreview() {
  const wrap = document.getElementById('admin-thumb-preview');
  const clearBtn = document.getElementById('admin-thumb-clear');
  const url = valueOf('field-thumbnailUrl');
  if (!wrap) return;
  if (url) {
    wrap.innerHTML = `<img src="${escapeAttr(url)}" alt="Ảnh thẻ catalog">`;
    show(clearBtn, true);
  } else {
    wrap.innerHTML = `<span class="material-symbols-outlined text-[40px] text-[#00864c]">image</span><span>Chưa có ảnh</span>`;
    show(clearBtn, false);
  }
}

function bindCropper() {
  const canvas = document.getElementById('admin-crop-canvas');
  const zoom = document.getElementById('admin-crop-zoom');
  document.getElementById('admin-crop-cancel')?.addEventListener('click', closeCropper);
  document.getElementById('admin-crop-apply')?.addEventListener('click', applyCrop);
  zoom?.addEventListener('input', () => {
    cropper.scale = cropper.minScale * Number(zoom.value || 1);
    clampCrop();
    drawCrop();
  });
  if (!canvas) return;
  canvas.addEventListener('pointerdown', (event) => {
    cropper.dragging = true;
    cropper.lastX = event.clientX;
    cropper.lastY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!cropper.dragging) return;
    cropper.offsetX += event.clientX - cropper.lastX;
    cropper.offsetY += event.clientY - cropper.lastY;
    cropper.lastX = event.clientX;
    cropper.lastY = event.clientY;
    clampCrop();
    drawCrop();
  });
  const stopDrag = () => {
    cropper.dragging = false;
  };
  canvas.addEventListener('pointerup', stopDrag);
  canvas.addEventListener('pointercancel', stopDrag);
  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    const slider = document.getElementById('admin-crop-zoom');
    if (!slider) return;
    const next = Math.min(3, Math.max(1, Number(slider.value) + (event.deltaY < 0 ? 0.08 : -0.08)));
    slider.value = String(next);
    cropper.scale = cropper.minScale * next;
    clampCrop();
    drawCrop();
  }, { passive: false });
}

function openCropper(file) {
  if (!file.type.startsWith('image/')) {
    showToast('Chỉ nhận file ảnh.', 'warning');
    return;
  }
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    URL.revokeObjectURL(url);
    const canvas = document.getElementById('admin-crop-canvas');
    cropper.image = image;
    cropper.minScale = Math.max(canvas.width / image.width, canvas.height / image.height);
    cropper.scale = cropper.minScale;
    cropper.offsetX = (canvas.width - image.width * cropper.scale) / 2;
    cropper.offsetY = (canvas.height - image.height * cropper.scale) / 2;
    const zoom = document.getElementById('admin-crop-zoom');
    if (zoom) zoom.value = '1';
    const modal = document.getElementById('admin-crop-modal');
    if (modal) {
      modal.hidden = false;
      if (!state.reduceMotion) {
        gsap.fromTo(modal, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2, ease: 'power2.out' });
        gsap.fromTo(modal.querySelector('.admin-crop-card'), { y: 18, scale: 0.97 }, {
          y: 0,
          scale: 1,
          duration: 0.32,
          ease: 'power3.out'
        });
      }
    }
    drawCrop();
  };
  image.onerror = () => {
    URL.revokeObjectURL(url);
    showToast('Không đọc được ảnh.', 'error');
  };
  image.src = url;
}

function closeCropper() {
  const modal = document.getElementById('admin-crop-modal');
  if (!modal) return;
  const hide = () => {
    modal.hidden = true;
    cropper.image = null;
    gsap.set(modal, { clearProps: 'all' });
  };
  if (state.reduceMotion) {
    hide();
    return;
  }
  gsap.to(modal, {
    autoAlpha: 0,
    duration: 0.16,
    ease: 'power2.in',
    onComplete: hide
  });
}

function drawCrop() {
  const canvas = document.getElementById('admin-crop-canvas');
  if (!canvas || !cropper.image) return;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1b1c1c';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(
    cropper.image,
    cropper.offsetX,
    cropper.offsetY,
    cropper.image.width * cropper.scale,
    cropper.image.height * cropper.scale
  );
}

function clampCrop() {
  const canvas = document.getElementById('admin-crop-canvas');
  if (!canvas || !cropper.image) return;
  const w = cropper.image.width * cropper.scale;
  const h = cropper.image.height * cropper.scale;
  cropper.offsetX = Math.min(0, Math.max(canvas.width - w, cropper.offsetX));
  cropper.offsetY = Math.min(0, Math.max(canvas.height - h, cropper.offsetY));
}

async function applyCrop() {
  if (!cropper.image) return;
  const canvas = document.getElementById('admin-crop-canvas');
  const out = document.createElement('canvas');
  out.width = 800;
  out.height = 600;
  const ctx = out.getContext('2d');
  const sx = -cropper.offsetX / cropper.scale;
  const sy = -cropper.offsetY / cropper.scale;
  const sw = canvas.width / cropper.scale;
  const sh = canvas.height / cropper.scale;
  ctx.drawImage(cropper.image, sx, sy, sw, sh, 0, 0, out.width, out.height);
  const blob = await new Promise((resolve) => out.toBlob(resolve, 'image/jpeg', 0.88));
  if (!blob) {
    showToast('Không crop được ảnh.', 'error');
    return;
  }
  const applyBtn = document.getElementById('admin-crop-apply');
  const original = applyBtn?.innerHTML;
  if (applyBtn) {
    applyBtn.disabled = true;
    applyBtn.textContent = 'Đang tải lên...';
  }
  try {
    const file = new File([blob], 'thumbnail.jpg', { type: 'image/jpeg' });
    const uploaded = await uploadAdminThumbnail(file);
    setValue('field-thumbnailUrl', uploaded?.url || '');
    renderThumbPreview();
    renderPreview();
    closeCropper();
    showToast('Đã crop và lưu ảnh thumbnail.', 'success');
  } catch (err) {
    showToast(err.message || 'Không tải được ảnh.', 'error');
  } finally {
    if (applyBtn) {
      applyBtn.disabled = false;
      applyBtn.innerHTML = original;
    }
  }
}

async function saveForm() {
  if (state.saving) return;
  const name = valueOf('field-name').trim();
  if (!name) {
    showToast('Nhập tên hiển thị trước khi lưu.', 'warning');
    document.getElementById('field-name')?.focus();
    return;
  }

  const category = valueOf('field-category').trim();
  if (category && !state.categories.some((item) => item.name.toLowerCase() === category.toLowerCase())) {
    try {
      const created = await createAdminCategory({ name: category });
      state.categories.push(created);
      renderCategoryChips();
    } catch (err) {
      if (!String(err.message || '').includes('đã tồn tại')) {
        showToast(err.message || 'Không tạo được loại mẫu.', 'error');
        return;
      }
    }
  }

  const payload = {
    name,
    scientificName: valueOf('field-scientificName').trim(),
    description: valueOf('field-description').trim(),
    category,
    grade: state.grade || 0,
    subject: valueOf('field-subject') || 'BIOLOGY',
    targetMode: valueOf('field-targetMode').trim(),
    sortOrder: Number(valueOf('field-sortOrder') || 1),
    badgeText: valueOf('field-badgeText').trim(),
    actionText: valueOf('field-actionText').trim() || 'Khám phá ngay',
    actionIcon: '3d_rotation',
    thumbnailUrl: valueOf('field-thumbnailUrl').trim(),
    modelUrl: valueOf('field-modelUrl').trim(),
    isFeatured: Boolean(document.getElementById('field-isFeatured')?.checked),
    isActive: Boolean(document.getElementById('field-isActive')?.checked)
  };
  if (!state.selectedId) {
    payload.slug = slugify(name) || `model-${Date.now()}`;
  }

  const saveBtn = document.getElementById('admin-save-btn');
  const original = saveBtn?.innerHTML;
  state.saving = true;
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> Đang lưu...';
  }

  try {
    const saved = state.selectedId
      ? await updateAdminModel(state.selectedId, payload)
      : await createAdminModel(payload);
    if (payload.targetMode) {
      await loadTaxonomy();
    }
    showToast(state.selectedId ? 'Đã cập nhật nhãn mẫu vật.' : 'Đã gắn nhãn. Mẫu sẽ hiện trên catalog nếu đang bật.', 'success');
    replaceTaxonomyItem('labeledModels', saved);
    await loadList({ animate: false });
    const fresh = state.items.find((item) => item.id === saved.id) || saved;
    fillForm(fresh, { animate: false });
    flashSaved(document.getElementById('admin-form'));
  } catch (err) {
    showToast(err.message || 'Không lưu được nhãn.', 'error');
  } finally {
    state.saving = false;
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = original;
    }
  }
}

async function hideSelected() {
  if (!state.selectedId) return;
  const name = valueOf('field-name') || 'mẫu này';
  const ok = await confirmModal({
    title: 'Ẩn khỏi catalog?',
    message: `Ẩn <strong>${escapeHtml(name)}</strong> khỏi trang Sinh học. File trên R2 vẫn giữ nguyên.`,
    type: 'confirm',
    confirmText: 'Ẩn mẫu',
    cancelText: 'Giữ lại',
    isDestructive: true,
    washiTag: 'CATALOG'
  });
  if (!ok) return;

  try {
    await deleteAdminModel(state.selectedId);
    showToast('Đã ẩn mẫu khỏi catalog.', 'success');
    startCreate();
    await loadList();
  } catch (err) {
    showToast(err.message || 'Không ẩn được mẫu.', 'error');
  }
}

function renderPreview() {
  const wrap = document.getElementById('admin-preview-card');
  if (!wrap) return;
  const name = valueOf('field-name') || 'Tên mô hình';
  const description = valueOf('field-description') || 'Mô hình 3D tương tác cho bài học KHTN.';
  const category = valueOf('field-category') || 'Chưa gắn loại';
  const badge = valueOf('field-badgeText') || '3D';
  const action = valueOf('field-actionText') || 'Khám phá ngay';
  const grade = state.grade ? `Lớp ${state.grade}` : 'THCS';
  const thumb = valueOf('field-thumbnailUrl');
  const thumbHtml = thumb
    ? `<img src="${escapeAttr(thumb)}" alt="" class="w-full h-full object-cover">`
    : `<span class="material-symbols-outlined text-[48px] text-[#00864c]">view_in_ar</span>`;

  wrap.innerHTML = `
    <article class="bg-white border-[2.5px] border-[#2d2d2d] rounded-2xl p-3 sketch-shadow flex flex-col relative">
      <div class="absolute -top-2.5 right-3 bg-[#dcfce7] border border-[#2d2d2d] px-2 py-0.5 rounded text-[10px] font-['Space_Grotesk'] font-bold text-[#166534]">${escapeHtml(grade)}</div>
      <div class="catalog-thumb mb-2.5">
        ${thumbHtml}
        <span class="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-white/90 border border-[#2d2d2d] text-[9px] font-['Space_Grotesk'] font-bold">${escapeHtml(badge)}</span>
      </div>
      <div class="flex items-center gap-1 mb-1">
        <span class="w-1.5 h-1.5 rounded-full bg-[#00864c]"></span>
        <span class="font-['Space_Grotesk'] text-[10px] text-[#00864c] font-bold uppercase">${escapeHtml(category)}</span>
      </div>
      <h3 class="font-['Epilogue'] text-[16px] font-bold leading-snug mb-1">${escapeHtml(name)}</h3>
      <p class="font-['Be_Vietnam_Pro'] text-[12px] text-[#5b403e] line-clamp-2 mb-3">${escapeHtml(description)}</p>
      <div class="w-full py-1.5 bg-[#fdfbf7] border-2 border-[#2d2d2d] rounded-lg font-['Space_Grotesk'] text-xs font-bold flex items-center justify-center gap-1">
        <span class="material-symbols-outlined text-[16px]">3d_rotation</span>
        <span>${escapeHtml(action)}</span>
      </div>
    </article>
  `;
  if (!state.reduceMotion) {
    gsap.fromTo(wrap.firstElementChild, { autoAlpha: 0.4, y: 8 }, {
      autoAlpha: 1,
      y: 0,
      duration: 0.22,
      ease: 'power2.out',
      overwrite: true
    });
  }
}

function animateForm(creating) {
  animateEditorSwap(document.getElementById('admin-form'), { creating });
}

function pulse(el) {
  popIn(el);
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

function slugify(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function prettyFileName(key) {
  const base = String(key || '').split('/').pop() || '';
  return base.replace(/\.(glb|gltf|png|jpe?g)$/i, '').replace(/[-_]+/g, ' ');
}

function formatBytes(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
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

function escapeAttr(value) {
  return escapeHtml(value);
}
