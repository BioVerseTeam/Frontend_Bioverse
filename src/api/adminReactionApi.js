/**
 * Admin reaction catalog API — /api/admin/reactions
 */

import { AuthService } from '../features/auth/authService.js';

const ADMIN_BASE = '/api/admin/reactions';

async function parseApiResponse(response) {
  let json;
  try {
    json = await response.json();
  } catch {
    if (response.status === 401) {
      throw new Error('Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.');
    }
    if (response.status === 403) {
      throw new Error('Chỉ tài khoản ADMIN mới cấu hình được phương trình.');
    }
    if (!response.ok) {
      throw new Error(`Lỗi kết nối máy chủ (${response.status})`);
    }
    return null;
  }

  if (json && typeof json.code === 'number') {
    if (json.code === 1000) return json.data;
    throw new Error(json.message || 'Thao tác không thành công');
  }

  if (response.status === 401) {
    throw new Error('Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.');
  }
  if (response.status === 403) {
    throw new Error('Chỉ tài khoản ADMIN mới cấu hình được phương trình.');
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
        ...(options.headers || {}),
      },
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

export async function listAdminReactions() {
  const data = await authFetch(ADMIN_BASE);
  return Array.isArray(data) ? data : [];
}

export async function createAdminReaction(payload) {
  return authFetch(ADMIN_BASE, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateAdminReaction(id, payload) {
  return authFetch(`${ADMIN_BASE}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminReaction(id) {
  return authFetch(`${ADMIN_BASE}/${id}`, { method: 'DELETE' });
}
