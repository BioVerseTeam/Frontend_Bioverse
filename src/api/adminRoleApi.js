/**
 * Admin role catalog API — /api/admin/roles
 */

import { AuthService } from '../features/auth/authService.js';

const ADMIN_ROLES = '/api/admin/roles';

async function parseApiResponse(response) {
  let json;
  try {
    json = await response.json();
  } catch {
    if (response.status === 401) throw new Error('Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.');
    if (response.status === 403) throw new Error('Chỉ tài khoản ADMIN mới quản lý được vai trò.');
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

export async function listAdminRoles({ q = null, page = 0, size = 50 } = {}) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  params.set('page', String(page));
  params.set('size', String(size));
  return unwrapPage(await authFetch(`${ADMIN_ROLES}?${params.toString()}`));
}

export async function createAdminRole(payload) {
  return authFetch(ADMIN_ROLES, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updateAdminRole(id, payload) {
  return authFetch(`${ADMIN_ROLES}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export async function deleteAdminRole(id) {
  return authFetch(`${ADMIN_ROLES}/${id}`, { method: 'DELETE' });
}

export const SYSTEM_ROLE_CODES = ['ADMIN', 'STUDENT'];

export function isSystemRole(code) {
  return SYSTEM_ROLE_CODES.includes(String(code || '').toUpperCase());
}
