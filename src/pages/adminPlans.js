import { setupNavbarAuth } from '../utils/authNavbar.js';
import { requireAdmin } from '../utils/adminGuard.js';
import { getAdminPlans, createAdminPlan, updateAdminPlan, deleteAdminPlan } from '../api/adminPlanApi.js';
import { alertModal, confirmModal, showToast } from '../components/modal.js';

let plansList = [];

function formatVND(amount) {
  if (amount == null) return '0đ';
  return Number(amount).toLocaleString('vi-VN') + 'đ';
}

function statusBadge(status) {
  switch (status) {
    case 'ACTIVE':
      return `<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#e8f5e9] text-[#2e7d32] border border-[#2e7d32]">Mở bán</span>`;
    case 'INACTIVE':
      return `<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#fff8e1] text-[#f57f17] border border-[#f57f17]">Tạm ẩn</span>`;
    case 'ARCHIVED':
      return `<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#f5f5f5] text-[#76716a] border border-[#76716a]">Lưu trữ</span>`;
    default:
      return `<span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-700">${status}</span>`;
  }
}

async function renderTable() {
  const tbody = document.getElementById('plans-table-body');
  if (!tbody) return;

  try {
    plansList = await getAdminPlans();
    if (!Array.isArray(plansList) || plansList.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="p-6 text-center text-gray-500 text-xs">Chưa có gói cước nào trong hệ thống.</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = plansList.map(plan => `
      <tr class="hover:bg-[#fdfbf7] transition-colors border-b border-[#2d2d2d]/10">
        <td class="p-3.5 font-bold text-center w-12">${plan.sortOrder || 0}</td>
        <td class="p-3.5 font-bold text-[#1b1c1c]">
          ${plan.name}
          ${plan.description ? `<p class="text-[11px] text-gray-500 font-normal mt-0.5">${plan.description}</p>` : ''}
        </td>
        <td class="p-3.5 font-mono text-xs text-gray-600">${plan.slug}</td>
        <td class="p-3.5">${plan.durationDays} ngày</td>
        <td class="p-3.5 font-bold text-primary">${formatVND(plan.price)}</td>
        <td class="p-3.5 text-xs text-gray-400 line-through">${plan.originalPrice ? formatVND(plan.originalPrice) : '—'}</td>
        <td class="p-3.5">${statusBadge(plan.status)}</td>
        <td class="p-3.5 text-right whitespace-nowrap">
          <button data-id="${plan.id}" class="edit-plan-btn px-2.5 py-1 text-xs font-bold text-[#1b1c1c] hover:text-primary transition-colors">
            Sửa
          </button>
          ${plan.status !== 'ARCHIVED' ? `
            <button data-id="${plan.id}" class="archive-plan-btn px-2.5 py-1 text-xs font-bold text-[#b71422] hover:underline">
              Lưu trữ
            </button>
          ` : ''}
        </td>
      </tr>
    `).join('');

    bindTableActions();
  } catch (err) {
    console.error('Failed to load admin plans:', err);
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="p-6 text-center text-red-500 text-xs font-bold">Lỗi tải dữ liệu: ${err.message}</td>
      </tr>
    `;
  }
}

function bindTableActions() {
  document.querySelectorAll('.edit-plan-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.id);
      const plan = plansList.find(p => p.id === id);
      if (plan) openModal(plan);
    });
  });

  document.querySelectorAll('.archive-plan-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = Number(btn.dataset.id);
      const ok = await confirmModal('Bạn có chắc chắn muốn lưu trữ gói cước này? Gói sẽ không còn hiển thị cho học sinh mua mới.', 'Xác nhận lưu trữ');
      if (!ok) return;

      try {
        await deleteAdminPlan(id);
        showToast('Đã lưu trữ gói cước thành công');
        renderTable();
      } catch (e) {
        alertModal(e.message, 'Lỗi', 'error');
      }
    });
  });
}

const modal = document.getElementById('plan-modal');
const modalTitle = document.getElementById('plan-modal-title');
const planForm = document.getElementById('plan-form');

function openModal(plan = null) {
  if (!modal || !planForm) return;

  if (plan) {
    modalTitle.textContent = 'Cập nhật gói cước';
    document.getElementById('plan-id').value = plan.id;
    document.getElementById('plan-name').value = plan.name || '';
    document.getElementById('plan-slug').value = plan.slug || '';
    document.getElementById('plan-duration').value = plan.duration || 'MONTHLY';
    document.getElementById('plan-days').value = plan.durationDays || 30;
    document.getElementById('plan-price').value = plan.price || '';
    document.getElementById('plan-original-price').value = plan.originalPrice || '';
    document.getElementById('plan-description').value = plan.description || '';
    document.getElementById('plan-features').value = Array.isArray(plan.features) ? plan.features.join(', ') : '';
    document.getElementById('plan-status').value = plan.status || 'ACTIVE';
    document.getElementById('plan-sort-order').value = plan.sortOrder || 1;
  } else {
    modalTitle.textContent = 'Tạo gói cước mới';
    planForm.reset();
    document.getElementById('plan-id').value = '';
    document.getElementById('plan-days').value = 30;
    document.getElementById('plan-sort-order').value = plansList.length + 1;
    document.getElementById('plan-status').value = 'ACTIVE';
  }

  modal.classList.remove('hidden');
}

function closeModal() {
  if (modal) modal.classList.add('hidden');
}

function bindModal() {
  const addBtn = document.getElementById('add-plan-btn');
  const closeBtn = document.getElementById('close-modal-btn');
  const cancelBtn = document.getElementById('cancel-modal-btn');

  if (addBtn) addBtn.addEventListener('click', () => openModal(null));
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

  if (planForm) {
    planForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('plan-id').value;
      const rawFeatures = document.getElementById('plan-features').value;
      const features = rawFeatures
        ? rawFeatures.split(',').map(s => s.trim()).filter(Boolean)
        : [];

      const payload = {
        name: document.getElementById('plan-name').value.trim(),
        slug: document.getElementById('plan-slug').value.trim() || null,
        duration: document.getElementById('plan-duration').value,
        durationDays: Number(document.getElementById('plan-days').value),
        price: Number(document.getElementById('plan-price').value),
        originalPrice: document.getElementById('plan-original-price').value ? Number(document.getElementById('plan-original-price').value) : null,
        description: document.getElementById('plan-description').value.trim() || null,
        features: features,
        status: document.getElementById('plan-status').value,
        sortOrder: Number(document.getElementById('plan-sort-order').value) || 0
      };

      try {
        if (id) {
          await updateAdminPlan(Number(id), payload);
          showToast('Cập nhật gói cước thành công');
        } else {
          await createAdminPlan(payload);
          showToast('Tạo gói cước mới thành công');
        }
        closeModal();
        renderTable();
      } catch (err) {
        alertModal(err.message, 'Lỗi lưu gói cước', 'error');
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  try {
    setupNavbarAuth();
  } catch (err) {
    console.warn('Admin navbar failed', err);
  }

  if (!requireAdmin({
    loginNext: '/admin-plans',
    message: 'Chỉ ADMIN mới có quyền quản lý gói cước.'
  })) return;

  bindModal();
  renderTable();
});
