/**
 * Admin user management API — GET /api/admin/users
 */

import { AuthService } from '../features/auth/authService.js';

const ADMIN_USERS = '/api/admin/users';

async function parseApiResponse(response) {
  let json;
  try {
    json = await response.json();
  } catch {
    if (response.status === 401) throw new Error('Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.');
    if (response.status === 403) throw new Error('Chỉ tài khoản ADMIN mới xem được danh sách người dùng.');
    if (!response.ok) throw new Error(`Lỗi kết nối máy chủ (${response.status})`);
    return null;
  }

  if (json && typeof json.code === 'number') {
    if (json.code === 1000) return json.data;
    throw new Error(json.message || 'Thao tác không thành công');
  }
  if (!response.ok) {
    throw new Error(json?.message || `Yêu cầu thất bại (${response.status})`);
  }
  return json?.data !== undefined ? json.data : json;
}

async function authFetch(url, options = {}, retried = false) {
  const token = AuthService.getToken();
  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
      }
    });
  } catch {
    throw new Error('Không thể kết nối máy chủ backend. Hãy kiểm tra dịch vụ rồi thử lại.');
  }

  if (response.status === 401 && !retried) {
    const refreshed = await AuthService.refreshToken();
    if (refreshed) return authFetch(url, options, true);
  }

  return parseApiResponse(response);
}

export async function listAdminUsers({
  q = null,
  status = null,
  role = null,
  page = 0,
  size = 20
} = {}) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (status) params.set('status', status);
  if (role) params.set('role', role);
  params.set('page', String(page));
  params.set('size', String(size));
  return unwrapPage(await authFetch(`${ADMIN_USERS}?${params.toString()}`));
}

export async function getAdminDesk() {
  const data = await authFetch('/api/admin/desk');
  return {
    models: unwrapPage(data?.models),
    users: unwrapPage(data?.users),
    census: data?.census || null,
    r2Assets: Array.isArray(data?.r2Assets) ? data.r2Assets : [],
    r2Ok: data?.r2Ok !== false,
    modelsError: data?.modelsError || null,
    usersError: data?.usersError || null,
    r2Error: data?.r2Error || null
  };
}

function unwrapPage(data) {
  if (Array.isArray(data)) {
    return {
      items: data,
      totalElements: data.length,
      totalPages: 1,
      page: 0,
      size: data.length
    };
  }
  const items = data?.items || data?.content || [];
  return {
    items,
    totalElements: Number(data?.totalElements ?? items.length),
    totalPages: Number(data?.totalPages ?? 1),
    page: Number(data?.page ?? data?.number ?? 0),
    size: Number(data?.size ?? items.length)
  };
}

export async function updateAdminUser(id, payload) {
  return authFetch(`${ADMIN_USERS}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}
