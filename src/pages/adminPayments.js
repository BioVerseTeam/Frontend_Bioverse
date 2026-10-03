import { setupNavbarAuth } from '../utils/authNavbar.js';
import { requireAdmin } from '../utils/adminGuard.js';
import { getAdminPayments, getAdminSubscriptions } from '../api/adminPaymentApi.js';

let currentTab = 'payments'; // 'payments' | 'subscriptions'
let currentPage = 0;
let totalPages = 1;

function formatVND(amount) {
  if (amount == null) return '0đ';
  return Number(amount).toLocaleString('vi-VN') + 'đ';
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

function statusBadge(status) {
  switch (status) {
    case 'PAID':
    case 'ACTIVE':
      return `<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#e8f5e9] text-[#2e7d32] border border-[#2e7d32]">${status === 'PAID' ? 'Đã thanh toán' : 'Đang hoạt động'}</span>`;
    case 'PENDING':
      return `<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#fff8e1] text-[#f57f17] border border-[#f57f17]">Đang chờ</span>`;
    case 'CANCELLED':
      return `<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#f5f5f5] text-[#76716a] border border-[#76716a]">Đã hủy</span>`;
    case 'EXPIRED':
      return `<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#f5f5f5] text-[#76716a] border border-[#76716a]">Hết hạn</span>`;
    case 'FAILED':
      return `<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#ffdad6] text-[#b71422] border border-[#b71422]">Thất bại</span>`;
    default:
      return `<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-700">${status}</span>`;
  }
}

async function loadData() {
  const container = document.getElementById('tab-content');
  const status = document.getElementById('status-filter').value || null;
  const keyword = document.getElementById('keyword-input').value.trim() || null;

  container.innerHTML = `
    <div class="p-8 text-center text-gray-500">
      <span class="material-symbols-outlined text-[32px] animate-spin text-primary">progress_activity</span>
      <p class="mt-2 text-xs">Đang nạp dữ liệu...</p>
    </div>
  `;

  try {
    if (currentTab === 'payments') {
      const res = await getAdminPayments({ status, keyword, page: currentPage, size: 15 });
      renderPaymentsTable(container, res);
    } else {
      const res = await getAdminSubscriptions({ status, keyword, page: currentPage, size: 15 });
      renderSubscriptionsTable(container, res);
    }
  } catch (err) {
    console.error('Failed to load admin data:', err);
    container.innerHTML = `
      <div class="p-8 text-center text-red-500 font-bold text-xs">
        Lỗi tải dữ liệu: ${err.message}
      </div>
    `;
  }
}

function renderPaymentsTable(container, pageData) {
  const items = pageData?.items || [];
  totalPages = pageData?.totalPages || 1;
  updatePagination();

  if (items.length === 0) {
    container.innerHTML = `<div class="p-8 text-center text-gray-500 text-xs">Không có giao dịch thanh toán nào phù hợp.</div>`;
    return;
  }

  container.innerHTML = `
    <table class="w-full text-left text-sm border-collapse">
      <thead>
        <tr class="bg-[#f9f7f2] border-b-2 border-[#2d2d2d]">
          <th class="p-3.5 font-bold">Mã đơn</th>
          <th class="p-3.5 font-bold">Người mua</th>
          <th class="p-3.5 font-bold">Gói cước</th>
          <th class="p-3.5 font-bold">Số tiền</th>
          <th class="p-3.5 font-bold">Trạng thái</th>
          <th class="p-3.5 font-bold">Khởi tạo</th>
          <th class="p-3.5 font-bold">Thanh toán lúc</th>
        </tr>
      </thead>
      <tbody class="divide-y border-[#2d2d2d]">
        ${items.map(p => `
          <tr class="hover:bg-[#fdfbf7] transition-colors border-b border-[#2d2d2d]/10">
            <td class="p-3.5 font-mono font-bold text-xs">#${p.orderCode}</td>
            <td class="p-3.5">
              <span class="font-bold text-[#1b1c1c]">${p.userFullName || '—'}</span>
              <p class="text-xs text-gray-500 font-mono">${p.userEmail || ''}</p>
            </td>
            <td class="p-3.5 font-medium">${p.planName || '—'}</td>
            <td class="p-3.5 font-bold text-primary">${formatVND(p.amount)}</td>
            <td class="p-3.5">${statusBadge(p.status)}</td>
            <td class="p-3.5 text-xs text-gray-500">${formatDate(p.createdAt)}</td>
            <td class="p-3.5 text-xs font-medium text-gray-700">${formatDate(p.paidAt)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function renderSubscriptionsTable(container, pageData) {
  const items = pageData?.items || [];
  totalPages = pageData?.totalPages || 1;
  updatePagination();

  if (items.length === 0) {
    container.innerHTML = `<div class="p-8 text-center text-gray-500 text-xs">Không có người dùng nào đang sở hữu gói.</div>`;
    return;
  }

  container.innerHTML = `
    <table class="w-full text-left text-sm border-collapse">
      <thead>
        <tr class="bg-[#f9f7f2] border-b-2 border-[#2d2d2d]">
          <th class="p-3.5 font-bold">Người dùng</th>
          <th class="p-3.5 font-bold">Gói cước</th>
          <th class="p-3.5 font-bold">Trạng thái</th>
          <th class="p-3.5 font-bold">Ngày bắt đầu</th>
          <th class="p-3.5 font-bold">Ngày hết hạn</th>
          <th class="p-3.5 font-bold">Tự gia hạn</th>
        </tr>
      </thead>
      <tbody class="divide-y border-[#2d2d2d]">
        ${items.map(s => `
          <tr class="hover:bg-[#fdfbf7] transition-colors border-b border-[#2d2d2d]/10">
            <td class="p-3.5">
              <span class="font-bold text-[#1b1c1c]">${s.userFullName || '—'}</span>
              <p class="text-xs text-gray-500 font-mono">${s.userEmail || ''}</p>
            </td>
            <td class="p-3.5 font-bold text-primary">${s.plan?.name || '—'}</td>
            <td class="p-3.5">${statusBadge(s.status)}</td>
            <td class="p-3.5 text-xs text-gray-600">${formatDate(s.startDate)}</td>
            <td class="p-3.5 text-xs font-bold text-[#1b1c1c]">${formatDate(s.endDate)}</td>
            <td class="p-3.5 text-xs text-gray-500">${s.autoRenew ? 'Có' : 'Không'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function updatePagination() {
  const info = document.getElementById('page-info');
  const prev = document.getElementById('prev-page-btn');
  const next = document.getElementById('next-page-btn');

  if (info) info.textContent = `Trang ${currentPage + 1} / ${Math.max(1, totalPages)}`;
  if (prev) prev.disabled = currentPage <= 0;
  if (next) next.disabled = currentPage >= totalPages - 1;
}

function bindEvents() {
  const tabPayments = document.getElementById('tab-payments-btn');
  const tabSubs = document.getElementById('tab-subs-btn');
  const filter = document.getElementById('status-filter');
  const keyword = document.getElementById('keyword-input');
  const refresh = document.getElementById('refresh-btn');
  const prev = document.getElementById('prev-page-btn');
  const next = document.getElementById('next-page-btn');

  tabPayments.addEventListener('click', () => {
    currentTab = 'payments';
    currentPage = 0;
    tabPayments.className = 'px-4 py-2 rounded-lg bg-white border border-[#2d2d2d] sketch-shadow-sm transition-all';
    tabSubs.className = 'px-4 py-2 rounded-lg text-gray-600 hover:text-black transition-all';
    loadData();
  });

  tabSubs.addEventListener('click', () => {
    currentTab = 'subscriptions';
    currentPage = 0;
    tabSubs.className = 'px-4 py-2 rounded-lg bg-white border border-[#2d2d2d] sketch-shadow-sm transition-all';
    tabPayments.className = 'px-4 py-2 rounded-lg text-gray-600 hover:text-black transition-all';
    loadData();
  });

  filter.addEventListener('change', () => {
    currentPage = 0;
    loadData();
  });

  let debounceTimer;
  keyword.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      currentPage = 0;
      loadData();
    }, 400);
  });

  refresh.addEventListener('click', () => {
    loadData();
  });

  prev.addEventListener('click', () => {
    if (currentPage > 0) {
      currentPage--;
      loadData();
    }
  });

  next.addEventListener('click', () => {
    if (currentPage < totalPages - 1) {
      currentPage++;
      loadData();
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  try {
    setupNavbarAuth();
  } catch (err) {
    console.warn('Admin navbar failed', err);
  }

  if (!requireAdmin({
    loginNext: '/admin-payments',
    message: 'Chỉ ADMIN mới có quyền truy cập trang thanh toán.'
  })) return;

  bindEvents();
  loadData();
});
