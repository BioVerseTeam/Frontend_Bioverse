import gsap from 'gsap';
import { setupNavbarAuth } from '../utils/authNavbar.js';
import { setupBiologyNav } from '../utils/siteNav.js';
import { ChatBox } from '../components/chatBox.js';
import { physicsModelApi } from '../api/physicsModelApi.js';
import {
  getRecentModels,
  clearRecentModels,
  removeRecentModel,
  formatTimeAgoVi,
  recordViewedModel
} from '../features/model/recentModels.js';
import { confirmModal, showToast } from '../components/modal.js';

const PAGE_SIZE = 12;

const state = {
  page: 0,
  grade: null,
  category: null,
  q: '',
  totalPages: 0,
  totalElements: 0,
  items: []
};

document.addEventListener('DOMContentLoaded', () => {
  setupNavbarAuth();
  setupBiologyNav();
  try {
    new ChatBox();
  } catch (err) {
    console.warn('BioBot init note:', err);
  }

  readFiltersFromUrl();
  bindControls();
  bindRecentControls();
  renderRecentModels();
  loadCategories();
  loadCatalog();
});

function readFiltersFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const page = Number(params.get('page'));
  const grade = Number(params.get('grade'));
  state.page = Number.isInteger(page) && page >= 0 ? page : 0;
  state.grade = [6, 7, 8, 9].includes(grade) ? grade : null;
  state.category = params.get('category') || null;
  state.q = (params.get('q') || '').trim();

  const searchInput = document.getElementById('catalog-search');
  if (searchInput) searchInput.value = state.q;
}

function writeFiltersToUrl() {
  const params = new URLSearchParams();
  if (state.page > 0) params.set('page', String(state.page));
  if (state.grade) params.set('grade', String(state.grade));
  if (state.category) params.set('category', state.category);
  if (state.q) params.set('q', state.q);
  const query = params.toString();
  const next = query ? `${window.location.pathname}?${query}` : window.location.pathname;
  window.history.replaceState(state, '', next);
}

function bindControls() {
  const searchInput = document.getElementById('catalog-search');
  const searchForm = document.getElementById('catalog-search-form');
  const retryBtn = document.getElementById('catalog-retry');
  const clearBtn = document.getElementById('catalog-clear-filters');

  let searchTimer = null;
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        applyFilters({ q: searchInput.value.trim(), page: 0 });
      }, 350);
    });
  }

  if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      applyFilters({ q: searchInput?.value.trim() || '', page: 0 });
    });
  }

  document.querySelectorAll('[data-grade]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const value = btn.dataset.grade;
      applyFilters({ grade: value ? Number(value) : null, page: 0 });
    });
  });

  if (retryBtn) {
    retryBtn.addEventListener('click', () => {
      loadCategories();
      loadCatalog();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      applyFilters({ grade: null, category: null, q: '', page: 0 });
    });
  }

  window.addEventListener('popstate', () => {
    readFiltersFromUrl();
    syncGradeChips();
    syncCategoryChips();
    loadCatalog();
  });
}

function applyFilters(next) {
  Object.assign(state, next);
  writeFiltersToUrl();
  syncGradeChips();
  syncCategoryChips();
  loadCatalog();
}

function syncGradeChips() {
  document.querySelectorAll('[data-grade]').forEach((btn) => {
    const value = btn.dataset.grade ? Number(btn.dataset.grade) : null;
    const active = value === state.grade;
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    btn.classList.toggle('is-active', active);
  });
}

function syncCategoryChips() {
  document.querySelectorAll('[data-category]').forEach((btn) => {
    const value = btn.dataset.category || null;
    const active = value === state.category;
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    btn.classList.toggle('is-active', active);
  });
}

/**
 * Gọi GET /api/models/categories?subject=PHYSICS từ Backend
 */
async function loadCategories() {
  const wrap = document.getElementById('catalog-categories');
  if (!wrap) return;

  try {
    const categories = await physicsModelApi.getCategories();
    const chips = [
      chipButton('', 'Tất cả thể loại', !state.category),
      ...categories.map((name) => chipButton(name, name, state.category === name))
    ];
    wrap.innerHTML = chips.join('');
    wrap.querySelectorAll('[data-category]').forEach((btn) => {
      btn.addEventListener('click', () => {
        applyFilters({ category: btn.dataset.category || null, page: 0 });
      });
    });
  } catch (err) {
    console.warn('Lỗi khi tải thể loại vật lý từ backend:', err);
    wrap.innerHTML = `<span class="text-xs text-[#76716a] font-['Space_Grotesk']">Đang kết nối backend...</span>`;
  }
}

