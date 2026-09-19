/**
 * Admin people list — lock/unlock and assign an existing role.
 * Role catalog CRUD lives on the roles page.
 */

import { setupNavbarAuth } from '../utils/authNavbar.js';
import { requireAdmin } from '../utils/adminGuard.js';
import { AuthService } from '../features/auth/authService.js';
import { confirmModal, showToast } from '../components/modal.js';
import { listAdminUsers, updateAdminUser } from '../api/adminUserApi.js';
import { listAdminRoles } from '../api/adminRoleApi.js';

const state = {
  q: '',
  role: '',
  status: '',
  page: 0,
  totalPages: 0,
  roles: []
};

document.addEventListener('DOMContentLoaded', async () => {
  try {
    setupNavbarAuth();
  } catch (err) {
    console.warn('Admin navbar failed', err);
  }
  if (!requireAdmin({
    loginNext: '/admin-users.html',
    message: 'Chỉ ADMIN mới xem và chỉnh người dùng được.'
  })) return;

  applyDeskLink();
  bindSearch();
  bindStatusFilters();
  await loadRoles();
  await loadUsers();
});

function applyDeskLink() {
  const params = new URLSearchParams(window.location.search);
  const q = params.get('q');
  const status = params.get('status') || '';
  const role = params.get('role') || '';
  const search = document.getElementById('admin-user-search');
  if (q && search) {
    search.value = q;
    state.q = q;
  }
  if (status) {
    state.status = status;
    document.querySelectorAll('[data-status-filter]').forEach((el) => {
      el.classList.toggle('is-active', (el.dataset.statusFilter || '') === status);
    });
  }
  if (role) state.role = role;
}

function bindSearch() {
  const search = document.getElementById('admin-user-search');
  let timer = null;
  search?.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      state.q = search.value.trim();
      state.page = 0;
      loadUsers();
    }, 280);
  });
}

function bindStatusFilters() {
  document.querySelectorAll('[data-status-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.status = btn.dataset.statusFilter || '';
      state.page = 0;
      document.querySelectorAll('[data-status-filter]').forEach((el) => {
        el.classList.toggle('is-active', el === btn);
      });
      loadUsers();
    });
  });
}

function bindRoleFilters() {
  document.querySelectorAll('[data-role-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.role = btn.dataset.roleFilter || '';
      state.page = 0;
      document.querySelectorAll('[data-role-filter]').forEach((el) => {
        el.classList.toggle('is-active', el === btn);
      });
      loadUsers();
    });
  });
}

async function loadRoles() {
  const wrap = document.getElementById('admin-role-filters');
  try {
    const data = await listAdminRoles({ page: 0, size: 50 });
    state.roles = data?.items || [];
  } catch {
    state.roles = [
      { code: 'STUDENT', name: 'Học sinh' },
      { code: 'ADMIN', name: 'Admin' }
    ];
  }
  if (!wrap) return;
  wrap.innerHTML = [
    `<button type="button" data-role-filter="" class="catalog-chip${state.role ? '' : ' is-active'}">Tất cả</button>`,
    ...state.roles.map((role) => {
      const code = role.code || '';
      const active = state.role === code ? ' is-active' : '';
      return `<button type="button" data-role-filter="${escapeAttr(code)}" class="catalog-chip${active}">${escapeHtml(role.name || code)}</button>`;
    })
  ].join('');
  bindRoleFilters();
}

async function loadUsers() {
  const body = document.getElementById('admin-user-rows');
  const empty = document.getElementById('admin-user-empty');
  const count = document.getElementById('admin-user-count');
  if (body) {
    body.innerHTML = `<tr><td colspan="5" class="p-4">Đang tải...</td></tr>`;
  }
  if (empty) empty.hidden = true;

  try {
    const data = await listAdminUsers({
      q: state.q,
      role: state.role || null,
      status: state.status || null,
      page: state.page,
      size: 20
    });
    const items = data?.items || [];
    state.totalPages = data?.totalPages || 0;
    if (count) count.textContent = `${data?.totalElements ?? 0} người dùng`;

    if (!items.length) {
      if (body) body.innerHTML = '';
      if (empty) empty.hidden = false;
      return;
    }

    if (body) {
      try {
        body.innerHTML = items.map(renderRow).join('');
        body.querySelectorAll('[data-toggle-status]').forEach((btn) => {
          btn.addEventListener('click', () => toggleStatus(btn));
        });
        body.querySelectorAll('[data-assign-role]').forEach((select) => {
          select.addEventListener('change', () => assignRole(select));
        });
      } catch (renderErr) {
        body.innerHTML = `<tr><td colspan="5" class="p-4">Không vẽ được bảng người dùng.</td></tr>`;
        showToast(renderErr.message || 'Không hiển thị được danh sách người dùng', 'error');
      }
    }
  } catch (err) {
    if (body) {
      body.innerHTML = `<tr><td colspan="5" class="p-4">${escapeHtml(err.message || 'Không tải được danh sách người dùng')}</td></tr>`;
    }
    if (count) count.textContent = 'Không tải được';
    showToast(err.message || 'Không tải được danh sách người dùng', 'error');
  }
}

