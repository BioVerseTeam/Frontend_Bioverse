/**
 * BioVerse — Biology models catalog (sinh-hoc.html)
 * Loads paginated BIOLOGY models from GET /api/models/catalog.
 */

import { setupNavbarAuth } from '../utils/authNavbar.js';
import { ChatBox } from '../components/chatBox.js';
import { getCatalog, getCategories } from '../api/bioModelApi.js';

const PAGE_SIZE = 12;
const SUBJECT = 'BIOLOGY';
const LAB_MODES = ['skull', 'paramecium', 'chemistry', 'organs', 'plant', 'mitosis'];

const state = {
  page: 0,
  grade: null,
  category: null,
  q: '',
  totalPages: 0,
  totalElements: 0
};

document.addEventListener('DOMContentLoaded', () => {
  setupNavbarAuth();
  try {
    new ChatBox();
  } catch (err) {
    console.warn('BioBot init note:', err);
  }

  readFiltersFromUrl();
  bindControls();
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
    retryBtn.addEventListener('click', () => loadCatalog());
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

async function loadCategories() {
  const wrap = document.getElementById('catalog-categories');
  if (!wrap) return;

  try {
    const categories = await getCategories(SUBJECT);
    const chips = [
      chipButton('', 'Tất cả thể loại', !state.category),
      ...(categories || []).map((name) => chipButton(name, name, state.category === name))
    ];
    wrap.innerHTML = chips.join('');
    wrap.querySelectorAll('[data-category]').forEach((btn) => {
      btn.addEventListener('click', () => {
        applyFilters({ category: btn.dataset.category || null, page: 0 });
      });
    });
  } catch (err) {
    wrap.innerHTML = `<p class="font-body-sm text-sm text-[#5b403e]">Không tải được danh sách thể loại.</p>`;
    console.warn(err);
  }
}

function chipButton(value, label, active) {
  const pressed = active ? 'true' : 'false';
  const activeClass = active ? ' is-active' : '';
  return `<button type="button" data-category="${escapeAttr(value)}" aria-pressed="${pressed}" class="catalog-chip${activeClass}">${escapeHtml(label)}</button>`;
}

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
    const data = await getCatalog({
      grade: state.grade,
      category: state.category,
      subject: SUBJECT,
      q: state.q,
      page: state.page,
      size: PAGE_SIZE
    });

    const items = data?.items || [];
    state.totalPages = data?.totalPages || 0;
    state.totalElements = data?.totalElements || 0;
    state.page = data?.page ?? state.page;

    if (countEl) {
      countEl.textContent = state.totalElements
        ? `${state.totalElements} mô hình sinh học`
        : 'Chưa có mô hình';
    }

    if (!items.length) {
      grid.innerHTML = '';
      show(empty, true);
      renderPagination(pager, 0);
      return;
    }

    grid.innerHTML = items.map(renderCard).join('');
    renderPagination(pager, state.totalPages);
  } catch (err) {
    grid.innerHTML = '';
    if (countEl) countEl.textContent = 'Không tải được danh mục';
    const errorText = document.getElementById('catalog-error-text');
    if (errorText) errorText.textContent = err.message || 'Không tải được kho mô hình.';
    show(error, true);
    renderPagination(pager, 0);
  }
}

function renderSkeletons(grid) {
  if (!grid) return;
  grid.innerHTML = Array.from({ length: 8 }, () => `
    <div class="bg-white border-[2.5px] border-[#2d2d2d] rounded-2xl p-3 sketch-shadow">
      <div class="catalog-thumb mb-2.5 animate-pulse"></div>
      <div class="h-3 w-24 bg-[#dcd5cb] rounded mb-2"></div>
      <div class="h-5 w-3/4 bg-[#dcd5cb] rounded mb-2"></div>
      <div class="h-10 w-full bg-[#f6f3f2] rounded"></div>
    </div>
  `).join('');
}

function renderCard(model) {
  const href = labHref(model);
  const grade = model.grade ? `Lớp ${model.grade}` : 'THCS';
  const badge = model.badgeText || '3D';
  const action = model.actionText || 'Khám phá ngay';
  const icon = model.actionIcon || '3d_rotation';
  const thumb = model.thumbnailUrl
    ? `<img src="${escapeAttr(model.thumbnailUrl)}" alt="${escapeAttr(model.name)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">`
    : `<span class="material-symbols-outlined text-[48px] text-[#00864c]">view_in_ar</span>`;

  return `
    <article class="group bg-white border-[2.5px] border-[#2d2d2d] rounded-2xl p-3 sketch-shadow hover:-translate-y-1 transition-all flex flex-col justify-between relative">
      <div class="absolute -top-2.5 right-3 bg-[#dcfce7] border border-[#2d2d2d] px-2 py-0.5 rounded text-[10px] font-['Space_Grotesk'] font-bold text-[#166534]">${escapeHtml(grade)}</div>
      <div class="catalog-thumb mb-2.5">
        ${thumb}
        <span class="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-white/90 border border-[#2d2d2d] text-[9px] font-['Space_Grotesk'] font-bold">${escapeHtml(badge)}</span>
      </div>
      <div>
        <div class="flex items-center gap-1 mb-1">
          <span class="w-1.5 h-1.5 rounded-full bg-[#00864c]"></span>
          <span class="font-['Space_Grotesk'] text-[10px] text-[#00864c] font-bold uppercase">${escapeHtml(model.category || 'Sinh học')}</span>
        </div>
        <h2 class="font-['Epilogue'] text-[16px] text-[#2d2d2d] leading-snug mb-1 font-bold">${escapeHtml(model.name)}</h2>
        <p class="font-['Be_Vietnam_Pro'] text-[12px] text-[#5b403e] line-clamp-2 mb-3">${escapeHtml(model.description || 'Mô hình 3D tương tác cho bài học KHTN.')}</p>
      </div>
      <a href="${escapeAttr(href)}" class="w-full py-1.5 bg-[#fdfbf7] hover:bg-[#db3237] hover:text-white border-2 border-[#2d2d2d] rounded-lg font-['Space_Grotesk'] text-xs font-bold flex items-center justify-center gap-1 transition-colors">
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
  const mode = model?.targetMode;
  if (mode && LAB_MODES.includes(mode)) {
    return `/lab.html?mode=${encodeURIComponent(mode)}`;
  }
  return '/lab.html';
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