function chipButton(value, label, active) {
  const pressed = active ? 'true' : 'false';
  const activeClass = active ? ' is-active' : '';
  return `<button type="button" data-category="${escapeAttr(value)}" aria-pressed="${pressed}" class="catalog-chip${activeClass}">${escapeHtml(label)}</button>`;
}

/**
 * Gọi GET /api/models/catalog?subject=PHYSICS&... từ Backend
 */
async function loadCatalog() {
  const grid = document.getElementById('catalog-grid');
  const empty = document.getElementById('catalog-empty');
  const error = document.getElementById('catalog-error');
  const pager = document.getElementById('catalog-pagination');
  const countEl = document.getElementById('catalog-count');

  show(empty, false);
  show(error, false);
  renderSkeletons(grid);
  syncGradeChips();

  try {
    const res = await physicsModelApi.getCatalog({
      grade: state.grade,
      category: state.category,
      q: state.q,
      page: state.page,
      size: PAGE_SIZE
    });

    const items = res.content || [];
    state.totalPages = res.totalPages || 0;
    state.totalElements = res.totalElements || 0;
    state.page = res.page ?? state.page;

    if (countEl) {
      countEl.textContent = state.totalElements
        ? `${state.totalElements} mô hình vật lý`
        : '0 mô hình';
    }

    if (!items.length) {
      grid.innerHTML = '';
      show(empty, true);
      renderPagination(pager, 0);
      return;
    }

    state.items = items;
    grid.innerHTML = items.map((m, idx) => renderCard(m, idx)).join('');
    grid.querySelectorAll('[data-model-idx]').forEach((article) => {
      article.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => {
          const idx = Number(article.dataset.modelIdx);
          const item = state.items[idx];
          if (item) recordViewedModel(item);
        });
      });
    });
    renderPagination(pager, state.totalPages);
  } catch (err) {
    grid.innerHTML = '';
    if (countEl) countEl.textContent = 'Lỗi kết nối';
    const errorText = document.getElementById('catalog-error-text');
    if (errorText) errorText.textContent = err.message || 'Không thể lấy dữ liệu từ Backend. Kiểm tra kết nối máy chủ.';
    show(error, true);
    renderPagination(pager, 0);
  }
}

function renderSkeletons(grid) {
  if (!grid) return;
  grid.innerHTML = Array.from({ length: 8 }, () => `
    <div class="bg-white border-[2.5px] border-[#2d2d2d] rounded-2xl p-3 sketch-shadow">
      <div class="catalog-thumb mb-2.5 animate-pulse bg-[#f6f3f2]"></div>
      <div class="h-3 w-24 bg-[#dcd5cb] rounded mb-2"></div>
      <div class="h-5 w-3/4 bg-[#dcd5cb] rounded mb-2"></div>
      <div class="h-10 w-full bg-[#f6f3f2] rounded"></div>
    </div>
  `).join('');
}

function renderCard(model, index = 0) {
  const href = labHref(model);
  const grade = model.grade ? `Lớp ${model.grade}` : 'THCS';
  const badge = model.badgeText || 'Vật lý 3D';
  const action = model.actionText || 'Khám phá ngay';
  const icon = model.actionIcon || '3d_rotation';
  const thumb = model.thumbnailUrl
    ? `<img src="${escapeAttr(model.thumbnailUrl)}" alt="${escapeAttr(model.name)}" class="max-w-full max-h-full w-auto h-auto object-contain p-2 group-hover:scale-105 transition-transform duration-300" loading="lazy">`
    : `<span class="material-symbols-outlined text-[48px] text-[#ed8936]">science</span>`;

  return `
    <article data-model-idx="${index}" class="group bg-white border-[2.5px] border-[#2d2d2d] rounded-2xl p-3 sketch-shadow hover:-translate-y-1 transition-all flex flex-col justify-between relative">
      <div class="absolute -top-2.5 right-3 bg-[#fffaf0] border border-[#2d2d2d] px-2 py-0.5 rounded text-[10px] font-['Space_Grotesk'] font-bold text-[#dd6b20]">${escapeHtml(grade)}</div>
      <a href="${escapeAttr(href)}" class="catalog-thumb mb-2.5 bg-[#fffaf0] relative flex items-center justify-center overflow-hidden rounded-xl border-2 border-[#2d2d2d] h-44">
        ${thumb}
        <span class="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-white/95 border border-[#2d2d2d] text-[9px] font-['Space_Grotesk'] font-bold text-[#2d2d2d] shadow-sm">${escapeHtml(badge)}</span>
      </a>
      <div>
        <div class="flex items-center gap-1 mb-1">
          <span class="w-1.5 h-1.5 rounded-full bg-[#ed8936]"></span>
          <span class="font-['Space_Grotesk'] text-[10px] text-[#ed8936] font-bold uppercase">${escapeHtml(model.category || 'Vật lý')}</span>
        </div>
        <h2 class="font-['Epilogue'] text-[16px] text-[#2d2d2d] leading-snug mb-1 font-bold group-hover:text-[#ed8936] transition-colors">${escapeHtml(model.name)}</h2>
        <p class="font-['Be_Vietnam_Pro'] text-[12px] text-[#5b403e] line-clamp-2 mb-3">${escapeHtml(model.description || 'Mô hình 3D tương tác thí nghiệm vật lý THCS.')}</p>
      </div>
      <a href="${escapeAttr(href)}" class="w-full py-1.5 bg-[#fdfbf7] hover:bg-[#ed8936] hover:text-white border-2 border-[#2d2d2d] rounded-lg font-['Space_Grotesk'] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors">
        <span class="material-symbols-outlined text-[16px]">${escapeHtml(icon)}</span>
        <span>${escapeHtml(action)}</span>
      </a>
    </article>
  `;
}

