/**
 * Admin STEM Badge API Client
 * CRUD operations for STEM Badges & Titles (/api/admin/badges)
 */

import { authFetch } from './httpClient.js';

const ADMIN_BASE = '/api/admin/badges';

async function parseApiResponse(response) {
  let json;
  try {
    json = await response.json();
  } catch {
    if (response.status === 401) {
      throw new Error('Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.');
    }
    if (response.status === 403) {
      throw new Error('Chỉ tài khoản ADMIN mới có quyền quản lý danh hiệu.');
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
    throw new Error('Chỉ tài khoản ADMIN mới có quyền quản lý danh hiệu.');
  }
  if (!response.ok) {
    throw new Error(json?.message || `Yêu cầu thất bại (${response.status})`);
  }

  return json?.data !== undefined ? json.data : json;
}

async function request(url, options = {}) {
  let response;
  try {
    response = await authFetch(url, options);
  } catch (err) {
    if (err.message && err.message.includes('Phiên đăng nhập')) throw err;
    throw new Error('Không thể kết nối máy chủ. Hãy kiểm tra dịch vụ backend.');
  }
  return parseApiResponse(response);
}

export async function listAdminBadges() {
  const data = await request(ADMIN_BASE);
  return Array.isArray(data) ? data : [];
}

export async function getAdminBadge(id) {
  return request(`${ADMIN_BASE}/${id}`);
}

export async function createAdminBadge(payload) {
  return request(ADMIN_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function updateAdminBadge(id, payload) {
  return request(`${ADMIN_BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function toggleAdminBadge(id) {
  return request(`${ADMIN_BASE}/${id}/toggle`, {
    method: 'PATCH'
  });
}

export async function deleteAdminBadge(id) {
  return request(`${ADMIN_BASE}/${id}`, {
    method: 'DELETE'
  });
}
