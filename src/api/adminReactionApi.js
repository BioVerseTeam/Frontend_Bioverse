/**
 * Admin reaction catalog API — /api/admin/reactions
 */

import { authFetch } from './httpClient.js';

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

async function request(url, options = {}) {
  return parseApiResponse(await authFetch(url, options));
}

export async function listAdminReactions() {
  const data = await request(ADMIN_BASE);
  return Array.isArray(data) ? data : [];
}

export async function createAdminReaction(payload) {
  return request(ADMIN_BASE, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateAdminReaction(id, payload) {
  return request(`${ADMIN_BASE}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminReaction(id) {
  return request(`${ADMIN_BASE}/${id}`, { method: 'DELETE' });
}
