/**
 * Admin role catalog — create, edit, delete roles.
 * Assigning a role to a person stays on the user page.
 */

import { setupNavbarAuth } from '../utils/authNavbar.js';
import { requireAdmin } from '../utils/adminGuard.js';
import { confirmModal, showToast } from '../components/modal.js';
import {
  listAdminRoles,
  createAdminRole,
  updateAdminRole,
  deleteAdminRole,
  isSystemRole
} from '../api/adminRoleApi.js';

const state = {
  q: '',
  items: [],
  selectedId: null,
  saving: false
};

document.addEventListener('DOMContentLoaded', () => {
  try {
    setupNavbarAuth();
  } catch (err) {
    console.warn('Admin navbar failed', err);
  }
  if (!requireAdmin({
    loginNext: '/admin-roles.html',
    message: 'Chỉ ADMIN mới quản lý được vai trò.'
  })) return;

  bindControls();
  applyDeskLink();
  loadRoles();
});

function applyDeskLink() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('create') === '1') startCreate();
}

function bindControls() {
  const search = document.getElementById('admin-role-search');
  let timer = null;
  search?.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      state.q = search.value.trim();
      loadRoles();
    }, 280);
  });

  document.getElementById('admin-role-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    saveRole();
  });
  document.getElementById('admin-role-reset')?.addEventListener('click', () => startCreate());
}

async function loadRoles() {
  const body = document.getElementById('admin-role-rows');
  const empty = document.getElementById('admin-role-empty');
  const count = document.getElementById('admin-role-count');
  if (body) body.innerHTML = `<tr><td colspan="4" class="p-4">Đang tải...</td></tr>`;
  if (empty) empty.hidden = true;

  try {
    const data = await listAdminRoles({ q: state.q || null, page: 0, size: 50 });
    state.items = data?.items || [];
    if (count) count.textContent = `${data?.totalElements ?? 0} vai trò`;

    if (!state.items.length) {
      if (body) body.innerHTML = '';
      if (empty) empty.hidden = false;
      return;
    }

    if (body) {
      body.innerHTML = state.items.map(renderRow).join('');
      body.querySelectorAll('[data-edit-role]').forEach((btn) => {
        btn.addEventListener('click', () => fillForm(Number(btn.dataset.editRole)));
      });
      body.querySelectorAll('[data-delete-role]').forEach((btn) => {
        btn.addEventListener('click', () => removeRole(Number(btn.dataset.deleteRole)));
      });
    }

    const params = new URLSearchParams(window.location.search);
    const id = Number(params.get('id'));
    if (id && state.items.some((role) => role.id === id)) fillForm(id);
  } catch (err) {
    if (body) {
      body.innerHTML = `<tr><td colspan="4" class="p-4">${escapeHtml(err.message || 'Không tải được danh sách vai trò')}</td></tr>`;
    }
    if (count) count.textContent = 'Không tải được';
    showToast(err.message || 'Không tải được danh sách vai trò', 'error');
  }
}

function renderRow(role) {
  const system = isSystemRole(role.code);
  const selected = String(role.id) === String(state.selectedId);
  return `
    <tr class="border-b border-[#dcd5cb]${selected ? ' bg-[#fff6d8]' : ''}">
      <td class="py-3 pr-3 font-['Space_Grotesk'] text-xs font-bold uppercase">${escapeHtml(role.code)}</td>
      <td class="py-3 pr-3">
        <div class="font-['Epilogue'] text-sm font-bold">${escapeHtml(role.name)}</div>
        ${system ? '<span class="admin-chip admin-chip--info">Hệ thống</span>' : ''}
      </td>
      <td class="py-3 pr-3 font-['Be_Vietnam_Pro'] text-sm text-[#5b403e]">${escapeHtml(role.description || '—')}</td>
      <td class="py-3">
        <div class="flex flex-wrap gap-2">
          <button type="button" class="catalog-chip" data-edit-role="${role.id}">Sửa</button>
          ${system ? '' : `<button type="button" class="catalog-chip" data-delete-role="${role.id}">Xóa</button>`}
        </div>
      </td>
    </tr>
  `;
}

function startCreate() {
  state.selectedId = null;
  const form = document.getElementById('admin-role-form');
  form?.reset();
  document.getElementById('field-role-id').value = '';
  document.getElementById('field-role-code').disabled = false;
  document.getElementById('admin-role-form-title').textContent = 'Tạo vai trò';
  document.getElementById('admin-role-form-hint').textContent = 'Mã bắt đầu bằng chữ, chỉ gồm chữ, số và gạch dưới.';
}

function fillForm(id) {
  const role = state.items.find((item) => Number(item.id) === Number(id));
  if (!role) return;
  state.selectedId = role.id;
  document.getElementById('field-role-id').value = String(role.id);
  document.getElementById('field-role-code').value = role.code || '';
  document.getElementById('field-role-code').disabled = isSystemRole(role.code);
  document.getElementById('field-role-name').value = role.name || '';
  document.getElementById('field-role-description').value = role.description || '';
  document.getElementById('admin-role-form-title').textContent = isSystemRole(role.code)
    ? 'Sửa vai trò hệ thống'
    : 'Sửa vai trò';
  document.getElementById('admin-role-form-hint').textContent = isSystemRole(role.code)
    ? 'ADMIN và STUDENT không đổi mã, không xóa được.'
    : 'Đổi mã sẽ đăng xuất mọi người đang dùng vai trò này.';
  document.getElementById('admin-role-rows')?.querySelectorAll('tr').forEach((row, index) => {
    row.classList.toggle('bg-[#fff6d8]', String(state.items[index]?.id) === String(id));
  });
}

async function saveRole() {
  if (state.saving) return;
  const id = document.getElementById('field-role-id')?.value;
  const code = document.getElementById('field-role-code')?.value.trim();
  const name = document.getElementById('field-role-name')?.value.trim();
  const description = document.getElementById('field-role-description')?.value.trim();
  if (!name || (!id && !code)) {
    showToast('Cần mã và tên vai trò.', 'warning');
    return;
  }

  state.saving = true;
  const btn = document.getElementById('admin-role-save');
  if (btn) btn.disabled = true;
  try {
    if (id) {
      await updateAdminRole(id, {
        ...(isSystemRole(code) ? {} : { code }),
        name,
        description
      });
      showToast('Đã cập nhật vai trò.', 'success');
    } else {
      await createAdminRole({ code, name, description });
      showToast('Đã tạo vai trò.', 'success');
      startCreate();
    }
    await loadRoles();
  } catch (err) {
    showToast(err.message || 'Không lưu được vai trò.', 'error');
  } finally {
    state.saving = false;
    if (btn) btn.disabled = false;
  }
}

async function removeRole(id) {
  const role = state.items.find((item) => Number(item.id) === Number(id));
  if (!role || isSystemRole(role.code)) return;
  const ok = await confirmModal({
    title: `Xóa vai trò ${role.code}?`,
    message: 'Chỉ xóa được khi không còn người dùng nào đang mang vai trò này.',
    type: 'confirm',
    confirmText: 'Xóa vai trò',
    cancelText: 'Hủy',
    isDestructive: true,
    washiTag: 'VAI TRÒ'
  });
  if (!ok) return;
  try {
    await deleteAdminRole(id);
    showToast('Đã xóa vai trò.', 'success');
    if (String(state.selectedId) === String(id)) startCreate();
    loadRoles();
  } catch (err) {
    showToast(err.message || 'Không xóa được vai trò.', 'error');
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
