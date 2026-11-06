/**
 * BioVerse Admin Feedbacks Management Page
 * Quản lý ý kiến đóng góp, báo lỗi, cập nhật trạng thái và xuất file Excel (.xlsx / .csv)
 * Tích hợp GSAP animations và Neo-brutalist sketchbook UI.
 */

import gsap from 'gsap';
import { setupNavbarAuth } from '../utils/authNavbar.js';
import { requireAdmin } from '../utils/adminGuard.js';
import { 
  getAdminFeedbacks, 
  getAdminFeedbackById, 
  updateAdminFeedback, 
  deleteAdminFeedback, 
  downloadAdminFeedbacksCsv 
} from '../api/adminFeedbackApi.js';
import { exportToExcelFile, formatFeedbacksForExport } from '../utils/excelExporter.js';

let currentPage = 0;
const pageSize = 15;
let totalPages = 1;
let totalElements = 0;
let currentFeedbacks = [];
let selectedFeedback = null;
let searchDebounceTimer = null;

const CATEGORY_MAP = {
  BUG: { label: 'Báo lỗi kỹ thuật', icon: 'bug_report', bg: '#fee2e2', color: '#b91c1c' },
  CONTENT: { label: 'Nội dung & 3D', icon: 'science', bg: '#ecfdf5', color: '#047857' },
  UI_UX: { label: 'Giao diện', icon: 'palette', bg: '#eff6ff', color: '#1d4ed8' },
  FEATURE: { label: 'Đề xuất tính năng', icon: 'lightbulb', bg: '#fef3c7', color: '#b45309' },
  GENERAL: { label: 'Góp ý chung', icon: 'chat_bubble', bg: '#f3f4f6', color: '#374151' }
};

const STATUS_MAP = {
  PENDING: { label: 'Chờ xử lý', bg: '#fffbeb', color: '#b45309', border: '#f59e0b' },
  REVIEWED: { label: 'Đã xem', bg: '#eff6ff', color: '#1d4ed8', border: '#3b82f6' },
  RESOLVED: { label: 'Đã giải quyết', bg: '#f0fdf4', color: '#15803d', border: '#22c55e' },
  DISMISSED: { label: 'Đã bỏ qua', bg: '#f3f4f6', color: '#6b7280', border: '#9ca3af' }
};

document.addEventListener('DOMContentLoaded', () => {
  setupNavbarAuth();
  const ok = requireAdmin({ loginNext: '/admin-feedbacks' });
  if (!ok) return;

  initEventListeners();
  loadData();
});

function initEventListeners() {
  // Status filter
  const statusFilter = document.getElementById('filter-status');
  if (statusFilter) {
    statusFilter.addEventListener('change', () => {
      currentPage = 0;
      loadData();
    });
  }

  // Category filter
  const catFilter = document.getElementById('filter-category');
  if (catFilter) {
    catFilter.addEventListener('change', () => {
      currentPage = 0;
      loadData();
    });
  }

  // Rating filter
  const ratingFilter = document.getElementById('filter-rating');
  if (ratingFilter) {
    ratingFilter.addEventListener('change', () => {
      currentPage = 0;
      loadData();
    });
  }

  // Search keyword with debounce
  const keywordInput = document.getElementById('keyword-input');
  if (keywordInput) {
    keywordInput.addEventListener('input', () => {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        currentPage = 0;
        loadData();
      }, 350);
    });
  }

  // Reset / Refresh button
  const resetBtn = document.getElementById('filter-reset-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      const icon = document.getElementById('refresh-icon');
      if (icon) {
        gsap.to(icon, { rotate: '+=360', duration: 0.45, ease: 'power2.inOut' });
      }
      if (statusFilter) statusFilter.value = '';
      if (catFilter) catFilter.value = '';
      if (ratingFilter) ratingFilter.value = '';
      if (keywordInput) keywordInput.value = '';
      currentPage = 0;
      loadData();
    });
  }

  // Export Excel button
  const exportExcelBtn = document.getElementById('export-excel-btn');
  if (exportExcelBtn) {
    exportExcelBtn.addEventListener('click', handleExportExcel);
  }

  // Export CSV button
  const exportCsvBtn = document.getElementById('export-csv-btn');
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', handleExportCsv);
  }

  // Modal actions
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalBackdrop = document.getElementById('detail-modal-backdrop');
  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeDetailModal);
  if (modalBackdrop) {
    modalBackdrop.addEventListener('click', (e) => {
      if (e.target === modalBackdrop) closeDetailModal();
    });
  }

  const modalSaveBtn = document.getElementById('modal-save-btn');
  if (modalSaveBtn) modalSaveBtn.addEventListener('click', handleSaveStatus);

  const modalDeleteBtn = document.getElementById('modal-delete-btn');
  if (modalDeleteBtn) modalDeleteBtn.addEventListener('click', handleDeleteFeedback);

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDetailModal();
  });
}

