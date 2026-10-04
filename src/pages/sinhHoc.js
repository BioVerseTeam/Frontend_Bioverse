import gsap from 'gsap';
import { setupNavbarAuth } from '../utils/authNavbar.js';
import { setupBiologyNav } from '../utils/siteNav.js';
import { ChatBox } from '../components/chatBox.js';
import { getCatalog, getCategories } from '../api/bioModelApi.js';
import {
  getRecentModels,
  clearRecentModels,
  removeRecentModel,
  formatTimeAgoVi,
  recordViewedModel
} from '../features/model/recentModels.js';
import { confirmModal, showToast } from '../components/modal.js';

const PAGE_SIZE = 12;
const SUBJECT = 'BIOLOGY';

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

function renderCard(model, index = 0) {
  const href = labHref(model);
  const grade = model.grade ? `Lớp ${model.grade}` : 'THCS';
  const badge = model.badgeText || '3D';
  const action = model.actionText || 'Khám phá ngay';
  const icon = model.actionIcon || '3d_rotation';
  const thumb = model.thumbnailUrl
    ? `<img src="${escapeAttr(model.thumbnailUrl)}" alt="${escapeAttr(model.name)}" class="max-w-full max-h-full w-auto h-auto object-contain p-2 group-hover:scale-105 transition-transform duration-300" loading="lazy">`
    : `<span class="material-symbols-outlined text-[48px] text-[#00864c]">view_in_ar</span>`;

  return `
    <article data-model-idx="${index}" class="group bg-white border-[2.5px] border-[#2d2d2d] rounded-2xl p-3 sketch-shadow hover:-translate-y-1 transition-all flex flex-col justify-between relative">
      <div class="absolute -top-2.5 right-3 bg-[#dcfce7] border border-[#2d2d2d] px-2 py-0.5 rounded text-[10px] font-['Space_Grotesk'] font-bold text-[#166534]">${escapeHtml(grade)}</div>
      <a href="${escapeAttr(href)}" class="catalog-thumb mb-2.5">
        ${thumb}
        <span class="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-white/90 border border-[#2d2d2d] text-[9px] font-['Space_Grotesk'] font-bold">${escapeHtml(badge)}</span>
      </a>
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
  if (model?.slug) return `/mo-hinh?slug=${encodeURIComponent(model.slug)}`;
  if (model?.id) return `/mo-hinh?id=${encodeURIComponent(model.id)}`;
  return '/sinh-hoc';
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

      if (!body) return;

      if (isRecentCollapsed) {
        gsap.to(body, {
          height: 0,
          opacity: 0,
          duration: 0.35,
          ease: 'power2.inOut',
          overflow: 'hidden',
          onComplete: () => {
            body.style.display = 'none';
          }
        });
        if (icon) icon.textContent = 'expand_more';
        if (text) text.textContent = 'Mở rộng';
      } else {
        body.style.display = 'block';
        gsap.fromTo(body,
          { height: 0, opacity: 0 },
          {
            height: 'auto',
            opacity: 1,
            duration: 0.35,
            ease: 'power2.out',
            clearProps: 'overflow,height'
          }
        );
        if (icon) icon.textContent = 'expand_less';
        if (text) text.textContent = 'Thu gọn';
      }
    });
  }

  if (btnClear) {
    btnClear.addEventListener('click', async () => {
      const recent = getRecentModels();
      if (!recent.length) {
        showToast('Hiện chưa có mô hình nào trong nhật ký quan sát.', 'info');
        return;
      }

      const ok = await confirmModal({
        title: 'Xóa nhật ký quan sát 3D?',
        message: 'Bạn có chắc muốn dọn sạch danh sách các mô hình 3D đã xem qua gần đây không?',
        type: 'confirm',
        confirmText: 'Xóa nhật ký',
        cancelText: 'Giữ lại',
        isDestructive: true,
        washiTag: 'NHẬT KÝ 3D'
      });

      if (ok) {
        const cards = carousel ? carousel.querySelectorAll('article, a') : [];
        if (cards.length) {
          gsap.to(cards, {
            scale: 0.75,
            opacity: 0,
            y: 12,
            stagger: 0.03,
            duration: 0.22,
            ease: 'power2.in',
            onComplete: () => {
              clearRecentModels();
              if (section) {
                gsap.to(section, {
                  opacity: 0,
                  y: -10,
                  duration: 0.25,
                  onComplete: () => {
                    section.hidden = true;
                    section.style.opacity = '1';
                    section.style.transform = 'none';
                  }
                });
              }
              showToast('Đã dọn sạch nhật ký quan sát.', 'info');
            }
          });
        } else {
          clearRecentModels();
          if (section) section.hidden = true;
          showToast('Đã dọn sạch nhật ký quan sát.', 'info');
        }
      }
    });
  }

  window.addEventListener('bioverse_recent_models_updated', () => {
    renderRecentModels(true);
  });
}

function renderRecentModels(animate = false) {
  const section = document.getElementById('recent-models-section');
  const countEl = document.getElementById('recent-models-count');
  const carouselEl = document.getElementById('recent-models-carousel');
  const navControls = document.getElementById('recent-nav-controls');

  if (!section || !carouselEl) return;

  const list = getRecentModels();

  if (!list.length) {
    section.hidden = true;
    return;
  }

  const wasHidden = section.hidden;
  section.hidden = false;

  if (countEl) {
    countEl.textContent = `${list.length} mẫu vật`;
  }

  // Toggle navigation buttons: only show when there are more than 3 models
  if (navControls) {
    navControls.style.display = list.length > 3 ? 'flex' : 'none';
  }

  const cardsHtml = list.map((model, idx) => renderRecentCard(model, idx)).join('');
  const discoveryCardHtml = list.length <= 4 ? renderDiscoveryCard() : '';
  carouselEl.innerHTML = cardsHtml + discoveryCardHtml;

  // Individual card remove handler
  carouselEl.querySelectorAll('.btn-remove-single-recent').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const modelId = btn.dataset.removeId;
      const card = btn.closest('article');
      if (card) {
        gsap.to(card, {
          scale: 0.7,
          opacity: 0,
          y: -8,
          duration: 0.22,
          ease: 'power2.in',
          onComplete: () => {
            removeRecentModel(modelId);
            showToast('Đã xóa mẫu vật khỏi nhật ký.', 'info');
          }
        });
      } else {
        removeRecentModel(modelId);
      }
    });
  });

  const cards = carouselEl.querySelectorAll('.recent-specimen-card');

  // GSAP animation
  if (wasHidden || animate) {
    gsap.fromTo(section,
      { opacity: 0, y: -14, scale: 0.99 },
      { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'power3.out' }
    );
  }

  if (cards.length) {
    gsap.fromTo(cards,
      { opacity: 0, y: 12, scale: 0.96 },
      { opacity: 1, y: 0, scale: 1, duration: 0.35, stagger: 0.05, ease: 'power2.out' }
    );
  }
}

function renderRecentCard(model, index = 0) {
  const href = labHref(model);
  const grade = model.grade ? `Lớp ${model.grade}` : 'THCS';
  const badge = model.badgeText || '3D';
  const timeAgo = formatTimeAgoVi(model.viewedAt);
  
  // Anti-squish: object-contain with max dimensions ensures original anatomical proportions are preserved
  const thumb = model.thumbnailUrl
    ? `<img src="${escapeAttr(model.thumbnailUrl)}" alt="${escapeAttr(model.name)}" class="max-w-full max-h-full w-auto h-auto object-contain transition-transform duration-300 group-hover:scale-105 filter drop-shadow-sm" loading="lazy" />`
    : `<div class="w-full h-full flex flex-col items-center justify-center text-[#00864c]"><span class="material-symbols-outlined text-[40px]">view_in_ar</span><span class="text-[10px] font-bold font-['Space_Grotesk'] mt-1">MÔ HÌNH 3D</span></div>`;

  return `
    <article class="recent-specimen-card group w-52 sm:w-56 flex-shrink-0 snap-start bg-white border-[2.5px] border-[#2d2d2d] rounded-2xl p-3 sketch-shadow-sm hover:-translate-y-1 hover:shadow-[4px_4px_0px_#2d2d2d] transition-all flex flex-col justify-between relative select-none">
      
      <!-- Quick Remove Button -->
      <button type="button" data-remove-id="${escapeAttr(model.id || model.slug)}"
        class="btn-remove-single-recent absolute top-2 right-2 w-7 h-7 rounded-lg bg-white/90 hover:bg-[#fee2e2] text-[#76716a] hover:text-[#b71422] border-2 border-[#2d2d2d] flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 sketch-shadow-sm z-20 cursor-pointer"
        title="Xóa mẫu vật này khỏi nhật ký">
        <span class="material-symbols-outlined text-[15px] pointer-events-none">close</span>
      </button>

      <!-- Thumbnail Stage (Zero Distortion, Object-Contain) -->
      <a href="${escapeAttr(href)}" class="specimen-thumb-box h-36 mb-2.5 overflow-hidden rounded-xl border-2 border-[#2d2d2d] bg-[#f8fafc] flex items-center justify-center relative block group/stage">
        ${thumb}
        <span class="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded bg-white/95 border border-[#2d2d2d] text-[10px] font-['Space_Grotesk'] font-bold text-[#00864c]">
          ${escapeHtml(badge)}
        </span>
        <span class="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded bg-[#fff9c4] border border-[#2d2d2d] text-[10px] font-['Space_Grotesk'] font-bold text-[#92400e]">
          ${escapeHtml(grade)}
        </span>
      </a>

      <!-- Specimen Info -->
      <div class="mb-3">
        <div class="flex items-center justify-between text-[11px] mb-1">
          <span class="font-['Space_Grotesk'] font-bold text-[#00864c] uppercase tracking-wider line-clamp-1">
            ${escapeHtml(model.category || 'Sinh học')}
          </span>
          <span class="font-['Be_Vietnam_Pro'] text-[#76716a] text-[11px] flex-shrink-0 flex items-center gap-0.5">
            <span class="material-symbols-outlined text-[12px]">schedule</span>
            ${escapeHtml(timeAgo)}
          </span>
        </div>
        <h3 class="font-['Epilogue'] text-sm sm:text-[15px] text-[#2d2d2d] font-bold line-clamp-1 leading-snug group-hover:text-[#00864c] transition-colors" title="${escapeAttr(model.name)}">
          ${escapeHtml(model.name)}
        </h3>
      </div>

      <!-- Action Button -->
      <a href="${escapeAttr(href)}" class="w-full py-2 bg-[#fdfbf7] group-hover:bg-[#00864c] group-hover:text-white border-2 border-[#2d2d2d] rounded-xl font-['Space_Grotesk'] text-xs font-bold flex items-center justify-center gap-1.5 sketch-shadow-sm transition-all active:scale-95">
        <span class="material-symbols-outlined text-[16px]">view_in_ar</span>
        <span>Mở lại mẫu vật</span>
      </a>
    </article>
  `;
}

function renderDiscoveryCard() {
  return `
    <a href="#catalog-grid" class="w-48 sm:w-52 flex-shrink-0 snap-start border-2 border-dashed border-[#2d2d2d]/30 hover:border-[#00864c] rounded-2xl p-3.5 flex flex-col items-center justify-center text-center bg-[#fdfbf7]/70 hover:bg-[#f0fdf4] transition-all group cursor-pointer sketch-shadow-sm">
      <div class="w-11 h-11 rounded-xl bg-white border-2 border-[#2d2d2d] flex items-center justify-center mb-2.5 group-hover:scale-110 group-hover:rotate-3 transition-transform sketch-shadow-sm">
        <span class="material-symbols-outlined text-[24px] text-[#00864c]">travel_explore</span>
      </div>
      <h4 class="font-['Epilogue'] text-sm font-bold text-[#2d2d2d] group-hover:text-[#00864c] transition-colors mb-0.5">
        Khám phá thêm
      </h4>
      <p class="font-['Be_Vietnam_Pro'] text-[11px] text-[#76716a] leading-tight mb-3">
        Xem kho mô hình giải phẫu KHTN
      </p>
      <div class="px-2.5 py-1 rounded-lg bg-white border border-[#2d2d2d] text-[11px] font-['Space_Grotesk'] font-bold text-[#2d2d2d] group-hover:bg-[#00864c] group-hover:text-white group-hover:border-[#00864c] transition-colors flex items-center gap-1">
        <span>Xem tất cả</span>
        <span class="material-symbols-outlined text-[13px]">arrow_downward</span>
      </div>
    </a>
  `;
}

