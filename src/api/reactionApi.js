/**
 * Public reaction catalog — GET /api/reactions
 * Admin-configured .chemx lessons for students.
 */

const API_BASE = '/api/reactions';

async function parseApiResponse(response) {
  let json;
  try {
    json = await response.json();
  } catch {
    if (!response.ok) {
      throw new Error(`Lỗi kết nối máy chủ (${response.status})`);
    }
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

async function request(path = '') {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`);
  } catch {
    throw new Error('Không thể kết nối máy chủ backend. Hãy kiểm tra dịch vụ rồi thử lại.');
  }
  return parseApiResponse(response);
}

/** @returns {Promise<Array>} */
export async function listPublicReactions() {
  const data = await request('');
  return Array.isArray(data) ? data : [];
}

export async function getPublicReaction(code) {
  return request(`/${encodeURIComponent(code)}`);
}