function getFilterParams() {
  return {
    status: document.getElementById('filter-status')?.value || null,
    category: document.getElementById('filter-category')?.value || null,
    rating: document.getElementById('filter-rating')?.value || null,
    keyword: document.getElementById('keyword-input')?.value?.trim() || null
  };
}

async function loadData() {
  const container = document.getElementById('table-container');
  const filters = getFilterParams();

  container.innerHTML = `
    <div class="p-12 text-center text-gray-500">
      <span class="material-symbols-outlined text-[32px] animate-spin text-primary">progress_activity</span>
      <p class="mt-2 text-xs">Đang nạp dữ liệu góp ý...</p>
    </div>
  `;

  try {
    const res = await getAdminFeedbacks({
      ...filters,
      page: currentPage,
      size: pageSize
    });

    currentFeedbacks = res?.items || [];
    totalPages = res?.totalPages || 1;
    totalElements = res?.totalElements || 0;

    renderTable(currentFeedbacks);
    updateMetrics(currentFeedbacks, totalElements);
    updatePagination();
  } catch (err) {
    console.error('Failed to load feedbacks:', err);
    container.innerHTML = `
      <div class="p-8 text-center text-red-600 font-bold text-xs">
        Lỗi khi tải dữ liệu: ${escapeHtml(err.message)}
      </div>
    `;
  }
}

function updateMetrics(items, total) {
  const totalEl = document.getElementById('stat-total');
  const pendingEl = document.getElementById('stat-pending');
  const ratingEl = document.getElementById('stat-rating');
  const resolvedEl = document.getElementById('stat-resolved');
  const updatedText = document.getElementById('last-updated-text');

  if (totalEl) totalEl.textContent = total.toLocaleString('vi-VN');

  // Compute metrics from current page or sample
  let pendingCount = 0;
  let resolvedCount = 0;
  let totalRating = 0;

  items.forEach(item => {
    if (item.status === 'PENDING') pendingCount++;
    if (item.status === 'RESOLVED') resolvedCount++;
    totalRating += (item.rating || 5);
  });

  const avg = items.length > 0 ? (totalRating / items.length).toFixed(1) : '5.0';

  if (pendingEl) pendingEl.textContent = pendingCount;
  if (resolvedEl) resolvedEl.textContent = resolvedCount;
  if (ratingEl) ratingEl.textContent = avg;
  if (updatedText) {
    const now = new Date();
    updatedText.textContent = `Cập nhật: ${now.toLocaleTimeString('vi-VN')}`;
  }
}

