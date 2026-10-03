import { authFetch } from './httpClient.js';

const ADMIN_PLANS = '/api/admin/plans';

async function parseResponse(response) {
  let json;
  try {
    json = await response.json();
  } catch {
    if (response.status === 401) throw new Error('Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.');
    if (response.status === 403) throw new Error('Chỉ tài khoản ADMIN mới có quyền thực hiện.');
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

export async function getAdminPlans() {
  const res = await authFetch(ADMIN_PLANS);
  return parseResponse(res);
}

export async function createAdminPlan(planData) {
  const res = await authFetch(ADMIN_PLANS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(planData)
  });
  return parseResponse(res);
}

export async function updateAdminPlan(id, planData) {
  const res = await authFetch(`${ADMIN_PLANS}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(planData)
  });
  return parseResponse(res);
}

export async function deleteAdminPlan(id) {
  const res = await authFetch(`${ADMIN_PLANS}/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
  return parseResponse(res);
}