function renderPagination(pager, totalPages) {
  if (!pager) return;
  if (totalPages <= 1) {
    pager.innerHTML = '';
    pager.hidden = true;
    return;
  }

  pager.hidden = false;
  const buttons = [];
  buttons.push(pageButton(state.page - 1, 'Trang trước', state.page === 0, false, 'chevron_left'));

  const windowSize = 5;
  let start = Math.max(0, state.page - 2);
  let end = Math.min(totalPages - 1, start + windowSize - 1);
  start = Math.max(0, end - windowSize + 1);

  for (let i = start; i <= end; i += 1) {
    buttons.push(pageButton(i, String(i + 1), false, i === state.page));
  }

  buttons.push(pageButton(state.page + 1, 'Trang sau', state.page >= totalPages - 1, false, 'chevron_right'));
  pager.innerHTML = buttons.join('');
  pager.querySelectorAll('[data-page]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const nextPage = Number(btn.dataset.page);
      if (Number.isInteger(nextPage) && nextPage !== state.page) {
        applyFilters({ page: nextPage });
        document.getElementById('catalog-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

function pageButton(page, label, disabled, current, icon) {
  const content = icon
    ? `<span class="material-symbols-outlined text-[18px]">${icon}</span><span class="sr-only">${escapeHtml(label)}</span>`
    : escapeHtml(label);
  return `<button type="button" data-page="${page}" ${disabled ? 'disabled' : ''} aria-current="${current ? 'page' : 'false'}" class="catalog-page-btn${current ? ' is-active' : ''}">${content}</button>`;
}

function labHref(model) {
  if (model?.slug) return `/mo-hinh?slug=${encodeURIComponent(model.slug)}`;
  if (model?.id) return `/mo-hinh?id=${encodeURIComponent(model.id)}`;
  return '/vat-ly';
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

let isRecentCollapsed = false;

function bindRecentControls() {
  const section = document.getElementById('recent-models-section');
  const carousel = document.getElementById('recent-models-carousel');
  const btnPrev = document.getElementById('btn-recent-prev');
  const btnNext = document.getElementById('btn-recent-next');
  const btnCollapse = document.getElementById('btn-toggle-recent-collapse');
  const btnClear = document.getElementById('btn-clear-recent-models');

  if (btnPrev && carousel) {
    btnPrev.addEventListener('click', () => {
      const target = Math.max(0, carousel.scrollLeft - 260);
      gsap.to(carousel, {
        scrollLeft: target,
        duration: 0.4,
        ease: 'power2.out'
      });
    });
  }

  if (btnNext && carousel) {
    btnNext.addEventListener('click', () => {
      const target = carousel.scrollLeft + 260;
      gsap.to(carousel, {
        scrollLeft: target,
        duration: 0.4,
        ease: 'power2.out'
      });
    });
  }

  if (btnCollapse) {
    btnCollapse.addEventListener('click', () => {
      isRecentCollapsed = !isRecentCollapsed;
      const body = document.getElementById('recent-models-body');
      const icon = document.getElementById('recent-collapse-icon');
      const text = document.getElementById('recent-collapse-text');

      if (body) {
        if (isRecentCollapsed) {
          gsap.to(body, {
            height: 0,
            opacity: 0,
            duration: 0.3,
            ease: 'power2.inOut',
            onComplete: () => {
              body.style.display = 'none';
            }
          });
        } else {
          body.style.display = 'block';
          gsap.fromTo(body, 
            { height: 0, opacity: 0 }, 
            { height: 'auto', opacity: 1, duration: 0.35, ease: 'power2.out' }
          );
        }
      }

      if (icon) icon.textContent = isRecentCollapsed ? 'expand_more' : 'expand_less';
      if (text) text.textContent = isRecentCollapsed ? 'Mở rộng' : 'Thu gọn';
    });
  }

  if (btnClear) {
    btnClear.addEventListener('click', async () => {
      const confirmed = await confirmModal({
        title: 'Xóa lịch sử quan sát 3D?',
        message: 'Thao tác này sẽ dọn dẹp các mô hình bạn đã mở gần đây khỏi danh sách.',
        confirmText: 'Xóa tất cả',
        cancelText: 'Giữ lại',
        isDanger: true
      });
      if (confirmed) {
        clearRecentModels();
        renderRecentModels();
        showToast('Đã xóa lịch sử mô hình xem gần đây', 'success');
      }
    });
  }

  window.addEventListener('bioverse_recent_models_updated', () => {
    renderRecentModels();
  });
}

function renderRecentModels() {
  const section = document.getElementById('recent-models-section');
  const countBadge = document.getElementById('recent-models-count');
  const carousel = document.getElementById('recent-models-carousel');
  const navControls = document.getElementById('recent-nav-controls');
  if (!section || !carousel) return;

  const models = getRecentModels();

  if (!models || models.length === 0) {
    section.hidden = true;
    return;
  }

  section.hidden = false;
  if (countBadge) {
    countBadge.textContent = `${models.length} mẫu vật`;
  }

  if (navControls) {
    navControls.style.display = models.length > 3 ? 'flex' : 'none';
  }

  carousel.innerHTML = models.map((m) => {
    const href = labHref(m);
    const timeAgo = formatTimeAgoVi(m.viewedAt);
    const thumb = m.thumbnailUrl
      ? `<img src="${escapeAttr(m.thumbnailUrl)}" alt="${escapeAttr(m.name)}" class="w-full h-full object-contain p-1 group-hover:scale-105 transition-transform" loading="lazy">`
      : `<span class="material-symbols-outlined text-[32px] text-[#ed8936]">science</span>`;

    return `
      <div class="group relative flex-shrink-0 w-64 bg-white border-2 border-[#2d2d2d] rounded-xl p-2.5 sketch-shadow-sm hover:sketch-shadow hover:-translate-y-0.5 transition-all flex flex-col justify-between">
        <button type="button" data-remove-recent="${escapeAttr(m.id || m.slug)}" class="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-white/90 hover:bg-[#fee2e2] hover:text-[#b71422] border border-[#2d2d2d] flex items-center justify-center text-[14px] z-10 transition-colors" title="Bỏ khỏi gần đây">
          &times;
        </button>
        <a href="${escapeAttr(href)}" class="w-full h-28 bg-[#fffaf0] rounded-lg border border-[#2d2d2d] flex items-center justify-center overflow-hidden mb-2 relative">
          ${thumb}
          <span class="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-white/90 border border-[#2d2d2d] text-[9px] font-['Space_Grotesk'] font-bold text-[#ed8936]">
            ${escapeHtml(m.category || 'Vật lý')}
          </span>
        </a>
        <div>
          <a href="${escapeAttr(href)}" class="block font-['Epilogue'] text-sm font-bold text-[#2d2d2d] hover:text-[#ed8936] transition-colors truncate mb-0.5" title="${escapeAttr(m.name)}">
            ${escapeHtml(m.name)}
          </a>
          <span class="font-['Be_Vietnam_Pro'] text-[11px] text-[#76716a] block mb-2">
            Đã xem ${escapeHtml(timeAgo)}
          </span>
        </div>
        <a href="${escapeAttr(href)}" class="w-full py-1 bg-[#fffaf0] hover:bg-[#ed8936] hover:text-white border border-[#2d2d2d] rounded-lg font-['Space_Grotesk'] text-[11px] font-bold flex items-center justify-center gap-1 transition-colors">
          <span class="material-symbols-outlined text-[14px]">3d_rotation</span>
          <span>Mở lại 3D</span>
        </a>
      </div>
    `;
  }).join('');

  carousel.querySelectorAll('[data-remove-recent]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.removeRecent;
      removeRecentModel(id);
      renderRecentModels();
      showToast('Đã xóa khỏi danh sách xem gần đây', 'info');
    });
  });
}