function renderTable(feedbacks) {
  const container = document.getElementById('table-container');

  if (feedbacks.length === 0) {
    container.innerHTML = `
      <div class="p-12 text-center text-gray-500">
        <span class="material-symbols-outlined text-[42px] text-gray-400 mb-2">inbox</span>
        <p class="text-sm font-bold text-gray-700">Chưa có ý kiến đóng góp nào phù hợp</p>
        <p class="text-xs text-gray-400 mt-1">Thử đổi trạng thái hoặc điều chỉnh từ khóa tìm kiếm.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <table class="w-full text-left text-xs border-collapse">
      <thead>
        <tr class="bg-[#f9f7f2] border-b-2 border-[#2d2d2d] text-gray-700 font-bold uppercase tracking-wider text-[11px]">
          <th class="p-3 w-16 text-center">ID</th>
          <th class="p-3 w-48">Người gửi</th>
          <th class="p-3 w-36">Chủ đề</th>
          <th class="p-3 w-28 text-center">Đánh giá</th>
          <th class="p-3">Nội dung góp ý</th>
          <th class="p-3 w-36 text-center">Trạng thái</th>
          <th class="p-3 w-28 text-center">Ngày gửi</th>
          <th class="p-3 w-24 text-center">Thao tác</th>
        </tr>
      </thead>
      <tbody id="feedback-table-body" class="divide-y divide-gray-200">
        ${feedbacks.map((f, idx) => `
          <tr class="hover:bg-[#fdfbf7] transition-colors feedback-row" data-id="${f.id}">
            <td class="p-3 text-center font-mono font-bold text-gray-600">#${f.id}</td>
            <td class="p-3">
              <div class="font-bold text-[#1b1c1c]">${escapeHtml(f.userName || 'Khách ẩn danh')}</div>
              <div class="text-[11px] text-gray-500 font-mono">${escapeHtml(f.userEmail || '—')}</div>
            </td>
            <td class="p-3">
              ${renderCategoryBadge(f.category)}
            </td>
            <td class="p-3 text-center">
              ${renderStars(f.rating)}
            </td>
            <td class="p-3">
              ${f.title ? `<div class="font-bold text-gray-900 mb-0.5 line-clamp-1">${escapeHtml(f.title)}</div>` : ''}
              <div class="text-gray-600 line-clamp-2">${escapeHtml(f.content)}</div>
              ${f.adminNotes ? `<div class="text-[11px] text-[#006a3b] font-medium mt-1">💬 BQT: ${escapeHtml(f.adminNotes)}</div>` : ''}
            </td>
            <td class="p-3 text-center">
              ${renderStatusBadge(f.status)}
            </td>
            <td class="p-3 text-center text-gray-500 whitespace-nowrap">
              ${formatDateShort(f.createdAt)}
            </td>
            <td class="p-3 text-center">
              <button type="button" 
                      class="px-2.5 py-1 rounded-lg border border-[#2d2d2d] bg-white hover:bg-gray-100 font-bold text-[11px] inline-flex items-center gap-1 shadow-sm transition-transform active:scale-95 view-btn"
                      data-id="${f.id}">
                <span class="material-symbols-outlined text-[14px]">visibility</span>
                Chi tiết
              </button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  // Attach view listeners
  container.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      openDetailModal(id);
    });
  });

  // Stagger GSAP entrance animation on rows
  gsap.fromTo('.feedback-row', 
    { opacity: 0, y: 12 }, 
    { opacity: 1, y: 0, stagger: 0.03, duration: 0.25, ease: 'power2.out' }
  );
}

function renderCategoryBadge(cat) {
  const item = CATEGORY_MAP[cat] || CATEGORY_MAP.GENERAL;
  return `
    <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border border-[#2d2d2d]/30" style="background-color: ${item.bg}; color: ${item.color};">
      <span class="material-symbols-outlined text-[13px]">${item.icon}</span>
      <span>${item.label}</span>
    </span>
  `;
}

function renderStatusBadge(st) {
  const item = STATUS_MAP[st] || STATUS_MAP.PENDING;
  return `
    <span class="inline-block px-2.5 py-1 rounded-full text-[11px] font-bold border" style="background-color: ${item.bg}; color: ${item.color}; border-color: ${item.border};">
      ${item.label}
    </span>
  `;
}

