/**
 * User Profile API Client — Handles /api/users/me, profile update, avatar upload, and password change
 */

import { authFetch } from './httpClient.js';

const PROFILE_BASE = '/api/users/me';
const MEDIA_UPLOAD = '/api/media/upload';

async function parseApiResponse(response) {
  let json;
  try {
    json = await response.json();
  } catch {
    if (response.status === 401) throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    if (response.status === 403) throw new Error('Bạn không có quyền thực hiện thao tác này.');
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
 * Lấy thông tin chi tiết người dùng hiện tại (kèm thông tin chuỗi ngày streak)
 * GET /api/users/me
 */
export async function fetchUserProfile() {
  const res = await authFetch(PROFILE_BASE);
  return parseApiResponse(res);
}

/**
 * Cập nhật thông tin cá nhân
 * PATCH /api/users/me
 * @param {Object} payload
 * @param {string} [payload.fullName]
 * @param {string} [payload.phone]
 * @param {number} [payload.grade] (6-9)
 * @param {string} [payload.avatarUrl]
 * @param {string} [payload.dateOfBirth] (YYYY-MM-DD)
 * @param {'MALE'|'FEMALE'|'OTHER'} [payload.gender]
 */
export async function updateUserProfile(payload) {
  const cleanPayload = {};
  if (payload.fullName !== undefined) cleanPayload.fullName = payload.fullName?.trim() || null;
  if (payload.phone !== undefined) cleanPayload.phone = payload.phone?.trim() || null;
  if (payload.grade !== undefined) cleanPayload.grade = payload.grade ? Number(payload.grade) : null;
  if (payload.avatarUrl !== undefined) cleanPayload.avatarUrl = payload.avatarUrl?.trim() || null;
  if (payload.dateOfBirth !== undefined) cleanPayload.dateOfBirth = payload.dateOfBirth || null;
  if (payload.gender !== undefined) cleanPayload.gender = payload.gender || null;

  const res = await authFetch(PROFILE_BASE, {
    method: 'PATCH',
    body: JSON.stringify(cleanPayload)
  });
  return parseApiResponse(res);
}

/**
 * Upload ảnh đại diện lên Cloudflare R2
 * POST /api/media/upload
 * @param {File} file
 * @returns {Promise<string>} Public URL của ảnh đã upload
 */
export async function uploadAvatar(file) {
  if (!file) throw new Error('Vui lòng chọn ảnh để tải lên');

  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type.toLowerCase())) {
    throw new Error('Chỉ hỗ trợ định dạng ảnh JPG, PNG hoặc WebP');
  }

  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    throw new Error('Dung lượng ảnh tối đa 5MB');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', 'avatars');

  const res = await authFetch(MEDIA_UPLOAD, {
    method: 'POST',
    body: formData
  });

  const data = await parseApiResponse(res);
  if (!data?.url) {
    throw new Error('Máy chủ không trả về liên kết ảnh');
  }
  return data.url;
}

/**
 * Yêu cầu gửi mã OTP đổi mật khẩu qua email
 * POST /api/users/me/password/otp
 */
export async function requestChangePasswordOtp() {
  const res = await authFetch(`${PROFILE_BASE}/password/otp`, {
    method: 'POST'
  });
  return parseApiResponse(res);
}

/**
 * Xác nhận đổi mật khẩu với OTP
 * POST /api/users/me/password
 * @param {Object} params
 * @param {string} params.currentPassword
 * @param {string} params.newPassword
 * @param {string} params.confirmPassword
 * @param {string} params.otp
 */
export async function changeUserPassword({ currentPassword, newPassword, confirmPassword, otp }) {
  if (!currentPassword) throw new Error('Vui lòng nhập mật khẩu hiện tại');
  if (!newPassword || newPassword.length < 8) throw new Error('Mật khẩu mới phải có ít nhất 8 ký tự');
  if (newPassword !== confirmPassword) throw new Error('Mật khẩu xác nhận không khớp');
  if (!otp || !otp.trim()) throw new Error('Vui lòng nhập mã OTP đã nhận qua email');

  const res = await authFetch(`${PROFILE_BASE}/password`, {
    method: 'POST',
    body: JSON.stringify({
      currentPassword,
      newPassword,
      confirmPassword,
      otp: otp.trim()
    })
  });
  return parseApiResponse(res);
}
