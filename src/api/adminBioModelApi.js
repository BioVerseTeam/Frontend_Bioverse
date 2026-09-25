/**
 * Admin Bio Model API — CRUD for catalog metadata.
 * File GLB nằm trên R2; các field này là nhãn hiển thị trên giao diện.
 */

import { authFetch } from './httpClient.js';

const ADMIN_BASE = '/api/admin/models';

async function parseApiResponse(response) {
  let json;
  try {
    json = await response.json();
  } catch {
    if (response.status === 401) {
      throw new Error('Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.');
    }
    if (response.status === 403) {
      throw new Error('Chỉ tài khoản ADMIN mới chỉnh được nhãn mô hình.');
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
    throw new Error('Chỉ tài khoản ADMIN mới chỉnh được nhãn mô hình.');
  }
  if (!response.ok) {
    throw new Error(json?.message || `Yêu cầu thất bại (${response.status})`);
  }

  return json?.data !== undefined ? json.data : json;
}

async function request(url, options = {}) {
  return parseApiResponse(await authFetch(url, options));
}

/**
 * @param {{ q?: string, isFeatured?: boolean|null, isActive?: boolean|null, page?: number, size?: number }} filters
 */
export async function listAdminModels({
  q = null,
  isFeatured = null,
  isActive = null,
  page = 0,
  size = 50
} = {}) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (isFeatured === true || isFeatured === false) params.set('isFeatured', String(isFeatured));
  if (isActive === true || isActive === false) params.set('isActive', String(isActive));
  params.set('page', String(page));
  params.set('size', String(size));
  return unwrapPage(await request(`${ADMIN_BASE}?${params.toString()}`));
}

export async function getAdminModel(id) {
  return request(`${ADMIN_BASE}/${id}`);
}

export async function createAdminModel(payload) {
  return request(ADMIN_BASE, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updateAdminModel(id, payload) {
  return request(`${ADMIN_BASE}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export async function deleteAdminModel(id) {
  return request(`${ADMIN_BASE}/${id}`, { method: 'DELETE' });
}

export async function toggleFeatured(id, isFeatured, sortOrder = null) {
  const body = { isFeatured };
  if (sortOrder != null) body.sortOrder = sortOrder;
  return request(`${ADMIN_BASE}/${id}/featured`, {
    method: 'PATCH',
    body: JSON.stringify(body)
  });
}

/** Danh sách file đã nằm trên Cloudflare R2. */
export async function listR2Assets() {
  const data = await request(`${ADMIN_BASE}/assets`);
  return Array.isArray(data) ? data : [];
}

export async function listAdminCategories() {
  const data = await request('/api/admin/model-categories');
  return Array.isArray(data) ? data : [];
}

export async function createAdminCategory(payload) {
  return request('/api/admin/model-categories', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updateAdminCategory(id, payload) {
  return request(`/api/admin/model-categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export async function deleteAdminCategory(id) {
  return request(`/api/admin/model-categories/${id}`, { method: 'DELETE' });
}

export async function listAdminLabs() {
  const data = await request('/api/admin/labs');
  return Array.isArray(data) ? data : [];
}

export async function createAdminLab(payload) {
  return request('/api/admin/labs', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updateAdminLab(id, payload) {
  return request(`/api/admin/labs/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export async function deleteAdminLab(id) {
  return request(`/api/admin/labs/${id}`, { method: 'DELETE' });
}

export async function uploadAdminThumbnail(file) {
  const body = new FormData();
  body.append('file', file, file.name || 'thumbnail.jpg');
  return request(`${ADMIN_BASE}/thumbnail`, {
    method: 'POST',
    body
  });
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