function renderStars(rating = 5) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    const isLit = i <= rating;
    stars.push(`<span class="material-symbols-outlined text-[14px] ${isLit ? 'text-amber-500' : 'text-gray-300'}" style="font-variation-settings: 'FILL' 1;">star</span>`);
  }
  return `<div class="inline-flex items-center">${stars.join('')}</div>`;
}

function updatePagination() {
  const info = document.getElementById('pagination-info');
  const controls = document.getElementById('pagination-controls');

  if (info) {
    const start = totalElements === 0 ? 0 : currentPage * pageSize + 1;
    const end = Math.min((currentPage + 1) * pageSize, totalElements);
    info.textContent = `Hiển thị ${start} - ${end} / Tổng ${totalElements} góp ý`;
  }

  if (!controls) return;
  controls.innerHTML = '';

  // Prev button
  const prevBtn = document.createElement('button');
  prevBtn.type = 'button';
  prevBtn.className = `px-3 py-1.5 rounded-lg border border-[#2d2d2d] bg-white font-bold text-xs flex items-center ${currentPage === 0 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-100'}`;
  prevBtn.disabled = currentPage === 0;
  prevBtn.innerHTML = '<span class="material-symbols-outlined text-[14px]">chevron_left</span> Trước';
  prevBtn.addEventListener('click', () => {
    if (currentPage > 0) {
      currentPage--;
      loadData();
    }
  });
  controls.appendChild(prevBtn);

  // Page indicator
  const pageTag = document.createElement('span');
  pageTag.className = 'px-3 py-1 font-mono font-bold text-xs';
  pageTag.textContent = `${currentPage + 1} / ${totalPages || 1}`;
  controls.appendChild(pageTag);

  // Next button
  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.className = `px-3 py-1.5 rounded-lg border border-[#2d2d2d] bg-white font-bold text-xs flex items-center ${currentPage >= totalPages - 1 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-100'}`;
  nextBtn.disabled = currentPage >= totalPages - 1;
  nextBtn.innerHTML = 'Sau <span class="material-symbols-outlined text-[14px]">chevron_right</span>';
  nextBtn.addEventListener('click', () => {
    if (currentPage < totalPages - 1) {
      currentPage++;
      loadData();
    }
  });
  controls.appendChild(nextBtn);
}

async function openDetailModal(id) {
  const backdrop = document.getElementById('detail-modal-backdrop');
  const card = document.getElementById('detail-modal-card');

  try {
    selectedFeedback = await getAdminFeedbackById(id);
    if (!selectedFeedback) return;

    // Populate fields
    document.getElementById('modal-feedback-meta').textContent = `#${selectedFeedback.id} • Gửi lúc ${formatDate(selectedFeedback.createdAt)}`;
    document.getElementById('modal-sender-name').textContent = selectedFeedback.userName || 'Khách ẩn danh';
    document.getElementById('modal-sender-email').textContent = selectedFeedback.userEmail || 'Chưa cung cấp email';

    const catBadge = document.getElementById('modal-category-badge');
    if (catBadge) {
      const cat = CATEGORY_MAP[selectedFeedback.category] || CATEGORY_MAP.GENERAL;
      catBadge.textContent = cat.label;
      catBadge.style.backgroundColor = cat.bg;
      catBadge.style.color = cat.color;
    }

    const ratingBadge = document.getElementById('modal-rating-badge');
    if (ratingBadge) {
      ratingBadge.textContent = `${selectedFeedback.rating || 5} ⭐`;
    }

    document.getElementById('modal-feedback-title').textContent = selectedFeedback.title || '(Không có tiêu đề)';
    document.getElementById('modal-feedback-content').textContent = selectedFeedback.content || '';
    document.getElementById('modal-page-url').textContent = selectedFeedback.pageUrl || '—';
    document.getElementById('modal-device-info').textContent = selectedFeedback.deviceInfo || '—';

    document.getElementById('modal-status-select').value = selectedFeedback.status || 'PENDING';
    document.getElementById('modal-admin-notes').value = selectedFeedback.adminNotes || '';

    backdrop.classList.remove('hidden');

    // GSAP entrance
    gsap.fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: 0.2 });
    gsap.fromTo(card, 
      { scale: 0.9, y: 20, opacity: 0 }, 
      { scale: 1, y: 0, opacity: 1, duration: 0.35, ease: 'back.out(1.4)' }
    );
  } catch (err) {
    console.error('Failed to load feedback detail:', err);
    alert('Không thể nạp chi tiết: ' + err.message);
  }
}

