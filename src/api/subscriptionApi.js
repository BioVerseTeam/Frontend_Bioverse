import { authFetch } from './httpClient.js';

/**
 * Subscription & PayOS client APIs
 */

async function parseResponse(response) {
  let json;
  try {
    json = await response.json();
  } catch {
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

/**
 * Danh sách các gói cước đang mở bán
 */
export async function getPublicPlans() {
  const res = await fetch('/api/plans');
  return parseResponse(res);
}

/**
 * Lấy trạng thái gói Premium của người dùng hiện tại
 */
export async function getMySubscription() {
  const res = await authFetch('/api/users/me/subscription');
  return parseResponse(res);
}

/**
 * Tạo link thanh toán PayOS
 */
export async function createCheckout({ planId, returnUrl = null, cancelUrl = null }) {
  const res = await authFetch('/api/payments/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ planId, returnUrl, cancelUrl })
  });
  return parseResponse(res);
}

/**
 * Lấy trạng thái đơn thanh toán PayOS theo orderCode
 */
export async function getPaymentStatus(orderCode) {
  const res = await authFetch(`/api/payments/${encodeURIComponent(orderCode)}`);
  return parseResponse(res);
}

/**
 * Hủy đơn thanh toán
 */
export async function cancelPayment(orderCode) {
  const res = await authFetch(`/api/payments/${encodeURIComponent(orderCode)}/cancel`, {
    method: 'POST'
  });
  return parseResponse(res);
}

/**
 * Xem lịch sử các gói cước của tôi
 */
export async function getMySubscriptionHistory() {
  const res = await authFetch('/api/users/me/subscription/history');
  return parseResponse(res);
}

/**
 * Xem lịch sử các thanh toán của tôi
 */
export async function getMyPaymentHistory() {
  const res = await authFetch('/api/users/me/subscription/payments');
  return parseResponse(res);
}
