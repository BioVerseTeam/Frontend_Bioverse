import { authFetch } from './httpClient.js';

const ADMIN_PAYMENTS = '/api/admin/payments';
const ADMIN_SUBSCRIPTIONS = '/api/admin/subscriptions';

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

export async function getAdminPayments({ status = null, keyword = null, page = 0, size = 20 } = {}) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (keyword) params.set('keyword', keyword);
  params.set('page', String(page));
  params.set('size', String(size));

  const res = await authFetch(`${ADMIN_PAYMENTS}?${params.toString()}`);
  return parseResponse(res);
}

export async function getAdminSubscriptions({ status = null, keyword = null, page = 0, size = 20 } = {}) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (keyword) params.set('keyword', keyword);
  params.set('page', String(page));
  params.set('size', String(size));

  const res = await authFetch(`${ADMIN_SUBSCRIPTIONS}?${params.toString()}`);
  return parseResponse(res);
}
