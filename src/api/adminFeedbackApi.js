/**
 * Admin Feedback API Client
 * Quản lý, tra cứu, xử lý và xuất báo cáo ý kiến đóng góp cho Admin
 */

import { authFetch } from './httpClient.js';

const ADMIN_FEEDBACKS_URL = '/api/admin/feedbacks';

async function parseResponse(response) {
  let json;
  try {
    json = await response.json();
  } catch {
    if (response.status === 401) throw new Error('Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.');
    if (response.status === 403) throw new Error('Chỉ tài khoản ADMIN mới có quyền truy cập.');
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

export async function getAdminFeedbacks({
  status = null,
  category = null,
  rating = null,
  keyword = null,
  page = 0,
  size = 20
} = {}) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (category) params.set('category', category);
  if (rating) params.set('rating', String(rating));
  if (keyword) params.set('keyword', keyword);
  params.set('page', String(page));
  params.set('size', String(size));

  const res = await authFetch(`${ADMIN_FEEDBACKS_URL}?${params.toString()}`);
  return parseResponse(res);
}

export async function getAdminFeedbackById(id) {
  const res = await authFetch(`${ADMIN_FEEDBACKS_URL}/${encodeURIComponent(id)}`);
  return parseResponse(res);
}

export async function updateAdminFeedback(id, { status, adminNotes = null }) {
  const res = await authFetch(`${ADMIN_FEEDBACKS_URL}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, adminNotes })
  });
  return parseResponse(res);
}

export async function deleteAdminFeedback(id) {
  const res = await authFetch(`${ADMIN_FEEDBACKS_URL}/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
  return parseResponse(res);
}

export function getAdminFeedbackExportUrl({
  status = null,
  category = null,
  rating = null,
  keyword = null
} = {}) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (category) params.set('category', category);
  if (rating) params.set('rating', String(rating));
  if (keyword) params.set('keyword', keyword);
  return `${ADMIN_FEEDBACKS_URL}/export?${params.toString()}`;
}

export async function downloadAdminFeedbacksCsv(filters = {}) {
  const url = getAdminFeedbackExportUrl(filters);
  const res = await authFetch(url);
  if (!res.ok) {
    throw new Error('Không thể tải file xuất báo cáo từ máy chủ');
  }
  const blob = await res.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = `BioVerse_Feedbacks_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(blobUrl);
}