function closeDetailModal() {
  const backdrop = document.getElementById('detail-modal-backdrop');
  const card = document.getElementById('detail-modal-card');
  if (!backdrop) return;

  gsap.to(card, { scale: 0.92, y: 15, opacity: 0, duration: 0.18, ease: 'power2.in' });
  gsap.to(backdrop, {
    opacity: 0,
    duration: 0.18,
    onComplete: () => {
      backdrop.classList.add('hidden');
      selectedFeedback = null;
    }
  });
}

async function handleSaveStatus() {
  if (!selectedFeedback) return;

  const saveBtn = document.getElementById('modal-save-btn');
  const status = document.getElementById('modal-status-select').value;
  const adminNotes = document.getElementById('modal-admin-notes').value.trim();

  saveBtn.disabled = true;
  saveBtn.innerHTML = `
    <span class="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
    Đang lưu...
  `;

  try {
    await updateAdminFeedback(selectedFeedback.id, { status, adminNotes });
    closeDetailModal();
    loadData();
  } catch (err) {
    console.error('Failed to update feedback:', err);
    alert('Không thể lưu cập nhật: ' + err.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = `
      <span class="material-symbols-outlined text-[16px]">save</span>
      Lưu thay đổi
    `;
  }
}

async function handleDeleteFeedback() {
  if (!selectedFeedback) return;
  const ok = confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn góp ý #${selectedFeedback.id} này không?`);
  if (!ok) return;

  try {
    await deleteAdminFeedback(selectedFeedback.id);
    closeDetailModal();
    loadData();
  } catch (err) {
    console.error('Failed to delete feedback:', err);
    alert('Lỗi khi xóa góp ý: ' + err.message);
  }
}

async function handleExportExcel() {
  const btn = document.getElementById('export-excel-btn');
  const originalHtml = btn.innerHTML;

  btn.disabled = true;
  btn.innerHTML = `
    <span class="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
    <span>Đang xuất Excel...</span>
  `;

  try {
    const filters = getFilterParams();
    // Fetch all records for export (size 1000)
    const res = await getAdminFeedbacks({
      ...filters,
      page: 0,
      size: 1000
    });

    const items = res?.items || [];
    if (items.length === 0) {
      alert('Không có dữ liệu phù hợp để xuất Excel');
      return;
    }

    const formatted = formatFeedbacksForExport(items);
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    exportToExcelFile(formatted, `BioVerse_Feedbacks_${dateStr}.xls`, 'Danh sách Góp ý');

    // Celebratory bounce
    gsap.fromTo(btn, { scale: 0.95 }, { scale: 1.05, duration: 0.15, yoyo: true, repeat: 1 });
  } catch (err) {
    console.error('Export Excel failed:', err);
    alert('Không thể xuất file Excel: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHtml;
  }
}

async function handleExportCsv() {
  const btn = document.getElementById('export-csv-btn');
  const originalHtml = btn.innerHTML;

  btn.disabled = true;
  btn.innerHTML = `<span class="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>`;

  try {
    const filters = getFilterParams();
    await downloadAdminFeedbacksCsv(filters);
  } catch (err) {
    console.error('Download CSV failed:', err);
    alert('Không thể tải file CSV: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHtml;
  }
}

function formatDate(dtStr) {
  if (!dtStr) return '—';
  try {
    const d = new Date(dtStr);
    return d.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dtStr;
  }
}

function formatDateShort(dtStr) {
  if (!dtStr) return '—';
  try {
    const d = new Date(dtStr);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  } catch {
    return dtStr;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