function renderRow(user) {
  const active = user.status === 'ACTIVE';
  const role = typeof user.role === 'string'
    ? user.role
    : String(user.role?.code || user.role?.name || 'STUDENT');
  const grade = role === 'ADMIN' ? '—' : (user.grade ? `Lớp ${user.grade}` : '—');
  const me = AuthService.getUser();
  const isSelf = me?.id != null && Number(me.id) === Number(user.id);
  const roleOptions = state.roles.map((item) => {
    const code = item.code || '';
    const selected = code === role ? ' selected' : '';
    return `<option value="${escapeAttr(code)}"${selected}>${escapeHtml(item.name || code)}</option>`;
  }).join('');

  return `
    <tr class="border-b border-[#dcd5cb]">
      <td class="py-3 pr-3">
        <div class="font-['Epilogue'] text-sm font-bold">${escapeHtml(user.fullName || user.email)}</div>
        <div class="font-['Be_Vietnam_Pro'] text-xs text-[#5b403e]">${escapeHtml(user.email)}</div>
      </td>
      <td class="py-3 pr-3">
        ${isSelf ? `<span class="font-['Space_Grotesk'] text-xs font-bold uppercase">${escapeHtml(role)}</span>` : `
        <select class="admin-role-select" data-assign-role="${user.id}" data-current-role="${escapeAttr(role)}" aria-label="Gán vai trò">
          ${roleOptions}
        </select>`}
      </td>
      <td class="py-3 pr-3 font-['Space_Grotesk'] text-xs">${escapeHtml(grade)}</td>
      <td class="py-3 pr-3">
        <span class="px-2 py-0.5 rounded-full border border-[#2d2d2d] text-[10px] font-['Space_Grotesk'] font-bold ${active ? 'bg-[#e8f5e9] text-[#00864c]' : 'bg-[#ffdad6] text-[#b71422]'}">${active ? 'Hoạt động' : user.status || 'Ẩn'}</span>
      </td>
      <td class="py-3">
        ${isSelf ? '<span class="font-[\'Be_Vietnam_Pro\'] text-xs text-[#76716a]">Tài khoản của bạn</span>' : `<button type="button" class="catalog-chip" data-toggle-status="${user.id}" data-next-status="${active ? 'INACTIVE' : 'ACTIVE'}">${active ? 'Tạm khóa' : 'Mở lại'}</button>`}
      </td>
    </tr>
  `;
}

async function toggleStatus(btn) {
  const id = Number(btn.dataset.toggleStatus);
  const next = btn.dataset.nextStatus;
  const ok = await confirmModal({
    title: next === 'INACTIVE' ? 'Tạm khóa tài khoản?' : 'Mở lại tài khoản?',
    message: next === 'INACTIVE'
      ? 'Học sinh sẽ không đăng nhập được cho đến khi mở lại.'
      : 'Tài khoản sẽ đăng nhập bình thường trở lại.',
    type: 'confirm',
    confirmText: next === 'INACTIVE' ? 'Tạm khóa' : 'Mở lại',
    cancelText: 'Hủy',
    isDestructive: next === 'INACTIVE',
    washiTag: 'NGƯỜI DÙNG'
  });
  if (!ok) return;
  try {
    await updateAdminUser(id, { status: next });
    showToast('Đã cập nhật trạng thái tài khoản.', 'success');
    loadUsers();
  } catch (err) {
    showToast(err.message || 'Không cập nhật được tài khoản.', 'error');
  }
}

async function assignRole(select) {
  const id = Number(select.dataset.assignRole);
  const next = select.value;
  const current = select.dataset.currentRole;
  if (!next || next === current) return;
  const ok = await confirmModal({
    title: 'Đổi vai trò người dùng?',
    message: `Vai trò mới: <strong>${escapeHtml(next)}</strong>. Người này sẽ phải đăng nhập lại.`,
    type: 'confirm',
    confirmText: 'Gán vai trò',
    cancelText: 'Hủy',
    washiTag: 'NGƯỜI DÙNG'
  });
  if (!ok) {
    select.value = current;
    return;
  }
  try {
    await updateAdminUser(id, { role: next });
    showToast('Đã gán vai trò.', 'success');
    loadUsers();
  } catch (err) {
    select.value = current;
    showToast(err.message || 'Không gán được vai trò.', 'error');
  }
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
